/**
 * Zusicherung zur Quellenzeile unter der Handlung (24.11.2026): The Mighty Nein zeigte „Quelle: aniSearch" mit Link auf die Startseite,
 * der Text kam von TMDB. Aufruf: `npm run check:logic`.
 */
import { cartoonHandlung, plotVon } from '../web/src/components/detail/plot.ts'
import { readdirSync, readFileSync } from 'node:fs'
import { synopseVon } from './bau/synopse-von.ts'
import { ausgelieferteCartoons, handlungQuellenFehler } from './lib/handlung-quellen.ts'
import { unbedingteAufrufe } from './lib/unbedingte-aufrufe.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const ohne = plotVon({ synopsis: { de: 'Ein deutscher Text ohne Herkunft.' } as never, anilistId: undefined, ersatz: undefined })
pruefe('deutsche Handlung ohne deSource behauptet keinen Anbieter', ohne.plot?.quelle === undefined, ohne.plot?.quelle)

const von = { id: 2, name: 'Staffel 1', al: 5 } as never
const ersatz = plotVon({ synopsis: undefined, anilistId: undefined, ersatz: { plot: { de: 'Text des Vorgängers.' } as never, von } })
pruefe('Ersatz-Handlung ohne deSource behauptet keinen Anbieter', ersatz.plot?.quelle === undefined, ersatz.plot?.quelle)

const mit = plotVon({ synopsis: { de: 'Text', deSource: { name: 'themoviedb.org', url: 'https://www.themoviedb.org/tv/1' } } as never, anilistId: undefined, ersatz: undefined })
pruefe('vorhandene deSource bleibt', mit.plot?.quelle?.url === 'https://www.themoviedb.org/tv/1')

const nein = cartoonHandlung({ synopsis: 'Text', tmdbId: 219080 })
pruefe('Cartoon-Handlung: TMDB-Seite des Titels', nein?.deSource?.url === 'https://www.themoviedb.org/tv/219080' && nein.deSource.name === 'themoviedb.org', nein)
pruefe('Cartoon ohne tmdbId: keine Quelle statt Startseite', cartoonHandlung({ synopsis: 'Text' })?.deSource === undefined)
pruefe('Cartoon ohne Handlung: nichts', cartoonHandlung({ tmdbId: 1 }) === undefined)

const q = (name: string, url: string) => ({ de: 'x', deSource: { name, url } })
const f = (s: Record<string, ReturnType<typeof q>>) => handlungQuellenFehler(s, []).length
pruefe('Wächter: Startseite wird gemeldet', f({ 1: q('anisearch.de', 'https://www.anisearch.de/') }) === 1)
pruefe('Wächter: fehlende Quelle wird gemeldet', handlungQuellenFehler({ 1: { de: 'x' } }, []).length === 1)
pruefe('Wächter: Name passt nicht zur Domain', f({ 1: q('anisearch.de', 'https://www.themoviedb.org/tv/1') }) === 1)
pruefe(
  'Wächter: titelgenaue Adressen sind in Ordnung',
  f({ 1: q('anisearch.de', 'https://www.anisearch.de/anime/123,x'), 2: q('themoviedb.org', 'https://www.themoviedb.org/movie/9'), 3: q('Wikipedia (EN)', 'https://en.wikipedia.org/wiki/X') }) === 0,
)
pruefe('Wächter: Cartoon ohne tmdbId wird gemeldet', handlungQuellenFehler({}, [{ id: -1, synopsis: 'x' }]).length === 1)

/* A4: der Riegel sieht auch die Cartoons des Kerns; je Kennung einmal, der Kern gewinnt. */
const cs = ausgelieferteCartoons([{ id: -1, synopsis: 'a' }, { id: -2, synopsis: 'b', tmdbId: 2 }], [{ id: -1, synopsis: 'a', tmdbId: 1 }, { id: -3, synopsis: 'c' }, { id: 7, synopsis: 'Anime im Kern' }])
pruefe('Cartoons: Vereinigung je Kennung einmal, Anime im Kern zählt nicht', JSON.stringify(cs.map((c) => c.id).sort()) === '[-1,-2,-3]', cs)
pruefe('Cartoons: der Kern gewinnt', cs.find((c) => c.id === -1)?.tmdbId === 1, cs)
pruefe('Cartoon nur im Kern ohne tmdbId wird gemeldet', handlungQuellenFehler({}, cs).length === 1 && handlungQuellenFehler({}, cs)[0]!.includes('-3'), handlungQuellenFehler({}, cs))

/* A4 am echten Bestand: jede ausgelieferte Handlung ist titelgenau belegt. */
const lies = <T>(pfad: string): T => JSON.parse(readFileSync(new URL(`../public/data/${pfad}`, import.meta.url), 'utf8')) as T
const synopsen: Record<string, { de?: string; deSource?: { name: string; url: string } }> = {}
for (const g of readdirSync(new URL('../public/data/synopses/', import.meta.url))) Object.assign(synopsen, lies(`synopses/${g}`))
const bestand = handlungQuellenFehler(synopsen, ausgelieferteCartoons(lies<{ id: number }[]>('cartoons.json'), lies<{ id: number }[]>('titles-core.json')))
pruefe('Bestand: keine Handlung ohne titelgenaue Quelle', bestand.length === 0, bestand.slice(0, 3))
pruefe('Bestand gelesen (Synopsen vorhanden)', Object.keys(synopsen).length > 1000, Object.keys(synopsen).length)

