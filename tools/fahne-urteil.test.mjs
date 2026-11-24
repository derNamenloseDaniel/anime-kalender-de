/** Test für tools/fahne-urteil.mjs (die Browser-Messung dazu: tools/ansicht-fahne.mjs, Mutanten in tools/mutationen/fahne-handy.json):einzeilig bis kurzHoehe + Rundung, darüber Umbruch, ungültige Messung rot. Aufruf: node tools/fahne-urteil.test.mjs */
import assert from 'node:assert/strict'
import { BREITEN } from './ansicht-fahne.mjs'
import { montagDerWoche, RUNDUNG, urteilFahne, wocheAb } from './fahne-urteil.mjs'

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
// Start der Wochensuche aus fester Uhr (Europe/Berlin; 23.11.2026 ist ein Montag, 01.01.2027 ein Freitag).
const um = (jahr, monat, tag, std, min) => Date.UTC(jahr, monat - 1, tag, std, min)
assert.equal(montagDerWoche(um(2026, 11, 23, 12, 0)), '2026-11-23', 'Montag selbst')
assert.equal(montagDerWoche(um(2026, 11, 25, 12, 0)), '2026-11-23', 'Wochenmitte')
assert.equal(montagDerWoche(um(2026, 11, 29, 12, 0)), '2026-11-23', 'Sonntag gehört zur Woche davor')
assert.equal(montagDerWoche(um(2026, 11, 30, 12, 0)), '2026-11-30', 'nächster Montag')
assert.equal(montagDerWoche(um(2027, 1, 1, 12, 0)), '2026-12-28', 'Jahreswechsel: Freitag 01.01.2027')
assert.equal(montagDerWoche(um(2026, 12, 31, 12, 0)), '2026-12-28', 'Jahreswechsel: Donnerstag 31.12.2026')
assert.equal(montagDerWoche(um(2026, 11, 29, 23, 30)), '2026-11-30', 'Sonntag 23:30 UTC ist in Berlin schon Montag')
assert.equal(montagDerWoche(um(2026, 11, 22, 23, 30)), '2026-11-23', 'Sonntag 23:30 UTC (Berlin Montag 00:30) liegt in der Woche ab 23.11., nicht 16.11.')
assert.equal(wocheAb('2026-12-28', 0), '2026-12-28')
assert.equal(wocheAb('2026-12-28', 1), '2027-01-04', 'eine Woche weiter über den Jahreswechsel')
assert.equal(wocheAb('2026-11-23', 16), '2027-03-15', 'sechzehn Wochen')
console.log('fahne-urteil.test: ok')
