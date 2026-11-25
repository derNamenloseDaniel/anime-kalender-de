/**
 * `quellen_pruefen_main` (tools/quellen-pruefen.sh) verschluckt keinen Fehler mehr per `|| true`:
 * Exit 1 der Prüfung auf main ist der Befund (Liste auf stdout), ein fehlender Arbeitsbaum oder Exit > 1 steht auf stderr.
 * Echtes git in Wegwerf-Repos unter os.tmpdir(); die Prüfung ist ein Wegwerf-Befehl (`QUELLEN_PRUEFBEFEHL`).
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const skript = join(dirname(fileURLToPath(import.meta.url)), 'quellen-pruefen.sh').replace(/\\/g, '/')
const ordner = mkdtempSync(join(tmpdir(), 'quellen-pruefen-main-'))
const posix = (p) => p.replace(/\\/g, '/')

const git = (cwd, ...args) => spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd, encoding: 'utf8', windowsHide: true, timeout: 60_000 })

/** Repo mit (mitMain) oder ohne `origin/main`; liefert den Arbeitsordner. */
function repo(name, mitMain) {
  const d = join(ordner, name)
  assert.equal(git(ordner, 'init', '-q', '-b', 'main', d).status, 0)
  assert.equal(git(d, 'commit', '-q', '--allow-empty', '-m', 'start').status, 0)
  if (mitMain) assert.equal(git(d, 'update-ref', 'refs/remotes/origin/main', 'HEAD').status, 0)
  return d
}

/** Ruft `quellen_pruefen_main` im Repo auf; `vorher` ist Shell-Text vor dem Aufruf (Attrappen). */
function main(cwd, befehl, vorher = '') {
  const r = spawnSync('bash', ['-c', `source "${skript}"\n${vorher}\nquellen_pruefen_main`], {
    cwd,
    encoding: 'utf8',
    windowsHide: true,
    timeout: 120_000,
    env: { ...process.env, QUELLEN_PRUEFBEFEHL: befehl },
  })
  return { status: r.status, out: r.stdout, err: r.stderr }
}

