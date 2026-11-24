/**
 * Test für tools/extension-lade-reihenfolge.mjs: Die echte `extension/manifest.json` lädt jeden `globalThis.ak…`-Schreiber
 * vor seinen Ladezeit-Lesern; Brüche (Schreiber später, Schreiber fehlt, Leser in Funktion, sofort aufgerufene Funktion)
 * an Fixtures mit je zwei Gliedern. Aufruf: node tools/extension-lade-reihenfolge.test.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ladeVerstoesse, ladeZugriffe } from './extension-lade-reihenfolge.mjs'

const ext = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'extension')
const manifest = JSON.parse(readFileSync(join(ext, 'manifest.json'), 'utf8'))
const echt = (datei) => readFileSync(join(ext, datei), 'utf8')

// Echter Stand: kein Verstoß, und die Prüfung hat Ladezeit-Leser gesehen (sonst wäre „leer“ nichts wert).
assert.deepEqual(ladeVerstoesse(manifest, echt), [], 'manifest.json lädt jeden Schreiber vor seinen Lesern')
const melder = ladeZugriffe(echt('melder.js'))
assert.ok(melder.liest.has('akKontext') && melder.liest.has('akNetflixStand'), 'melder.js liest akKontext und akNetflixStand beim Laden')
assert.ok(ladeZugriffe(echt('kontext.js')).schreibt.has('akKontext'), 'kontext.js setzt akKontext beim Laden')

// Zugriffsarten: Ladezeit, Funktionskörper, sofort aufgerufene Funktion, Vergleich ist kein Schreiben.
const z = ladeZugriffe(`
  globalThis.akA = () => globalThis.akInnen
  const x = globalThis.akB
  ;(() => { globalThis.akC = globalThis.akD })()
  ;(function () { globalThis.akE = 1 })()
  if (globalThis.akF === 1) globalThis.akG ??= 2
  function f() { return globalThis.akH }
  globalThis.keinAk = globalThis.akklein
  void function () { globalThis.akK = globalThis.akL }()
`)
assert.deepEqual([...z.schreibt].sort(), ['akA', 'akC', 'akE', 'akK'], 'Schreiber beim Laden (auch in sofort aufgerufenen Funktionen)')
assert.deepEqual([...z.liest].sort(), ['akB', 'akD', 'akF', 'akG', 'akL'], 'Leser beim Laden: nicht in Funktionskörpern, `??=` und `===` lesen')

// Fixtures: Gruppe mit drei Dateien (Schreiber, Leser, Leser), zweite Gruppe daneben.
const dateien = {
  'a.js': 'globalThis.akKontext = {}\n',
  'b.js': 'const k = globalThis.akKontext\nglobalThis.akZweit = 1\n',
  'c.js': 'const z = globalThis.akZweit\n',
  'spaet.js': 'globalThis.akSpaet = 1\n',
  'fuehrt.js': 'const s = globalThis.akSpaet\n',
  'nur-funktion.js': 'globalThis.holen = () => globalThis.akSpaet\n',
  'fremd.js': 'const s = globalThis.akKontext\n',
}
const lies = (d) => dateien[d]
const gruppe = (...js) => ({ content_scripts: [{ js }] })
assert.deepEqual(ladeVerstoesse(gruppe('a.js', 'b.js', 'c.js'), lies), [], 'Schreiber vor Lesern')
assert.deepEqual(ladeVerstoesse(gruppe('b.js', 'a.js', 'c.js'), lies), ['Gruppe 0: b.js liest beim Laden akKontext, das erst a.js setzt (später im Manifest)'], 'Schreiber hinter Leser')
assert.deepEqual(ladeVerstoesse(gruppe('c.js', 'a.js', 'b.js'), lies), ['Gruppe 0: c.js liest beim Laden akZweit, das erst b.js setzt (später im Manifest)'], 'zweiter Fall, nur c.js')
assert.deepEqual(ladeVerstoesse(gruppe('fuehrt.js', 'spaet.js'), lies), ['Gruppe 0: fuehrt.js liest beim Laden akSpaet, das erst spaet.js setzt (später im Manifest)'])
assert.deepEqual(ladeVerstoesse(gruppe('nur-funktion.js', 'spaet.js'), lies), [], 'Lesen in einer Funktion ist erst nach dem Laden')
assert.deepEqual(ladeVerstoesse(gruppe('spaet.js', 'fuehrt.js', 'spaet.js'), lies), [], 'derselbe Name zweimal: der erste Schreiber zählt')
// Gruppen sind getrennt: der Schreiber in Gruppe 0 hilft Gruppe 1 nicht.
const zwei = { content_scripts: [{ js: ['a.js', 'b.js'] }, { js: ['fremd.js', 'c.js'] }] }
assert.deepEqual(ladeVerstoesse(zwei, lies), [
  'Gruppe 1: fremd.js liest beim Laden akKontext, aber kein Skript der Gruppe setzt es',
  'Gruppe 1: c.js liest beim Laden akZweit, aber kein Skript der Gruppe setzt es',
], 'Schreiber in anderer Gruppe zählt nicht')
// Nicht-JS-Einträge (css) und fehlende Felder brechen nichts.
assert.deepEqual(ladeVerstoesse({ content_scripts: [{ js: ['a.js', 'x.css'] }, {}] }, lies), [])
assert.deepEqual(ladeVerstoesse({}, lies), [])
// Datei selbst: Schreiben und Lesen in einer Datei, Schreiber zuerst.
assert.deepEqual(ladeVerstoesse(gruppe('b.js'), lies), ['Gruppe 0: b.js liest beim Laden akKontext, aber kein Skript der Gruppe setzt es'])

console.log('extension-lade-reihenfolge.test: ok')
