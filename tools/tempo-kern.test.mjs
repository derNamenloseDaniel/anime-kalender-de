/** Test für tools/tempo-kern.mjs: Median und die Auslieferung eines Build-Ordners unter der Live-Adresse (Attrappen, kein Browser). */
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { BASIS, ausDistLiefern, median } from './tempo-kern.mjs'

assert.equal(median([3, 1, 2]), 2)
assert.equal(median([5, 1, 9, 3]), 5, 'gerade Zahl: das obere mittlere Element')
assert.equal(median([7]), 7)
const roh = [3, 1, 2]
median(roh)
assert.deepEqual(roh, [3, 1, 2], 'Eingabe bleibt unsortiert')

const dist = mkdtempSync(join(tmpdir(), 'tempo-kern-'))
try {
  writeFileSync(join(dist, 'index.html'), '<h1>start</h1>')
  mkdirSync(join(dist, 'data'))
  writeFileSync(join(dist, 'data/woche.json'), '{"a":1}')
  writeFileSync(join(dist, 'x.unbekannt'), 'roh')
  let handler
  await ausDistLiefern({ route: async (muster, h) => { assert.equal(muster, `${BASIS}**`); handler = h } }, dist)
  const lauf = async (url) => {
    const r = {}
    await handler({ request: () => ({ url: () => url }), fulfill: async (o) => (r.fulfill = o), continue: async () => (r.weiter = true) })
    return r
  }
  const start = await lauf(`${BASIS}`)
  assert.equal(start.fulfill.contentType, 'text/html')
  assert.equal(String(start.fulfill.body), '<h1>start</h1>', 'Wurzel liefert index.html')
  assert.equal((await lauf(`${BASIS}data/woche.json`)).fulfill.contentType, 'application/json')
  assert.equal((await lauf(`${BASIS}x.unbekannt`)).fulfill.contentType, 'application/octet-stream', 'unbekannte Endung')
  assert.equal((await lauf(`${BASIS}fehlt.js`)).weiter, true, 'fehlende Datei geht ins Netz')
  assert.equal((await lauf(`${BASIS}ohne-endung`)).weiter, true, 'Pfad ohne Endung geht ins Netz (Cover u. a.)')
  assert.equal((await lauf(`${BASIS}data`)).weiter, true, 'ein Ordner ohne Endung wird nicht gelesen')
} finally {
  rmSync(dist, { recursive: true, force: true })
}
console.log('tempo-kern.test: ok')