/* A1: synopseVon — jede Weiche einzeln. */
const titel = { synopsis: 'English' } as never
const tmdb = (extra: object) => ({ overviewDe: 'Deutsch von TMDB', ...extra }) as never
const trenne = (text: string) => (text.startsWith('URL:') ? { text: 'T', url: text.slice(4) } : { text })
const synopse = (o: { asId?: number; ausAnisearch?: string; ausTmdb?: unknown }) => synopseVon({ t: titel, asId: o.asId, ausAnisearch: o.ausAnisearch, ausTmdb: o.ausTmdb as never, trenneQuelle: trenne })
const AS = 987654321
const adresse = `https://www.anisearch.de/anime/${AS}`
pruefe('synopseVon: aniSearch-Text mit Adresse im Text → diese Adresse', synopse({ asId: 5, ausAnisearch: `URL:${adresse}` })?.deSource?.url === adresse, synopse({ asId: 5, ausAnisearch: `URL:${adresse}` }))
pruefe('synopseVon: aniSearch-Text ohne Adresse → Titelseite der Kennung', synopse({ asId: AS, ausAnisearch: 'Text' })?.deSource?.url === adresse)
pruefe('synopseVon: aniSearch-Text ohne Adresse und ohne Kennung → keine Quelle, nie Startseite', synopse({ ausAnisearch: 'Text' })?.deSource === undefined, synopse({ ausAnisearch: 'Text' }))
pruefe('synopseVon: Name der aniSearch-Quelle', synopse({ asId: AS, ausAnisearch: 'Text' })?.deSource?.name === 'anisearch.de')
pruefe('synopseVon: TMDB-Serie → Seite des Titels', synopse({ ausTmdb: tmdb({ tmdbId: 77, kind: 'tv' }) })?.deSource?.url === 'https://www.themoviedb.org/tv/77', synopse({ ausTmdb: tmdb({ tmdbId: 77, kind: 'tv' }) }))
pruefe('synopseVon: TMDB-Film → /movie/', synopse({ ausTmdb: tmdb({ tmdbId: 78, kind: 'movie' }) })?.deSource?.url === 'https://www.themoviedb.org/movie/78')
pruefe('synopseVon: TMDB ohne Kennung → keine Quelle', synopse({ ausTmdb: tmdb({}) })?.deSource === undefined)
pruefe('synopseVon: TMDB-Name', synopse({ ausTmdb: tmdb({ tmdbId: 77, kind: 'tv' }) })?.deSource?.name === 'themoviedb.org')
pruefe('synopseVon: aniSearch schlägt TMDB', synopse({ asId: AS, ausAnisearch: 'Text', ausTmdb: tmdb({ tmdbId: 77, kind: 'tv' }) })?.deSource?.name === 'anisearch.de')
pruefe('synopseVon: ohne aniSearch-Text steht der Weg zur aniSearch-Seite in asUrl', synopse({ asId: AS, ausTmdb: tmdb({ tmdbId: 77, kind: 'tv' }) })?.asUrl === adresse)
pruefe('synopseVon: mit aniSearch-Text kein asUrl', synopse({ asId: AS, ausAnisearch: 'Text' })?.asUrl === undefined)
pruefe('synopseVon: ohne jeden Text kein Eintrag', synopseVon({ t: {} as never, asId: AS, ausAnisearch: undefined, ausTmdb: undefined, trenneQuelle: trenne }) === undefined)

/* A2: der Bau ruft den Riegel unbedingt auf, mit beiden Beständen, bevor die Gruppen geschrieben werden. */
const zusatz = unbedingteAufrufe(readFileSync(new URL('./bau/13-4-zusatzdateien.ts', import.meta.url), 'utf8'), 'schreibeZusatzdateien')
const riegel = zusatz.find((a) => a.name === 'riegelHandlungQuellen')
pruefe('13-4 ruft riegelHandlungQuellen unbedingt auf', riegel !== undefined, zusatz.map((a) => a.name))
pruefe('13-4: Riegel bekommt synopses und die Cartoons aus cartoons.json und dem Kern', riegel?.args[0] === 'synopses' && /^ausgelieferteCartoons\(.*cartoons\.json.*titles-core\.json/.test(riegel.args[1] ?? ''), riegel?.args)
const gruppen = zusatz.find((a) => a.name === 'schreibeSynopsenGruppen')
pruefe('13-4: Riegel läuft vor dem Schreiben der Synopsen-Gruppen', riegel !== undefined && gruppen !== undefined && riegel.stelle < gruppen.stelle, [riegel?.stelle, gruppen?.stelle])

if (verletzt) process.exit(1)
