// Prüft den Vergleichsrahmen an einem Wegwerf-Git-Repo: gleiche Fassung, geänderte Rückgabe, veränderte Eingabe, geschriebene Datei, Zweig-Lücke, Aufruf.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnMitLimit } from './kind-mit-limit.mjs'
import { hashOrdner, vergleicheAltNeu, zaehler } from './vergleich-alt-neu.mjs'

const werkzeug = fileURLToPath(new URL('./vergleich-alt-neu.mjs', import.meta.url))
const git = (repo, ...args) => execFileSync('git', ['-C', repo, '-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { timeout: 30_000, stdio: 'pipe' })

const ALT = `import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
export function f(liste, schreibe) {
  liste.sort()
  if (schreibe) writeFileSync(join(process.env.AK_ROOT, 'aus.txt'), 'x')
  return liste.map((e) => e + '!')
}
`

function neuesRepo() {
  const repo = mkdtempSync(join(tmpdir(), 'vergleich-alt-neu-test-'))
  git(repo, 'init', '-q')
  writeFileSync(join(repo, 'f.mjs'), ALT)
  git(repo, 'add', '.')
  git(repo, 'commit', '-q', '-m', 'alt')
  return repo
}

const faelle = [
  { name: 'ohne Datei', args: [['b', 'a'], false], zweig: 'ohne' },
  { name: 'mit Datei', args: [['b'], true], zweig: 'datei' },
]
const lauf = (repo, neu, extra = {}) => {
  writeFileSync(join(repo, 'f.mjs'), neu)
  return vergleicheAltNeu({ datei: 'f.mjs', funktion: 'f', faelle, ref: 'HEAD', wurzel: repo, ...extra })
}

const repo = neuesRepo()
try {
  // gleich: unverändert und umformuliert
  const gleich = await lauf(repo, ALT)
  assert.equal(gleich.gleich, true)
  assert.deepEqual(gleich.abdeckung, { ohne: 1, datei: 1 })
  assert.equal((await lauf(repo, ALT.replace('(e) => e + \'!\'', '(e) => `${e}!`'))).gleich, true, 'andere Schreibweise, gleiche Ausgabe')

  // ungleich: Rückgabe
  const rueck = await lauf(repo, ALT.replace("e + '!'", "e + '?'"))
  assert.deepEqual(rueck.abweichungen.map((a) => `${a.fall}:${a.was}`), ['ohne Datei:ergebnis', 'mit Datei:ergebnis'])

  // ungleich: veränderte Eingabe (Sortieren weg → Reihenfolge der Eingabe bleibt)
  const eingabe = await lauf(repo, ALT.replace('  liste.sort()\n', ''))
  assert.ok(eingabe.abweichungen.some((a) => a.fall === 'ohne Datei' && a.was === 'eingaben'))
  assert.ok(!eingabe.abweichungen.some((a) => a.fall === 'mit Datei'), 'eine Liste mit einem Element ändert sich nicht')

  // ungleich: geschriebene Datei (Kulisse) — Inhalt und Fehlen
  const inhalt = await lauf(repo, ALT.replace("'x')", "'y')"))
  assert.deepEqual(inhalt.abweichungen.map((a) => `${a.fall}:${a.was}`), ['mit Datei:dateien'])
  const fehlt = await lauf(repo, ALT.replace("  if (schreibe) writeFileSync(join(process.env.AK_ROOT, 'aus.txt'), 'x')\n", ''))
  assert.deepEqual(fehlt.abweichungen.map((a) => `${a.fall}:${a.was}`), ['mit Datei:dateien'])

  // Fehler zählen als Ergebnis: wirft nur die neue Fassung, ist es eine Abweichung
  const wirft = await lauf(repo, ALT.replace('liste.sort()', 'throw new Error("kaputt")'))
  assert.equal(wirft.abweichungen.filter((a) => a.was === 'ergebnis').length, 2)

  // Zweig-Lücke
  const luecke = await lauf(repo, ALT, { erwarteteZweige: ['ohne', 'nie'] })
  assert.deepEqual(luecke.luecken, ['nie'])
  assert.equal(luecke.gleich, false)
  assert.equal((await lauf(repo, ALT, { erwarteteZweige: ['ohne', 'datei'] })).gleich, true)

  // Die Wegwerfdatei bleibt nicht liegen.
  assert.equal(execFileSync('git', ['-C', repo, 'status', '--porcelain'], { encoding: 'utf8', timeout: 30_000 }).includes('.alt-'), false)

  // Aufruf: Fallmodul, Exit-Codes
  writeFileSync(join(repo, 'faelle.mjs'), `export const faelle = ${JSON.stringify(faelle)}\n`)
  writeFileSync(join(repo, 'f.mjs'), ALT)
  const cli = (...a) => spawnMitLimit(process.execPath, [werkzeug, ...a], { cwd: repo, encoding: 'utf8' })
  const ok = cli('f.mjs', 'f', 'faelle.mjs', '--ref', 'HEAD', '--zweige', 'ohne,datei')
  assert.equal(ok.status, 0, ok.stdout + ok.stderr)
  assert.match(ok.stdout, /2 Fälle.*byte-gleich/)
  writeFileSync(join(repo, 'f.mjs'), ALT.replace("e + '!'", "e + '?'"))
  const rot = cli('f.mjs', 'f', 'faelle.mjs', '--ref', 'HEAD')
  assert.equal(rot.status, 1)
  assert.match(rot.stdout, /ABWEICHUNG ohne Datei: ergebnis/)
  assert.equal(cli('f.mjs').status, 2)
} finally {
  rmSync(repo, { recursive: true, force: true })
}

// Hilfen
const z = zaehler()
z.zaehle('a')
z.zaehle('a')
z.zaehle('b')
assert.deepEqual(z.alle(), { a: 2, b: 1 })
assert.equal(z.anzahl('c'), 0)
const leer = mkdtempSync(join(tmpdir(), 'vergleich-alt-neu-hash-'))
try {
  const h0 = hashOrdner(leer)
  writeFileSync(join(leer, 'a'), '1')
  const h1 = hashOrdner(leer)
  writeFileSync(join(leer, 'a'), '2')
  assert.notEqual(h0, h1)
  assert.notEqual(h1, hashOrdner(leer), 'Inhalt zählt')
} finally {
  rmSync(leer, { recursive: true, force: true })
}
console.log('vergleich-alt-neu.test: grün')
