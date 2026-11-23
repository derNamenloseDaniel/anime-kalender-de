/** Test der Regeltabelle des Mängel-Registers: je Regel Treffer, Ausnahme und Grenzfälle. Die Fortschreibung testet `check-maengel-register.ts`. */
import type { Release, Title } from '../shared/types.ts'
import { adresseMehrfach, REGELN, zaehleMaengel, type Kontext } from './lib/maengel-regeln.ts'
import { baueNeinGilt } from './lib/maengel-nein.ts'
import { alsLookup } from './lib/bild-sprache.ts'
import { franchiseTeile } from './lib/folgenzahl-erklaerung.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name} — gefunden: ${JSON.stringify(gefunden)}`)
}

const HEUTE = '2026-11-16'
/** Ein vollständiger Titel: keine Regel schlägt an. */
const gut = (id: number, ueber: Partial<Title> = {}): Title => ({
  id,
  titleDe: 'Gut',
  jpYear: 2020,
  coverImage: 'c',
  bannerImage: 'b',
  format: 'TV',
  episodes: 12,
  fsk: 12,
  score: 70,
  studios: ['S'],
  genres: ['G'],
  runtimeMin: 24,
  hasVoices: true,
  dubConfidence: 'high',
  jpEnd: '2020-12-01',
  streams: [{ platform: 'netflix', url: `u${id}`, dub: true }],
  watchLinks: [],
  ...ueber,
} as unknown as Title)
const zwoelfFolgen = () => ({ f: Array.from({ length: 12 }, (_, i) => [i + 1, `F${i + 1}`] as [number, string]) })
const kontext = (ueber: Partial<Kontext> = {}): Kontext => ({
  heute: HEUTE,
  coverBekannt: {},
  synopse: () => ({ de: 'Text' }),
  folgen: zwoelfFolgen,
  kuenftig: new Set(),
  releases: new Map(),
  discTitel: new Set(),
  adresseMehrfach: new Map(),
  staffelZuordnung: new Map(),
  tvOhneFolge: new Set(),
  franchiseTeile: () => [],
  neinGilt: () => false,
  plakat: () => undefined,
  banner: () => undefined,
  ...ueber,
})
const arten = (t: Title, k = kontext()) => zaehleMaengel([t], k).map((x) => (x.grund ? `${x.art}:${x.grund}` : x.art))
const rel = (ueber: Partial<Release>): Release => ({ titleId: 1, platform: 'netflix', releaseType: 'batch', sources: [{ url: 'https://q' }], schedule: { firstEpisodeDate: '2026-01-01', episodeCount: 12 }, ...ueber } as unknown as Release)
const mitReleases = (...r: Release[]) => kontext({ releases: new Map([[1, r]]) })
const ohneFolgen = kontext({ folgen: () => undefined })

pruefe('vollständiger Titel: keine Regel schlägt an', arten(gut(1)).length === 0, arten(gut(1)))
pruefe('Tabelle: jede Art einmal, jede mit Wirkung 1–3 und wer', new Set(REGELN.map((r) => r.art)).size === REGELN.length && REGELN.every((r) => r.wirkung >= 1 && r.wirkung <= 3 && r.wer), REGELN.map((r) => r.art))

