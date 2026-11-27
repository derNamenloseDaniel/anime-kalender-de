import type { DiscAusgabe, Release } from '@shared/types.ts'
import { anzeigeName } from '@shared/titles.ts'
import { kurzeAusgabe } from './disc-ausgabe.ts'

/*
  Die Disc-Ausgaben eines Titels als **eine Liste**, gleich ob eine Ausgabe als aniSearch-Artikel (`DiscAusgabe`) oder als Termin
  des Bestands (`Release`) bekannt ist (Daniel, 26.10.2026: Disc im Vordergrund, Anbieter dahinter). Weiter geht es in `disc-varianten.ts`.
*/

export type Format = DiscAusgabe[1]
export const FORMATE: Format[] = ['b', 'd', 'u']

export interface Ausgabe {
  schluessel: string
  name: string
  formate: Format[]
  /** ISO-Datum oder leer, wenn keine Quelle eins nennt. */
  datum: string
  gesamt: boolean
  /** Je Format die aniSearch-Artikelkennung. */
  artikel: Partial<Record<Format, number>>
  /** Adresse eines Shops (nie aniSearch), falls ein Termin eine nennt. */
  shopUrl?: string
  /** Der Termin aus dem Bestand, falls es einen gibt — Kalenderknopf und Verlag hängen daran. */
  release?: Release
}

export const artikelUrl = (artikel: number): string => `https://www.anisearch.de/article/${artikel}`

/** Die Shop-Adresse eines Termins; aniSearch ist Quelle, kein Shop. */
export function shopUrlVon(r: Release): string | undefined {
  return [r.buyUrl, r.platformUrl].find((u) => u && !/anisearch\./i.test(u))
}

/** Formate aus der Editionsangabe eines Termins („Limited Edition, DVD & Blu-ray“); ohne Angabe gilt Blu-ray. */
function formateAus(edition = ''): Format[] {
  const gefunden: Format[] = []
  if (/4k|uhd/i.test(edition)) gefunden.push('u')
  if (/blu-?ray/i.test(edition)) gefunden.push('b')
  if (/\bdvd\b/i.test(edition)) gefunden.push('d')
  return gefunden.length ? gefunden : ['b']
}

/** „Sakamoto Days – Vol. 1“ → „Vol. 1“: der Serienname steht schon im Kopf des Panels; bleibt nichts, bleibt nichts. */
function ohneTitel(name: string, titel: string): string {
  const rest = name.replace(titel, '').replace(/^[\s–\-:]+/, '').trim()
  return rest.length >= 3 ? rest : ''
}

/** Die aniSearch-Ausgaben: gleicher Name und gleiches Datum sind eine Ausgabe in mehreren Formaten. */
function ausgabenVonAniSearch(ausgaben: DiscAusgabe[]): Ausgabe[] {
  const nachSchluessel = new Map<string, Ausgabe>()
  for (const [kurz, format, art, datum, artikel] of ausgaben) {
    const schluessel = `${kurz}|${datum}`
    const eintrag = nachSchluessel.get(schluessel) ?? { schluessel: `as-${artikel}`, name: kurz, formate: [], datum, gesamt: art === 'g', artikel: {} }
    if (!eintrag.formate.includes(format)) eintrag.formate.push(format)
    eintrag.artikel[format] = artikel
    nachSchluessel.set(schluessel, eintrag)
  }
  return [...nachSchluessel.values()].map((a) => ({ ...a, formate: FORMATE.filter((f) => a.formate.includes(f)) }))
}

const terminDatum = (r: Release): string => r.schedule?.firstEpisodeDate ?? ''

/** Die aniSearch-Ausgabe, auf deren Artikel der Termin verweist. */
function perArtikel(r: Release, ausgaben: Ausgabe[]): Ausgabe | undefined {
  const artikel = r.sources.map((s) => Number(/article\/(\d+)/.exec(s)?.[1])).filter(Boolean)
  return ausgaben.find((a) => Object.values(a.artikel).some((n) => artikel.includes(n)))
}

/** „vol2“, „box9“ aus „… – Vol. 2“, „Box 09“; ohne Bandnummer leer. */
function band(text: string): string {
  const treffer = /\b(Box|Vol|Film)\.?\s*0*(\d+)/i.exec(text)
  return treffer ? `${treffer[1]!.toLowerCase()}${Number(treffer[2])}` : ''
}

/** Ein nummerierter Termin („Vol. 2“) ist nie die Gesamtausgabe und nie ein anderer Band; ohne Nummer auf einer Seite gilt der Tag. */
function gleicherBand(r: Release, a: Ausgabe): boolean {
  const termin = band(`${r.name} ${r.edition ?? ''}`)
  if (!termin) return true
  return !a.gesamt && [termin, ''].includes(band(a.name))
}

