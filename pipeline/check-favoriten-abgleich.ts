/**
 * Zusicherung (Daniel, 23.11.2026): Favoriten gleichen sich zwischen Geräten mit demselben Newsletter-Konto ab —
 * Handy und PC behalten, was sie je gemerkt haben; Entferntes einer Seite wirkt auf die andere.
 * Aufruf: `npm run check:logic`.
 */
import { readFileSync } from 'node:fs'
import { vereinigeFavoriten } from '../web/src/lib/favoriten-vereinigen.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}
const s = (a: number[]) => new Set(a)
const v = (b: number[] | null, l: number[], sv: number[]) => [...vereinigeFavoriten(b === null ? null : s(b), s(l), s(sv))].sort((x, y) => x - y)

console.log('\nFavoriten-Abgleich (Drei-Wege-Vereinigung):')
pruefe('Handy kennt nur Server, PC nur lokal: beide Listen vereint', JSON.stringify(v(null, [1, 2], [3])) === '[1,2,3]', v(null, [1, 2], [3]))
pruefe('Ohne Basis wird nie gelöscht', JSON.stringify(v(null, [], [5])) === '[5]')
pruefe('Server hat dazu (anderes Gerät): lokal übernimmt', JSON.stringify(v([1], [1], [1, 2])) === '[1,2]')
pruefe('Anderes Gerät hat entfernt: lokal entfernt ebenfalls', JSON.stringify(v([1, 2], [1, 2], [1])) === '[1]')
pruefe('Lokal entfernt, Server noch alt: bleibt entfernt', JSON.stringify(v([1, 2], [1], [1, 2])) === '[1]')
pruefe('Beide ergänzen verschieden: beides bleibt', JSON.stringify(v([1], [1, 2], [1, 3])) === '[1,2,3]')
pruefe('Negative Kennungen bleiben', JSON.stringify(v([-4], [-4, 7], [-4])) === '[-4,7]')

const app = readFileSync(new URL('../web/src/App.tsx', import.meta.url), 'utf8')
pruefe('App ruft useFavoritenAbgleich auf (sonst veraltet das zweite Gerät)', /useFavoritenAbgleich\(\)/.test(app))
if (verletzt) process.exit(1)