pruefe('cover: Treffer', arten(gut(1, { coverImage: undefined })).join() === 'cover')
pruefe('cover: auf der Handliste cover-ohne-bekannt ist Ausnahme', arten(gut(1, { coverImage: undefined }), kontext({ coverBekannt: { 1: 'TMDB führt ihn nicht' } })).join() === 'cover:ohne-bekanntes-cover')
pruefe('cover: anderer Titel auf der Handliste ändert nichts', arten(gut(1, { coverImage: undefined }), kontext({ coverBekannt: { 2: 'x' } })).join() === 'cover')
pruefe('banner: Treffer', arten(gut(1, { bannerImage: undefined })).join() === 'banner')
/* banner: Ausnahme nur, wenn TMDB keins führt (null) und kein Teil der Reihe eins hat */
const ohneBanner = gut(1, { bannerImage: undefined })
const teile = (...hat: boolean[]) => hat.map((hatBanner) => ({ format: 'TV', episodes: 12, hatBanner }))
const tmdbKeins = (ueber: Partial<Kontext> = {}) => kontext({ banner: (id) => (id === 1 ? null : undefined), ...ueber })
pruefe('banner: TMDB ohne Banner, allein in der Reihe: Ausnahme', arten(ohneBanner, tmdbKeins()).join() === 'banner:kein-banner-bekannt')
pruefe('banner: TMDB ohne Banner, Teile ohne Banner: Ausnahme', arten(ohneBanner, tmdbKeins({ franchiseTeile: () => teile(false, false) })).join() === 'banner:kein-banner-bekannt')
pruefe('banner: Teil mit Banner in der Reihe: offen', arten(ohneBanner, tmdbKeins({ franchiseTeile: (t) => (t.id === 1 ? teile(false, true, false) : []) })).join() === 'banner')
const reihe = franchiseTeile([gut(1, { bannerImage: undefined, franchiseId: 7 }), gut(2, { franchiseId: 7 }), gut(3, { bannerImage: undefined, franchiseId: 7 }), gut(4, { franchiseId: 8 })])
pruefe('franchiseTeile: hatBanner je Teil der Reihe, fremde Reihe getrennt', JSON.stringify((reihe.get(7) ?? []).map((x) => [x.id, x.hatBanner])) === '[[1,false],[2,true],[3,false]]' && JSON.stringify((reihe.get(8) ?? []).map((x) => [x.id, x.hatBanner])) === '[[4,true]]', [...reihe])
pruefe('banner: TMDB hat ein Banner: offen', arten(ohneBanner, tmdbKeins({ banner: () => ({ p: '/b.jpg' }) })).join() === 'banner')
pruefe('banner: nie gesucht (undefined): offen', arten(ohneBanner, kontext({ franchiseTeile: (t) => (t.id === 1 ? teile(false) : []) })).join() === 'banner')
pruefe('banner: TMDB-Eintrag eines anderen Titels ändert nichts', arten(ohneBanner, kontext({ banner: (id) => (id === 2 ? null : undefined) })).join() === 'banner')
/* bild-fremdsprachig: japanisches TMDB-Plakat oder AniList-Key-Visual (Daniel, 21.11.2026) */
const TMDB = 'https://image.tmdb.org/t/p/w500/x.jpg'
const ANILIST = 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx1.jpg'
const plakat = (l: string | null, nurJa?: true, p = '/x.jpg') => kontext({ plakat: () => ({ p, w: 1000, h: 1500, l, inhaltAm: '2026-12-01', ...(nurJa ? { nurJa } : {}) }) })
pruefe('bild-fremdsprachig: japanisches Plakat aus der alten Wahl ist offen', arten(gut(1, { coverImage: TMDB }), plakat('ja')).join() === 'bild-fremdsprachig')
pruefe('bild-fremdsprachig: japanisches Plakat mit Beleg „nur japanisch“ ist Ausnahme, ohne Beleg (auch mit neuem Abruftag) offen', arten(gut(1, { coverImage: TMDB }), plakat('ja', true)).join() === 'bild-fremdsprachig:keine-lesbare-fassung' && arten(gut(1, { coverImage: TMDB }), plakat('ja')).join() === 'bild-fremdsprachig')
pruefe('bild-fremdsprachig: deutsches, englisches und textloses Plakat zählen nicht', ['de', 'en', null].every((l) => arten(gut(1, { coverImage: TMDB }), plakat(l)).length === 0))
pruefe('bild-fremdsprachig: TMDB-Cover eines anderen Plakats (Schwestertitel) zählt nicht', arten(gut(1, { coverImage: TMDB }), plakat('ja', undefined, '/y.jpg')).length === 0)
pruefe('bild-fremdsprachig: AniList-Cover offen, solange TMDB nicht „kein Plakat“ sagt', arten(gut(1, { coverImage: ANILIST })).join() === 'bild-fremdsprachig' && arten(gut(1, { coverImage: ANILIST }), kontext({ plakat: () => null })).join() === 'bild-fremdsprachig:keine-lesbare-fassung')
pruefe('bild-fremdsprachig: AniList-Banner offen, solange TMDB nicht „kein Banner“ sagt', arten(gut(1, { bannerImage: ANILIST })).join() === 'bild-fremdsprachig' && arten(gut(1, { bannerImage: ANILIST }), kontext({ banner: () => null })).join() === 'bild-fremdsprachig:keine-lesbare-fassung')
const nachschlagen = alsLookup({ 1: { p: '/a.jpg' }, 2: null, 3: { p: '/geteilt.jpg' } }, { 1: { p: '/a.jpg' }, 2: null })
pruefe('bild-fremdsprachig: Bestand wie im Bau – Eintrag, null, geteilter Film wird null, nie gesucht bleibt undefined', nachschlagen(1)?.p === '/a.jpg' && nachschlagen(2) === null && nachschlagen(3) === null && nachschlagen(4) === undefined)
pruefe('bild-fremdsprachig: Ausnahme nur, wenn jedes Bild sie hat', arten(gut(1, { coverImage: ANILIST, bannerImage: ANILIST }), kontext({ plakat: () => null })).join() === 'bild-fremdsprachig' && arten(gut(1, { coverImage: ANILIST, bannerImage: ANILIST }), kontext({ plakat: () => null, banner: () => null })).join() === 'bild-fremdsprachig:keine-lesbare-fassung')
pruefe('titel-de: Treffer mit Weg', arten(gut(1, { titleDe: undefined })).join() === 'titel-de')
pruefe('titel-de: ohne Weg und Erstausgabe zu Recht leer', arten(gut(1, { titleDe: undefined, streams: [], watchLinks: [], deErstausgabe: undefined })).join() === 'titel-de:ohne-deutsche-fassung,kein-weg')
pruefe('handlung-de: Treffer', arten(gut(1), kontext({ synopse: () => ({ en: 'only' }) })).join() === 'handlung-de')
pruefe('folgentitel: Serie mit fehlenden Titeln', arten(gut(1), kontext({ folgen: () => ({ f: [[1, 'A'], [2, '']] }) })).join() === 'folgentitel')
pruefe('folgentitel: Liste voll lang, aber eine Folge ohne Titel', arten(gut(1), kontext({ folgen: () => ({ f: Array.from({ length: 12 }, (_, i) => [i + 1, i === 5 ? '' : 'T'] as [number, string]) }) })).join() === 'folgentitel')
pruefe('folgentitel: Film mit Folgen ist Ausnahme', arten(gut(1, { format: 'MOVIE' }), ohneFolgen).join() === 'folgentitel:film')
pruefe('folgentitel: Einzelwerk (1 Folge) zählt nicht', arten(gut(1, { episodes: 1 }), ohneFolgen).length === 0)
pruefe('folgenzahl: Treffer', arten(gut(1, { episodes: undefined, jpEnd: '2020-12-01' }), ohneFolgen).join() === 'folgenzahl')
pruefe('folgenzahl: läuft noch (kein Ende) ist Ausnahme, auch eine junge Serie', arten(gut(1, { episodes: undefined, jpEnd: undefined, jpYear: 2026 }), kontext({ folgen: () => undefined, kuenftig: new Set([1]) })).join() === 'folgenzahl:laeuft' && arten(gut(1, { episodes: undefined, jpEnd: undefined, jpYear: 1999 }), kontext({ folgen: () => undefined, kuenftig: new Set([1]) })).join() === 'folgenzahl:laeuft')
const fz = (ueber: Partial<Title>, k: Kontext) => arten(gut(1, { episodes: undefined, jpEnd: undefined, ...ueber }), k).filter((a) => a.startsWith('folgenzahl')).join()
pruefe('folgenzahl: altes Jahr, kein Ende, kein Termin ab heute (abgeschlossen, jpEnd fehlt) bleibt offen', fz({ jpYear: 1999 }, ohneFolgen) === 'folgenzahl', fz({ jpYear: 1999 }, ohneFolgen))
pruefe('folgenzahl: AniList-Status FINISHED ohne Ende ist offen, auch im laufenden Jahr', fz({ jpYear: 2026, jpStatus: 'FINISHED' }, ohneFolgen) === 'folgenzahl' && fz({ jpYear: 1999, jpStatus: 'FINISHED' }, kontext({ folgen: () => undefined, kuenftig: new Set([1]) })) === 'folgenzahl')
pruefe('folgenzahl: Gegenprobe laufend — RELEASING, Termin ab heute, Jahr dieses Jahres oder ohne Jahr bleiben Ausnahme', fz({ jpYear: 1999, jpStatus: 'RELEASING' }, ohneFolgen) === 'folgenzahl:laeuft' && fz({ jpYear: 1999 }, kontext({ folgen: () => undefined, kuenftig: new Set([1]) })) === 'folgenzahl:laeuft' && fz({ jpYear: 2026 }, ohneFolgen) === 'folgenzahl:laeuft' && fz({ jpYear: undefined }, ohneFolgen) === 'folgenzahl:laeuft')
pruefe('folgenzahl: CANCELLED ohne Ende ist offen, auch im laufenden Jahr', fz({ jpYear: 2026, jpStatus: 'CANCELLED' }, ohneFolgen) === 'folgenzahl')
const mitTv = (...r: Release[]) => kontext({ folgen: () => undefined, releases: new Map([[1, r]]) })
const tvStart = (ueber: Partial<Release['schedule']> = {}, art: Partial<Release> = {}) => rel({ platform: 'tv', releaseType: 'weekly', schedule: { firstEpisodeDate: '2026-09-19', episodeCount: 10, ...ueber }, ...art })
pruefe('folgenzahl: Beyblade-X-Form (Jahr 2023, kein Ende, kein künftiger Termin, TV-Wochentakt seit 2026-09-19 ohne Ende) und Pokémon-Form bleiben laufend', fz({ jpYear: 2023 }, mitTv(tvStart())) === 'folgenzahl:laeuft' && fz({ jpYear: 2023 }, mitTv(tvStart({ firstEpisodeDate: '2026-09-16' }))) === 'folgenzahl:laeuft' && fz({ jpYear: 2023 }, mitTv(tvStart({ firstEpisodeDate: HEUTE }))) === 'folgenzahl:laeuft')
pruefe('folgenzahl: Wochentakt mit belegtem Ende, Start erst morgen, Batch oder Disc statt Wochentakt: altes Jahr bleibt offen', fz({ jpYear: 2023 }, mitTv(tvStart({ lastEpisodeDate: '2026-11-01' }))) === 'folgenzahl' && fz({ jpYear: 2023 }, mitTv(tvStart({ firstEpisodeDate: '2026-11-17' }))) === 'folgenzahl' && fz({ jpYear: 2023 }, mitTv(tvStart({}, { releaseType: 'batch' }))) === 'folgenzahl' && fz({ jpYear: 2023 }, mitTv(tvStart({}, { releaseType: 'disc', platform: 'disc' }))) === 'folgenzahl')
pruefe('folgenzahl: Ende heute läuft noch, Ende gestern ist offen', arten(gut(1, { episodes: undefined, jpEnd: HEUTE }), ohneFolgen).includes('folgenzahl:laeuft') && arten(gut(1, { episodes: undefined, jpEnd: '2026-11-15' }), ohneFolgen).join() === 'folgenzahl')
pruefe('fsk: fehlt = Treffer', arten(gut(1, { fsk: undefined })).join() === 'fsk')
pruefe('fsk: 0 ist eine Einstufung, kein Mangel', arten(gut(1, { fsk: 0 as never })).length === 0)
pruefe('wertung: Treffer', arten(gut(1, { score: undefined })).join() === 'wertung')
pruefe('wertung: Titel ohne AniList-Kennung (eigener, nur-aniSearch) hat keine Quelle mit genug Stimmen — belegte Ausnahme, kein offener Mangel', arten(gut(5_000_001, { score: undefined })).join() === 'wertung:keine-quelle-mit-stimmen' && arten(gut(10_000_042, { score: undefined })).join() === 'wertung:keine-quelle-mit-stimmen')
pruefe('wertung: AniList-Titel ohne Wertung bleibt offen (Quelle vorhanden)', arten(gut(4_999_999, { score: undefined })).join() === 'wertung')
pruefe('studio: Treffer', arten(gut(1, { studios: [] })).join() === 'studio')
/* aniSearch-Zeile (Kennung ab 10 Mio.) wird aus einem Eintrag gebaut: leeres Studio heißt `st` des Eintrags leer. */
pruefe('studio: aniSearch-Zeile mit leerem st ist Ausnahme quelle-ohne-studio', [10_000_042, 10_000_043].every((id) => arten(gut(id, { studios: [] })).join() === 'studio:quelle-ohne-studio'))
pruefe('studio: Titel ohne aniSearch-Eintrag (Eigentitel, AniList) bleibt offen', [5_000_001, 4_999_999, 4_999_998].every((id) => arten(gut(id, { studios: [] })).join() === 'studio'))
pruefe('studio: Grenze — 10 Mio. ist die erste aniSearch-Kennung, 9.999.999 noch nicht; Gruppe bleibt fehlend', arten(gut(10_000_000, { studios: [] })).join() === 'studio:quelle-ohne-studio' && arten(gut(9_999_999, { studios: [] })).join() === 'studio' && REGELN.find((r) => r.art === 'studio')!.gruppe === 'fehlend')
pruefe('studio: aniSearch-Zeile mit Studio ist kein Mangel', arten(gut(10_000_042, { studios: ['X'] })).length === 0)
pruefe('genre: Treffer', arten(gut(1, { genres: [] })).join() === 'genre')
pruefe('laufzeit: Treffer', arten(gut(1, { runtimeMin: undefined })).join() === 'laufzeit')
pruefe('jahr: Treffer', arten(gut(1, { jpYear: undefined })).join() === 'jahr')
pruefe('sprecher: Treffer mit Synchro', arten(gut(1, { hasVoices: false })).join() === 'sprecher')
pruefe('sprecher: ohne Synchro zu Recht leer', arten(gut(1, { hasVoices: false, streams: [{ platform: 'netflix', url: 'u', dub: false }] as Title['streams'] })).join() === 'sprecher:ohne-synchro')
pruefe('kein-weg: Treffer', arten(gut(1, { streams: [], watchLinks: [] })).includes('kein-weg'))
pruefe('kein-weg: Kauflink genügt', !arten(gut(1, { streams: [], watchLinks: [{ name: 'x', url: 'u', kind: 'buy' }] as Title['watchLinks'] })).includes('kein-weg'))
const erst = { von: '2022-01-01', synchro: true } as Title['deErstausgabe']
pruefe('erstausgabe-ohne-weg: Treffer', arten(gut(1, { streams: [], watchLinks: [], deErstausgabe: erst })).includes('erstausgabe-ohne-weg'))
pruefe('erstausgabe-ohne-weg: Disc-Termin ist ein Weg (#4034)', !arten(gut(1, { streams: [], watchLinks: [], deErstausgabe: erst }), kontext({ discTitel: new Set([1]) })).includes('erstausgabe-ohne-weg'))
pruefe('erstausgabe-ohne-weg: mit Weg kein Treffer', !arten(gut(1, { deErstausgabe: erst })).includes('erstausgabe-ohne-weg'))
pruefe('termin-fehlt-laufend: Treffer', arten(gut(1, { jpEnd: undefined })).join() === 'termin-fehlt-laufend')
pruefe('termin-fehlt-laufend: Termin da oder Serie beendet: kein Treffer', arten(gut(1, { jpEnd: undefined }), kontext({ kuenftig: new Set([1]) })).length === 0 && arten(gut(1)).length === 0)
const sichtung = (ueber: Partial<Release> = {}) => rel({ releaseType: 'weekly', tvLetzteSichtung: '2026-11-14', ...ueber })
pruefe('termin-fehlt-laufend: nur Sichtungen (Beyblade X) schreiben nichts fort: Ausnahme nur-sichtung',
  arten(gut(1, { jpEnd: undefined }), mitReleases(sichtung(), sichtung({ releaseType: 'batch' }))).join() === 'termin-fehlt-laufend:nur-sichtung')
