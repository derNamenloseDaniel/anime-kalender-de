/**
 * Zusicherung zur Quellenzeile unter der Handlung (24.11.2026): The Mighty Nein zeigte „Quelle: aniSearch" mit Link auf die Startseite,
 * der Text kam von TMDB. Aufruf: `npm run check:logic`.
 */
import { cartoonHandlung, plotVon } from '../web/src/components/detail/plot.ts'
import { handlungQuellenFehler } from './lib/handlung-quellen.ts'

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

if (verletzt) process.exit(1)
