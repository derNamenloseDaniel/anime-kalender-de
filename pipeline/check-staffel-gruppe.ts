/**
 * Zusicherung: der optionale Eingang `gruppe` (Staffel und Teil des Anbieters) in `staffelBeschriftungen()`/`staffelStaende()`.
 * Ohne `gruppe` bleibt die Ausgabe wie sie war (JoJo Steel Ball Run, PR 5261). Läuft in `check:logic`.
 */
import { staffelBeschriftungen, staffelStaende } from '../shared/titles.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const REIHE = "JoJo's Bizarre Adventure"
const sbr = [
  { id: 1, name: REIHE, jpStart: '2012-10-06' },
  { id: 2, name: `${REIHE}: Stardust Crusaders`, jpStart: '2014-03-31' },
  { id: 3, name: `${REIHE}: Steel Ball Run - Phase 1`, jpStart: '2026-03-01' },
  { id: 4, name: `${REIHE}: Steel Ball Run - Phase 2-3`, jpStart: '2026-04-01' },
]
const stone = [
  { id: 10, name: REIHE, jpStart: '2012-10-06' },
  { id: 11, name: `${REIHE} Staffel 2`, jpStart: '2014-03-31' },
  { id: 12, name: `${REIHE}: Stone Ocean`, jpStart: '2021-12-01' },
  { id: 13, name: `${REIHE}: Stone Ocean Part 2`, jpStart: '2022-09-01' },
]

console.log('\nOhne gruppe unverändert (Steel Ball Run, PR 5261):')
{
  const stand = staffelStaende(sbr, REIHE)
  pruefe('Phase 1 = 7.1, Phase 2-3 = 7.2–3', stand.get(3)?.teil === 1 && stand.get(4)?.teil === 2 && stand.get(4)?.teilBis === 3, [...stand])
  const mitLeerer = staffelBeschriftungen(sbr.map((m) => ({ ...m, gruppe: undefined })), REIHE)
  pruefe('gruppe: undefined gleich fehlendes Feld', JSON.stringify([...mitLeerer]) === JSON.stringify([...staffelBeschriftungen(sbr, REIHE)]), [...mitLeerer])
}

console.log('\nMit gruppe gilt Staffel und Teil des Anbieters:')
{
  const mit = stone.map((m) => (m.id >= 12 ? { ...m, gruppe: { nr: 3, teil: m.id - 11 } } : m))
  const be = staffelBeschriftungen(mit, REIHE)
  pruefe('Stone Ocean: Staffel 3 - Teil 1 und Teil 2', be.get(12) === 'Staffel 3 - Teil 1' && be.get(13) === 'Staffel 3 - Teil 2', [...be])
  const stand = staffelStaende(mit, REIHE)
  pruefe('Stände: beide Teile in Staffel 3, ohne eigenen Namen', [12, 13].every((id) => stand.get(id)?.staffel === 3 && stand.get(id)?.eigenerName === false), [...stand])
  pruefe('Eintrag ohne gruppe zählt weiter nach Name', be.get(11) === 'Staffel 2', [...be])
}

if (verletzt) {
  console.error(`\n${verletzt} Zusicherung(en) verletzt`)
  process.exit(1)
}
console.log('\nOK')