pruefe('termin-fehlt-laufend: ein Termin ohne Sichtung daneben und keine Releases bleiben Treffer, ein Disc-Termin ändert nichts',
  arten(gut(1, { jpEnd: undefined }), mitReleases(sichtung(), rel({ releaseType: 'weekly' }))).join() === 'termin-fehlt-laufend'
  && arten(gut(1, { jpEnd: undefined }), mitReleases(sichtung(), rel({ releaseType: 'disc', platform: 'disc' }))).join() === 'termin-fehlt-laufend:nur-sichtung'
  && arten(gut(1, { jpEnd: undefined }), mitReleases()).join() === 'termin-fehlt-laufend')
pruefe('termin-fehlt-laufend: echter Bestand Beyblade X (165159): zwei Sichtungen plus alter Batch (dort Disney+) ohne Sichtung: Ausnahme nur-sichtung',
  arten(gut(1, { jpEnd: undefined }), mitReleases(sichtung(), sichtung(), rel({ releaseType: 'batch' }))).join() === 'termin-fehlt-laufend:nur-sichtung')
pruefe('sprachurteil-offen: Treffer', arten(gut(1, { streams: [{ platform: 'netflix', url: 'u' }] as Title['streams'] })).join() === 'sprachurteil-offen')
pruefe('sprachurteil-offen: ein Urteil genügt', !arten(gut(1, { streams: [{ platform: 'netflix', url: 'u', dub: false }, { platform: 'adn', url: 'v' }] as Title['streams'] })).includes('sprachurteil-offen'))
pruefe('synchro-schwach: Treffer', arten(gut(1, { dubConfidence: 'low' })).join() === 'synchro-schwach')
pruefe('synchro-schwach: normal ist kein Treffer', arten(gut(1, { dubConfidence: 'normal' })).length === 0)
pruefe('erschienen-ohne-weg: Treffer', arten(gut(1), mitReleases(rel({ platform: 'adn' }))).join() === 'erschienen-ohne-weg')
pruefe('erschienen-ohne-weg: Plattform vorhanden, künftig oder Disc kein Treffer',
  arten(gut(1), mitReleases(rel({ platform: 'netflix' }), rel({ platform: 'adn', schedule: { firstEpisodeDate: '2027-01-01' } as never }), rel({ platform: 'disc' }))).length === 0)
