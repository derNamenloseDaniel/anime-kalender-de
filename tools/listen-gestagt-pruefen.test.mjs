/**
 * Test für `tools/listen-gestagt-pruefen.mjs` (Pre-commit): gestagte Prüfliste mit unsortierter oder doppelter Zeile hält den Commit an,
 * sortierte läuft durch, nicht gestagte und fremde Listen werden nicht geprüft; `--einrichten` hängt die Prüfung in den Hook.
 */
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { gestagteListen, listenRot } from './listen-gestagt-pruefen.mjs'

// Auswahl und Prüfung ohne Prozess: Fake-`git` liefert die gestagten Namen und den Index-Text.
const fake = (namen, texte) => (...a) => (a[0] === 'diff' ? namen.join('\0') : texte[a[1].slice(1)])
const auswahl = ['tools/check-logic-liste.txt', 'tools/check-bestand-liste.txt', 'tools/check-logic-liste-ausnahmen.txt', 'tools/x/check-logic-liste.txt', 'tools/check-logic-liste.txt.bak', 'pipeline/check-a.ts']
assert.deepEqual(gestagteListen(fake(auswahl, {})), ['tools/check-logic-liste.txt', 'tools/check-bestand-liste.txt'], 'nur echte Prüflisten')
assert.deepEqual(listenRot(fake(['tools/check-logic-liste.txt'], { 'tools/check-logic-liste.txt': 'a\nb\n' })), [])
assert.match(listenRot(fake(['tools/check-logic-liste.txt'], { 'tools/check-logic-liste.txt': 'b\na\n' }))[0], /check-logic-liste\.txt muss alphabetisch sortiert sein/)

const tools = import.meta.dirname
const wurzel = mkdtempSync(path.join(tmpdir(), 'listen-gestagt-'))
const git = (...args) => execFileSync('git', ['-C', wurzel, '-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'core.autocrlf=false', ...args], { encoding: 'utf8', windowsHide: true, timeout: 30000 })
const schreibe = (datei, zeilen) => {
  mkdirSync(path.dirname(path.join(wurzel, datei)), { recursive: true })
  writeFileSync(path.join(wurzel, datei), `${zeilen.join('\n')}\n`)
}
const lauf = () => spawnSync(process.execPath, [path.join(wurzel, 'tools/listen-gestagt-pruefen.mjs')], { cwd: wurzel, encoding: 'utf8', windowsHide: true, timeout: 60000 })

try {
  git('init', '-q')
  for (const d of ['listen-gestagt-pruefen.mjs', 'liste-pruefen.mjs']) {
    mkdirSync(path.join(wurzel, 'tools'), { recursive: true })
    copyFileSync(path.join(tools, d), path.join(wurzel, 'tools', d))
  }
  schreibe('tools/check-logic-liste.txt', ['pipeline/check-a.ts', 'pipeline/check-b.ts'])
  git('add', '-A')
  git('commit', '-q', '-m', 'start')

  // Nachbesserung: Eintrag am Listenende statt an der passenden Stelle (Fall 4857).
  schreibe('tools/check-logic-liste.txt', ['pipeline/check-a.ts', 'pipeline/check-c.ts', 'pipeline/check-b.ts'])
  assert.equal(lauf().status, 0, 'nicht gestagte Liste wird nicht geprüft')
  git('add', 'tools/check-logic-liste.txt')
  const unsortiert = lauf()
  assert.equal(unsortiert.status, 1, unsortiert.stderr)
  assert.match(unsortiert.stderr, /check-b\.ts steht zu früh/, 'zu früh stehender Eintrag wird genannt')
  assert.match(unsortiert.stderr, /listen-gestagt-pruefen: Commit angehalten \(1 Fehler\):\n {2}✖ /, 'Kopfzeile mit Zahl, dann die Fehler')

  schreibe('tools/check-logic-liste.txt', ['pipeline/check-a.ts', 'pipeline/check-b.ts', 'pipeline/check-b.ts'])
  git('add', 'tools/check-logic-liste.txt')
  assert.match(lauf().stderr, /mehrfach/, 'Doppelzeile wird genannt')

  schreibe('tools/check-logic-liste.txt', ['pipeline/check-a.ts', '# Kommentar', 'pipeline/check-b.ts', 'pipeline/check-c.ts'])
  git('add', 'tools/check-logic-liste.txt')
  assert.equal(lauf().status, 0, 'sortierte Liste mit Kommentar ist grün')

  // Gleichartige Liste (Bestand) wird mitgeprüft, fremde Dateien nicht.
  schreibe('tools/check-bestand-liste.txt', ['pipeline/z.ts', 'pipeline/a.ts'])
  schreibe('tools/check-logic-liste-ausnahmen.txt', ['pipeline/z.ts', 'pipeline/a.ts'])
  git('add', 'tools/check-logic-liste-ausnahmen.txt')
  assert.equal(lauf().status, 0, 'Ausnahmen-Datei ist keine Prüfliste')
  git('add', 'tools/check-bestand-liste.txt')
  assert.match(lauf().stderr, /check-bestand-liste\.txt/, 'Bestandsliste wird mitgeprüft')

  // Gelöschte Liste: der Index kennt sie nicht mehr.
  git('rm', '-q', '-f', 'tools/check-bestand-liste.txt')
  assert.equal(lauf().status, 0, 'gelöschte Liste wird nicht geprüft')

  // --einrichten schreibt die Prüfung in den Hook.
  copyFileSync(path.join(tools, 'quellen-commit-wache.sh'), path.join(wurzel, 'tools/quellen-commit-wache.sh'))
  const einrichten = spawnSync('bash', ['tools/quellen-commit-wache.sh', '--einrichten'], { cwd: wurzel, encoding: 'utf8', windowsHide: true, timeout: 60000 })
  assert.equal(einrichten.status, 0, einrichten.stderr)
  const hook = readFileSync(path.join(wurzel, '.git/hooks/pre-commit'), 'utf8')
  assert.match(hook, /node tools\/listen-gestagt-pruefen\.mjs/, 'Listen-Prüfung im Hook')
  assert.match(hook, /umfang-pruefen\.mjs/, 'bisherige Prüfung bleibt')
  console.log('listen-gestagt: ok (unsortiert, doppelt, sortiert, Bestandsliste, Ausnahmen/gelöscht außen, Hook)')
} finally {
  rmSync(wurzel, { recursive: true, force: true })
}
