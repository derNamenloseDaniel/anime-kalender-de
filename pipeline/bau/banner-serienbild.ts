import type { Title } from '../../shared/types.ts'

/** Zuordnung Titel → TMDB (`data/tmdb-titles.json`, mit Handvorrang). */
export type SerienZuordnung = Record<string, { tmdbId?: number; kind?: string } | null | undefined>
/** Folgen der TMDB-Serie je Titel (`data/tmdb-folgen.json`); Staffel 0 sind Specials. */
export type SerienFolgen = Record<string, { tmdbId?: number; folgen?: { s: number }[] } | undefined>

/** TMDB-Serien, auf die mehr als ein Titel zeigt: Deren Hintergrundbild kann höchstens zu einem davon gehören. */
export function geteilteSerien(zuordnung: SerienZuordnung): Set<number> {
  const zahl = new Map<number, number>()
  for (const z of Object.values(zuordnung)) if (z?.tmdbId && z.kind === 'tv') zahl.set(z.tmdbId, (zahl.get(z.tmdbId) ?? 0) + 1)
  return new Set([...zahl].filter(([, n]) => n > 1).map(([id]) => id))
}

/**
 * Zeigt das TMDB-Hintergrundbild womöglich einen anderen Teil als diesen Titel? TMDB führt Hintergrundbilder nur je Serie; umfasst die Serie
 * mehr als den Titel (ein weiterer Titel zeigt auf sie, oder sie hat mindestens zwei reguläre Staffeln mit mehr Folgen als der Titel),
 * gehört das Bild nicht belegt zu ihm (JoJo 2012 trug das Bild von Steel Ball Run, 27.11.2026).
 */
export function serienbildFremd(t: Pick<Title, 'id' | 'episodes'>, zuordnung: SerienZuordnung, folgen: SerienFolgen, geteilt: Set<number>): boolean {
  const z = zuordnung[String(t.id)]
  if (!z?.tmdbId || z.kind !== 'tv') return false
  if (geteilt.has(z.tmdbId)) return true
  const f = folgen[String(t.id)]
  const regulaer = f?.tmdbId === z.tmdbId ? (f.folgen ?? []).filter((x) => x.s > 0) : []
  return new Set(regulaer.map((x) => x.s)).size >= 2 && (t.episodes ?? 0) > 0 && t.episodes! < regulaer.length
}
