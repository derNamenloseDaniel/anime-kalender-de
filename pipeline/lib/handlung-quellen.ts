import { brichAbBeiWiderspruch } from './bau-widerspruch.ts'

/** Wächter für „Quelle:" unter der Handlung (24.11.2026, The Mighty Nein): jede deutsche Handlung trägt Anbieter und Adresse des Titels, nie eine Startseite. */
type Quelle = { name: string; url: string }
type SynopseEintrag = { de?: string; deSource?: Quelle }

const HOST_JE_NAME: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^anisearch\.de$/, () => 'www.anisearch.de'],
  [/^themoviedb\.org$/, () => 'www.themoviedb.org'],
  [/^Wikipedia \((\w+)\)$/, (m) => `${m[1]!.toLowerCase()}.wikipedia.org`],
]

function quellenFehler(kennung: string, q: Quelle | undefined): string | undefined {
  if (!q) return `${kennung}: deutsche Handlung ohne Quelle`
  let u: URL
  try {
    u = new URL(q.url)
  } catch {
    return `${kennung}: Quelle "${q.url}" ist keine Adresse`
  }
  if (u.pathname.replace(/\/+$/, '') === '') return `${kennung}: Quelle ${q.name} verweist auf die Startseite ${q.url}, nicht auf den Titel`
  for (const [muster, host] of HOST_JE_NAME) {
    const m = q.name.match(muster)
    if (m && u.host !== host(m)) return `${kennung}: Quelle "${q.name}" passt nicht zur Adresse ${q.url}`
  }
  return undefined
}

/** Synopsen (Kennung → Eintrag) und Cartoons (tragen ihre Handlung im Titel, Quelle ist TMDB über `tmdbId`). */
export function handlungQuellenFehler(synopsen: Record<string, SynopseEintrag>, cartoons: { id: number; tmdbId?: number; synopsis?: string }[]): string[] {
  const fehler: string[] = []
  for (const [id, s] of Object.entries(synopsen)) {
    if (!s.de) continue
    const f = quellenFehler(`Handlung ${id}`, s.deSource)
    if (f) fehler.push(f)
  }
  for (const c of cartoons) if (c.synopsis && !c.tmdbId) fehler.push(`Cartoon ${c.id}: Handlung ohne tmdbId, die Quelle ließe sich nicht verlinken`)
  return fehler
}

/** Alle ausgelieferten Cartoons: `cartoons.json` und die Cartoons (negative Kennung) im Kern `titles-core.json`, je Kennung einmal; der Kern gewinnt, er ist, was der Kalender zeigt. */
export function ausgelieferteCartoons<T extends { id: number }>(cartoons: T[], kern: T[]): T[] {
  const nachId = new Map(cartoons.map((c) => [c.id, c]))
  for (const t of kern) if (t.id < 0) nachId.set(t.id, t)
  return [...nachId.values()]
}

/** Der Bau-Riegel: bricht ab, wenn eine Handlung ohne titelgenaue Quelle ausgeliefert würde. */
export function riegelHandlungQuellen(synopsen: Record<string, SynopseEintrag>, cartoons: { id: number; tmdbId?: number; synopsis?: string }[]): void {
  brichAbBeiWiderspruch(handlungQuellenFehler(synopsen, cartoons), 'Handlungen ohne titelgenaue Quelle — nichts geschrieben.')
}
