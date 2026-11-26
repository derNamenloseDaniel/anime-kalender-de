/**
 * Test für `tools/bau-vergleich-luecken.mjs` und seine Einbindung in `beschreibeDatei` (bau-vergleich): neue, geänderte und
 * verschwundene Folgenlücken in `schedule.observed` von releases.json werden benannt.
 */
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { lueckenDelta, luecken } from './bau-vergleich-luecken.mjs'
import { beschreibeDatei } from './bau-vergleich-stand.mjs'

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

// Einbindung: beschreibeDatei nennt die Lücke bei releases.json, bei anderen Dateien nicht.
const kontext = { git: () => '', basis: 'b', glatt: (s) => s, eigene: new Set(['public/data/releases.json']) }
const wurzel = mkdtempSync(join(tmpdir(), 'luecken-test-'))
try {
  const [a, b] = [join(wurzel, 'a'), join(wurzel, 'b')]
  for (const [o, t] of [[a, lueckenlos], [b, mitLuecke]]) {
    mkdirSync(join(o, 'public/data'), { recursive: true })
    writeFileSync(join(o, 'public/data/releases.json'), t)
  }
  const zeilen = beschreibeDatei(kontext, a, b, 'public/data/releases.json')
  assert.ok(zeilen.includes('Folgenlücke neu: x ohne Folge 2'), `releases.json meldet die Lücke: ${zeilen.join(' | ')}`)
} finally {
  rmSync(wurzel, { recursive: true, force: true })
}
console.log('bau-vergleich-luecken.test: ok')
