import type { Title } from '../../shared/types.ts'

/** Was die Regel aus einem Eintrag in `data/tmdb-poster.json` liest (`PlakatEintrag`; eigener Typ, damit der Bau den Abrufcode nicht importiert). */
export type PlakatWahl = { p: string; l: string | null; nurJa?: true }

/** Bestandseintrag eines Bildes: `undefined` = nie gesucht, `null` = TMDB hat keins. */
export type BildLookup<T> = (id: number) => T | null | undefined

/** Ein Bildbestand wie der Bau ihn liest: was `gilt` gegenüber `roh` verwirft (geteilter Film), hat für den Titel kein Bild (`null`). */
export function alsLookup<T>(roh: Record<string, T | null>, gilt: Record<string, T | null>): BildLookup<T> {
  return (id) => (String(id) in roh && !(String(id) in gilt) ? null : gilt[String(id)])
}

/**
 * Titel ohne TMDB-Serie (Suche ohne Treffer, `miss` ohne Kennung) haben nie einen Banner-Abruf (`holeBanner` fragt nur Titel mit Kennung):
 * „nie gesucht“ ist für sie falsch, TMDB hat kein Banner (`null`). Ein vorhandener Eintrag gewinnt.
 */
export function bannerOhneTmdbSerie<T>(banner: BildLookup<T>, ohneSerie: ReadonlySet<number>): BildLookup<T> {
  return (id) => {
    const eintrag = banner(id)
    return eintrag === undefined && ohneSerie.has(id) ? null : eintrag
  }
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
  if (cover.includes('image.tmdb.org') && p && cover.endsWith(p.p) && p.l === 'ja') aus.push(p.nurJa === true)
  if (cover.includes('anilist.co')) aus.push(p === null)
  // Ein übernommenes Banner (`bannerVon`) zählt beim Spender, nicht noch einmal beim Empfänger.
  if (t.bannerVon === undefined && t.bannerImage?.includes('anilist.co')) aus.push(banner(t.id) === null)
  return aus
}
