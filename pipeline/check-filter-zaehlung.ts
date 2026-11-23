/**
 * Zusicherungen zur Zählung an den Chips des Filterfensters (`web/src/lib/filter-zaehlung.ts`, Filterkonzept S5, 23.11.2026):
 * ein Titel zählt je Chip einmal, auch wenn mehrere Wege ihn tragen; Yaiba (Disc ×2, Joyn, TV) zählt bei Disc, Joyn und TV je 1.
 * Aufruf: `npm run check:logic`.
 */
import type { Release, Title } from '../shared/types.ts'
import { zaehleFilterGen } from '../web/src/lib/filter-zaehlung.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const HEUTE = '2026-11-23'
let nr = 0
const titel = (teil: Partial<Title> = {}): Title =>
  ({ id: ++nr, titleDe: `T${nr}`, genres: [], keywords: [], streams: [], dubConfidence: 'high', format: 'TV', ...teil }) as unknown as Title
const release = (t: Title, platform: string, releaseType: string, year = 2026): Release =>
  ({ slug: `${t.id}-${platform}-${releaseType}-${year}`, titleId: t.id, name: `T${t.id}`, platform, releaseType, year, schedule: { firstEpisodeDate: `${year}-01-01` } }) as unknown as Release

const yaiba = titel()
const nurNetflix = titel({ keywords: ['Cartoon'] })
const ohneWeg = titel()
const rs = new Map<number, Release[]>([
  [yaiba.id, [release(yaiba, 'disc', 'disc', 2024), release(yaiba, 'disc', 'disc', 2025), release(yaiba, 'joyn', 'weekly'), release(yaiba, 'tv', 'weekly')]],
  [nurNetflix.id, [release(nurNetflix, 'netflix', 'weekly')]],
])
const z = (() => {
  const gen = zaehleFilterGen([yaiba, nurNetflix, ohneWeg], rs, HEUTE)
  for (;;) {
    const r = gen.next()
    if (r.done) return r.value
  }
})()

console.log('\nZählung an den Chips:')
pruefe('Disc zählt Yaiba einmal, nicht je Disc-Release', z.platforms.get('disc') === 1, z.platforms.get('disc'))
pruefe('Netflix 1, Joyn 1, TV 1', z.platforms.get('netflix') === 1 && z.platforms.get('joyn') === 1 && z.platforms.get('tv') === 1)
pruefe('Art weekly zählt zwei Titel, Art disc einen', z.releaseTypes.get('weekly') === 2 && z.releaseTypes.get('disc') === 1)
pruefe('Schnellchips: Disc 1, TV 1, Cartoon 1', z.schnell.disc === 1 && z.schnell.tv === 1 && z.schnell.cartoon === 1, z.schnell)
pruefe('Titel ohne Weg erzeugt keine Plattformzahl', ![...z.platforms.keys()].includes('' as never))

if (verletzt) {
  console.error(`\n${verletzt} Zusicherung(en) verletzt.`)
  process.exit(1)
}
console.log('\nZählung an den Chips: alle Zusicherungen erfüllt.')