const BESONDERS = /limited|limitiert|steelbook|steelcase|mediabook|collector|ultimate|schuber|deluxe|premium|special/i
const ARTEN = [/steelbook/i, /steelcase/i, /mediabook/i, /collector/i, /ultimate/i, /schuber/i, /deluxe|premium/i, /special/i]

/** Nennt der Termin eine Edition? Nur Format („DVD & Blu-ray“) oder nichts sagt über das Produkt nichts. */
const nenntEdition = (edition = ''): boolean => /[a-zäöü]{3,}/i.test(edition.replace(/blu-?ray|\bdvd\b|\b4k\b|uhd|\bund\b/gi, ''))

/** Nennt ein Termin eine Edition, muss der Artikel dieselbe Art Ausgabe sein (Limited gegen schlichte, Steelbook gegen Collector’s sind zwei Produkte). */
function gleicheEdition(r: Release, a: Ausgabe): boolean {
  const edition = r.edition ?? ''
  if (!nenntEdition(edition)) return true
  if (BESONDERS.test(edition) !== BESONDERS.test(a.name)) return false
  const [t, n] = [ARTEN.filter((re) => re.test(edition)), ARTEN.filter((re) => re.test(a.name))]
  return !t.length || !n.length || t.some((re) => n.includes(re))
}

/**
 * Ein Termin ohne Artikelbezug ist dieselbe Ausgabe wie der aniSearch-Artikel, der am selben Tag im selben Format erscheint —
 * aber nur eindeutig: genau ein freier Artikel und genau ein loser Termin an dem Tag (26.11.2026: 124 von 183 losen Terminen).
 */
function amSelbenTag(r: Release, ausgaben: Ausgabe[], lose: Release[]): Ausgabe | undefined {
  const datum = terminDatum(r)
  if (!datum) return undefined
  const formate = formateAus(r.edition)
  const passt = (tag: string, andere: Format[]) => tag === datum && andere.some((f) => formate.includes(f))
  /* Ohne Termin ist nur ein aniSearch-Artikel: Jede Zeile aus einem Termin trägt ihn. */
  const artikel = ausgaben.filter((a) => !a.release && passt(a.datum, a.formate) && gleicherBand(r, a))
  const termine = lose.filter((l) => passt(terminDatum(l), formateAus(l.edition)))
  return artikel.length === 1 && termine.length === 1 && gleicheEdition(r, artikel[0]!) ? artikel[0] : undefined
}

/** Ein Termin gehört zu der aniSearch-Ausgabe, auf deren Artikel er verweist oder die am selben Tag dieselbe ist; sonst wird er eine eigene Zeile. */
function mitTerminen(liste: Ausgabe[], releases: Release[], titel: string): Ausgabe[] {
  const ergebnis = liste.map((a) => ({ ...a }))
  const lose = releases.filter((r) => !perArtikel(r, ergebnis))
  /* Erst die Termine mit Artikelbezug: Ein loser Termin darf keinen Artikel belegen, den ein anderer Termin nennt. */
  for (const r of [...releases.filter((x) => !lose.includes(x)), ...lose]) {
    const shopUrl = shopUrlVon(r)
    const treffer = perArtikel(r, ergebnis) ?? amSelbenTag(r, ergebnis, lose)
    if (treffer) {
      treffer.release = r
      treffer.shopUrl = shopUrl
      continue
    }
    ergebnis.push({
      schluessel: `t-${r.slug}`,
      /* Ein Termin ohne Editionsangabe (Dan Da Dan, 30.09.2026) heißt schlicht „Ausgabe“ — der Titel steht im Kopf. */
      name: [ohneTitel(r.name, titel), kurzeAusgabe(r.edition)].filter(Boolean).join(' · ') || 'Ausgabe',
      formate: formateAus(r.edition),
      datum: terminDatum(r),
      gesamt: /gesamt|komplett/i.test(r.edition ?? ''),
      artikel: {},
      shopUrl,
      release: r,
    })
  }
  return ergebnis
}

/** Alle Ausgaben eines Titels, älteste zuerst; ohne Datum ans Ende. */
export function discAusgabenVon(discAusgaben: DiscAusgabe[], discReleases: Release[], title: Parameters<typeof anzeigeName>[0]): Ausgabe[] {
  return mitTerminen(ausgabenVonAniSearch(discAusgaben), discReleases, anzeigeName(title)).sort(
    (a, b) => (a.datum || '9999').localeCompare(b.datum || '9999') || a.name.localeCompare(b.name),
  )
}
