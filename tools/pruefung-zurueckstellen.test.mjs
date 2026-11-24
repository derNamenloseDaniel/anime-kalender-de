/**
 * Test für tools/pruefung-zurueckstellen.mjs (löscht Meldungen im Briefkasten über fetch): als echter Kindprozess mit einer Vorlade-Datei,
 * die `fetch` durch eine Attrappe ersetzt. Kein Netz, kein Token echt. Der Riegel `--wirklich-loeschen` und `--trocken` sind die Kernfälle.
 * Aufruf: node tools/pruefung-zurueckstellen.test.mjs
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const skript = join(dirname(fileURLToPath(import.meta.url)), 'pruefung-zurueckstellen.mjs')
const wurzel = mkdtempSync(join(tmpdir(), 'zurueck-'))

const VORLADE = `
import fs from 'node:fs'
const szenario = JSON.parse(fs.readFileSync(process.env.FAKE_SZENARIO, 'utf8'))
globalThis.fetch = async (url, opt = {}) => {
  fs.appendFileSync(process.env.FAKE_LOG, JSON.stringify({ url, methode: opt.method ?? 'GET', headers: opt.headers, body: opt.body ?? null }) + '\\n')
  if ((opt.method ?? 'GET') === 'DELETE') return { ok: true, status: 200, json: async () => ({ geloescht: szenario.geloescht }) }
  return { ok: szenario.getStatus === 200, status: szenario.getStatus, json: async () => ({ pruefungen: szenario.pruefungen }) }
}
`
writeFileSync(join(wurzel, 'vorlade.mjs'), VORLADE)

const ERSTE = { id: 4319, gemeldet_am: '2026-11-20T08:15:00Z', befund: 'dub', titel: 'Testserie Alpha', seiten_kennung: 'B0TESTAAA1', url: 'https://www.amazon.de/gp/video/detail/B0TESTAAA1' }
const MITTE = { id: 4325, gemeldet_am: '2026-11-21T09:30:00Z', befund: 'kein-dub', titel: 'Relight Beispiel', seiten_kennung: 'B0TESTBBB2', url: 'https://www.amazon.de/gp/video/detail/B0TESTBBB2' }
const LETZTE = { id: 4330, gemeldet_am: '2026-11-22T10:45:00Z', befund: 'dub', titel: 'Testserie Gamma', seiten_kennung: 'B0TESTCCC3', url: 'https://www.amazon.de/gp/video/detail/B0TESTCCC3' }
const PRUEFUNGEN = [ERSTE, MITTE, LETZTE]

let nr = 0
function lauf(args, szenario = {}, token = 'geheim-test') {
  const log = join(wurzel, `fetch${++nr}.log`)
  writeFileSync(join(wurzel, `s${nr}.json`), JSON.stringify({ pruefungen: PRUEFUNGEN, getStatus: 200, geloescht: 0, ...szenario }))
  const env = { ...process.env, FAKE_SZENARIO: join(wurzel, `s${nr}.json`), FAKE_LOG: log }
  if (token) env.LAUF_TOKEN = token
  else delete env.LAUF_TOKEN
  const r = spawnSync(process.execPath, ['--import', join(wurzel, 'vorlade.mjs'), skript, ...args], { encoding: 'utf8', timeout: 30000, windowsHide: true, env })
  const aufrufe = existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map((z) => JSON.parse(z)) : []
  return { r, aufrufe, loeschungen: aufrufe.filter((a) => a.methode === 'DELETE') }
}

try {
  // Ohne Token: Exit 1, kein Abruf
  {
    const { r, aufrufe } = lauf(['--offen'], {}, '')
    assert.equal(r.status, 1)
    assert.match(r.stderr, /LAUF_TOKEN fehlt/)
    assert.equal(aufrufe.length, 0)
  }

  // --offen: alle drei Meldungen, Abruf mit Bearer-Token, nichts gelöscht
  {
    const { r, aufrufe, loeschungen } = lauf(['--offen'])
    assert.equal(r.status, 0, r.stderr)
    assert.match(r.stdout, /3 Meldungen im Briefkasten/)
    for (const t of ['Testserie Alpha', 'Relight Beispiel', 'Testserie Gamma']) assert.ok(r.stdout.includes(t), t)
    assert.equal(aufrufe[0].url, 'https://newsletter.animekalender.workers.dev/pruefung')
    assert.deepEqual(aufrufe[0].headers, { Authorization: 'Bearer geheim-test' })
    assert.equal(loeschungen.length, 0)
  }

  // --suche: ohne Beachtung der Schreibweise, nur die mittlere Meldung passt
  {
    const { r, loeschungen } = lauf(['--suche', 'RELIGHT'])
    assert.equal(r.status, 0, r.stderr)
    assert.match(r.stdout, /1 von 3 passen auf „RELIGHT"/)
    assert.ok(r.stdout.includes('Relight Beispiel') && !r.stdout.includes('Testserie Alpha') && !r.stdout.includes('Testserie Gamma'))
    assert.equal(loeschungen.length, 0)
  }

  // Ohne Auftrag: Exit 1 mit Hilfetext
  {
    const { r, loeschungen } = lauf([])
    assert.equal(r.status, 1)
    assert.match(r.stderr, /Erwartet: --offen, --suche <text>, --zurueck <ids> oder --zurueck-adresse <url>/)
    assert.equal(loeschungen.length, 0)
  }

  // --zurueck ohne Bestätigung: zeigt die Vorschau, Exit 1, NICHTS gelöscht
  {
    const { r, loeschungen } = lauf(['--zurueck', '4319,4325'], { geloescht: 2 })
    assert.equal(r.status, 1)
    assert.match(r.stdout, /Trifft 2 offene Meldung\(en\)/)
    assert.ok(r.stdout.includes('Testserie Alpha') && r.stdout.includes('Relight Beispiel') && !r.stdout.includes('Testserie Gamma'))
    assert.match(r.stdout, /würden GELÖSCHT, nicht zurückgesetzt/)
    assert.equal(loeschungen.length, 0)
  }

  // --trocken (auch mit Bestätigung): Exit 0, nichts gelöscht
  for (const args of [['--zurueck', '4319', '--trocken'], ['--zurueck', '4319', '--trocken', '--wirklich-loeschen']]) {
    const { r, loeschungen } = lauf(args, { geloescht: 1 })
    assert.equal(r.status, 0, r.stderr)
    assert.match(r.stdout, /--trocken: nichts gelöscht\./)
    assert.equal(loeschungen.length, 0, args.join(' '))
  }

  // --zurueck mit Bestätigung: genau ein DELETE mit den Ids, Token im Kopf
  {
    const { r, loeschungen } = lauf(['--zurueck', '4319, 4325', '--wirklich-loeschen'], { geloescht: 2 })
    assert.equal(r.status, 0, r.stderr)
    assert.equal(loeschungen.length, 1)
    assert.equal(loeschungen[0].url, 'https://newsletter.animekalender.workers.dev/pruefung')
    assert.deepEqual(JSON.parse(loeschungen[0].body), { ids: [4319, 4325] })
    assert.deepEqual(loeschungen[0].headers, { 'Content-Type': 'application/json', 'X-Lauf-Token': 'geheim-test' })
    assert.match(r.stdout, /Gelöscht: 2 \(HTTP 200\)/)
  }

  // Ids: Nichtzahlen und 0 fallen weg
  {
    const { loeschungen } = lauf(['--zurueck', 'abc,0,4330', '--wirklich-loeschen'], { geloescht: 1 })
    assert.deepEqual(JSON.parse(loeschungen[0].body), { ids: [4330] })
  }

  // --zurueck-adresse: Treffer nur bei genau dieser Adresse, Rumpf mit url
  {
    const { r, loeschungen } = lauf(['--zurueck-adresse', MITTE.url, '--wirklich-loeschen'], { geloescht: 1 })
    assert.equal(r.status, 0, r.stderr)
    assert.match(r.stdout, /Trifft 1 offene Meldung\(en\)/)
    assert.ok(r.stdout.includes('Relight Beispiel') && !r.stdout.includes('Testserie Alpha'))
    assert.deepEqual(JSON.parse(loeschungen[0].body), { url: MITTE.url })
    const keine = lauf(['--zurueck-adresse', 'https://www.amazon.de/gp/video/detail/B0NIEMAND9'])
    assert.match(keine.r.stdout, /Trifft 0 offene Meldung\(en\)/)
    assert.equal(keine.loeschungen.length, 0)
  }

  // Briefkasten antwortet 500: Prozess bricht ab, nichts gelöscht
  {
    const { r, loeschungen } = lauf(['--zurueck', '4319', '--wirklich-loeschen'], { getStatus: 500 })
    assert.notEqual(r.status, 0)
    assert.match(r.stderr, /HTTP 500/)
    assert.equal(loeschungen.length, 0)
  }
} finally {
  rmSync(wurzel, { recursive: true, force: true })
}

console.log('pruefung-zurueckstellen.test.mjs ok')
