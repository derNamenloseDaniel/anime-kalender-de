/** Test für tools/bilder-ordner.mjs: Prüfbilder gehen nur mit --docs nach docs/, sonst in den Temp-Ordner. */
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { bilderOrdner } from './bilder-ordner.mjs'

const wurzel = mkdtempSync(path.join(os.tmpdir(), 'bilder-ordner-test-'))
const unter = `bo-test-${process.pid}`
const log = console.log
console.log = () => {}
try {
  const alt = [...process.argv]
  const temp = bilderOrdner(wurzel, unter)
  assert.equal(temp, path.join(os.tmpdir(), unter), 'ohne --docs: Temp-Ordner')
  assert.ok(existsSync(temp), 'Ordner wird angelegt')
  assert.ok(!existsSync(path.join(wurzel, 'docs')), 'ohne --docs entsteht kein docs/')
  process.argv.push('--docs')
  const docs = bilderOrdner(wurzel, unter)
  assert.equal(docs, path.join(wurzel, 'docs'), 'mit --docs: docs/ der Wurzel')
  assert.ok(existsSync(docs))
  process.argv.length = 0
  process.argv.push(...alt)
  rmSync(temp, { recursive: true, force: true })
} finally {
  console.log = log
  rmSync(wurzel, { recursive: true, force: true })
}
console.log('bilder-ordner.test: ok')
