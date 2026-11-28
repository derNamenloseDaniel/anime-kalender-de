/**
 * Videos, die der Trailer-Knopf nicht zeigen darf: Reviews, Reaktionen, ganze Filme/Folgen, Ranglisten, Analysen,
 * Fan-Edits und Fehleinträge. Fehlermeldung 28.11.2026: „Call of the Night“ zeigte ein Anime-Review (TMDB-Eintrag
 * vom Typ Trailer, von Nutzern gepflegt). Der Videotitel wird ohne den Animenamen geprüft — „Ranking of Kings“
 * trägt „Ranking“ im Namen. Handeinträge (`trailer-hand.yaml`) gehen nie durch diese Regel.
 */

export const ABLEHNUNGEN = ['review', 'kritik', 'reaktion', 'ganzer-film', 'folgen-upload', 'ranking', 'analyse', 'fan-edit', 'falscher-titel', 'marathon', 'gesperrt'] as const
export type Ablehnung = (typeof ABLEHNUNGEN)[number]
export type Ablehnungen = Record<Ablehnung, number>

const MUSTER: [Ablehnung, RegExp][] = [
  ['review', /\b(reviews?|rezension\w*)\b/],
  ['kritik', /\bkritik\w*\b/],
  ['reaktion', /\b(reactions?|reaktion\w*|reacts?\s+to)\b/],
  ['ganzer-film', /\b(full\s+(movie|film|episodes?|anime)|ganze[rnms]?\s+(film|folgen?|episoden?|anime)|komplette[rnms]?\s+(film|folgen?|episoden?))\b/],
  ['ranking', /\b(ranking|top\s*\d+|tier\s*list|best\s+anime|beste[rnms]?\s+anime|best\s+of)\b/],
  ['analyse', /\b(analy[sz]\w*|erkl[aä]rt|explained|breakdown)\b/],
  ['fan-edit', /\b(amv|fan[\s-]?(edit|made|film|trailer|dub|sub)|fanedit|fanmade)\b/],
  ['falscher-titel', /\b(wrong\s+title|please\s+delete)\b/],
  ['marathon', /\b(marathon|catch[\s-]?up)\b/],
]

const FOLGE = /\b(episode|folge|ep)\s*\d+\b/
const TRAILER_WORT = /\b(trailer|teaser|preview|vorschau|promo|pv)\b/

/** Klein, ohne Satzzeichen (Schrift jeder Art bleibt), einfache Leerzeichen. */
function glatt(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

/** Der Videotitel ohne die Schreibweisen des Animenamens, mit Leerzeichen am Rand. */
function ohneNamen(videoTitel: string, namen: string[]): string {
  let text = ` ${glatt(videoTitel)} `
  const gesucht = namen.map(glatt).filter((n) => n.length >= 3).sort((a, b) => b.length - a.length)
  for (const n of gesucht) text = text.split(` ${n} `).join(' ')
  return text
}

/** Der Grund, aus dem ein Video kein Trailer ist, oder `null`. */
export function ablehnungsgrund(videoTitel: string, namen: string[]): Ablehnung | null {
  const text = ohneNamen(videoTitel, namen)
  for (const [grund, muster] of MUSTER) if (muster.test(text)) return grund
  if (FOLGE.test(text) && !TRAILER_WORT.test(text)) return 'folgen-upload'
  return null
}

/** Alle Schreibweisen des Animenamens, die der Videotitel tragen darf. */
export function animeNamen(t: { titleDe?: string; titleEn?: string; titleRomaji?: string }, tmdbName?: string): string[] {
  return [t.titleDe, t.titleEn, t.titleRomaji, tmdbName].filter((n): n is string => Boolean(n))
}

/** Prüft ein Video einer Quelle gegen Regel und Sperrliste (YouTube-Kennungen aus `trailer-sperre.yaml`). */
export type Ablehner = (video: string, videoTitel: string) => Ablehnung | null

export function macheAblehner(namen: string[], sperre: ReadonlySet<string> = new Set()): Ablehner {
  return (video, videoTitel) => (sperre.has(video) ? 'gesperrt' : ablehnungsgrund(videoTitel, namen))
}

export function neueAblehnungen(): Ablehnungen {
  return Object.fromEntries(ABLEHNUNGEN.map((g) => [g, 0])) as Ablehnungen
}

/** Eine Zeile für das Lauflog: nur Gründe mit Treffern. */
export function ablehnungenText(a: Ablehnungen): string {
  return ABLEHNUNGEN.filter((g) => a[g]).map((g) => `${a[g]}× ${g}`).join(', ') || 'keine'
}

export interface Entfernt {
  id: string
  video: string
  titel: string
  grund: Ablehnung
}

/**
 * Wirft aus dem Bestand, was die Regel ablehnt; der Titel steht danach wieder zur Suche an, und die Wege 1–3 lehnen
 * dasselbe Video ab. Gibt jeden entfernten Eintrag zurück (der Lauf nennt sie im Protokoll).
 */
export function entferneAbgelehnte(
  bestand: Record<string, { video: string; titel: string }>,
  namenJe: (id: string) => string[],
  sperre: ReadonlySet<string>,
): Entfernt[] {
  const weg: Entfernt[] = []
  for (const [id, e] of Object.entries(bestand)) {
    const grund = macheAblehner(namenJe(id), sperre)(e.video, e.titel)
    if (!grund) continue
    weg.push({ id, video: e.video, titel: e.titel, grund })
    delete bestand[id]
  }
  return weg
}
