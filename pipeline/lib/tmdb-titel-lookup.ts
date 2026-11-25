/** Abruf eines Titels bei TMDB (Suche, Detail, Freigaben, Anbieter); `holen` und `pause` sind einspeisbar, damit ein Test ohne Netz läuft. */
import type { Fsk, PlatformId, Title } from '../../shared/types.ts'
import { fetchJson, sleep, warn } from './util.ts'
import { readOffers } from './tmdb.ts'
import { waehleBesten, type Bester, type SearchHit } from './tmdb-titel-treffer.ts'
import { kinostartsDe, type ReleaseDatesAntwort } from './tmdb-kino-zuletzt.ts'
import type { TmdbTitle } from '../fetch-tmdb-titles.ts'

const BASE = 'https://api.themoviedb.org/3'

const FSK_VALUES: Fsk[] = [0, 6, 12, 16, 18]

function parseFsk(raw: string | undefined): Fsk | undefined {
  if (!raw) return undefined
  const n = Number(raw.replace(/[^\d]/g, ''))
  return FSK_VALUES.includes(n as Fsk) ? (n as Fsk) : undefined
}

function providerToPlatform(name: string): PlatformId | undefined {
  const n = name.toLowerCase()
  if (n.includes('crunchyroll')) return 'crunchyroll'
  if (n.includes('netflix')) return 'netflix'
  if (n.includes('disney')) return 'disneyplus'
  if (n.includes('amazon') || n.includes('prime video')) return 'primevideo'
  if (n.includes('animation digital network') || n === 'adn') return 'adn'
  if (n.includes('wow')) return 'wow'
  if (n.includes('joyn')) return 'joyn'
  if (n.includes('rtl')) return 'rtlplus'
  if (n.includes('aniverse')) return 'aniverse'
  return undefined
}

/** Seit diesem Tag sucht `lookup` nach einem Fehlschlag auch den Film; ältere Fehlschläge solcher Titel wurden nie so gesucht. */
export const FILMSUCHE_SEIT = '2026-11-04'

/**
 * Ein einzelner Film von Netflix & Co. steht bei AniList als ONA, OVA oder Special mit einer Folge, bei TMDB aber als Film
 * (Bright: Samurai Soul, 04.11.2026: als Serie gesucht, nie gefunden). Die Serien-Suche bleibt zuerst; der Film kommt nur nach einem Fehlschlag.
 */
export function koennteFilmSein(title: Pick<Title, 'format' | 'episodes' | 'jpYear'>): boolean {
  return ['ONA', 'OVA', 'SPECIAL'].includes(title.format ?? '') && title.episodes === 1 && title.jpYear !== undefined
}

/**
 * Strenger als die Serien-Suche (0,75): Ohne Jahr prüft `waehleBesten` nichts, und ein Special mit Seriennamen (Tachikomatic Days, 0,86)
 * traf den Film der Hauptserie. Von 134 Treffern der Probe (04.11.2026) fallen 8 unter 0,9, einer davon war falsch.
 */
const FILM_MIN_AEHNLICHKEIT = 0.9

/** Bester Treffer über alle Schreibweisen für eine Art (`tv` oder `movie`). */
async function sucheBesten(
  apiKey: string,
  kind: 'tv' | 'movie',
  candidates: string[],
  jpYear: number | undefined,
  holen: typeof fetchJson,
  pause: (ms: number) => Promise<void>,
): Promise<Bester | undefined> {
  let best: Bester | undefined
  for (const query of candidates) {
    const url =
      `${BASE}/search/${kind}?api_key=${apiKey}&language=de-DE&include_adult=false` +
      `&query=${encodeURIComponent(query)}`
    let results: SearchHit[]
    try {
      results = (await holen<{ results: SearchHit[] }>(url)).results ?? []
    } catch (err) {
      warn(`Suche fehlgeschlagen für "${query}": ${(err as Error).message}`)
      continue
    }
    await pause(40)

    best = waehleBesten(best, query, results, jpYear)
  }
  return best
}

type Holen = typeof fetchJson
type Pause = (ms: number) => Promise<void>

interface DetailAntwort {
  overview?: string
  name?: string
  title?: string
  first_air_date?: string
  release_date?: string
  genres?: { id: number }[]
}

interface AnbieterAntwort {
  results: Record<
    string,
    {
      link?: string
      flatrate?: { provider_name: string }[]
      rent?: { provider_name: string }[]
      buy?: { provider_name: string }[]
    }
  >
}

/**
 * **Vier Schreibweisen statt zwei.**
 *
 * Am 28.08.2026 gemessen: 1.247 von 2.753 Titeln findet TMDB nicht, darunter
 * 392 Serien, für die wir einen Verweis führen. Gesucht wurde bis dahin nur
 * mit dem englischen und dem Romaji-Titel.
 *
 * TMDB führt zu jedem Eintrag auch `original_name` — bei Anime ist das der
 * **japanische** Titel, und den haben wir als `titleNative`. Der deutsche
 * Titel kommt dazu, weil TMDB deutsche Ausgaben unter ihrem hiesigen Namen
 * kennt („Die Rückkehr der Zauberer" findet man nicht als „Mahoutsukai").
 *
 * Die Reihenfolge bleibt: Was zuerst trifft, gewinnt, und Englisch ist die
 * Schreibweise, unter der TMDB Anime am ehesten führt.
 */
