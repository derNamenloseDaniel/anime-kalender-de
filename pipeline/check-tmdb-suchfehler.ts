/**
 * Zusicherungen: Eine gescheiterte TMDB-Suche (Netz, 5xx, 429) wird nicht als „kein Treffer“ gespeichert, sondern als `suchfehler`,
 * und der Titel ist im nächsten Lauf wieder fällig (`lookup`, `faelligeTitel`). Aufruf: `npm run check:logic`.
 */
import type { Title } from '../shared/types.ts'
import { faelligeTitel } from './lib/tmdb-faellig.ts'
import { lookup } from './lib/tmdb-titel-lookup.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const TITEL = { id: 1, titleEn: 'Luck', titleRomaji: 'Rakku', jpYear: 2022, format: 'TV', episodes: 12 } as Title
const keinSchlaf = async (): Promise<void> => {}
/** `fehler`: welche Anfragen (nach Reihenfolge, ab 1) scheitern; `treffer`: Antwort der übrigen Suchen. */
function kulisse(fehler: number[], treffer: object[] = []): typeof import('./lib/util.ts').fetchJson {
  let n = 0
  return (async (url: string) => {
    if (!url.includes('/search/')) return { results: {} }
    n++
    if (fehler.includes(n)) throw new Error('503')
    return { results: treffer }
  }) as unknown as typeof import('./lib/util.ts').fetchJson
}

console.log('\nTMDB-Suchfehler: getrennt von „kein Treffer“')
const leer = await lookup('k', TITEL, kulisse([]), keinSchlaf)
pruefe('beide Suchen antworten leer: kein Treffer, kein Suchfehler', leer.miss === true && leer.suchfehler === undefined, leer)
const alleFehler = await lookup('k', TITEL, kulisse([1, 2]), keinSchlaf)
pruefe('beide Suchen scheitern: Suchfehler', alleFehler.miss === true && alleFehler.suchfehler === true, alleFehler)
const einerFehler = await lookup('k', TITEL, kulisse([1]), keinSchlaf)
pruefe('eine scheitert, die andere ist leer: Suchfehler (die verlorene Suche hätte treffen können)', einerFehler.suchfehler === true, einerFehler)
const treffer = { id: 9, name: 'Luck', original_name: 'Luck', first_air_date: '2022-04-01', genre_ids: [16], vote_count: 5 }
const gefunden = await lookup('k', TITEL, kulisse([2], [treffer]), keinSchlaf)
pruefe('eine scheitert, die andere trifft: Kennung, kein Suchfehler', gefunden.tmdbId === 9 && gefunden.suchfehler === undefined, gefunden)

console.log('\nTMDB-Suchfehler: Wiedervorlage')
const opt = { handIds: new Set<number>(), nurOhneEintrag: false, force: false, grenze: '2000-01-01T00:00:00.000Z', grenzeFehlschlag: '2000-01-01T00:00:00.000Z' }
const frisch = '2026-11-25T00:00:00.000Z'
const cache = { '1': { miss: true as const, suchfehler: true as const, fetchedAt: frisch }, '2': { miss: true as const, fetchedAt: frisch } }
const ids = faelligeTitel([{ id: 1 }, { id: 2 }], cache, opt).map((t) => t.id)
pruefe('frischer Suchfehler ist fällig, frischer Fehlschlag nicht', ids.join() === '1', ids)

if (verletzt) {
  console.error(`\n${verletzt} Zusicherung(en) verletzt.`)
  process.exit(1)
}
console.log('\nTMDB-Suchfehler: alle Zusicherungen grün.')
