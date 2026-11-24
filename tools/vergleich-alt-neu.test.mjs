// Prüft den Vergleichsrahmen an einem Wegwerf-Git-Repo: gleiche Fassung, geänderte Rückgabe, veränderte Eingabe, geschriebene Datei, Zweig-Lücke, Aufruf.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnMitLimit } from './kind-mit-limit.mjs'
import { hashOrdner, kanonisch, vergleicheAltNeu, zaehler } from './vergleich-alt-neu.mjs'

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

  // Eingaben mit Funktionen (`argsFabrik`): nicht klonbar; das Aufrufprotokoll der Attrappe geht in den Vergleich ein.
  const G = "export function g(opt) {\n  opt.aufrufe.push(1)\n  return [opt.fn(2), opt.fn(3)]\n}\n"
  writeFileSync(join(repo, 'g.mjs'), G)
  git(repo, 'add', 'g.mjs')
  git(repo, 'commit', '-q', '-m', 'g')
  const fabrik = (name, zweig) => ({ name, zweig, argsFabrik: () => { const aufrufe = []; return [{ aufrufe, fn: (n) => { aufrufe.push(n); return n * 2 } }] } })
  const gLauf = (neu) => {
    writeFileSync(join(repo, 'g.mjs'), neu)
    return vergleicheAltNeu({ datei: 'g.mjs', funktion: 'g', faelle: [fabrik('a', 'x'), fabrik('b', 'x')], ref: 'HEAD', wurzel: repo })
  }
  assert.equal((await gLauf(G)).gleich, true)
  const protokoll = await gLauf(G.replace('opt.fn(3)', 'opt.fn(4)'))
  assert.deepEqual(protokoll.abweichungen.map((a) => `${a.fall}:${a.was}`), ['a:ergebnis', 'a:eingaben', 'b:ergebnis', 'b:eingaben'])
  const nurProtokoll = await gLauf(G.replace('  opt.aufrufe.push(1)\n', ''))
  assert.deepEqual(nurProtokoll.abweichungen.map((a) => `${a.fall}:${a.was}`), ['a:eingaben', 'b:eingaben'])

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

// Kanonische Schreibweise: unterscheidet, was für die Gleichheit zählt
assert.notEqual(kanonisch({ a: undefined }), kanonisch({}), 'undefined ≠ fehlend')
assert.notEqual(kanonisch({ a: 1, b: 2 }), kanonisch({ b: 2, a: 1 }), 'Reihenfolge der Schlüssel')
assert.notEqual(kanonisch({ a: 1, b: 2 }), kanonisch({ a: 1, b: 3 }), 'auch der zweite Schlüssel zählt')
assert.notEqual(kanonisch(0), kanonisch(-0))
assert.notEqual(kanonisch('1'), kanonisch(1))
assert.notEqual(kanonisch(new Map([[1, 'a']])), kanonisch(new Map([[1, 'b']])))
const geteilt = { x: 1 }
assert.notEqual(kanonisch([geteilt, geteilt]), kanonisch([{ x: 1 }, { x: 1 }]), 'geteiltes Objekt ≠ zwei gleiche')
assert.equal(kanonisch([{ x: 1 }, { x: 1 }]), kanonisch([{ x: 1 }, { x: 1 }]))
assert.equal(kanonisch('ö'), kanonisch('ö'), 'Darstellung der Zeichenkette ohne Einfluss')

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
