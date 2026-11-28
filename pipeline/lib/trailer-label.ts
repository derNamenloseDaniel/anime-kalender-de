/**
 * Deutsche Label-Trailer (KSM Anime, peppermint, Universum u. a.) den Titeln zuordnen — rein, ohne Netz.
 *
 * Fehlermeldung 26.11.2026: „The Most Heretical Last Boss Queen“ (AniList 156040) hatte keinen Trailer, obwohl
 * KSM Anime einen deutschen hochgeladen hat; der Trailerlauf las nur KinoCheck und TMDB. Jede Verwerfung wird
 * gezählt (`Verwerfungen`), damit der Lauf sagen kann, warum ein Video nicht zugeordnet wurde.
 */
import { bewerteTreffer, woerterVon } from './adn.ts'
import { ablehnungsgrund } from './trailer-ablehnung.ts'

export interface LabelVideo {
  video: string
  titel: string
  /** Veröffentlichungstag `JJJJ-MM-TT`. */
  am: string
  kanal: string
}

export interface LabelTitel {
  id: number
  titleDe?: string
  titleEn?: string
  titleRomaji?: string
  jpYear?: number
  deErstausgabe?: { von?: string }
}

export interface LabelFund {
  video: string
  titel: string
  sprache: 'de'
  herkunft: 'label'
  gefundenAm: string
}

export const VERWERFUNGEN = ['kein-trailer', 'nicht-deutsch', 'kein-name', 'kein-treffer', 'mehrdeutig', 'staffel', 'jahr', 'abgelehnt'] as const
export type Verwerfung = (typeof VERWERFUNGEN)[number]
export type Verwerfungen = Record<Verwerfung, number>

/** Nennt der Videotitel die deutsche Fassung und keine Untertitel-/Originalton-Fassung? (peppermint lädt auch OmU hoch.) */
export function istDeutschesVideo(videoTitel: string): boolean {
  const deutsch = /\b(deutsch\w*|german|dt|synchro\w*|ger\s?dub)\b/i.test(videoTitel)
  const fremd = /\b(omu|sub|subs|gersub|ger\s?sub|jap\s?dub|japdub|japanese|japanisch\w*|untertitel\w*|english|englisch\w*)\b/i.test(videoTitel)
  return deutsch && !fremd
}

const STAFFEL = /\b(?:staffel|season|teil|part|cour)\s*(\d+)\b|\b(\d+)\.?\s*(?:staffel|season)\b|\b(\d+)(?:nd|rd|th)\s+season\b/gi

/** Staffelnummer aus einem Namen; ohne Hinweis 1. */
export function staffelNummer(name: string): number {
  const nummern = [...name.matchAll(STAFFEL)].map((m) => Number(m[1] ?? m[2] ?? m[3]))
  return nummern.length ? Math.max(...nummern) : 1
}

/** Der Titelname vor „Trailer“/„|“, ohne Jahr, Klammern und Staffelhinweis. */
export function videoName(videoTitel: string): string {
  const kopf = videoTitel.split(/\s\|\s/)[0] ?? ''
  const vor = kopf.split(/\b(?:(?:offizielle[rs]?|official|finale[rs]?|final|erste[rs]?|zweite[rs]?|neue[rs]?|deutsche[rs]?|german)\s+)*(?:synchro[\s-]*)?(?:teaser[\s-]*)?(?:trailer|teaser)\b/i)[0] ?? ''
  return vor
    .replace(/\([^)]*\)/g, ' ')
    .replace(STAFFEL, ' ')
    .replace(/\b(?:19|20)\d{2}\b/g, ' ')
    .replace(/[\s\-–—:|]+$/g, '')
    .trim()
}

function varianten(t: LabelTitel): string[] {
  return [t.titleDe, t.titleEn, t.titleRomaji].filter((n): n is string => Boolean(n))
}

/** Bester Wert über alle Schreibweisen; `deckt` = jedes Wort des Videonamens steht in dieser Schreibweise. */
function bewerte(name: string, t: LabelTitel): { punkte: number; deckt: boolean } {
  const gesucht = woerterVon(name)
  let beste = { punkte: 0, deckt: false }
  for (const v of varianten(t)) {
    const punkte = bewerteTreffer({ title: name }, { title: { romaji: v } })
    if (punkte <= beste.punkte) continue
    const ihre = woerterVon(v)
    beste = { punkte, deckt: [...gesucht].every((w) => ihre.has(w)) }
  }
  return beste
}

function videoJahr(v: LabelVideo): number | undefined {
  const imTitel = [...v.titel.matchAll(/\b(19[5-9]\d|20[0-4]\d)\b/g)].map((m) => Number(m[1]))
  const jahr = imTitel.length ? Math.min(...imTitel) : Number(v.am.slice(0, 4))
  return Number.isFinite(jahr) && jahr > 0 ? jahr : undefined
}

/** Fenster: ein Jahr vor der frühesten bis drei Jahre nach der spätesten Veröffentlichung (japanisch bzw. deutsche Erstausgabe). */
function jahrPasst(v: LabelVideo, t: LabelTitel): boolean {
  const anker = [t.jpYear, Number(t.deErstausgabe?.von?.slice(0, 4))].filter((j): j is number => Number.isFinite(j) && Boolean(j))
  const jahr = videoJahr(v)
  if (!anker.length || !jahr) return true
  return jahr >= Math.min(...anker) - 1 && jahr <= Math.max(...anker) + 3
}

