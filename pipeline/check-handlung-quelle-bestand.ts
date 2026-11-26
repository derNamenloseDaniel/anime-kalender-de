/**
 * Zusicherung am gebauten Bestand (24.11.2026): jede ausgelieferte Handlung (`public/data/synopses/`) und jeder Cartoon (`cartoons.json`,
 * `titles-core.json`) hat eine titelgenaue Quelle, nie die Startseite eines Anbieters. Liest `public/data` und gehört deshalb in
 * `check:bestand`; die Fälle ohne Bestand stehen in `check-handlung-quelle.ts`.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { ausgelieferteCartoons, handlungQuellenFehler } from './lib/handlung-quellen.ts'
import { melde } from './lib/quarantaene.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const lies = <T>(pfad: string): T => JSON.parse(readFileSync(new URL(`../public/data/${pfad}`, import.meta.url), 'utf8')) as T
const synopsen: Record<string, { de?: string; deSource?: { name: string; url: string } }> = {}
for (const g of readdirSync(new URL('../public/data/synopses/', import.meta.url))) Object.assign(synopsen, lies(`synopses/${g}`))
const bestand = handlungQuellenFehler(synopsen, ausgelieferteCartoons(lies<{ id: number }[]>('cartoons.json'), lies<{ id: number }[]>('titles-core.json')))
// Titelmarke je Fund: der Bestandsbau stellt nur diese Titel zurück, statt ganz zu sperren.
for (const f of bestand) {
  const id = /^(?:Handlung|Cartoon) (-?\d+)/.exec(f)?.[1]
  if (id !== undefined) melde(Number(id), 'handlung-quelle', f)
}
pruefe('Bestand: keine Handlung ohne titelgenaue Quelle', bestand.length === 0, bestand.slice(0, 3))
pruefe('Bestand gelesen (Synopsen vorhanden)', Object.keys(synopsen).length > 1000, Object.keys(synopsen).length)

console.log(`VERSTÖSSE: ${verletzt}`)
if (verletzt) process.exit(1)
