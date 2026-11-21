import type { Title } from '../../shared/types.ts'

/** Was die Regel aus einem Eintrag in `data/tmdb-poster.json` liest (`PlakatEintrag`; eigener Typ, damit der Bau den Abrufcode nicht importiert). */
export type PlakatWahl = { p: string; l: string | null; inhaltAm?: string }

/**
 * Ab diesem Abruftag (`inhaltAm`) wählt der Plakat-Lauf ein japanisches Plakat erst nach dem textlosen (`tmdb-plakat.ts`). Ein japanisches
 * Plakat von da an ist das einzige Hochformat bei TMDB; eines von vorher kann noch einer lesbaren Fassung weichen.
 */
export const SPRACHFOLGE_AB = '2026-11-22'

/** Bestandseintrag eines Bildes: `undefined` = nie gesucht, `null` = TMDB hat keins. */
export type BildLookup<T> = (id: number) => T | null | undefined

/** Ein Bildbestand wie der Bau ihn liest: was `gilt` gegenüber `roh` verwirft (geteilter Film), hat für den Titel kein Bild (`null`). */
export function alsLookup<T>(roh: Record<string, T | null>, gilt: Record<string, T | null>): BildLookup<T> {
  return (id) => (String(id) in roh && !(String(id) in gilt) ? null : gilt[String(id)])
}

/** Grund, warum ein Bild mit fremder Schrift zu Recht steht. */
export const KEINE_LESBARE = 'keine-lesbare-fassung'

/**
 * Die Bilder eines Titels mit japanischer Schrift oder als AniList-Key-Visual: je Bild, ob es nachweislich keine lesbare TMDB-Fassung gibt.
 * Leer = kein solches Bild. Gemessen wird nur, was belegt ist: die Sprache des gewählten TMDB-Plakats und die Herkunft AniList.
 */
export function fremdeBilder(t: Title, plakat: BildLookup<PlakatWahl>, banner: BildLookup<{ p: string }>): boolean[] {
  const aus: boolean[] = []
  const cover = t.coverImage ?? ''
  const p = plakat(t.id)
  if (cover.includes('image.tmdb.org') && p && cover.endsWith(p.p) && p.l === 'ja') aus.push((p.inhaltAm ?? '') >= SPRACHFOLGE_AB)
  if (cover.includes('anilist.co')) aus.push(p === null)
  if (t.bannerImage?.includes('anilist.co')) aus.push(banner(t.id) === null)
  return aus
}
