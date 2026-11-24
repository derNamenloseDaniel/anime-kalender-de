/**
 * Test für tools/beleg-adresse-nachtragen.mjs (Schreiben nach data/dub-confirmed.yaml): nur Prime-Belege ohne url bekommen die Adresse
 * aus ihrer eigenen Notiz, alles andere bleibt Byte für Byte; der Prozess schreibt nur mit --schreiben.
 * Aufruf: node tools/beleg-adresse-nachtragen.test.mjs
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ergaenzeAdressen } from './beleg-adresse-nachtragen.mjs'

const skript = join(dirname(fileURLToPath(import.meta.url)), 'beleg-adresse-nachtragen.mjs')

const PRIME_OHNE = '- anilistId: 900001\n  platform: primevideo\n  dub: false\n  note: "Amazon-Seite B0TEST0001: alle 0 Folgen geprueft"'
const PRIME_OHNE_2 = '- anilistId: 900002\n  platform: primevideo\n  dub: false\n  note: "Amazon-Seite B0TEST0002: Folge 1"'
const PRIME_MIT = '- anilistId: 900003\n  platform: primevideo\n  url: https://www.amazon.de/gp/video/detail/B0TEST0003\n  note: "Amazon-Seite B0TEST0003: ok"'
const NETFLIX = '- anilistId: 900004\n  platform: netflix\n  note: "Amazon-Seite B0TEST0004: fremde Notiz"'
const OHNE_NOTIZ = '- anilistId: 900005\n  platform: primevideo\n  note: "kein Verweis"'
const ZU_KURZ = '- anilistId: 900006\n  platform: primevideo\n  note: "Amazon-Seite B0KURZ: zu kurz"'
const EINGABE = [PRIME_OHNE, PRIME_MIT, NETFLIX, OHNE_NOTIZ, PRIME_OHNE_2, ZU_KURZ].join('\n')

const r = ergaenzeAdressen(EINGABE)
assert.equal(r.bloecke.length, 6)
assert.equal(r.ergaenzt, 2)
assert.equal(r.hatteSchon, 1)
assert.equal(r.ohneKennung, 2, 'ohne Notiz und mit zu kurzer Kennung (unter 8 Zeichen)')
// Die Adresse steht direkt hinter `platform:`, mit der Kennung genau aus der eigenen Notiz
assert.equal(r.neu[0], '- anilistId: 900001\n  platform: primevideo\n  url: https://www.amazon.de/gp/video/detail/B0TEST0001\n  dub: false\n  note: "Amazon-Seite B0TEST0001: alle 0 Folgen geprueft"')
assert.equal(r.neu[4], '- anilistId: 900002\n  platform: primevideo\n  url: https://www.amazon.de/gp/video/detail/B0TEST0002\n  dub: false\n  note: "Amazon-Seite B0TEST0002: Folge 1"')
// Unberührt: Beleg mit url, Netflix-Beleg mit Amazon-Notiz, ohne Kennung, zu kurze Kennung
for (const i of [1, 2, 3, 5]) assert.equal(r.neu[i], r.bloecke[i], `Block ${i} unverändert`)
assert.ok(!r.neu[2].includes('url:'), 'Netflix-Beleg bekommt keine Amazon-Adresse')

// Zweiter Lauf auf dem Ergebnis ergänzt nichts mehr
const zweit = ergaenzeAdressen(r.neu.join('\n'))
assert.equal(zweit.ergaenzt, 0)
assert.equal(zweit.hatteSchon, 3)
assert.equal(zweit.neu.join('\n'), r.neu.join('\n'))

// Leere Eingabe
const leer = ergaenzeAdressen('')
assert.deepEqual([leer.ergaenzt, leer.hatteSchon, leer.ohneKennung], [0, 0, 1], 'leere Eingabe = ein leerer Block ohne Kennung')

// Prozess im Wegwerf-Ordner: ohne Schalter nur zählen, mit --schreiben schreiben
const wurzel = mkdtempSync(join(tmpdir(), 'badresse-'))
try {
  mkdirSync(join(wurzel, 'data'))
  const datei = join(wurzel, 'data', 'dub-confirmed.yaml')
  writeFileSync(datei, EINGABE)
  const lauf = (...args) => spawnSync(process.execPath, [skript, ...args], { cwd: wurzel, encoding: 'utf8', timeout: 30000, windowsHide: true })
  const trocken = lauf()
  assert.equal(trocken.status, 0, trocken.stderr)
  assert.match(trocken.stdout, /6 Belege gelesen/)
  assert.match(trocken.stdout, /2 bekommen die Adresse/)
  assert.match(trocken.stdout, /Trockenlauf/)
  assert.equal(readFileSync(datei, 'utf8'), EINGABE, 'ohne --schreiben bleibt die Datei')
  const echt = lauf('--schreiben')
  assert.equal(echt.status, 0, echt.stderr)
  assert.match(echt.stdout, /data\/dub-confirmed\.yaml geschrieben/)
  assert.equal(readFileSync(datei, 'utf8'), r.neu.join('\n'))
} finally {
  rmSync(wurzel, { recursive: true, force: true })
}

console.log('beleg-adresse-nachtragen.test.mjs ok')
