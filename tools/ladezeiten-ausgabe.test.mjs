/** Test für tools/ladezeiten-ausgabe.mjs: Zeilen, Markdown-Tabelle und Ergebnisdatei samt Step-Summary (Temp-Ordner). */
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { alsMarkdown, ergebnisSchreiben, ergebnisZeilen } from './ladezeiten-ausgabe.mjs'

const medianVon = (w) => [...w].sort((a, b) => a - b)[Math.floor(w.length / 2)]
const werte = new Map([['Kalender sichtbar', [900, 700, 800]], ['Filter auf', [50]]])
const zeilen = ergebnisZeilen(werte, [{ name: 'Kalender sichtbar', grenze: 1500 }], medianVon)
assert.deepEqual(zeilen[0], { name: 'Kalender sichtbar', median: 800, min: 700, max: 900, grenze: 1500, werte: [900, 700, 800] })
assert.equal(zeilen[1].grenze, null, 'ohne Urteil keine Grenze')

const md = alsMarkdown(zeilen, 'KOPF')
assert.ok(md.startsWith('### Ladezeiten am Handy'))
assert.ok(md.includes('| Kalender sichtbar | 800 | 700–900 | 1500 |'))
assert.ok(md.includes('| Filter auf | 50 | 50–50 | – |'))

const ordner = mkdtempSync(join(tmpdir(), 'lz-ausgabe-'))
try {
  const datei = join(ordner, 'tief', 'ergebnis.json')
  const summary = join(ordner, 'summary.md')
  ergebnisSchreiben({ datei, zeilen, laufzeitS: 12, nurMessen: true, umgebung: { GITHUB_SHA: 'abcdef1234567890', GITHUB_RUN_ID: '77', GITHUB_STEP_SUMMARY: summary } })
  const stand = JSON.parse(readFileSync(datei, 'utf8'))
  assert.equal(stand.commit, 'abcdef1234567890')
  assert.equal(stand.lauf, '77')
  assert.equal(stand.nurMessen, true)
  assert.equal(stand.messgroessen.length, 2)
  assert.match(readFileSync(summary, 'utf8'), /Stand abcdef123 · nur gemessen, ohne Urteil/, 'Kopf: 9 Zeichen des Commits')
  ergebnisSchreiben({ datei, zeilen, laufzeitS: 1, nurMessen: false, umgebung: {} })
  const lokal = JSON.parse(readFileSync(datei, 'utf8'))
  assert.equal(lokal.commit, null)
  assert.equal(lokal.lauf, null)
} finally {
  rmSync(ordner, { recursive: true, force: true })
}
console.log('ladezeiten-ausgabe.test: ok')
