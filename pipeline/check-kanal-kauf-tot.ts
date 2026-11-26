/**
 * Kanal- und Kaufwege aus aniSearch (`09-6-3`) gehen nie auf eine Adresse, die die Linkprüfung als tot kennt
 * (Wächter-Fund aus `check-wege-stellen-istot.ts`: `09-6-1` fragte `lautPruefungTot`, `09-6-3` nicht).
 * Je Fall eine tote Adresse und ihre lebende Zwillingsadresse als Kontrolle.
 *
 * Aufruf: npm run check:logic (steckt darin) oder `tsx pipeline/check-kanal-kauf-tot.ts`
 */
import type { Title } from '../shared/types.ts'
import { ergaenzeKanalUndKaufWege } from './bau/09-6-3-kanal-kauf.ts'
import type { AnisearchEintrag } from './bau/01-quellen.ts'

const TOT = 'https://www.amazon.de/dp/B000000TOT'
const LEBT = 'https://www.amazon.de/dp/B000000OK1'

const titel = (id: number): Title => ({ id, streams: [], watchLinks: [] }) as unknown as Title
const quellen = (url: string): AnisearchEintrag => ({ streams: [{ provider: 'amazon-de', url }] }) as unknown as AnisearchEintrag

const t1 = titel(1)
const t2 = titel(2)
ergaenzeKanalUndKaufWege({
  titles: new Map([[1, t1], [2, t2]]),
  anisearch: { 1: quellen(TOT), 2: quellen(LEBT) },
  checks: new Map(),
  adressKern: (u) => u,
  frueherEntfernt: { has: () => false },
  lautPruefungTot: (u) => u === TOT,
})

let verletzt = 0
function pruefe(name: string, ok: boolean): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}`)
}
pruefe('tote Adresse wird kein Kaufweg', (t1.watchLinks ?? []).length === 0)
pruefe('lebende Zwillingsadresse bleibt Kaufweg', (t2.watchLinks ?? []).map((w) => w.url).join() === LEBT)
if (verletzt) process.exit(1)
