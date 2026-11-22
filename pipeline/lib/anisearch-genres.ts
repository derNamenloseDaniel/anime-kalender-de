/**
 * aniSearch-Hauptgenre (`g` in `data/anisearch-eintraege.json`, API `genres.main`) → unsere Genre-Namen (die AniList-Schlüssel aus `GENRE_DE`,
 * `shared/mappings.ts`). Nur für die reinen aniSearch-Zeilen, die sonst ohne Genre blieben (Lösungskarte 21.11.2026, Mängelart genre).
 * Nicht aufgeführt und deshalb gezählt statt übernommen: „Unbestimmt“ (aniSearch legt sich nicht fest) und „Ganbatte“ (kein Gegenstück).
 */
export const ANISEARCH_GENRE: Record<string, string[]> = {
  Abenteuer: ['Adventure'],
  Abenteuerkomödie: ['Adventure', 'Comedy'],
  Action: ['Action'],
  Actiondrama: ['Action', 'Drama'],
  Actionkomödie: ['Action', 'Comedy'],
  Alltagsdrama: ['Slice of Life', 'Drama'],
  Alltagskomödie: ['Slice of Life', 'Comedy'],
  Drama: ['Drama'],
  'Fighting-Shounen': ['Action', 'Shounen'],
  Geistergeschichten: ['Supernatural'],
  Horror: ['Horror'],
  Komödie: ['Comedy'],
  Krimi: ['Crime'],
  Mysterythriller: ['Mystery', 'Thriller'],
  'Nonsense-Komödie': ['Comedy'],
  Politdrama: ['Drama', 'Politics'],
  'Romantische Komödie': ['Romance', 'Comedy'],
  Romanze: ['Romance'],
  'Sentimentales Drama': ['Drama'],
}

/** Genres zu den aniSearch-Genres, ohne Doppelte; jedes nicht zuordenbare wird in `luecken` gezählt (Name → Anzahl). */
export function genresAusAnisearch(g: string[] | undefined, luecken: Map<string, number>): string[] {
  const genres = new Set<string>()
  for (const name of g ?? []) {
    const ziel = ANISEARCH_GENRE[name]
    if (!ziel) luecken.set(name, (luecken.get(name) ?? 0) + 1)
    for (const z of ziel ?? []) genres.add(z)
  }
  return [...genres]
}

/** Baulog-Teil: nicht zuordenbare aniSearch-Genres mit Anzahl, häufigste zuerst. */
export const genreLueckenText = (luecken: Map<string, number>): string =>
  luecken.size ? `aniSearch-Genre ohne Zuordnung: ${[...luecken].sort((a, b) => b[1] - a[1]).map(([g, n]) => `${g} ×${n}`).join(', ')}` : 'jedes aniSearch-Genre zugeordnet'
