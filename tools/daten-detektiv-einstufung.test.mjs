/** Test für tools/daten-detektiv/einstufung.ts: Hebel = Wirkung × Sicherheit; Ausgangswerte der Tabelle. */
import assert from 'node:assert/strict'
import { EINSTUFUNG, hebel } from './daten-detektiv/einstufung.ts'

assert.equal(hebel('DD-01'), 3, 'Wirkung 3 × Sicherheit 1,0')
assert.ok(Math.abs(hebel('DD-02') - 3 * 0.86) < 1e-9)
assert.equal(hebel('DD-NIE'), 0.5, 'unbekannte Regel: 1 × 0,5')
for (const [id, e] of Object.entries(EINSTUFUNG)) {
  assert.ok([1, 2, 3].includes(e.wirkung), `${id}: Wirkung 1–3`)
  assert.ok(e.sicherheit >= 0 && e.sicherheit <= 1, `${id}: Sicherheit 0–1`)
  assert.ok(['hart', 'weich', 'nein'].includes(e.empfehlung), `${id}: Empfehlung`)
}
assert.ok(hebel('DD-01') > hebel('DD-22'), 'harte Falschaussage schlägt unsichere Regel')
console.log('daten-detektiv-einstufung.test: ok')
