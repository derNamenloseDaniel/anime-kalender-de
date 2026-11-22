import type { AniListMedia } from './anilist.ts'
import { readJson } from './util.ts'

/** Unter dieser Stimmenzahl gilt AniLists Wertung nicht: gemessen am 22.11.2026 an den 50 offenen AniList-Titeln, 48 haben ≥ 10 Stimmen (≥ 20: 40); gleiche Schwelle wie TMDB bei Cartoons. */
export const MIN_STIMMEN_ANILIST = 10

export type AnilistWertung = { score: number; stimmen: number }

/** AniLists Wertung eines Eintrags: `averageScore`, sonst `meanScore`, ab `MIN_STIMMEN_ANILIST` Stimmen (Summe von `stats.scoreDistribution`); sonst keine. */
export function anilistWertungAus(m: Pick<AniListMedia, 'averageScore' | 'meanScore' | 'stats'>): AnilistWertung | undefined {
  const score = m.averageScore || m.meanScore
  const stimmen = (m.stats?.scoreDistribution ?? []).reduce((summe, stufe) => summe + stufe.amount, 0)
  return score && stimmen >= MIN_STIMMEN_ANILIST ? { score, stimmen } : undefined
}

let alle: Map<number, AnilistWertung> | undefined

/** Wertungen aller Zwischenspeicher-Einträge (nach AniList-Kennung), einmal je Prozess gelesen; nur Einträge, die gelten. */
export function ladeAnilistWertungen(): Map<number, AnilistWertung> {
  if (alle) return alle
  alle = new Map()
  for (const datei of ['data/cache/anilist-media.json', 'data/cache/anilist-by-id.json']) {
    for (const m of Object.values(readJson<Record<string, AniListMedia>>(datei, {}))) {
      const wertung = anilistWertungAus(m)
      if (wertung) alle.set(m.id, wertung)
    }
  }
  return alle
}
