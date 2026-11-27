/** Test für tools/oder-true-ausnahmen.mjs: jede Ausnahme hat Grund und trifft eine echte Zeile der genannten Datei. */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { OHNE_BEFUND } from './oder-true-ausnahmen.mjs'

const wurzel = join(import.meta.dirname, '..')
assert.ok(OHNE_BEFUND.length > 10)
for (const e of OHNE_BEFUND) {
  assert.ok(e.grund && e.grund.split(/\s+/).length >= 3, `${e.datei}: Grund fehlt`)
  assert.ok(e.text.length > 3, `${e.datei}: Text zu kurz`)
  const pfad = join(wurzel, e.datei)
  assert.ok(existsSync(pfad), `${e.datei} existiert nicht mehr`)
  const zeilen = readFileSync(pfad, 'utf8').split(/\r?\n/).map((z) => z.trim())
  assert.ok(zeilen.some((z) => z.includes(e.text)), `${e.datei}: kein Treffer für „${e.text}“`)
}
console.log('oder-true-ausnahmen.test: ok')