const adnTermin = (ueber: Partial<Release> = {}) => mitReleases(rel({ platform: 'adn', ...ueber }))
const geschaetzt = adnTermin({ schedule: { firstEpisodeDate: '2026-01-01', estimated: true } as never })
pruefe('erschienen-ohne-weg: ein geschätzter Termin ist kein Erscheinen (11-7 baut dafür auch keinen Weg), er zählt als termin-geschaetzt-ohne-weg', arten(gut(1), geschaetzt).join() === 'termin-geschaetzt-ohne-weg')
pruefe('termin-geschaetzt-ohne-weg: sicherer Termin, Weg vorhanden, künftiger Termin und Termin ohne Quelle sind kein Treffer', [
  adnTermin(), mitReleases(rel({ platform: 'netflix', schedule: { firstEpisodeDate: '2026-01-01', estimated: true } as never })),
  mitReleases(rel({ platform: 'adn', schedule: { firstEpisodeDate: '2999-01-01', estimated: true } as never })), mitReleases(rel({ platform: 'adn', sources: [], schedule: { firstEpisodeDate: '2026-01-01', estimated: true } as never })),
].every((k) => !arten(gut(1), k).includes('termin-geschaetzt-ohne-weg')))
pruefe('erschienen-ohne-weg: ein Termin ohne Quelle zählt nicht', arten(gut(1), adnTermin({ sources: [] })).length === 0)
pruefe('erschienen-ohne-weg: belegtes Nein ist Ausnahme, ohne Nein bleibt es offen', arten(gut(1), { ...adnTermin(), neinGilt: () => true }).filter((a) => a.startsWith('erschienen')).join() === 'erschienen-ohne-weg:belegtes-nein' && arten(gut(1), adnTermin()).join() === 'erschienen-ohne-weg')
pruefe('erschienen-ohne-weg: Nein nur für eine von zwei Plattformen bleibt offen', arten(gut(1), { ...mitReleases(rel({ platform: 'adn' }), rel({ platform: 'primevideo' })), neinGilt: (_i, p) => p === 'adn' }).filter((a) => a.startsWith('erschienen')).join() === 'erschienen-ohne-weg')
const mitNein = (ueber: Partial<Release>) => ({ ...adnTermin(ueber), neinGilt: () => true })
pruefe('termin-trotz-nein: Nein belegt, Termin ohne sprache → Mangel; mit omu → nur Ausnahme belegtes-nein; ohne Nein kein Treffer', arten(gut(1), mitNein({})).includes('termin-trotz-nein') && !arten(gut(1), mitNein({ sprache: 'omu' })).includes('termin-trotz-nein') && arten(gut(1), mitNein({ sprache: 'omu' })).join() === 'erschienen-ohne-weg:belegtes-nein' && !arten(gut(1), adnTermin()).includes('termin-trotz-nein'))
pruefe('termin-trotz-nein: auch „offen“ ist eine Kennzeichnung (der Termin sagt selbst „Synchro offen“), kein Mangel', !arten(gut(1), mitNein({ sprache: 'offen' })).includes('termin-trotz-nein') && arten(gut(1), mitNein({ sprache: 'offen' })).join() === 'erschienen-ohne-weg:belegtes-nein')
const beleg = (ueber: object) => ({ anilistId: 1, platform: 'primevideo', ...ueber }) as Parameters<typeof baueNeinGilt>[0][number]
const nichtVerfuegbar = baueNeinGilt([beleg({ available: false, checkedAt: '2026-08-30' })])
pruefe('neinGilt: „nicht verfügbar“ vor dem Termin ist überholt, am Termintag und danach gilt es', !nichtVerfuegbar(1, 'primevideo', '2026-09-13') && nichtVerfuegbar(1, 'primevideo', '2026-08-30') && nichtVerfuegbar(1, 'primevideo', '2026-08-01'))
const eigeneAdresse = baueNeinGilt([beleg({ dub: true, url: 'https://www.amazon.de/dp/B000000001', checkedAt: '2026-09-01' }), beleg({ dub: false, url: 'https://www.amazon.de/dp/B000000002', checkedAt: '2026-09-02' })])
pruefe('neinGilt: Nein an einer Kanal-Adresse neben einem Ja an anderer Adresse gilt über den Adress-Schlüssel', eigeneAdresse(1, 'primevideo', '2026-10-01'))
const ohneTon = baueNeinGilt([beleg({ dub: false, checkedAt: '2026-09-14' })])
pruefe('neinGilt: „ohne deutschen Ton“ gilt auch für einen späteren Termin; andere Plattform und Titel nicht', ohneTon(1, 'primevideo', '2026-10-15') && !ohneTon(1, 'netflix', '2026-10-15') && !ohneTon(2, 'primevideo', '2026-10-15'))
pruefe('folgenzahl-widerspruch: Release mit mehr Folgen', arten(gut(1), mitReleases(rel({ schedule: { firstEpisodeDate: '2026-01-01', episodeCount: 24 } }))).join() === 'folgenzahl-widerspruch')
pruefe('folgenzahl-widerspruch: Liste länger als Folgenzahl', arten(gut(1), kontext({ folgen: () => ({ f: Array.from({ length: 13 }, (_, i) => [i + 1, 'x'] as [number, string]) }) })).join() === 'folgenzahl-widerspruch')
pruefe('folgenzahl-widerspruch: Disc mit mehr Folgen zählt nicht', arten(gut(1), mitReleases(rel({ releaseType: 'disc', platform: 'disc', schedule: { firstEpisodeDate: '2026-01-01', episodeCount: 99 } }))).length === 0)
// Echte Zeilen vom 17.11.2026: Gantz (13, Prime 26, Staffel 2 hat 13), Wolf’s Rain (26, ADN 30, OVA 4), Zexal II (73, Prime 97, keine Summe passt), Super Wings (52, TV 59 nur gesichtet).
const wid = (t: Title, k: Kontext) => arten(t, k).filter((a) => a.startsWith('folgenzahl-widerspruch'))
const primeZahl = (n: number, extra = {}) => rel({ platform: 'primevideo', schedule: { firstEpisodeDate: '2026-09-10', episodeCount: n, ...extra } })
const gantz = gut(1, { episodes: 13, franchiseId: 1 })
pruefe('folgenzahl-widerspruch: Zahl = Titel + alle Serien-Staffeln des Franchise (Gantz) ist Ausnahme', wid(gantz, { ...mitReleases(primeZahl(26)), folgen: () => ({ f: Array.from({ length: 13 }, (_, i) => [i + 1, 'x'] as [number, string]) }), franchiseTeile: () => [{ format: 'TV', episodes: 13 }, { format: 'MOVIE', episodes: 1 }] }).join() === 'folgenzahl-widerspruch:anbieter-franchise')
pruefe('folgenzahl-widerspruch: Zahl = Titel + OVA (Wolf’s Rain 26 + 4) ist Ausnahme, auch für die Liste', wid(gut(1, { episodes: 26 }), { ...kontext({ folgen: () => ({ f: Array.from({ length: 30 }, (_, i) => [i + 1, 'x'] as [number, string]) }), franchiseTeile: () => [{ format: 'OVA', episodes: 4 }] }) }).join() === 'folgenzahl-widerspruch:anbieter-franchise')
pruefe('folgenzahl-widerspruch: Zexal II 97 ohne passende Summe bleibt offen', wid(gut(1, { episodes: 73 }), { ...mitReleases(primeZahl(97)), folgen: () => undefined, franchiseTeile: () => [{ format: 'TV', episodes: 224 }, { format: 'TV', episodes: 73 }, { format: 'OVA', episodes: 1 }] }).join() === 'folgenzahl-widerspruch')
pruefe('folgenzahl-widerspruch: ein Film zählt nicht als Zugabe', wid(gut(1, { episodes: 26 }), { ...mitReleases(primeZahl(27)), folgen: () => undefined, franchiseTeile: () => [{ format: 'MOVIE', episodes: 1 }] }).join() === 'folgenzahl-widerspruch')
pruefe('folgenzahl-widerspruch: eine erklärte und eine unerklärte Zahl bleiben offen', wid(gut(1, { episodes: 26 }), { ...mitReleases(primeZahl(27)), folgen: () => ({ f: Array.from({ length: 30 }, (_, i) => [i + 1, 'x'] as [number, string]) }), franchiseTeile: () => [{ format: 'OVA', episodes: 4 }] }).join() === 'folgenzahl-widerspruch')
pruefe('folgenzahl-widerspruch: nur gesichtete Zahl (Super Wings 59 > 52) ist Ausnahme', wid(gut(1, { episodes: 52 }), { ...mitReleases(rel({ platform: 'tv', releaseType: 'weekly', schedule: { firstEpisodeDate: '2026-10-07', episodeCount: 59, episodeCountAssumed: true, episodeCountNurGesichtet: true } })), folgen: () => undefined }).join() === 'folgenzahl-widerspruch:nur-gesichtet')
pruefe('folgenzahl-widerspruch: drei Zugaben als Summe erklären nichts (Grenze zwei)', wid(gut(1, { episodes: 26 }), { ...mitReleases(primeZahl(29)), folgen: () => undefined, franchiseTeile: () => [{ format: 'OVA', episodes: 1 }, { format: 'OVA', episodes: 1 }, { format: 'SPECIAL', episodes: 1 }] }).join() === 'folgenzahl-widerspruch')
const strom = (url: string, extra = {}) => [{ platform: 'netflix', url, dub: true, ...extra }] as Title['streams']
const geteilt = adresseMehrfach([gut(1, { streams: strom('x'), franchiseId: 10 }), gut(2, { streams: strom('x'), franchiseId: 20 }), gut(3, { streams: strom('x', { sharedWith: 3 }), franchiseId: 30 }), gut(4)])
pruefe('adresse-mehrfach: zwei fremde Titel, eine Adresse → Mangel, auch mit `sharedWith` (der Vermerk verdeckt nichts); Einzelne nicht', [...geteilt].map(([i, w]) => `${i}${w}`).sort().join() === '1fremd,2fremd,3fremd', [...geteilt])
const staffeln = adresseMehrfach([gut(1, { streams: strom('y'), franchiseId: 10 }), gut(2, { streams: strom('y', { sharedWith: 2 }), franchiseId: 10 })])
pruefe('adresse-mehrfach: zwei Staffeln eines Franchise → kein offener Mangel, sondern Ausnahme gleiches-franchise', [...staffeln.values()].join() === 'franchise,franchise' && arten(gut(1), kontext({ adresseMehrfach: staffeln })).join() === 'adresse-mehrfach:gleiches-franchise')
const leerWeg = (id: number) => gut(id, { streams: [{ platform: 'disneyplus', url: '' }] as Title['streams'] })
pruefe('adresse-mehrfach: leere Adresse zählt nicht als gleiche (Grenzfall: zwei Titel mit url "")', adresseMehrfach([leerWeg(1), leerWeg(2)]).size === 0)
pruefe('weg-ohne-adresse: Weg mit leerer url trifft, mit Adresse nicht', arten(leerWeg(1)).includes('weg-ohne-adresse') && !arten(gut(1)).includes('weg-ohne-adresse'))
pruefe('adresse-mehrfach: Regel nutzt die Menge', arten(gut(1), kontext({ adresseMehrfach: new Map([[1, 'fremd']]) })).join() === 'adresse-mehrfach' && arten(gut(1), kontext({ adresseMehrfach: new Map([[1, 'franchise']]) })).join() === 'adresse-mehrfach:gleiches-franchise')

