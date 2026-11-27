/** Test für tools/daten-detektiv/regel.ts: der Regel-Bauer legt die Felder an die richtige Stelle. */
import assert from 'node:assert/strict'
import { regel } from './daten-detektiv/regel.ts'

const t = [{ schluessel: 'a', text: 'A widerspricht B', ort: '/r/a/' }]
const r = regel('DD-99', 'Name', 'Folge für Besucher', 42, t)
assert.deepEqual(r, { id: 'DD-99', name: 'Name', folge: 'Folge für Besucher', geprueft: 42, treffer: t })
assert.equal(regel('X', 'n', 'f', 0, []).treffer.length, 0)
console.log('daten-detektiv-regel.test: ok')