try {
  const rot = 'echo "  - tools/a.ts"; exit 1'

  // Rote Prüfung auf main: Befund auf stdout, keine Fehlermeldung (Exit 1 ist erwartet).
  const a = main(repo('rot', true), rot)
  assert.equal(a.status, 0, a.err)
  assert.equal(a.out, '  - tools/a.ts\n', 'Befund von main steht auf stdout')
  assert.ok(!/konnte nicht laufen|Kein Arbeitsbaum/.test(a.err), `Exit 1 ist kein Fehler: ${a.err}`)

  // Grüne Prüfung auf main: nichts auf stdout.
  const b = main(repo('gruen', true), 'true')
  assert.equal(b.status, 0, b.err)
  assert.equal(b.out, '')
  assert.ok(!/konnte nicht laufen|Kein Arbeitsbaum/.test(b.err), b.err)

  // Kein origin/main: Arbeitsbaum fehlt, die Meldung steht auf stderr, Basis leer, kein Abbruch.
  const c = main(repo('ohne-main', false), rot)
  assert.equal(c.status, 0, c.err)
  assert.match(c.out, /^Basis nicht prüfbar: kein Arbeitsbaum/, 'ohne Arbeitsbaum läuft die Prüfung nirgends, der Grund steht auf stdout')
  assert.match(c.err, /Kein Arbeitsbaum für origin\/main; der Vergleich gilt ohne Basis\./)

  // Arbeitsbaum lässt sich nicht betreten (git meldet Erfolg, legt aber nichts an): Exit 2 sichtbar, Prüfung läuft nicht im falschen Ordner.
  const attrappe = 'git() {\n  if [ "$1" = worktree ] && [ "$2" = add ]; then return 0; fi\n  command git "$@"\n}'
  const d = main(repo('kein-ordner', true), rot, attrappe)
  assert.equal(d.status, 0, d.err)
  assert.match(d.out, /^Basis nicht prüfbar: .*Exit 2/, 'die Prüfung darf nicht im Arbeitsordner des Aufrufers laufen')
  assert.match(d.err, /Die Prüfung auf main konnte nicht laufen \(Exit 2\); der Vergleich gilt ohne Basis\./)

  // Vergleich je Prüfdatei (25.11.2026): `npx tsx <datei>` ist eine Attrappe, die die Datei mit bash ausführt; main trägt rote, grüne, hängende und nicht startende Dateien.
  const bin = join(ordner, 'bin')
  mkdirSync(bin)
  writeFileSync(join(bin, 'npx'), '#!/bin/bash\n[ "$1 $2" = "--no-install tsx" ] || exit 99\nexec bash "$3"\n', { mode: 0o755 })
  const dateien = { 'rot.ts': 'exit 1', 'gruen.ts': 'exit 0', 'haengt.ts': 'sleep 30', 'startet-nicht.ts': 'exit 127' }
  const repoMitDateien = (name, ohneModule = false) => {
    const r = repo(name, false)
    for (const [datei, inhalt] of Object.entries(dateien)) writeFileSync(join(r, datei), `${inhalt}\n`)
    assert.equal(git(r, 'add', '.').status, 0)
    assert.equal(git(r, 'commit', '-q', '-m', 'dateien').status, 0)
    assert.equal(git(r, 'update-ref', 'refs/remotes/origin/main', 'HEAD').status, 0)
    if (!ohneModule) mkdirSync(join(r, 'node_modules'))
    return r
  }
  /** `quellen_neue_fehler` mit dem Fund (Zeilen `  - <datei>`) ohne QUELLEN_PRUEFBEFEHL, mit der Attrappe vorn im PATH. */
  const neu = (cwd, fund, frist = '60') => {
    const r = spawnSync('bash', ['-c', `source "${skript}"\nquellen_neue_fehler "$FUND"`], {
      cwd,
      encoding: 'utf8',
      windowsHide: true,
      timeout: 120_000,
      env: { ...process.env, PATH: `${posix(bin)}:${process.env.PATH}`, FUND: fund, QUELLEN_PRUEFFRIST: frist, QUELLEN_PRUEFBEFEHL: '' },
    })
    assert.equal(r.status, 0, r.stderr)
    return r.stdout
  }

  // Basis hat dieselbe rote Datei: nicht neu. Basis grün (oder Datei gibt es auf main nicht): neu.
  const e = repoMitDateien('dateien')
  assert.equal(neu(e, '  - rot.ts'), '', 'auf main schon rot → nicht neu')
  assert.equal(neu(e, '  - gruen.ts'), '  - gruen.ts\n', 'auf main grün → neu')
  assert.equal(neu(e, '  - gibt-es-nicht.ts'), '  - gibt-es-nicht.ts\n', 'nicht auf main → neu')
  assert.equal(neu(e, '  - rot.ts\n  - gruen.ts'), '  - gruen.ts\n', 'gemischt: nur die neue bleibt')

  // Basis nicht prüfbar (Frist, Start, Module fehlen): alles bleibt rot, der Grund steht als erste Zeile.
  const frist = neu(e, '  - haengt.ts\n  - rot.ts', '1')
  assert.match(frist, /^Vergleich mit main nicht möglich, alle roten Prüfungen gelten als neu\. Basis nicht prüfbar: .*haengt\.ts.*Frist/, frist)
  assert.ok(frist.endsWith('  - haengt.ts\n  - rot.ts\n'), 'alle Zeilen des Funds bleiben stehen')
  assert.match(neu(e, '  - startet-nicht.ts'), /Basis nicht prüfbar: startet-nicht\.ts startete nicht \(Exit 127\)/)
  assert.match(neu(repoMitDateien('ohne-module', true), '  - rot.ts'), /Basis nicht prüfbar: node_modules fehlt/)
  // Eine Frist-Zeile des Funds selbst (keine Liste) bleibt unverändert und ohne Vergleich.
  assert.equal(neu(e, 'Die Prüfung brauchte länger als 600 s und wurde abgebrochen.'), 'Die Prüfung brauchte länger als 600 s und wurde abgebrochen.\n')

  console.log('quellen-pruefen-main: 11 Fälle grün (rot, grün, ohne main, Ordner fehlt, je Datei rot/grün/fehlt/gemischt, Frist, Start, Module).')
} finally {
  rmSync(ordner, { recursive: true, force: true })
}