/* Grenzfälle und Einheitlichkeit (Prüfer-Auflagen N4, N7) */
const regel = (art: string) => REGELN.find((r) => r.art === art)!
pruefe('studio hat Handbesitzer (kein Automat füllt es, 22.11.2026)', regel('studio').wer === 'hand:studio-von-hand', regel('studio').wer)
pruefe('weg-ohne-adresse bleibt auto: (ein Handbesitzer ohne Abarbeitungsweg schaltet die Stillstand-Warnung nur ab)', regel('weg-ohne-adresse').wer === 'auto:anbieterkalender', regel('weg-ohne-adresse').wer)
pruefe('Tabelle: cover und kein-weg tragen Wirkung 3; wer auto:tmdb-poster bzw. daniel', regel('cover').wirkung === 3 && regel('cover').wer === 'auto:tmdb-poster' && regel('kein-weg').wirkung === 3 && regel('kein-weg').wer === 'daniel')
pruefe('Tabelle: bild-fremdsprachig ist schwach, Wirkung 2, wer auto:tmdb-poster', regel('bild-fremdsprachig')?.gruppe === 'schwach' && regel('bild-fremdsprachig')?.wirkung === 2 && regel('bild-fremdsprachig')?.wer === 'auto:tmdb-poster')
pruefe('Tabelle: handlung-de hat Handbesitzer mit Weg handlung-eigen (keine automatische Quelle liefert den Text)', regel('handlung-de')?.wer === 'hand:handlung-eigen')
pruefe('folgentitel: SPECIAL und MUSIC mit mehreren Folgen sind keine Ausnahme', ['SPECIAL', 'MUSIC', 'OVA'].every((f) => arten(gut(1, { format: f as Title['format'] }), ohneFolgen).join() === 'folgentitel'))
pruefe('kein-weg: Disc-Termin ist ein Weg (wie bei erstausgabe-ohne-weg)', !arten(gut(1, { streams: [], watchLinks: [] }), kontext({ discTitel: new Set([1]) })).includes('kein-weg') && arten(gut(1, { streams: [], watchLinks: [] }), kontext({ discTitel: new Set([2]) })).includes('kein-weg'))
const ohneWeg = (ueber: Partial<Title> = {}) => gut(1, { streams: [], watchLinks: [], ...ueber })
const kino = (tag: string, ueber: Partial<Release> = {}) => rel({ platform: 'kino', releaseType: 'movie', schedule: { firstEpisodeDate: tag }, ...ueber })
pruefe('kein-weg: Kinostart ab heute mit Quelle ist der Weg (Witch on the Holy Night), gestern oder ohne Quelle nicht', arten(ohneWeg(), mitReleases(kino('2027-01-26'))).join() === 'kein-weg:kinostart' && arten(ohneWeg(), mitReleases(kino(HEUTE))).join() === 'kein-weg:kinostart' && arten(ohneWeg(), mitReleases(kino('2026-11-15'))).join() === 'kein-weg' && arten(ohneWeg(), mitReleases(kino('2027-01-26', { sources: [] }))).join() === 'kein-weg')
pruefe('kein-weg: nur ein Kinostart, nicht Fernsehen oder Disc-Termin, nimmt die Lücke', arten(ohneWeg(), mitReleases(rel({ platform: 'tv', schedule: { firstEpisodeDate: '2027-01-26' } }))).join() === 'kein-weg')
const ohneDatum = { jpYear: undefined, jpEnd: undefined, jpStart: undefined, jpSeason: undefined }
pruefe('kein-weg: ohne Erscheinungsdatum und ohne Termin ist noch nichts da (Crown Handler 5/6)', arten(ohneWeg({ ...ohneDatum, format: 'MOVIE' })).filter((a) => a.startsWith('kein-weg')).join() === 'kein-weg:unveroeffentlicht')
pruefe('kein-weg: Jahr, Ende, Start oder irgendein Termin heben die Ausnahme auf', [{ jpYear: 1977 }, { jpEnd: '2020-01-01' }, { jpStart: '2020-01' }].every((d) => arten(ohneWeg({ ...ohneDatum, ...d })).filter((a) => a.startsWith('kein-weg')).join() === 'kein-weg') && arten(ohneWeg(ohneDatum), mitReleases(rel({ platform: 'joyn', schedule: { firstEpisodeDate: '2026-11-03', estimated: true } }))).filter((a) => a.startsWith('kein-weg')).join() === 'kein-weg')
const streamerErst = (publisher: string) => ({ deErstausgabe: { von: '2017-08-18', publisher, synchro: true } as Title['deErstausgabe'] })
const neinNur = (plattform: string) => kontext({ neinGilt: (id, p, ab) => id === 1 && p === plattform && ab === '2017-08-18' })
const weg = (t: Title, k = kontext()) => arten(t, k).filter((a) => a.startsWith('kein-weg') || a.startsWith('erstausgabe')).join()
pruefe('kein-weg: Streamer als Verlag und belegtes „nicht verfügbar“ dort (Glitter Force Doki Doki, Kaguya-sama Ishigami) ist Ausnahme, bei kein-weg und erstausgabe-ohne-weg',
  weg(ohneWeg(streamerErst('Netflix')), neinNur('netflix')) === 'kein-weg:belegtes-nein,erstausgabe-ohne-weg:belegtes-nein' && weg(ohneWeg(streamerErst('Crunchyroll')), neinNur('crunchyroll')) === 'kein-weg:belegtes-nein,erstausgabe-ohne-weg:belegtes-nein' && weg(ohneWeg(streamerErst('Amazon.com, Inc.')), neinNur('primevideo')) === 'kein-weg:belegtes-nein,erstausgabe-ohne-weg:belegtes-nein')
