/** Test für tools/daten-detektiv/wache.ts: neue Funde, Festschreiben und Lesen/Schreiben der Bekannt-Liste (Fixture in Temp). */
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { WEICHE_REGELN, festzuschreiben, ladeBekannt, neueFunde, schreibeBekannt } from './daten-detektiv/wache.ts'

const tr = (k) => ({ schluessel: k, text: `Text ${k}` })
const regeln = [
  { id: 'DD-02', name: 'a', folge: 'f', geprueft: 3, treffer: [tr('b'), tr('a'), tr('neu')] },
  { id: 'DD-01', name: 'hart', folge: 'f', geprueft: 3, treffer: [tr('hart1')] },
  { id: 'DD-17', name: 'c', folge: 'f', geprueft: 1, treffer: [] },
]
assert.ok(WEICHE_REGELN.includes('DD-02') && !WEICHE_REGELN.includes('DD-01'))

const bekannt = { 'DD-02': ['a', 'b'] }
assert.deepEqual(neueFunde(regeln, bekannt), [{ id: 'DD-02', schluessel: 'neu', text: 'Text neu' }], 'nur der unbekannte Schlüssel einer weichen Regel')
assert.deepEqual(neueFunde(regeln, { 'DD-02': ['a', 'b', 'neu'] }), [], 'alles bekannt: grün')

assert.deepEqual(festzuschreiben(regeln, bekannt, false), { 'DD-02': ['a', 'b'] }, 'ohne Aufnahme bleibt es beim Bekannten (sortiert, ohne harte Regel)')
assert.deepEqual(festzuschreiben(regeln, bekannt, true), { 'DD-02': ['a', 'b', 'neu'] }, 'mit Aufnahme kommt der neue Schlüssel dazu')
assert.deepEqual(festzuschreiben([{ ...regeln[0], treffer: [] }], bekannt, true), {}, 'Regel ohne Treffer fällt aus der Liste')

const ordner = mkdtempSync(join(tmpdir(), 'dd-wache-'))
try {
  const pfad = join(ordner, 'bekannt.json')
  assert.deepEqual(ladeBekannt(pfad), {}, 'fehlende Datei = leer')
  schreibeBekannt({ 'DD-02': ['x'] }, pfad)
  assert.ok(readFileSync(pfad, 'utf8').endsWith('}\n'), 'Datei endet mit Zeilenumbruch')
  assert.deepEqual(ladeBekannt(pfad), { 'DD-02': ['x'] }, 'Rundlauf')
} finally {
  rmSync(ordner, { recursive: true, force: true })
}
console.log('daten-detektiv-wache.test: ok')
