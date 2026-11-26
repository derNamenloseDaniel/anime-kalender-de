/**
 * Test für `tools/bau-vergleich-luecken.mjs`: neue, geänderte und
 * verschwundene Folgenlücken in `schedule.observed` von releases.json werden benannt.
 */
import assert from 'node:assert/strict'
import { lueckenDelta, luecken } from './bau-vergleich-luecken.mjs'

const termin = (slug, observed) => ({ slug, schedule: { observed } })
const text = (...e) => JSON.stringify(e)

assert.deepEqual(luecken({ 1: 'a', 2: 'b', 4: 'c' }), [3])
assert.deepEqual(luecken({ 5: 'a' }), [], 'eine Folge allein hat keine Lücke')
assert.deepEqual(luecken(undefined), [])

const lueckenlos = text(termin('x', { 1: 'a', 2: 'b', 3: 'c' }))
const mitLuecke = text(termin('x', { 1: 'a', 3: 'c' }))
assert.deepEqual(lueckenDelta(lueckenlos, mitLuecke), ['Folgenlücke neu: x ohne Folge 2'])
assert.deepEqual(lueckenDelta(mitLuecke, lueckenlos), ['Folgenlücke verschwunden: x ohne Folge 2'])
assert.deepEqual(lueckenDelta(mitLuecke, mitLuecke), [], 'gleiche Lücke ist keine Meldung')
assert.deepEqual(lueckenDelta(mitLuecke, text(termin('x', { 1: 'a', 4: 'c' }))), ['Folgenlücke geändert: x ohne Folge 2 → 2, 3'])
assert.deepEqual(lueckenDelta('kaputt', mitLuecke), ['Folgenlücke neu: x ohne Folge 2'], 'unlesbare Seite zählt als ohne Lücken')

const viele = (n) => text(termin('v', Object.fromEntries([[1, 'a'], [n + 2, 'b']])))
assert.deepEqual(lueckenDelta(lueckenlos, viele(7)), ['Folgenlücke neu: v ohne Folge 2, 3, 4, 5, 6, 7, … (7)'], 'mehr als sechs Nummern werden gekürzt, genau sechs nicht')
assert.deepEqual(lueckenDelta(lueckenlos, viele(6)), ['Folgenlücke neu: v ohne Folge 2, 3, 4, 5, 6, 7'])
const vieleTermine = text(...Array.from({ length: 22 }, (_, i) => termin(`t${i}`, { 1: 'a', 3: 'c' })))
const zeilen22 = lueckenDelta('[]', vieleTermine)
assert.equal(zeilen22.length, 21, 'höchstens 20 Zeilen plus Rest')
assert.equal(zeilen22[20], '… und 2 weitere Lücken')
assert.equal(lueckenDelta('[]', text(...Array.from({ length: 20 }, (_, i) => termin(`t${i}`, { 1: 'a', 3: 'c' })))).length, 20, 'genau 20 Zeilen bleiben ungekürzt')
assert.deepEqual(lueckenDelta('{}', '{"a":1}'), [], 'kein Array: nichts')
assert.deepEqual(luecken({ 1: 'a', 2: 'b' }), [], 'lückenlose Nachbarn')

console.log('bau-vergleich-luecken.test: ok')
