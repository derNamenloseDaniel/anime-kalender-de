/**
 * **Eine JustWatch-Kennung gehört einer TMDB-Reihe** (04.11.2026, Anlass: „Fancy Nancy: Fancy It Yourself“ (TMDB 112652, 20 Folgen)
 * bekam im Tiefendurchlauf dieselbe `jwId` wie „Fancy Nancy Clancy“ (80056, 123 Folgen) — Disney-Seite an zwei Reihen, der
 * Bestandsbau stand rot). Zwölf solche Paare standen im Bestand (Spin-offs und Ableger auf der Hauptserie).
 */
export interface JwKennungBefund {
  jwId?: string
  tmdbId?: number
  ohneTreffer?: boolean
}

/** Schlüssel eines anderen Eintrags, der `jwId` schon mit einer anderen TMDB-Kennung hält. */
export function fremderHalter(bestand: Record<string, JwKennungBefund>, eigener: string, jwId: string, tmdbId: number | undefined): string | undefined {
  return Object.entries(bestand).find(([k, b]) => k !== eigener && !b.ohneTreffer && b.jwId === jwId && b.tmdbId !== tmdbId)?.[0]
}

/** Alle `jwId`, die an Einträgen mit verschiedenen TMDB-Kennungen hängen, samt den Schlüsseln. */
export function geteilteJwKennungen(bestand: Record<string, JwKennungBefund>): Map<string, string[]> {
  const jeKennung = new Map<string, Map<number | undefined, string[]>>()
  for (const [k, b] of Object.entries(bestand)) {
    if (b.ohneTreffer || !b.jwId) continue
    const m = jeKennung.get(b.jwId) ?? new Map<number | undefined, string[]>()
    m.set(b.tmdbId, [...(m.get(b.tmdbId) ?? []), k])
    jeKennung.set(b.jwId, m)
  }
  const aus = new Map<string, string[]>()
  for (const [jw, m] of jeKennung) if (m.size > 1) aus.set(jw, [...m.values()].flat())
  return aus
}

/** Die Annahme-Entscheidung des Sammlers: `halter` gesetzt = abgewiesen, die Kennung gehört schon einer anderen TMDB-Reihe. */
export function nimmTreffer<T extends { id: string }>(
  bestand: Record<string, JwKennungBefund>,
  schluessel: string,
  gefunden: T | undefined,
  erwartet: number | string | undefined,
): { treffer?: T; halter?: string } {
  if (!gefunden) return {}
  const halter = fremderHalter(bestand, schluessel, gefunden.id, Number(erwartet))
  return halter === undefined ? { treffer: gefunden } : { halter }
}

/**
 * Ein Film, dessen Erscheinungsjahr bei JustWatch um mehr als eins von unserem abweicht, ist ein anderer Film: JustWatch verknüpft
 * TMDB-Kennungen auch falsch (23.11.2026: 1310387 = „Yotsuba Succession Arc“ (2026) hängt dort an der Seite des Films von 2017, samt
 * deutschem Amazon-Ton). Serien bleiben ausgenommen, ihr JustWatch-Jahr ist nicht immer der Start.
 */
export function jahrFremd(
  titel: { format?: string; jpYear?: number; deErstausgabe?: { von?: string } },
  knoten: { content: { originalReleaseYear?: number | null } },
): boolean {
  const jahr = knoten.content.originalReleaseYear
  const unsere = [titel.jpYear, Number(titel.deErstausgabe?.von?.slice(0, 4))].filter((j): j is number => Number.isFinite(j) && Number(j) > 0)
  return titel.format === 'MOVIE' && typeof jahr === 'number' && unsere.length > 0 && unsere.every((j) => Math.abs(j - jahr) > 1)
}

/** Die Logzeile für abgewiesene Treffer: sonst bliebe der richtige Titel still `ohneTreffer`, wenn zuerst der falsche Halter gespeichert wurde. */
export function abweisungsZeile(namen: string[]): string {
  return `⚠ WARNUNG JustWatch: ${namen.length} Treffer abgewiesen, die Kennung gehört schon einer anderen TMDB-Reihe: ${namen.join('; ')}`
}
