/**
 * Test für tools/cache-holen.mjs (gh-Aufrufe, schreibt in den Cache-Ordner): als echter Kindprozess mit einer Vorlade-Datei,
 * die `gh` (execFileSync) durch eine Attrappe ersetzt und die Uhr festsetzt (2026-11-23T12:00:00Z). Kein Netz.
 * Aufruf: node tools/cache-holen.test.mjs
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const skript = join(dirname(fileURLToPath(import.meta.url)), 'cache-holen.mjs')
const wurzel = mkdtempSync(join(tmpdir(), 'cacheholen-'))

// Vorlade-Datei: feste Uhr, gh-Attrappe (Szenario aus FAKE_SZENARIO, Protokoll nach FAKE_LOG)
const VORLADE = `
import cp from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { syncBuiltinESMExports } from 'node:module'
const JETZT = Date.parse('2026-11-23T12:00:00Z')
Date.now = () => JETZT
const szenario = JSON.parse(fs.readFileSync(process.env.FAKE_SZENARIO, 'utf8'))
let angestossen = false
const protokoll = (a) => fs.appendFileSync(process.env.FAKE_LOG, JSON.stringify(a) + '\\n')
cp.execFileSync = (cmd, args) => {
  protokoll([cmd, ...args])
  if (cmd !== 'gh') throw new Error('unerwarteter Befehl ' + cmd)
  if (args[0] === 'api') {
    if (szenario.apiFehler) throw new Error(szenario.apiFehler)
    return JSON.stringify({ artifacts: angestossen ? szenario.nach : szenario.vor })
  }
  if (args[0] === 'workflow' && args[1] === 'run') { angestossen = true; return '' }
  if (args[0] === 'run' && args[1] === 'list') return JSON.stringify([{ databaseId: 777, createdAt: '2026-11-23T11:59:59Z' }])
  if (args[0] === 'run' && args[1] === 'watch') return ''
  if (args[0] === 'run' && args[1] === 'download') {
    const ziel = args[args.indexOf('-D') + 1]
    fs.writeFileSync(path.join(ziel, 'anilist-katalog.json'), '{"geholtAm": "2026-11-23T11:00:00Z"}')
    fs.writeFileSync(path.join(ziel, 'neu.json'), '{"lauf": ' + args[2] + '}')
    return ''
  }
  throw new Error('unerwarteter gh-Aufruf ' + args.join(' '))
}
syncBuiltinESMExports()
`
const vorlade = join(wurzel, 'vorlade.mjs')
writeFileSync(vorlade, VORLADE)

const artefakt = (lauf, angelegt, extra = {}) => ({ expired: false, workflow_run: { id: lauf }, created_at: angelegt, size_in_bytes: 2097152, ...extra })

let nr = 0
/** Fährt das Werkzeug mit einem Szenario; liefert Ergebnis, Protokoll der gh-Aufrufe und den Zielordner. */
function lauf(szenario, args = [], vorbereiten = () => {}) {
  const ordner = join(wurzel, `l${++nr}`)
  mkdirSync(ordner)
  const ziel = join(ordner, 'cache')
  vorbereiten(ziel, ordner)
  writeFileSync(join(ordner, 'szenario.json'), JSON.stringify(szenario))
  const log = join(ordner, 'gh.log')
  const r = spawnSync(process.execPath, ['--import', vorlade, skript, '--ziel', ziel, ...args], {
    encoding: 'utf8',
    timeout: 30000,
    windowsHide: true,
    env: { ...process.env, FAKE_SZENARIO: join(ordner, 'szenario.json'), FAKE_LOG: log },
  })
  const aufrufe = existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map((z) => JSON.parse(z)) : []
  return { r, aufrufe, ziel }
}
const art = (aufrufe) => aufrufe.map((a) => a.slice(1, 3).join(' '))

