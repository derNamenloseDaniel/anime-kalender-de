import { log } from '../lib/util.ts'
import type { Title } from '../../shared/types.ts'

/** Abstand in Jahren; ohne Jahr bei einem der beiden Titel gilt er als weit entfernt, der Titel bleibt aber Spender. */
const abstandJahre = (a: Title, b: Title): number => (a.jpYear && b.jpYear ? Math.abs(a.jpYear - b.jpYear) : Infinity)

/**
 * Der Teil derselben Reihe, dessen eigenes Banner ein Titel ohne Banner übernimmt: zuerst gleiches Format (TV zu TV, Film zu Film),
 * erst ohne solchen Teil ein anderes; darin der nächstliegende nach Erscheinungsjahr, bei Gleichstand die kleinere Kennung.
 */
export function waehleBannerSpender(t: Title, spender: Title[]): Title | undefined {
  const rang = (x: Title): [number, number, number] => [x.format === t.format ? 0 : 1, abstandJahre(t, x), x.id]
  const sortiert = [...spender].sort((a, b) => {
    const [ra, rb] = [rang(a), rang(b)]
    return ra[0] - rb[0] || ra[1] - rb[1] || ra[2] - rb[2]
  })
  return sortiert[0]
}

/**
 * Ein Titel ohne Banner übernimmt das eines anderen Teils seiner Reihe (`franchiseId`) und trägt `bannerVon` (Kennung des Spenders),
 * damit Oberfläche und `tools/maengel.mjs` das abgeleitete Bild vom eigenen unterscheiden. Spender ist nur, wer sein Banner selbst hat
 * (keine Ketten); Wer allein in der Reihe steht, bekommt nichts; der Reihenkopf (ohne `franchiseId`) zählt als Mitglied. Gibt die Kennungen der Empfänger zurück.
 */
export function uebernehmeFranchiseBanner(titles: Map<number, Title>): number[] {
  const eigene = new Map<number, Title[]>()
  for (const t of titles.values()) {
    if (!t.bannerImage) continue
    const reihe = t.franchiseId ?? t.id
    const teile = eigene.get(reihe) ?? []
    teile.push(t)
    eigene.set(reihe, teile)
  }
  const empfaenger: number[] = []
  for (const t of titles.values()) {
    if (t.bannerImage) continue
    const spender = waehleBannerSpender(t, (eigene.get(t.franchiseId ?? t.id) ?? []).filter((x) => x.id !== t.id))
    if (!spender) continue
    t.bannerImage = spender.bannerImage
    t.bannerVon = spender.id
    empfaenger.push(t.id)
  }
  log(`Banner aus der Reihe übernommen: ${empfaenger.length} Titel`)
  return empfaenger
}

const istAnilistBild = (url: string | undefined): boolean => Boolean(url?.includes('anilist.co'))

/**
 * Ein AniList-Banner (Key Visual, meist mit japanischer Schrift) weicht dem TMDB-Banner eines anderen Teils derselben Reihe (`bild-fremdsprachig`):
 * TMDB wählt textlos vor deutsch vor englisch (`lib/tmdb-banner.ts`), und 331 von 348 offenen Fällen hatten einen solchen Teil (Stand 26.11.2026).
 * Spender ist nur ein eigenes TMDB-Banner (keine Ketten); ohne Spender bleibt das AniList-Banner. Kennzeichnung wie bei `uebernehmeFranchiseBanner`.
 * Läuft danach, damit auch dort übernommene AniList-Banner ersetzt werden. Gibt die Kennungen der Ersetzten zurück.
 */
export function ersetzeAnilistBanner(titles: Map<number, Title>): number[] {
  const spender = new Map<number, Title[]>()
  for (const t of titles.values()) {
    if (!t.bannerImage?.includes('tmdb.org') || t.bannerVon !== undefined) continue
    const reihe = t.franchiseId ?? t.id
    spender.set(reihe, [...(spender.get(reihe) ?? []), t])
  }
  const ersetzt: number[] = []
  for (const t of titles.values()) {
    if (!istAnilistBild(t.bannerImage)) continue
    const wahl = waehleBannerSpender(t, (spender.get(t.franchiseId ?? t.id) ?? []).filter((x) => x.id !== t.id))
    if (!wahl) continue
    t.bannerImage = wahl.bannerImage
    t.bannerVon = wahl.id
    ersetzt.push(t.id)
  }
  log(`AniList-Banner durch das TMDB-Banner der Reihe ersetzt: ${ersetzt.length} Titel`)
  return ersetzt
}
