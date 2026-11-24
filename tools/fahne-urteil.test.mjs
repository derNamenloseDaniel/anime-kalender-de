/** Test für tools/fahne-urteil.mjs (die Browser-Messung dazu: tools/ansicht-fahne.mjs, Mutanten in tools/mutationen/fahne-handy.json):einzeilig bis kurzHoehe + Rundung, darüber Umbruch, ungültige Messung rot. Aufruf: node tools/fahne-urteil.test.mjs */
import assert from 'node:assert/strict'
import { BREITEN } from './ansicht-fahne.mjs'
import { RUNDUNG, urteilFahne } from './fahne-urteil.mjs'

assert.equal(RUNDUNG, 1)
assert.deepEqual(BREITEN, [360, 375], 'die Messung fährt beide Handybreiten')
// Fixtures je Rolle mit zwei Gliedern (360 und 375 px; Werte aus PR 4436: 16,5 einzeilig, 31,5 umgebrochen).
for (const breite of [360, 375]) {
  assert.deepEqual(urteilFahne({ schriftDa: true, kurzHoehe: 16.5, langHoehe: 16.5, breite }), [], `${breite}: gleiche Höhe ist einzeilig`)
  assert.deepEqual(urteilFahne({ schriftDa: true, kurzHoehe: 16.5, langHoehe: 17.5, breite }), [], `${breite}: genau Rundung darüber ist noch einzeilig`)
  assert.deepEqual(urteilFahne({ schriftDa: true, kurzHoehe: 16.5, langHoehe: 17.6, breite }), [`${breite} px: Fahne bricht um (17.6 px statt 16.5 px)`], `${breite}: knapp darüber ist rot`)
  assert.deepEqual(urteilFahne({ schriftDa: true, kurzHoehe: 16.5, langHoehe: 31.5, breite }), [`${breite} px: Fahne bricht um (31.5 px statt 16.5 px)`], `${breite}: Umbruch ist rot`)
}
assert.equal(urteilFahne({ schriftDa: true, kurzHoehe: 0, langHoehe: 0, breite: 360 }).length, 1, 'Höhe 0 (Fahne nicht sichtbar) ist rot')
assert.equal(urteilFahne({ schriftDa: true, kurzHoehe: NaN, langHoehe: 16, breite: 360 }).length, 1, 'ungemessen ist rot')
for (const schriftDa of [false, undefined]) {
  assert.deepEqual(urteilFahne({ schriftDa, kurzHoehe: 16.5, langHoehe: 16.5, breite: 360 }), ['360 px: Referenzschrift Liberation Sans fehlt, Messung wäre schriftabhängig'], `Schrift ${schriftDa}: rot trotz passender Höhe`)
}
console.log('fahne-urteil.test: ok')