try {
  // A: frisches Artefakt (6 h) vorhanden; abgelaufenes Neueres wird übersprungen, das jüngste gültige gewinnt (Lauf 555, nicht 333)
  {
    const { r, aufrufe, ziel } = lauf(
      { vor: [artefakt(111, '2026-11-23T10:00:00Z', { expired: true }), artefakt(555, '2026-11-23T06:00:00Z'), artefakt(333, '2026-11-22T06:00:00Z')] },
      [],
      (z) => { mkdirSync(z, { recursive: true }); writeFileSync(join(z, 'bleibt.json'), 'alt'); writeFileSync(join(z, 'anilist-katalog.json'), '{"geholtAm": "2026-11-20T12:00:00Z"}') },
    )
    assert.equal(r.status, 0, r.stderr)
    assert.match(r.stdout, /Vorher:  Katalog geholt 2026-11-20 12:00 UTC, vor 3\.0 Tagen/)
    assert.match(r.stdout, /Artefakt: 2 MB, angelegt 2026-11-23 06:00 UTC, vor 6\.0 h \(Lauf 555\)/)
    assert.match(r.stdout, /Nachher: Katalog geholt 2026-11-23 11:00 UTC, vor 1\.0 h/)
    assert.deepEqual(art(aufrufe), ['api repos/derNamenloseDaniel/anime-kalender-de/actions/artifacts?name=data-cache&per_page=10', 'run download'])
    assert.deepEqual(aufrufe[1].slice(0, 7), ['gh', 'run', 'download', '555', '--repo', 'derNamenloseDaniel/anime-kalender-de', '-n'])
    assert.equal(aufrufe[1][7], 'data-cache')
    assert.equal(readFileSync(join(ziel, 'neu.json'), 'utf8'), '{"lauf": 555}')
    assert.equal(readFileSync(join(ziel, 'bleibt.json'), 'utf8'), 'alt', 'Dateien außerhalb des Artefakts bleiben liegen')
  }

  // B: Artefakt 48 h alt (über 24 h): Workflow wird angestoßen, abgewartet, das neue (Lauf 888) geholt
  {
    const { r, aufrufe } = lauf({ vor: [artefakt(555, '2026-11-21T12:00:00Z')], nach: [artefakt(888, '2026-11-23T11:59:00Z')] })
    assert.equal(r.status, 0, r.stderr)
    assert.match(r.stdout, /stoße cache-ablegen\.yml an/)
    assert.match(r.stdout, /\(Lauf 888\)/)
    assert.deepEqual(art(aufrufe).map((s) => s.split('?')[0].replace(/^api .*artifacts$/, 'api')), ['api', 'workflow run', 'run list', 'run watch', 'api', 'run download'])
    assert.deepEqual(aufrufe[1], ['gh', 'workflow', 'run', 'cache-ablegen.yml', '--repo', 'derNamenloseDaniel/anime-kalender-de'])
    assert.deepEqual(aufrufe[3], ['gh', 'run', 'watch', '777', '--repo', 'derNamenloseDaniel/anime-kalender-de', '--exit-status'])
    assert.equal(aufrufe[5][3], '888')
  }

  // Grenze: genau 24 h gilt noch als frisch, knapp darüber nicht; --max-alter verschiebt die Grenze
  {
    const genau = lauf({ vor: [artefakt(555, '2026-11-22T12:00:00Z')] })
    assert.equal(genau.r.status, 0, genau.r.stderr)
    assert.ok(!art(genau.aufrufe).includes('workflow run'), 'genau 24 h: kein neuer Lauf')
    const knapp = lauf({ vor: [artefakt(555, '2026-11-22T11:59:00Z')], nach: [artefakt(888, '2026-11-23T11:59:00Z')] })
    assert.ok(art(knapp.aufrufe).includes('workflow run'), 'über 24 h: neuer Lauf')
    const lang = lauf({ vor: [artefakt(555, '2026-11-21T12:00:00Z')] }, ['--max-alter', '72'])
    assert.ok(!art(lang.aufrufe).includes('workflow run'), '48 h bei --max-alter 72: kein neuer Lauf')
    const kurz = lauf({ vor: [artefakt(555, '2026-11-23T06:00:00Z')], nach: [artefakt(888, '2026-11-23T11:59:00Z')] }, ['--max-alter', '5'])
    assert.ok(art(kurz.aufrufe).includes('workflow run'), '6 h bei --max-alter 5: neuer Lauf')
    const name = lauf({ vor: [artefakt(555, '2026-11-23T06:00:00Z')] }, ['--name', 'anderes'])
    assert.match(name.aufrufe[0][2], /name=anderes&/)
    assert.equal(name.aufrufe[1][7], 'anderes')
  }

  // Kein gültiges Artefakt, auch nach dem Lauf nicht: Exit 1 mit Meldung, nichts geholt
  {
    const { r, aufrufe, ziel } = lauf({ vor: [artefakt(555, '2026-11-20T12:00:00Z', { expired: true })], nach: [] })
    assert.equal(r.status, 1)
    assert.match(r.stderr, /Artefakt „data-cache" fehlt auch nach dem Lauf/)
    assert.ok(!art(aufrufe).includes('run download'))
    assert.ok(!existsSync(ziel), 'Ziel bleibt unberührt')
  }

  // gh-Fehler: Exit 1, Ursache im Wortlaut auf stderr
  {
    const { r } = lauf({ apiFehler: 'HTTP 403: rate limit exceeded' })
    assert.equal(r.status, 1)
    assert.match(r.stderr, /HTTP 403: rate limit exceeded/)
  }

  // Ziel ist ein Symlink/Junction: Exit 1, kein gh-Aufruf, fremder Ordner bleibt leer
  {
    let uebersprungen = false
    const fremd = join(wurzel, 'fremd')
    mkdirSync(fremd)
    try {
      const { r, aufrufe } = lauf({ vor: [artefakt(555, '2026-11-23T06:00:00Z')] }, [], (z) => symlinkSync(fremd, z, 'junction'))
      assert.equal(r.status, 1)
      assert.match(r.stderr, /ist ein Junction\/Symlink/)
      assert.equal(aufrufe.length, 0)
      assert.ok(!existsSync(join(fremd, 'neu.json')))
    } catch (e) {
      if (e?.code !== 'EPERM') throw e
      uebersprungen = true
    }
    if (uebersprungen) console.log('Symlink-Fall übersprungen (EPERM beim Anlegen)')
  }
} finally {
  rmSync(wurzel, { recursive: true, force: true })
}

console.log('cache-holen.test.mjs ok')
