/**
 * Test für tools/cr-laufend-nachtragen.ts (schreibt data/crunchyroll-dub.json): als echter Prozess im Wegwerf-Ordner mit eigenem
 * data/crunchyroll-raw; die Nummer kommt aus dem Archiv (de-DE-Fassung), Vorhandenes bleibt, --trocken schreibt nicht.
 * Aufruf: node tools/cr-laufend-nachtragen.test.mjs
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const werkzeuge = dirname(fileURLToPath(import.meta.url))
const skript = join(werkzeuge, 'cr-laufend-nachtragen.ts')
const TSX = createRequire(join(werkzeuge, '..', 'package.json')).resolve('tsx/cli')

const folge = (nr, guid) => ({ sequence_number: nr, versions: [{ audio_locale: 'ja-JP', guid: `ja-${guid}` }, { audio_locale: 'de-DE', guid }] })

const wurzel = mkdtempSync(join(tmpdir(), 'crlaufend-'))
try {
  mkdirSync(join(wurzel, 'data', 'crunchyroll-raw'), { recursive: true })
  const roh = (name, inhalt) => writeFileSync(join(wurzel, 'data', 'crunchyroll-raw', name), gzipSync(JSON.stringify(inhalt)))
  // S1: .de-Archiv gewinnt vor dem Gesamtarchiv (g1: 5 statt 99), verschachtelt; ja-JP-Fassung zählt nicht
  roh('S1.de.json.gz', { items: [{ seasons: [folge(5, 'g1'), folge(6, 'g2')] }] })
  roh('S1.json.gz', { items: [folge(99, 'g1'), folge(7, 'g3')] })
  // S2: nur das Gesamtarchiv
  roh('S2.json.gz', [folge(12, 'h1')])
  const serien = [
    { seriesId: 'S1', staffeln: [{ deutscheFolgen: [{ guid: 'g1' }, { guid: 'g2', laufend: 40 }, { guid: 'g3' }, { guid: 'g4' }, { guid: 'ja-g1' }] }] },
    { seriesId: 'S2', staffeln: [{ deutscheFolgen: [{ guid: 'h1' }, { guid: 'h2', laufend: 0 }] }, {}] },
    { staffeln: [{ deutscheFolgen: [{ guid: 'g1' }] }] },
    { seriesId: 'S3' },
  ]
  const datei = join(wurzel, 'data', 'crunchyroll-dub.json')
  const roheDatei = JSON.stringify({ serien }, null, 2)
  writeFileSync(datei, roheDatei)
  const lauf = (...args) => spawnSync(process.execPath, [TSX, skript, ...args], { cwd: wurzel, encoding: 'utf8', timeout: 60000, windowsHide: true })

  // --trocken: zählt, schreibt nicht
  const trocken = lauf('--trocken')
  assert.equal(trocken.status, 0, trocken.stderr)
  assert.match(trocken.stdout, /laufende Nummer nachgetragen: 3, im Archiv nicht gefunden: 2/)
  assert.equal(readFileSync(datei, 'utf8'), roheDatei)

  // Echter Lauf: g1 = 5 (.de vor Gesamtarchiv), g3 = 7 (Rückfall), h1 = 12; g2 (40) und h2 (0) bleiben; g4 und ja-g1 ohne Nummer; Serie ohne Kennung bleibt
  const echt = lauf()
  assert.equal(echt.status, 0, echt.stderr)
  assert.match(echt.stdout, /laufende Nummer nachgetragen: 3, im Archiv nicht gefunden: 2/)
  const nach = JSON.parse(readFileSync(datei, 'utf8')).serien
  assert.deepEqual(nach[0].staffeln[0].deutscheFolgen, [{ guid: 'g1', laufend: 5 }, { guid: 'g2', laufend: 40 }, { guid: 'g3', laufend: 7 }, { guid: 'g4' }, { guid: 'ja-g1' }])
  assert.deepEqual(nach[1].staffeln[0].deutscheFolgen, [{ guid: 'h1', laufend: 12 }, { guid: 'h2', laufend: 0 }])
  assert.deepEqual(nach[2], { staffeln: [{ deutscheFolgen: [{ guid: 'g1' }] }] }, 'Serie ohne seriesId bleibt')
  assert.deepEqual(nach[3], { seriesId: 'S3' })
  assert.equal(readFileSync(datei, 'utf8'), JSON.stringify({ serien: nach }, null, 2), 'Format wie vorher (2 Leerzeichen)')

  // Zweiter Lauf auf dem Ergebnis: nichts mehr zu tun, Datei unverändert
  const stand = readFileSync(datei, 'utf8')
  const zweit = lauf()
  assert.equal(zweit.status, 0, zweit.stderr)
  assert.match(zweit.stdout, /laufende Nummer nachgetragen: 0, im Archiv nicht gefunden: 2/)
  assert.equal(readFileSync(datei, 'utf8'), stand)
} finally {
  rmSync(wurzel, { recursive: true, force: true })
}

console.log('cr-laufend-nachtragen.test.mjs ok')
