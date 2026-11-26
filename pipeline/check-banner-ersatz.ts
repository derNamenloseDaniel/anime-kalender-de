/**
 * AniList-Banner durch das TMDB-Banner der Reihe ersetzen (`bau/banner-franchise.ts`, `ersetzeAnilistBanner`): nur eigene TMDB-Banner spenden,
 * ohne Spender bleibt das AniList-Banner, keine Ketten. Aufruf: `npx tsx pipeline/check-banner-ersatz.ts` (`check:logic`).
 */
import * as franchise from './bau/banner-franchise.ts'
import { schliesseWegeAb } from './bau/11-wege-abschluss.ts'
import { suchadressenInTemp } from './lib/suchadressen-temp.ts'
import { fremdeBilder } from './lib/bild-sprache.ts'
import type { Title } from '../shared/types.ts'

let fehler = 0
function pruefe(name: string, bedingung: boolean, gefunden?: unknown): void {
  if (bedingung) return console.log(`  ✓ ${name}`)
  fehler++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — ${JSON.stringify(gefunden)}`}`)
}

const AL = 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/x.jpg'
const TM = 'https://image.tmdb.org/t/p/w1280/serie.jpg'
const titel = (id: number, o: Partial<Title> = {}): Title => ({ id, format: 'TV', jpYear: 2010, franchiseId: 1, streams: [], watchLinks: [], keywords: [], genres: [], ...o }) as unknown as Title
const karte = (...t: Title[]): Map<number, Title> => new Map(t.map((x) => [x.id, x]))

const kopf = titel(1, { franchiseId: undefined, bannerImage: TM, jpYear: 2000 })
const staffel = titel(2, { bannerImage: AL, jpYear: 2012 })
const film = titel(3, { format: 'MOVIE', bannerImage: AL })
const geliehen = titel(4, { bannerImage: AL, bannerVon: 3 })
const allein = titel(5, { franchiseId: 5, bannerImage: AL })
const eigenTmdb = titel(6, { franchiseId: 6, bannerImage: 'https://image.tmdb.org/t/p/w1280/eigen.jpg' })
const ohneBanner = titel(7)
const m = karte(kopf, staffel, film, geliehen, allein, eigenTmdb, ohneBanner)
const ids = franchise.ersetzeAnilistBanner(m)
pruefe('AniList-Banner wird durch das TMDB-Banner der Reihe ersetzt, Spender gekennzeichnet', staffel.bannerImage === TM && staffel.bannerVon === 1, staffel)
pruefe('Film mit AniList-Banner nimmt das Serienbanner (kein Teil mit gleichem Format)', film.bannerImage === TM && film.bannerVon === 1, film)
pruefe('bei einem übernommenen AniList-Banner gilt dasselbe', geliehen.bannerImage === TM && geliehen.bannerVon === 1, geliehen)
pruefe('allein in der Reihe: AniList-Banner bleibt', allein.bannerImage === AL && allein.bannerVon === undefined, allein)
pruefe('eigenes TMDB-Banner bleibt, Titel ohne Banner bleibt ohne', eigenTmdb.bannerVon === undefined && ohneBanner.bannerImage === undefined)
pruefe('Spender behält sein Banner ohne Kennzeichnung', kopf.bannerImage === TM && kopf.bannerVon === undefined)
pruefe('Rückgabe: genau die Ersetzten', ids.join() === '2,3,4', ids)
pruefe('Mangel bild-fremdsprachig: ersetztes Banner zählt nicht mehr', fremdeBilder(staffel, () => undefined, () => undefined).length === 0)

// Mehrere Spender in der Reihe: der nächstliegende nach Jahr gilt, auch wenn er vor dem letzten steht.
{
  const [a, b] = [titel(81, { franchiseId: 8, jpYear: 2000, bannerImage: TM }), titel(82, { franchiseId: 8, jpYear: 2015, bannerImage: TM })]
  const c = titel(83, { franchiseId: 8, jpYear: 2001, bannerImage: AL })
  franchise.ersetzeAnilistBanner(karte(a, b, c))
  pruefe('zwei Spender: der nächstliegende nach Jahr', c.bannerVon === 81, c)
}

// Eigenes TMDB-Banner in einer Reihe mit Spender: bleibt, wird nicht durch das eines anderen Teils ersetzt.
{
  const eigen = 'https://image.tmdb.org/t/p/w1280/eigen-reihe.jpg'
  const [a, b] = [titel(101, { franchiseId: 10, jpYear: 2000, bannerImage: TM }), titel(102, { franchiseId: 10, jpYear: 2010, bannerImage: eigen })]
  franchise.ersetzeAnilistBanner(karte(a, b))
  pruefe('eigenes TMDB-Banner neben einem Spender bleibt', b.bannerImage === eigen && b.bannerVon === undefined, b)
}

// Keine Ketten: ein übernommenes TMDB-Banner spendet nicht, auch wenn sein Titel jahresnäher liegt.
{
  const a = titel(111, { franchiseId: 11, jpYear: 2000, bannerImage: TM })
  const b = titel(112, { franchiseId: 11, jpYear: 2014, bannerImage: TM, bannerVon: 111 })
  const c = titel(113, { franchiseId: 11, jpYear: 2015, bannerImage: AL })
  franchise.ersetzeAnilistBanner(karte(a, b, c))
  pruefe('übernommenes TMDB-Banner ist kein Spender', c.bannerVon === 111, c)
}

// Verdrahtung: der Wege-Abschluss ruft den Ersatz auf (Vorbild `check-banner-franchise.ts`).
{
  suchadressenInTemp()
  const spender = titel(9000070, { franchiseId: 9000070, bannerImage: TM })
  const al = titel(9000071, { franchiseId: 9000070, bannerImage: AL })
  schliesseWegeAb({
    titles: new Map([[spender.id, spender], [al.id, al]]),
    anisearch: {},
    releases: [],
    zugangJeAdresse: new Map(),
    tmdbMehrdeutig: new Set(),
    toteAdressen: new Set(),
    linkBefunde: {},
    verweiseEntfernt: [],
    crAdresseZu: () => undefined,
    beantworteteSuchen: new Set(),
    suchOffen: [],
    alleChecks: [],
    lautPruefungTot: () => false,
    checksJePlattform: new Map(),
    belegFuer: () => undefined,
  })
  pruefe('Wege-Abschluss: AniList-Banner ist durch das TMDB-Banner ersetzt', al.bannerImage === TM && al.bannerVon === spender.id, al)
}

if (fehler) {
  console.error(`${fehler} Prüfung(en) fehlgeschlagen`)
  process.exit(1)
}
console.log('Banner-Ersatz stimmt.')