function schreibweisen(title: Title): string[] {
  return [title.titleEn, title.titleRomaji, title.titleDe, title.titleNative].filter(Boolean) as string[]
}

/** Serien-Suche zuerst; der Film kommt nur nach einem Fehlschlag und nur mit strengerer Ähnlichkeit. */
async function sucheTreffer(
  apiKey: string,
  title: Title,
  candidates: string[],
  holen: Holen,
  pause: Pause,
): Promise<{ best: Bester | undefined; kind: 'tv' | 'movie' }> {
  let kind: 'tv' | 'movie' = title.format === 'MOVIE' ? 'movie' : 'tv'
  let best = await sucheBesten(apiKey, kind, candidates, title.jpYear, holen, pause)
  if (!best && kind === 'tv' && koennteFilmSein(title)) {
    kind = 'movie'
    best = await sucheBesten(apiKey, kind, candidates, title.jpYear, holen, pause)
    if (best && best.score < FILM_MIN_AEHNLICHKEIT) best = undefined
  }
  return { best, kind }
}

/** Handlung, Genres, Jahr und deutscher Name; schreibt in `out`, damit ein späterer Fehler das Bisherige nicht verliert. */
async function leseDetail(out: TmdbTitle, apiKey: string, holen: Holen, pause: Pause): Promise<void> {
  const detail = await holen<DetailAntwort>(`${BASE}/${out.kind}/${out.tmdbId}?api_key=${apiKey}&language=de-DE`)
  // TMDB liefert bei fehlender Übersetzung ein leeres Feld statt Englisch.
  if (detail.overview && detail.overview.trim().length > 40) out.overviewDe = detail.overview.trim()
  /* Serien tragen `first_air_date`, Filme `release_date` — beide als Jahr. */
  out.genreIds = (detail.genres ?? []).map((g) => g.id)
  const datum = detail.first_air_date || detail.release_date
  const jahr = Number((datum ?? '').slice(0, 4))
  if (Number.isFinite(jahr) && jahr > 1900) out.jahr = jahr
  /*
    **Der deutsche Titel kommt aus derselben Antwort — er wurde nur nie gelesen.**

    194 Titel im Bestand haben keinen deutschen Namen; `titleDe` kommt bisher
    allein aus aniSearch. TMDB antwortet auf `language=de-DE` mit dem deutschen
    Namen, wenn es einen gibt, und sonst mit dem Originaltitel.

    Genau deshalb wird er hier nur mitgeschrieben, nicht gesetzt: Ob er sich
    vom Originaltitel unterscheidet, entscheidet der Bau — er kennt beide.
  */
  const nameDe = (detail.name ?? detail.title ?? "").trim()
  if (nameDe) out.nameDe = nameDe
  await pause(40)
}

/** FSK und bei Filmen die Kinostarts; Filme und Serien führen sie an verschiedenen Stellen. */
async function leseFreigabe(out: TmdbTitle, apiKey: string, holen: Holen, pause: Pause): Promise<void> {
  if (out.kind === 'movie') {
    const rel = await holen<ReleaseDatesAntwort>(`${BASE}/movie/${out.tmdbId}/release_dates?api_key=${apiKey}`)
    const de = rel.results?.find((r) => r.iso_3166_1 === 'DE')
    out.fsk = parseFsk(de?.release_dates?.find((r) => r.certification)?.certification)
    out.kinoDe = kinostartsDe(rel)
  } else {
    const ratings = await holen<{ results: { iso_3166_1: string; rating: string }[] }>(
      `${BASE}/tv/${out.tmdbId}/content_ratings?api_key=${apiKey}`,
    )
    out.fsk = parseFsk(ratings.results?.find((r) => r.iso_3166_1 === 'DE')?.rating)
  }
  await pause(40)
}

/** Deutsche Angebote und die daraus abgeleiteten Plattformen. */
async function leseAnbieter(out: TmdbTitle, apiKey: string, holen: Holen, pause: Pause): Promise<void> {
  const wp = await holen<AnbieterAntwort>(`${BASE}/${out.kind}/${out.tmdbId}/watch/providers?api_key=${apiKey}`)
  const de = wp.results?.DE
  if (de) {
    out.justwatchUrl = de.link
    // Die ganze Liste behalten, nicht nur die Dienste mit eigener Plattform.
    const offers = readOffers(de)
    if (offers.length) out.offers = offers
    const platforms = [
      ...new Set(offers.map((o) => providerToPlatform(o.name)).filter(Boolean)),
    ] as PlatformId[]
    if (platforms.length) out.providers = platforms
  }
  await pause(40)
}

export async function lookup(
  apiKey: string,
  title: Title,
  holen: Holen = fetchJson,
  pause: Pause = sleep,
): Promise<TmdbTitle> {
  const candidates = schreibweisen(title)
  if (!candidates.length) return { miss: true }

  const { best, kind } = await sucheTreffer(apiKey, title, candidates, holen, pause)
  if (!best) return { miss: true }

  const out: TmdbTitle = { tmdbId: best.hit.id, kind }
  try {
    await leseDetail(out, apiKey, holen, pause)
    await leseFreigabe(out, apiKey, holen, pause)
    await leseAnbieter(out, apiKey, holen, pause)
  } catch (err) {
    warn(`Details fehlgeschlagen für TMDB ${best.hit.id}: ${(err as Error).message}`)
  }
  return out
}
