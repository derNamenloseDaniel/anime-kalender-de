/**
 * Zusicherung: reine aniSearch-Zeilen tragen die Genres aus `g` (`data/anisearch-eintraege.json`) über die Zuordnungstabelle
 * `pipeline/lib/anisearch-genres.ts` (Mängelart genre, Lösungskarte 21.11.2026); nicht zuordenbare Genres stehen gezählt im Baulog, und der
 * Sammler schreibt `g` in neue Einträge. Der Bau läuft wirklich (`ergaenzeAnisearchTitel`) auf den echten Einträgen; in `check:logic`.
 *
 * Aufruf: npx tsx pipeline/check-anisearch-genres.ts
 */
import { ergaenzeAnisearchTitel } from './bau/anisearch-titel.ts'
import { kompakt } from './fetch-anisearch-eintraege.ts'
import { GENRE_DE } from '../shared/mappings.ts'
import type { Title } from '../shared/types.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}
const BASIS = 10_000_000

console.log('\nAnlegen der aniSearch-Zeilen (echte Einträge):')
const zeilen = new Map<number, Title>()
const baulog: string[] = []
const echtesLog = console.log
console.log = (...a: unknown[]) => void baulog.push(a.join(' '))
try {
  ergaenzeAnisearchTitel(zeilen, new Map(), new Map())
} finally {
  console.log = echtesLog
}
const genres = (asId: number) => zeilen.get(BASIS + asId)?.genres
pruefe('Gosho Aoyama’s Collection of Short Stories (2), 5879 „Actionkomödie“ → Action, Comedy', JSON.stringify(genres(5879)) === '["Action","Comedy"]', genres(5879))
pruefe('Baki: Staatsfeind Nummer 1, 15206 „Fighting-Shounen“ → Action, Shounen', JSON.stringify(genres(15206)) === '["Action","Shounen"]', genres(15206))
pruefe('Reporter Blues, 3873 „Krimi“ → Crime', JSON.stringify(genres(3873)) === '["Crime"]', genres(3873))
pruefe('Gegenprobe: Kickers (Harry-Episoden), 13694 „Ganbatte“ → keins', JSON.stringify(genres(13694)) === '[]', genres(13694))
pruefe('Gegenprobe: Es war einmal … der Mensch, 4749 „Unbestimmt“ → keins', JSON.stringify(genres(4749)) === '[]', genres(4749))
pruefe('Gegenprobe: 9970 mit leerem g → keins', JSON.stringify(genres(9970)) === '[]', genres(9970))
const zeile = baulog.find((z) => z.includes('Titel nur bei aniSearch ergänzt')) ?? ''
pruefe('Baulog zählt die nicht zuordenbaren Genres mit Namen (Ganbatte, Unbestimmt)', /aniSearch-Genre ohne Zuordnung: .*Ganbatte ×\d+/.test(zeile) && /Unbestimmt ×\d+/.test(zeile), zeile.slice(-120))

console.log('\nZuordnungstabelle (anisearch-genres):')
try {
  const { ANISEARCH_GENRE, genresAusAnisearch, genreLueckenText } = await import('./lib/anisearch-genres.ts')
  const fremd = Object.values(ANISEARCH_GENRE).flat().filter((g) => !(g in GENRE_DE))
  pruefe('jedes Ziel ist ein vorhandener Genre-Name (GENRE_DE), keiner erfunden', fremd.length === 0, fremd)
  const luecken = new Map<string, number>()
  pruefe('zwei Genres, ohne Doppelte', JSON.stringify(genresAusAnisearch(['Actionkomödie', 'Komödie'], luecken)) === '["Action","Comedy"]')
  pruefe('ohne g → keins', genresAusAnisearch(undefined, luecken).length === 0)
  genresAusAnisearch(['Neu', 'Ganbatte'], luecken)
  genresAusAnisearch(['Romanze', 'Ganbatte'], luecken)
  pruefe('Lücken je Name gezählt, häufigste zuerst', genreLueckenText(luecken) === 'aniSearch-Genre ohne Zuordnung: Ganbatte ×2, Neu ×1', genreLueckenText(luecken))
  pruefe('ohne Lücke: eigener Text', genreLueckenText(new Map()) === 'jedes aniSearch-Genre zugeordnet')
} catch (fehler) {
  pruefe('Zuordnungstabelle lädt', false, String(fehler))
}

console.log('\nSammler (kompakt):')
const roh = { id: 900_501, title: 'Probe', type: 'TV-Serie', genres: { main: ['Actionkomödie'] } } as Parameters<typeof kompakt>[0]
pruefe('neuer Eintrag trägt g aus genres.main', JSON.stringify(kompakt(roh).g) === '["Actionkomödie"]', kompakt(roh).g)

if (verletzt) {
  console.error(`\n${verletzt} Zusicherung(en) verletzt.`)
  process.exit(1)
}
console.log('\nAlle Zusicherungen erfüllt.')
