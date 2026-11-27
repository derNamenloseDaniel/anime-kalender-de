/** Test für tools/trefferprobe-ausnahmen.mjs: jede Ausnahme nennt Wähler und Grund, nichts pauschal. */
import assert from 'node:assert/strict'
import { AUSNAHMEN } from './trefferprobe-ausnahmen.mjs'

assert.ok(AUSNAHMEN.length >= 1, 'mindestens die Tastatur-Karte ist ausgenommen')
for (const a of AUSNAHMEN) {
  assert.equal(typeof a.waehler, 'string')
  assert.ok(a.waehler.length > 3 && a.waehler !== '*', `Wähler nicht pauschal: ${a.waehler}`)
  assert.ok(a.grund.split(/\s+/).length >= 5, `Grund ausführlich: ${a.waehler}`)
}
assert.equal(new Set(AUSNAHMEN.map((a) => a.waehler)).size, AUSNAHMEN.length, 'kein Wähler doppelt')
assert.ok(AUSNAHMEN.some((a) => a.waehler === 'button.ak-oeffnen.sr-only'), 'der unsichtbare Öffnen-Knopf bleibt ausgenommen')
console.log('trefferprobe-ausnahmen.test: ok')
