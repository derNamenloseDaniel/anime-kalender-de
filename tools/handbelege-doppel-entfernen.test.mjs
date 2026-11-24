/**
 * Test für tools/handbelege-doppel-entfernen.mjs (Schreiben nach data/dub-confirmed.yaml): Doppel fallen ab dem zweiten weg,
 * Kommentare und Reihenfolge bleiben, die Gegenprobe der Menge hält, der Prozess schreibt nur ohne --trocken.
 * Aufruf: node tools/handbelege-doppel-entfernen.test.mjs
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { entferneDoppel } from './handbelege-doppel-entfernen.mjs'

const skript = join(dirname(fileURLToPath(import.meta.url)), 'handbelege-doppel-entfernen.mjs')

const A = '- anilistId: 900001\n  platform: netflix\n  dub: true'
const B = '- anilistId: 900002\n  platform: disney\n  dub: false'
const C = '- anilistId: 900003\n  platform: primevideo\n  note: "Amazon-Seite B0TEST0001"'
const EINGABE = `# Kopf\n${A}\n\n# Zwischen\n${B}\n\n${A}\n\n${C}\n\n${B}\n`

// Ab dem zweiten identischen Block fällt weg; Kommentare, Reihenfolge und erste Vorkommen bleiben
const r = entferneDoppel(EINGABE)
assert.equal(r.entfernt, 2)
assert.equal(r.neu, `# Kopf\n${A}\n\n# Zwischen\n${B}\n\n${C}\n`)
assert.equal((r.neu.match(/anilistId: 900001/g) ?? []).length, 1)
assert.equal((r.neu.match(/anilistId: 900002/g) ?? []).length, 1)
assert.equal((r.neu.match(/anilistId: 900003/g) ?? []).length, 1)
assert.equal(r.raus.filter((z) => z.startsWith('#')).length, 2, 'Kommentarzeilen bleiben')
assert.ok(r.neu.indexOf('900001') < r.neu.indexOf('900002') && r.neu.indexOf('900002') < r.neu.indexOf('900003'), 'Reihenfolge')

// Gleiche Kennung, aber anderer Inhalt ist kein Doppel (nur textgleiche Blöcke fallen)
const verschieden = entferneDoppel(`${A}\n${A.replace('dub: true', 'dub: false')}\n`)
assert.equal(verschieden.entfernt, 0)
assert.equal(verschieden.neu, `${A}\n${A.replace('dub: true', 'dub: false')}\n`)

// Nachlaufende Leerzeichen am Zeilenende zählen nicht als Unterschied
assert.equal(entferneDoppel(`${A}\n${A.replace('netflix', 'netflix   ')}\n`).entfernt, 1)

// Ohne Doppel bleibt der Text byte-gleich; leere Eingabe wirft nicht
const ohne = `# x\n${A}\n\n${B}\n`
assert.deepEqual([entferneDoppel(ohne).neu, entferneDoppel(ohne).entfernt], [ohne, 0])
assert.equal(entferneDoppel('').entfernt, 0)

// Prozess im Wegwerf-Ordner: --trocken schreibt nicht, ohne Schalter wird geschrieben, zweiter Lauf ist ruhig
const wurzel = mkdtempSync(join(tmpdir(), 'hdoppel-'))
try {
  mkdirSync(join(wurzel, 'data'))
  const datei = join(wurzel, 'data', 'dub-confirmed.yaml')
  writeFileSync(datei, EINGABE)
  const lauf = (...args) => spawnSync(process.execPath, [skript, ...args], { cwd: wurzel, encoding: 'utf8', timeout: 30000, windowsHide: true })
  const trocken = lauf('--trocken')
  assert.equal(trocken.status, 0, trocken.stderr)
  assert.match(trocken.stdout, /Belege vorher 5, nachher 3, entfernt 2/)
  assert.match(trocken.stdout, /Menge der Belege unverändert: ja \(3 verschiedene\)/)
  assert.match(trocken.stdout, /\(trocken — nichts geschrieben\)/)
  assert.equal(readFileSync(datei, 'utf8'), EINGABE, '--trocken lässt die Datei unberührt')
  const echt = lauf()
  assert.equal(echt.status, 0, echt.stderr)
  assert.match(echt.stdout, /data\/dub-confirmed\.yaml geschrieben/)
  assert.equal(readFileSync(datei, 'utf8'), r.neu)
  const zweit = lauf()
  assert.match(zweit.stdout, /entfernt 0/)
  assert.equal(readFileSync(datei, 'utf8'), r.neu, 'zweiter Lauf ändert nichts')
} finally {
  rmSync(wurzel, { recursive: true, force: true })
}

console.log('handbelege-doppel-entfernen.test.mjs ok')
