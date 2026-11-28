/** Welche Titel der Trailerlauf abfragt und wie er TMDBs Videoliste anspricht. */

/** Filme (Kinokanäle) und die Einstiege des Entdecken-Pools (`empfehlung.json`, Reihe → erster Teil). */
export function trailerKandidaten<T extends { id: number; format?: string }>(titel: T[], einstiege: ReadonlySet<number>): T[] {
  return titel.filter((t) => t.format === 'MOVIE' || einstiege.has(t.id))
}

/** `/videos` liefert ohne `include_video_language` nur die Sprache des Abrufs (englisch); de, en und ja müssen ausdrücklich verlangt werden. */
export function tmdbVideosUrl(basis: string, art: string, tmdbId: number, schluessel: string): string {
  const pfad = art === 'movie' ? 'movie' : 'tv'
  return `${basis}/${pfad}/${tmdbId}/videos?include_video_language=de,en,ja&api_key=${schluessel}`
}

/** Ein Eintrag aus TMDBs `/videos`. */
export interface TmdbVideo {
  key?: string
  name?: string
  site?: string
  type?: string
  iso_639_1?: string
  published_at?: string
}

/**
 * Ein `Trailer` oder `Teaser` auf YouTube, in der Reihenfolge `de`, `en`, `ja`, je Sprache der jüngste
 * (er zeigt den fertigen Film, nicht die erste Ankündigung). Nur hier ist die Sprache belegt statt geraten.
 */
export function waehleTmdbVideo(videos: TmdbVideo[]): { video: string; titel: string; sprache: 'de' | 'en' | 'ja' } | null {
  const brauchbar = videos.filter((v) => v.site === 'YouTube' && v.key && (v.type === 'Trailer' || v.type === 'Teaser'))
  for (const sprache of ['de', 'en', 'ja'] as const) {
    const fund = brauchbar
      .filter((v) => v.iso_639_1 === sprache)
      .sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''))[0]
    if (fund?.key) return { video: fund.key, titel: fund.name ?? '', sprache }
  }
  return null
}

/** Die TMDB-Art eines Eintrags: `kind` gilt, wenn es `movie` oder `tv` ist; sonst entscheidet das Format (Film → movie, alles andere → tv). */
export function tmdbArt(kind: string | undefined, format: string | undefined): 'movie' | 'tv' {
  if (kind === 'movie' || kind === 'tv') return kind
  return format === 'MOVIE' ? 'movie' : 'tv'
}
