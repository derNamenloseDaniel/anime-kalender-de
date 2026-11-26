/**
 * Gegenprobe zu tools/title-tooltips.mjs: `title` an nativen Elementen, `x.title =` und `setAttribute('title')` zählen,
 * Props eigener Komponenten, Strings, Kommentare und Tests nicht, `title-ok:` gilt nur als Kommentar mit Grund,
 * die Grenze macht rot, wenn sie überschritten wird, und `--festschreiben` senkt und erhöht nie.
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const werkzeug = join(dirname(fileURLToPath(import.meta.url)), 'title-tooltips.mjs')
const ordner = mkdtempSync(join(tmpdir(), 'title-tooltips-'))

const lauf = (quelle, grenzen, ...optionen) => spawnSync(process.execPath, [werkzeug, '--quelle', quelle, '--grenzen', grenzen, ...optionen], { encoding: 'utf8', windowsHide: true, timeout: 30000 })
const git = (wurzel, ...args) => spawnSync('git', ['-C', wurzel, ...args], { encoding: 'utf8', windowsHide: true, timeout: 30000 })

function baum(name, dateien) {
  const wurzel = join(ordner, name)
  mkdirSync(wurzel, { recursive: true })
  assert.equal(git(wurzel, 'init', '-q').status, 0)
  for (const [pfad, text] of Object.entries(dateien)) {
    mkdirSync(dirname(join(wurzel, pfad)), { recursive: true })
    writeFileSync(join(wurzel, pfad), text)
  }
  assert.equal(git(wurzel, 'add', '-A').status, 0)
  return wurzel
}

const grenzen = (n) => {
  const datei = join(ordner, `grenzen-${n}-${Math.random().toString(36).slice(2)}.json`)
  writeFileSync(datei, JSON.stringify({ erlaubt: n }))
  return datei
}

let zaehler = 0
/** Fundstellen einer einzelnen Quelle in web/src (Grenze 99, damit nur --liste zählt). */
const funde = (text, datei = 'web/src/a.tsx') => {
  const antwort = lauf(baum(`f${zaehler++}`, { [datei]: text }), grenzen(99), '--liste')
  assert.equal(antwort.status, 0, antwort.stderr)
  return antwort.stdout.split('\n').filter(Boolean)
}

// Zählt, mit der richtigen Zeile.
assert.deepEqual(funde('const a = <button title="x">a</button>'), ['web/src/a.tsx:1'])
assert.deepEqual(funde('const a = (\n  <a\n    href="#"\n    title={t("k")}\n  />\n)'), ['web/src/a.tsx:4'])
assert.deepEqual(funde('el.title = "x"', 'web/src/a.ts'), ['web/src/a.ts:1'])
assert.deepEqual(funde("el.setAttribute('title', 'x')", 'web/src/a.ts'), ['web/src/a.ts:1'])
assert.deepEqual(funde('document.title = tab', 'web/src/lib/b.ts'), ['web/src/lib/b.ts:1'])

// Zählt nicht: eigene Komponenten, Strings, Kommentare, andere Attribute, Tests, Dateien außerhalb von web/src.
assert.deepEqual(funde('const a = <Button title="x" />'), [])
assert.deepEqual(funde('const a = <Chip title={t("k")}>a</Chip>'), [])
assert.deepEqual(funde('const s = \'<button title="x">\' // title="x"'), [])
assert.deepEqual(funde('const a = <button aria-label="x" data-hinweis="x" />'), [])
assert.deepEqual(funde('const a = <button title="x" />', 'web/src/a.test.tsx'), [])
assert.deepEqual(funde('const a = <button title="x" />', 'tools/a.tsx'), [])

// `title-ok:` nimmt die Zeile aus, aber nur als Kommentar mit Grund.
assert.deepEqual(funde('const a = <iframe title="x" /> // title-ok: Name des iframe'), [])
assert.deepEqual(funde('const a = <iframe\n  title="x" // title-ok: Name des iframe\n/>'), [])
assert.deepEqual(funde('const a = <iframe title="x" /> // title-ok:'), ['web/src/a.tsx:1'])
assert.deepEqual(funde('const a = <iframe title="x" /> // title-ok'), ['web/src/a.tsx:1'])
assert.deepEqual(funde('const a = <iframe title="title-ok: nein" />'), ['web/src/a.tsx:1'])
assert.deepEqual(funde('// title-ok: Grund\nconst a = <iframe title="x" />'), ['web/src/a.tsx:2'])

// Grenze: gleich ist grün, drüber rot; --festschreiben senkt, erhöht nie.
const zwei = baum('grenze', { 'web/src/a.tsx': 'const a = <b title="x" />\nconst b = <i title="y" />' })
assert.equal(lauf(zwei, grenzen(2)).status, 0)
const rot = lauf(zwei, grenzen(1))
assert.equal(rot.status, 1)
assert.match(rot.stderr, /2 statt höchstens 1/)
const sinkt = grenzen(5)
assert.equal(lauf(zwei, sinkt, '--festschreiben').status, 0)
assert.equal(JSON.parse(readFileSync(sinkt, 'utf8')).erlaubt, 2)
const bleibt = grenzen(1)
assert.equal(lauf(zwei, bleibt, '--festschreiben').status, 1)
assert.equal(JSON.parse(readFileSync(bleibt, 'utf8')).erlaubt, 1)

console.log('title-tooltips.test.mjs: ok')
