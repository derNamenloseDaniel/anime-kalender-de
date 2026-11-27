import { log, readJson } from '../lib/util.ts'
import { mitHandvorrang } from '../lib/tmdb-von-hand.ts'
import { ANIMATION } from '../lib/tmdb-genre.ts'
import type { Title } from '../../shared/types.ts'

/**
 * TMDB-Genre → unsere Genre-Namen (die Schlüssel aus `GENRE_DE`, `shared/mappings.ts`). Nicht aufgeführt, weil es keinen Gegenwert gibt oder
 * nichts über die Handlung sagt: Animation (16), Family (10751), Kids (10762), History (36), Western (37), War (10752), Dokumentation (99), TV-Film (10770), Politik (10768).
 */
export const TMDB_GENRE: Record<number, string[]> = {
  12: ['Adventure'],
  14: ['Fantasy'],
  18: ['Drama'],
  27: ['Horror'],
  28: ['Action'],
  35: ['Comedy'],
  53: ['Thriller'],
  80: ['Crime'],
  878: ['Sci-Fi'],
  9648: ['Mystery'],
  10402: ['Music'],
  10749: ['Romance'],
  10759: ['Action', 'Adventure'],
  10765: ['Sci-Fi', 'Fantasy'],
}

/** Unsere Genres zu den TMDB-Genre-Kennungen, ohne Doppelte; nur Animation-Treffer (alles andere ist ein Realtitel gleichen Namens). */
export function genresAusTmdb(genreIds: number[] | undefined): string[] {
  if (!genreIds?.includes(ANIMATION)) return []
  return [...new Set(genreIds.flatMap((id) => TMDB_GENRE[id] ?? []))]
}

/**
 * **Titel ohne Genre aus AniList/aniSearch bekommen TMDBs Genres — als Rückfall gekennzeichnet (`genreQuelle: 'tmdb'`).**
 * TMDB ist grob (viele Titel tragen nur „Animation“); ein vorhandenes Genre bleibt unberührt, mehrdeutige Zuordnungen fallen weg.
 */
export function uebernehmeGenreAusTmdb({ titles, tmdbMehrdeutig, tmdb = mitHandvorrang(readJson<Record<string, { genreIds?: number[] }>>('data/tmdb-titles.json', {})) }: {
  titles: Map<number, Title>
  tmdbMehrdeutig: Set<string>
  tmdb?: Record<string, { genreIds?: number[] }>
}): void {
  let gesetzt = 0
  for (const title of titles.values()) {
    if (title.genres?.length || tmdbMehrdeutig.has(String(title.id))) continue
    const genres = genresAusTmdb(tmdb[String(title.id)]?.genreIds)
    if (!genres.length) continue
    title.genres = genres
    title.genreQuelle = 'tmdb'
    gesetzt++
  }
  const fehler = genreQuelleFehler(titles.values())
  if (fehler.length) throw new Error(`Genre aus TMDB widerspricht der Zusicherung:\n${fehler.slice(0, 10).join('\n')}`)
  log(`Genre aus TMDB: ${gesetzt} Titel ohne Genre ergänzt (Rückfall, gekennzeichnet)`)
}

/** Zusicherung: `genreQuelle: 'tmdb'` steht nur bei einem Titel mit Genre; ein Titel ohne Genre trägt sie nie. */
export function genreQuelleFehler(titles: Iterable<Title>): string[] {
  const fehler: string[] = []
  for (const t of titles) if (t.genreQuelle !== undefined && !t.genres?.length) fehler.push(`Titel ${t.id}: genreQuelle ${t.genreQuelle} ohne Genre`)
  return fehler
}
