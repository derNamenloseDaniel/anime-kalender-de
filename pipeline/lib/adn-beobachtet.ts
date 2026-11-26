import type { AdnEpisode } from './adn.ts'

/**
 * Die belegten Tage der Folgen eines Wochen-Abschnitts, wenn der Wochenraster sie nicht trägt.
 *
 * ADN stellt zum Start oft mehrere Folgen zugleich ein (Dorohedoro Staffel 2: Folge 13–15 am 01.04.).
 * Der Raster legt dann eine Folge je Woche, die Reihe endet mit 11 Folgen am 27.05. nach nur 9 Terminen.
 * Gibt es keinen solchen Tag, bleibt der Raster zuständig (`undefined`).
 */
export function beobachteteFolgen(folgen: AdnEpisode[]): Record<number, string> | undefined {
  const frueh = new Map<number, string>()
  for (const e of folgen) {
    const k = e.episode ?? Number.NaN
    if (Number.isNaN(k)) return undefined
    const bisher = frueh.get(k)
    if (!bisher || e.date < bisher) frueh.set(k, e.date)
  }
  const tage = [...frueh.entries()].sort((a, b) => a[0] - b[0]).map(([, d]) => d)
  if (new Set(tage).size === tage.length) return undefined
  return Object.fromEntries(tage.map((d, i) => [i + 1, d]))
}
