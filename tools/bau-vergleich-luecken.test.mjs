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
  // Andere Dateien melden keine Lücken, news.json weiter nur ihr News-Delta.
  for (const [o, t] of [[a, lueckenlos], [b, mitLuecke]]) writeFileSync(join(o, 'public/data/titles.json'), t)
  assert.ok(!beschreibeDatei(kontext, a, b, 'public/data/titles.json').some((z) => z.includes('Folgenlücke')), 'titles.json meldet keine Lücke')
  const news = (titel) => JSON.stringify([{ am: '2026-11-01', titelId: 1, titel, meldungen: titel ? [{ art: 'neu' }] : [] }])
  writeFileSync(join(a, 'public/data/news.json'), news(''))
  writeFileSync(join(b, 'public/data/news.json'), news('T'))
  const newsZeilen = beschreibeDatei(kontext, a, b, 'public/data/news.json')
  assert.ok(newsZeilen.some((z) => z.startsWith('news.json je Titel: 1 neu')), 'news.json meldet ihr News-Delta')
  assert.ok(!newsZeilen.some((z) => z.includes('Folgenlücke')), 'news.json meldet keine Lücke')
  // Fehlt releases.json auf einer Seite, gilt der Stand der Basis (hier leer): die Lücke steht trotzdem da.
  rmSync(join(a, 'public/data/releases.json'))
  assert.ok(beschreibeDatei(kontext, a, b, 'public/data/releases.json').includes('Folgenlücke neu: x ohne Folge 2'), 'fehlende Seite gilt als ohne Lücken')
} finally {
  rmSync(wurzel, { recursive: true, force: true })
}
console.log('bau-vergleich-luecken.test: ok')
