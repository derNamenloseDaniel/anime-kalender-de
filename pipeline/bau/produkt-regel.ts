import { ohneGeteilteFilme } from '../lib/tmdb-eindeutig.ts'
import { log, readJson } from '../lib/util.ts'
import { ladeBewertungen } from '../lib/anisearch-bewertung.ts'
import { type AnilistWertung, ladeAnilistWertungen } from '../lib/anilist-wertung.ts'
import { BANNER_DATEI, bannerAdresse, type TmdbBanner } from '../lib/tmdb-banner.ts'
import { mitHandvorrang } from '../lib/tmdb-von-hand.ts'
import type { Title } from '../../shared/types.ts'
import { anisearchKennungen } from './anisearch-kennung.ts'
import { geteilteSerien, serienbildFremd, type SerienFolgen, type SerienZuordnung } from './banner-serienbild.ts'

/**
 * **Woher Bewertung, Schlagworte und Banner kommen** (Daniel, 11.10.2026): Bewertung (Klarwert) und Schlagworte aus der aniSearch-Seite
 * (`lib/anisearch-bewertung.ts`, Schlagworte nur aus der festen Liste), Banner von TMDB (`data/tmdb-banner.json`). Nichts davon kommt noch von AniList.
 */
type Bewertung = Pick<Title, 'score' | 'scoreQuelle'>

let tmdbBanner: TmdbBanner | undefined
const banner = (): TmdbBanner => (tmdbBanner ??= ohneGeteilteFilme(readJson<TmdbBanner>(BANNER_DATEI, {}), 'Banner'))

let serien: { zuordnung: SerienZuordnung; folgen: SerienFolgen; geteilt: Set<number> } | undefined
/** Dieselben Dateien für den Wächter `check-anilist-produkt.ts` (`--bestand`) wie für den Bau. */
export function serienDaten(): NonNullable<typeof serien> {
  if (serien) return serien
  const zuordnung = mitHandvorrang(readJson<Record<string, { tmdbId?: number; kind?: string }>>('data/tmdb-titles.json', {}))
  return (serien = { zuordnung, folgen: readJson<SerienFolgen>('data/tmdb-folgen.json', {}), geteilt: geteilteSerien(zuordnung) })
}

/** Unter dieser Stimmenzahl zeigt der Titel keine Bewertung: ein Durchschnitt aus 1–4 Stimmen ist kein Beleg (Dirigent, 11.10.2026). */
export const MIN_STIMMEN_BEWERTUNG = 5

/** Bewertung eines Titels: der aniSearch-Klarwert ab `MIN_STIMMEN_BEWERTUNG` Stimmen, sonst AniLists Wertung (gekennzeichnet `anilist`), sonst keine. Eine TMDB-Wertung (Cartoons) bleibt. */
export function bewertungNachRegel(bisher: Bewertung, anisearchId: number | undefined, anilist?: AnilistWertung): Bewertung {
  if (bisher.scoreQuelle === 'tmdb') return bisher
  const seite = anisearchId === undefined ? undefined : ladeBewertungen().get(anisearchId)
  if (seite?.klarwert && seite.stimmen >= MIN_STIMMEN_BEWERTUNG) return { score: seite.klarwert }
  return anilist ? { score: anilist.score, scoreQuelle: 'anilist' } : {}
}

/** Schlagworte eines Titels: die erlaubten aniSearch-Tags seiner Seite. */
export function schlagworteNachRegel(anisearchId: number | undefined): string[] {
  return anisearchId === undefined ? [] : (ladeBewertungen().get(anisearchId)?.schlagworte ?? [])
}

/**
 * Bannerbild eines Titels: das TMDB-Hintergrundbild. ÜBERGANG: Wo TMDB keins hat (Lückenliste `daniel-zum-abarbeiten/listen/luecken/banner.md`),
 * bleibt vorerst das AniList-Banner — diese Zeile entfällt, sobald für die Lücken ein Ersatz gefunden ist.
 * Umfasst die TMDB-Serie mehr als den Titel (`serienbildFremd`), geht das eigene AniList-Banner vor: Es gehört zu genau diesem Teil.
 */
export type BannerArt = 'tmdb' | 'anilist-luecke' | 'wechsel' | 'fremd-bleibt'

/** Das Banner und warum: `wechsel` = AniList statt fremdem Serienbild, `fremd-bleibt` = fremdes Serienbild, weil AniList keins hat (Rest-Falschangabe, der Bau zählt sie). */
export function bannerEntscheidung(id: number, anilistBanner: string | undefined, episodes?: number): { bild: string | undefined; art: BannerArt } {
  const tmdb = banner()[String(id)]?.p
  if (!tmdb) return { bild: anilistBanner, art: 'anilist-luecke' }
  const { zuordnung, folgen, geteilt } = serienDaten()
  if (!serienbildFremd({ id, episodes }, zuordnung, folgen, geteilt)) return { bild: bannerAdresse(tmdb), art: 'tmdb' }
  return anilistBanner ? { bild: anilistBanner, art: 'wechsel' } : { bild: bannerAdresse(tmdb), art: 'fremd-bleibt' }
}

export const bannerNachRegel = (id: number, anilistBanner: string | undefined, episodes?: number): string | undefined => bannerEntscheidung(id, anilistBanner, episodes).bild

/** Bewertung, Schlagworte und Banner nach der Regel; auch für die Kopien in `verschoben`, die vor `setzeProduktFelder` entstanden. */
export function mitProduktFeldern<T extends Title>(t: T, anisearchId: number | undefined): T {
  const { score, scoreQuelle } = bewertungNachRegel(t, anisearchId, ladeAnilistWertungen().get(t.id))
  return {
    ...t,
    score,
    scoreQuelle,
    keywords: schlagworteNachRegel(anisearchId),
    bannerImage: bannerNachRegel(t.id, t.bannerImage, t.episodes),
  }
}

/**
 * Setzt Bewertung, Schlagworte und Banner jedes Titels nach der Regel. Läuft vor `baueMeta`, damit Hauptbestand, Verschobene, Reihen
 * und Meldungen dasselbe sehen.
 */
export function setzeProduktFelder(titles: Map<number, Title>): void {
  const kennungen = anisearchKennungen([...titles.values()].map((t) => ({ id: t.id, mal: t.malId })))
  let ohneKennung = 0
  const bannerArten: Record<BannerArt, number> = { tmdb: 0, 'anilist-luecke': 0, wechsel: 0, 'fremd-bleibt': 0 }
  for (const t of titles.values()) {
    const asId = kennungen.get(t.id)
    if (asId === undefined) ohneKennung++
    bannerArten[bannerEntscheidung(t.id, t.bannerImage, t.episodes).art]++
    Object.assign(t, mitProduktFeldern(t, asId))
  }
  const mitBewertung = [...titles.values()].filter((t) => t.score !== undefined).length
  const ausAnilist = [...titles.values()].filter((t) => t.scoreQuelle === 'anilist').length
  log(`Bewertung, Schlagworte und Banner nach Regel: ${mitBewertung} von ${titles.size} Titeln mit Bewertung (davon ${ausAnilist} Rückfall AniList), ${ohneKennung} ohne aniSearch-Kennung`)
  log(`Banner: ${bannerArten.wechsel} Titel wechseln vom Serienbild einer anderen Staffel auf ihr AniList-Banner, ${bannerArten['fremd-bleibt']} behalten es mangels AniList-Banner (${bannerArten.tmdb} eigenes TMDB-Bild, ${bannerArten['anilist-luecke']} AniList ohne TMDB)`)
}
