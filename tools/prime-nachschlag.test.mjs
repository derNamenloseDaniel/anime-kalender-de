/** Test für tools/prime-nachschlag.mjs: MAL-Kennung am Titel, IMDb-Kennung aus data/imdb-ids.json (Fixture-Wurzel in Temp). */
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { nachschlagVon } from './prime-nachschlag.mjs'

const wurzel = mkdtempSync(join(tmpdir(), 'prime-nachschlag-'))
const leer = mkdtempSync(join(tmpdir(), 'prime-nachschlag-leer-'))
try {
  mkdirSync(join(wurzel, 'data'))
  writeFileSync(join(wurzel, 'data/imdb-ids.json'), JSON.stringify({ 123: 'tt0000123' }))
  const nach = nachschlagVon(wurzel)
  assert.deepEqual(nach({ malId: 123 }), { malId: 123, imdb: 'tt0000123' })
  assert.deepEqual(nach({ malId: 999 }), { malId: 999 }, 'ohne IMDb-Treffer nur MAL')
  assert.deepEqual(nach({}), {}, 'ohne MAL-Kennung nichts')
  assert.deepEqual(nach(undefined), {})
  assert.deepEqual(nachschlagVon(leer)({ malId: 123 }), { malId: 123 }, 'ohne Datei bleibt es bei MAL')
} finally {
  rmSync(wurzel, { recursive: true, force: true })
  rmSync(leer, { recursive: true, force: true })
}
console.log('prime-nachschlag.test: ok')