function staffelPasst(videoStaffel: number, t: LabelTitel): boolean {
  return varianten(t).some((n) => staffelNummer(n) === videoStaffel)
}

/** Synchro-Trailer vor vollem Trailer vor Teaser. */
function rang(videoTitel: string): number {
  if (/\bsynchro\w*\b/i.test(videoTitel)) return 0
  return /\bteaser\b/i.test(videoTitel) ? 2 : 1
}

/** Die Titel je Wort — so bewertet ein Video nur die Titel, die mindestens ein Wort teilen. */
function wortIndex(titel: LabelTitel[]): Map<string, LabelTitel[]> {
  const index = new Map<string, LabelTitel[]>()
  for (const t of titel) {
    for (const wort of new Set(varianten(t).flatMap((v) => [...woerterVon(v)]))) {
      const liste = index.get(wort)
      if (liste) liste.push(t)
      else index.set(wort, [t])
    }
  }
  return index
}

/**
 * Bester Titel je Video (nicht der erste), dann bestes Video je Titel. Ein Video ohne eindeutigen Treffer,
 * mit anderer Staffel oder außerhalb des Jahresfensters wird verworfen und gezählt.
 */
export function waehleLabelTrailer(
  titel: LabelTitel[],
  videos: LabelVideo[],
  heute: string,
): { funde: Map<number, LabelFund>; verworfen: Verwerfungen } {
  const verworfen = Object.fromEntries(VERWERFUNGEN.map((g) => [g, 0])) as Verwerfungen
  const index = wortIndex(titel)
  const kandidaten = new Map<number, { v: LabelVideo; rang: number }[]>()
  for (const v of videos) {
    const grund = pruefeVideo(v, index)
    if (typeof grund === 'string') {
      verworfen[grund]++
      continue
    }
    const liste = kandidaten.get(grund.id) ?? []
    liste.push({ v, rang: rang(v.titel) })
    kandidaten.set(grund.id, liste)
  }
  const funde = new Map<number, LabelFund>()
  for (const [id, liste] of kandidaten) {
    const best = liste.sort((a, b) => a.rang - b.rang || b.v.am.localeCompare(a.v.am))[0]!.v
    funde.set(id, { video: best.video, titel: best.titel, sprache: 'de', herkunft: 'label', gefundenAm: heute })
  }
  return { funde, verworfen }
}

/** Der Titel, zu dem das Video gehört, oder der Grund der Verwerfung. */
function pruefeVideo(v: LabelVideo, idx: Map<string, LabelTitel[]>): Verwerfung | LabelTitel {
  if (!/\b(trailer|teaser)\b/i.test(v.titel)) return 'kein-trailer'
  if (!istDeutschesVideo(v.titel)) return 'nicht-deutsch'
  const name = videoName(v.titel)
  const woerter = woerterVon(name)
  if (!woerter.size) return 'kein-name'
  const gemeinsam = new Set([...woerter].flatMap((w) => idx.get(w) ?? []))
  const bewertet = [...gemeinsam].map((t) => ({ t, ...bewerte(name, t) })).sort((a, b) => b.punkte - a.punkte)
  const brauchbar = bewertet.filter((b) => b.punkte >= 2 && b.deckt)
  if (!brauchbar.length) return 'kein-treffer'
  /* Erst die Staffel, dann der Rang: „Staffel 2“ steht in keinem Videonamen, aber die zweite Staffel trägt ein Wort mehr und verlöre sonst. */
  const staffel = staffelNummer(v.titel)
  const [erster, zweiter] = brauchbar.filter((b) => staffelPasst(staffel, b.t))
  if (!erster) return 'staffel'
  if (zweiter && zweiter.punkte === erster.punkte) return 'mehrdeutig'
  if (!jahrPasst(v, erster.t)) return 'jahr'
  if (ablehnungsgrund(v.titel, varianten(erster.t))) return 'abgelehnt'
  return erster.t
}

/** Eine Zeile für das Lauflog: nur Gründe mit Treffern. */
export function verwerfungenText(v: Verwerfungen): string {
  return VERWERFUNGEN.filter((g) => v[g]).map((g) => `${v[g]}× ${g}`).join(', ') || 'keine'
}

/** Setzt die Funde in den Bestand: ein deutscher Eintrag bleibt, ein englischer/japanischer/fehlender wird ersetzt. */
export function uebernehmeLabel(
  titel: LabelTitel[],
  bestand: Record<string, { sprache?: string }>,
  videos: LabelVideo[],
  heute: string,
): { neu: number; ersetzt: number; verworfen: Verwerfungen } {
  const { funde, verworfen } = waehleLabelTrailer(titel, videos, heute)
  let neu = 0
  let ersetzt = 0
  for (const [id, fund] of funde) {
    const alt = bestand[String(id)]
    if (alt?.sprache === 'de') continue
    if (alt) ersetzt++
    else neu++
    bestand[String(id)] = fund
  }
  return { neu, ersetzt, verworfen }
}
