/**
 * Zusicherungen zur Übernahme voller Folgentitel-Listen (Auftrag folgentitel-tmdb-2211): Datumsgrenze bei abgeschlossenen Serien,
 * Verlängerung einer zu kurzen aniSearch-Liste aus TMDB, Beginnjahr ±1 bei einziger TMDB-Staffel, Staffelsumme mit Gegenprobe.
 * Aufruf: `npm run check:logic`.
 */
import type { Title } from '../shared/types.ts'
import { endeNummer, erschieneneFolgen } from './bau/folgen-dateien.ts'
import { mitFremdTiteln, type TitelQuellen } from './bau/folgentitel-stufen.ts'
import { tmdbFolgentitel, type TmdbFolge } from './bau/folgentitel-tmdb.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const serie = (extra: object = {}) => ({ id: 900002, format: 'TV', jpYear: 1986, episodes: 8, streams: [], titleRomaji: 'Beispielserie', ...extra }) as unknown as Title
const staffel = (s: number, n: number, start: string): TmdbFolge[] =>
  Array.from({ length: n }, (_, i) => ({ s, e: i + 1, titel: `T${s}-${i + 1}`, en: `Episode title ${s}-${i + 1}`, datum: i === 0 ? start : `${start.slice(0, 4)}-12-31` }))
const quellen = (folgen: TmdbFolge[]): TitelQuellen => ({ crSerien: new Map(), tmdbFolgen: { 900002: { folgen } }, tmdbNamen: { 900002: { nameDe: 'Beispielserie' } }, kitsu: {}, rtlplus: {}, hand: {} })
const liste = (n: number, mitTitel: number) => Array.from({ length: n }, (_, i) => ({ nr: i + 1, ...(i < mitTitel ? { de: `T1-${i + 1}` } : {}) }))

console.log('\nErschienen bei abgeschlossener Serie')
const nurEins = [{ nr: 1, datum: '1976-04-07' }, { nr: 2 }, { nr: 3 }, { nr: 4 }]
pruefe('ohne Ende: nur die datierte Folge (wie bisher)', erschieneneFolgen(nurEins, 0, '2026-11-22').length === 1)
pruefe('mit Folgenzahl 3 eines beendeten Titels: Folgen bis 3', erschieneneFolgen(nurEins, 0, '2026-11-22', 3).length === 3)
pruefe('Folgen über der Folgenzahl bleiben draußen (Ankündigung)', erschieneneFolgen(nurEins, 0, '2026-11-22', 3).every((x) => x.nr <= 3))
pruefe('endeNummer: Ende vor heute gibt die Folgenzahl', endeNummer(serie({ jpEnd: '1987-03-25' }), '2026-11-22') === 8)
pruefe('endeNummer: Ende heute gibt 0 (läuft noch)', endeNummer(serie({ jpEnd: '2026-11-22' }), '2026-11-22') === 0)
pruefe('endeNummer: Ende in der Zukunft gibt 0', endeNummer(serie({ jpEnd: '2027-03-25' }), '2026-11-22') === 0)
pruefe('endeNummer: ohne Ende oder ohne Folgenzahl gibt 0', endeNummer(serie(), '2026-11-22') === 0 && endeNummer(serie({ jpEnd: '1987-03-25', episodes: undefined }), '2026-11-22') === 0)