pruefe('kein-weg: Nein bei einem anderen Anbieter als dem Verlag, Disc-Verlag mit Nein, ohne Erstausgabe oder ohne Nein bleibt offen',
  weg(ohneWeg(streamerErst('Netflix')), neinNur('crunchyroll')) === 'kein-weg,erstausgabe-ohne-weg' && weg(ohneWeg(streamerErst('Kazé Deutschland')), neinNur('netflix')) === 'kein-weg,erstausgabe-ohne-weg' && weg(ohneWeg(streamerErst('Netflix')), kontext()) === 'kein-weg,erstausgabe-ohne-weg' && weg(ohneWeg(), neinNur('netflix')) === 'kein-weg' && weg(ohneWeg(streamerErst('')), neinNur('netflix')) === 'kein-weg,erstausgabe-ohne-weg')
const nurVerlag = { deErstausgabe: { publisher: 'Netflix', synchro: true } as Title['deErstausgabe'] }
pruefe('kein-weg: Erstausgabe ohne Datum wird nicht verneint, auch wenn jedes Nein gilt', weg(ohneWeg(nurVerlag), kontext({ neinGilt: () => true })) === 'kein-weg,erstausgabe-ohne-weg')
pruefe('erstausgabe-ohne-weg: Gruppe fehlend wie kein-weg', regel('erstausgabe-ohne-weg').gruppe === 'fehlend' && regel('kein-weg').gruppe === 'fehlend')
pruefe('erschienen-ohne-weg: Erscheinungstag heute zählt, morgen nicht', arten(gut(1), mitReleases(rel({ platform: 'adn', schedule: { firstEpisodeDate: HEUTE } }))).join() === 'erschienen-ohne-weg' && arten(gut(1), mitReleases(rel({ platform: 'adn', schedule: { firstEpisodeDate: '2026-11-17' } }))).length === 0)
pruefe('erschienen-ohne-weg: Fernsehen und Kino sind keine Streamingplattform', arten(gut(1), mitReleases(rel({ platform: 'tv' }), rel({ platform: 'kino' }))).length === 0)
pruefe('termin-fehlt-laufend: Ende heute läuft noch, Ende gestern nicht', arten(gut(1, { jpEnd: HEUTE })).join() === 'termin-fehlt-laufend' && arten(gut(1, { jpEnd: '2026-11-15' })).length === 0)
/* herkunft-fremder-titel: Namenstreffer (normierter Teilstring) und Staffelzahl bei Titeln über mehrere Staffeln */
const auto = (herkunft: string) => rel({ automatisch: true, herkunft: `Automatisch übernommen aus „${herkunft}".` })
const fremd = (titel: Partial<Title>, herkunft: string) => arten(gut(1, titel), mitReleases(auto(herkunft))).includes('herkunft-fremder-titel')
pruefe('herkunft-fremder-titel: Name fehlt im Titel → trifft (ohne Staffel, nur der Name entscheidet)', fremd({ titleDe: 'Boruto: Naruto Next Generations' }, '»Naruto Shippuden«'))
pruefe('herkunft-fremder-titel: Boruto an „»Naruto Shippuden« – Staffel 4“ trifft', fremd({ titleDe: 'Boruto: Naruto Next Generations', episodes: 293 }, '»Naruto Shippuden« – Staffel 4'))
pruefe('herkunft-fremder-titel: Zexal (73 Folgen) an „»Yu-Gi-Oh!« – Staffel 5“ trifft (Name steckt drin, Staffel nicht)', fremd({ titleDe: 'Yu-Gi-Oh! Zexal', episodes: 73 }, '»Yu-Gi-Oh!« – Staffel 5'))
pruefe('herkunft-fremder-titel: Staffel mit Zahl im Namen, Staffel 1, kurzer Titel (Minami-ke, 13 Folgen) und Namensvariante treffen nicht',
  !fremd({ titleDe: 'Call of the Night: Season 2', episodes: 13 }, '»Call of the Night« – Staffel 2') && !fremd({ titleDe: 'Yu-Gi-Oh! Zexal', episodes: 73 }, '»Yu-Gi-Oh!« – Staffel 1')
  && !fremd({ titleDe: 'Minami-ke: Korekara', episodes: 13 }, '»Minami-ke« – Staffel 5') && !fremd({ titleDe: 'Chaika, die Sargprinzessin' }, '»Chaika – Die Sargprinzessin« – Staffel 1'))
pruefe('herkunft-fremder-titel: Artikelname länger als der Titel („Chaika – Die Sargprinzessin“ an „Chaika“) trifft nicht', !fremd({ titleDe: 'Chaika' }, '»Chaika – Die Sargprinzessin«'))
pruefe('herkunft-fremder-titel: Termin von Hand oder ohne Artikelnamen zählt nicht', arten(gut(1, { titleDe: 'Boruto' }), mitReleases(rel({ herkunft: '»Naruto«' }), auto('Neue Folgen im Dezember'))).length === 0)

if (verletzt) {
  console.error(`${verletzt} Prüfung(en) verletzt`)
  process.exit(1)
}
console.log('Mängel-Regeln: alle Prüfungen bestanden')