console.log('\nVerlängerung einer zu kurzen Liste aus TMDB')
const tmdb8 = staffel(1, 8, '1986-04-01')
const lang = mitFremdTiteln(serie(), liste(6, 6), quellen(tmdb8))
pruefe('6 von 8 Folgen benannt: TMDB liefert 7 und 8', lang?.length === 8 && lang[6].de === 'T1-7' && lang[7].de === 'T1-8', lang?.slice(5))
pruefe('vorhandene Titel bleiben', lang?.[0].de === 'T1-1')
const fremd = tmdb8.map((f) => ({ ...f, titel: `Ganz anders ${f.e}` }))
pruefe('Nummern stimmen nicht überein (Titel verschoben): Liste bleibt kurz', mitFremdTiteln(serie(), liste(6, 6), quellen(fremd))?.length === 6)
pruefe('nur zwei benannte Folgen sind keine Gegenprobe: Liste bleibt kurz', mitFremdTiteln(serie(), liste(6, 2), quellen(tmdb8))?.length === 6)
pruefe('ohne Folgenzahl keine Verlängerung', mitFremdTiteln(serie({ episodes: undefined }), liste(6, 6), quellen(tmdb8))?.length === 6)
const mitFalschen = (falsch: number) => liste(6, 5).map((x, i) => (i < falsch ? { ...x, de: `Ganz anders ${i}` } : x))
pruefe('4 von 5 benannten Folgen stimmen (Grenze): Verlängerung', mitFremdTiteln(serie(), mitFalschen(1), quellen(tmdb8))?.length === 8)
pruefe('3 von 5 benannten Folgen stimmen: Liste bleibt kurz', mitFremdTiteln(serie(), mitFalschen(2), quellen(tmdb8))?.length === 6)
pruefe('Liste so lang wie die Folgenzahl: nichts kommt dazu', mitFremdTiteln(serie({ episodes: 6 }), liste(6, 6), quellen(tmdb8))?.length === 6)
console.log('\nBeginnjahr bei einziger TMDB-Staffel')
const jahr = (start: string, extra: object = {}) => tmdbFolgentitel(serie({ jpYear: 1986, ...extra }), 'Beispielserie', { folgen: staffel(1, 8, start) }, [1, 2, 3, 4, 5, 6, 7, 8], new Map())
pruefe('ein Jahr Abstand: Titel', jahr('1987-04-01')?.size === 8)
pruefe('zwei Jahre Abstand: nichts', jahr('1988-04-01') === undefined)
pruefe('Gegenprobe der Nummernliste bleibt: Folgen 7 und 8 fehlen dort, also kein Titel dafür', tmdbFolgentitel(serie(), 'Beispielserie', { folgen: staffel(1, 8, '1986-04-01') }, [1, 2, 3, 4, 5, 6], new Map())?.size === 6)
const zwei = [...staffel(1, 8, '1987-04-01'), ...staffel(2, 8, '1988-04-01')]
pruefe('bei mehreren Staffeln gilt das Jahr genau', tmdbFolgentitel(serie({ jpYear: 1986 }), 'Beispielserie', { folgen: zwei }, [], new Map()) === undefined)

console.log('\nStaffelsumme bei bekannter Folgenzahl')
const bon = [...staffel(1, 6, '2024-01-01'), ...staffel(2, 6, '2024-07-01')]
const vorh = new Map([[1, 'T1-1'], [2, 'T1-2'], [3, 'T1-3']])
const kette = tmdbFolgentitel(serie({ jpYear: 2024, episodes: 12 }), 'Beispielserie', { folgen: bon }, [], vorh)
pruefe('6 + 6 = 12 mit drei passenden Titeln: Nummer 7 ist Staffel 2 Folge 1', kette?.size === 12 && kette.get(7) === 'T2-1', kette && [...kette].slice(5, 8))
pruefe('ohne vorhandene Titel keine Verkettung', tmdbFolgentitel(serie({ jpYear: 2024, episodes: 12 }), 'Beispielserie', { folgen: bon }, [], new Map()) === undefined)
pruefe('Beginnjahr ohne Treffer (Staffel 1 beginnt 2024, wir 2023): nichts', tmdbFolgentitel(serie({ jpYear: 2023, episodes: 12 }), 'Beispielserie', { folgen: bon }, [], vorh) === undefined)
const verschoben = new Map([[1, 'T1-4'], [2, 'T1-5'], [3, 'T1-6']])
pruefe('vorhandene Titel gehören zu anderen Nummern (verschoben): nichts', tmdbFolgentitel(serie({ jpYear: 2024, episodes: 12 }), 'Beispielserie', { folgen: bon }, [], verschoben) === undefined)
pruefe('Summe passt nicht (11): nichts', tmdbFolgentitel(serie({ jpYear: 2024, episodes: 11 }), 'Beispielserie', { folgen: bon }, [], vorh) === undefined)

if (verletzt) {
  console.error(`\n${verletzt} Zusicherung(en) verletzt`)
  process.exit(1)
}
console.log('\nalle Zusicherungen gehalten')
