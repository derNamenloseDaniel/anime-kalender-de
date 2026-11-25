// Prüft den Vergleichsrahmen an einem Wegwerf-Git-Repo: gleiche Fassung, geänderte Rückgabe, veränderte Eingabe, geschriebene Datei, Zweig-Lücke, Aufruf.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { serialize } from 'node:v8'
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

// Wurf in beiden Fassungen ist rot, außer `erwartetWurf`; AK_ROOT gilt schon beim Import (ROOT-Konstante wie in pipeline/lib/util.ts)
const repo3 = neuesRepo()
try {
  const H = "export function h(x) {\n  if (x < 0) throw new Error('negativ ' + x)\n  return x\n}\n"
  const R = "import { writeFileSync } from 'node:fs'\nimport { join } from 'node:path'\nconst ROOT = process.env.AK_ROOT\nexport function r(x) {\n  writeFileSync(join(ROOT, 'aus.txt'), 'x' + x)\n  return x\n}\n"
  writeFileSync(join(repo3, 'h.mjs'), H)
  writeFileSync(join(repo3, 'r.mjs'), R)
  git(repo3, 'add', '.')
  git(repo3, 'commit', '-q', '-m', 'h und r')
  const fall = (name, x, extra = {}) => ({ name, args: [x], ...extra })
  const lauf3 = (datei, funktion, neu, faelle3) => {
    writeFileSync(join(repo3, datei), neu)
    return vergleicheAltNeu({ datei, funktion, faelle: faelle3, ref: 'HEAD', wurzel: repo3 })
  }
  const mix = [fall('ok 1', 1), fall('wirft -1', -1), fall('ok 2', 2), fall('wirft -2', -2)]
  const beide = await lauf3('h.mjs', 'h', H, mix)
  assert.equal(beide.gleich, false)
  assert.deepEqual(beide.abweichungen, [
    { fall: 'wirft -1', was: 'wirft in beiden Fassungen', fehler: 'negativ -1' },
    { fall: 'wirft -2', was: 'wirft in beiden Fassungen', fehler: 'negativ -2' },
  ])
  const erwartet = mix.map((f) => (f.args[0] < 0 ? { ...f, erwartetWurf: true } : f))
  assert.equal((await lauf3('h.mjs', 'h', H, erwartet)).gleich, true, 'erwarteter Wurf mit gleichem Fehlertext ist gleich')
  const anderer = await lauf3('h.mjs', 'h', H.replace("'negativ '", "'unter null '"), erwartet)
  assert.deepEqual(anderer.abweichungen.map((a) => `${a.fall}:${a.was}`), ['wirft -1:ergebnis', 'wirft -2:ergebnis'])

  const rFaelle = [fall('a', 1), fall('b', 2)]
  assert.equal((await lauf3('r.mjs', 'r', R, rFaelle)).gleich, true, 'Bauphase mit Wurzel-Konstante: AK_ROOT gilt beim Import')
  const rAnders = await lauf3('r.mjs', 'r', R.replace("'x' + x", "'y' + x"), rFaelle)
  assert.deepEqual(rAnders.abweichungen.map((a) => `${a.fall}:${a.was}`), ['a:dateien', 'b:dateien'])
  assert.equal(process.env.AK_ROOT, undefined, 'AK_ROOT wird nach dem Lauf zurückgesetzt')

  // `dateien` füllt die Kulisse (auch in Unterordnern); Reste des vorigen Falls sind weg
  const D = "import { existsSync, readFileSync, writeFileSync } from 'node:fs'\nimport { join } from 'node:path'\nexport function d(x) {\n  const alt = existsSync(join(process.env.AK_ROOT, 'rest.txt'))\n  writeFileSync(join(process.env.AK_ROOT, 'rest.txt'), 'r')\n  return [alt, readFileSync(join(process.env.AK_ROOT, 'u/ein.txt'), 'utf8') + x]\n}\n"
  writeFileSync(join(repo3, 'd.mjs'), D)
  git(repo3, 'add', 'd.mjs')
  git(repo3, 'commit', '-q', '-m', 'd')
  const dFaelle = [fall('p', 1, { dateien: { 'u/ein.txt': 'P' } }), fall('q', 2, { dateien: { 'u/ein.txt': 'Q' } })]
  assert.equal((await lauf3('d.mjs', 'd', D, dFaelle)).gleich, true)
  const dAnders = await lauf3('d.mjs', 'd', D.replace("'utf8') + x", "'utf8') + x + x"), dFaelle)
  assert.deepEqual(dAnders.abweichungen.map((a) => `${a.fall}:${a.was}`), ['p:ergebnis', 'q:ergebnis'])
  const dRest = await lauf3('d.mjs', 'd', D.replace("const alt = existsSync(join(process.env.AK_ROOT, 'rest.txt'))", 'const alt = false'), dFaelle)
  assert.equal(dRest.gleich, true, 'die Kulisse ist vor jedem Aufruf leer: „rest.txt“ des Vorfalls ist weg, also immer false')
} finally {
  rmSync(repo3, { recursive: true, force: true })
}

// kanonisch: V8-serialize unterscheidet dieselbe Zahl je nach interner Darstellung (Smi gegen Double), kanonisch nicht
const doubleArray = [0.5, 2, 3]
doubleArray[0] = 1
const dZahl = [1.5, 2.5]
const schein = [
  [[1, 2, 3], doubleArray],
  [{ n: 3, l: [4, 5] }, { n: dZahl[0] + dZahl[1] - 1, l: [4.5, 5.5].map((x) => x - 0.5) }],
]
for (const [a, b] of schein) {
  assert.notEqual(serialize(a).toString('hex'), serialize(b).toString('hex'), 'Vorbedingung: serialize sieht hier einen Scheinunterschied')
  assert.equal(kanonisch(a), kanonisch(b))
}
assert.equal(kanonisch({ a: 1, b: [2] }), kanonisch(structuredClone({ a: 1, b: [2] })))

// kanonisch: echte Unterschiede, je Art mindestens zwei Glieder
const gleicheVerweise = { x: 1 }
const ersterVerweis = { x: 1 }
const zweiterVerweis = { x: 1 }
const ungleich = {
  Wert: [[1, 2], ['a', 'b'], [true, false], [{ a: 1 }, { a: 2 }]],
  Typ: [[1, '1'], ['n:1', 1], [null, 0]],
  Schlüssel: [[{ a: 1 }, { b: 1 }], [{ a: 1 }, { a: 1, b: 1 }]],
  Schlüsselreihenfolge: [[{ a: 1, b: 2 }, { b: 2, a: 1 }], [{ k: { a: 1, b: 2 } }, { k: { b: 2, a: 1 } }]],
  Arrayreihenfolge: [[[1, 2], [2, 1]], [[{ a: 1 }, { a: 2 }], [{ a: 2 }, { a: 1 }]]],
  'undefined gegen fehlend': [[{ a: undefined }, {}], [[undefined], []], [{ a: undefined }, { a: null }]],
  Loch: [[[, 1], [undefined, 1]], [[1, , 3], [1, undefined, 3]]],
  Map: [[new Map([[1, 'a']]), new Map([[1, 'b']])], [new Map([[1, 'a']]), new Map([[2, 'a']])], [new Map([[1, 'a'], [2, 'b']]), new Map([[2, 'b'], [1, 'a']])]],
  Set: [[new Set([1]), new Set([2])], [new Set([1, 2]), new Set([2, 1])], [new Set([1]), [1]]],
  Date: [[new Date(0), new Date(1)], [new Date(NaN), new Date(0)]],
  NaN: [[NaN, 0], [{ z: NaN }, { z: null }]],
  'minus null': [[-0, 0], [{ z: -0 }, { z: 0 }]],
  'geteilter Verweis': [[[gleicheVerweise, gleicheVerweise], [{ x: 1 }, { x: 1 }]], [{ p: gleicheVerweise, q: gleicheVerweise }, { p: gleicheVerweise, q: { x: 1 } }], [[ersterVerweis, zweiterVerweis, zweiterVerweis], [ersterVerweis, zweiterVerweis, ersterVerweis]]],
}
for (const [art, paare] of Object.entries(ungleich)) {
  assert.ok(paare.length >= 2, `${art}: mindestens zwei Glieder`)
  for (const [a, b] of paare) assert.notEqual(kanonisch(a), kanonisch(b), `${art}: ${String(a)} gegen ${String(b)} muss ungleich bleiben`)
}
assert.equal(kanonisch(new Map([[1, new Set([2])]])), kanonisch(new Map([[1, new Set([2])]])), 'Map/Set gleichen Inhalts sind gleich')
assert.equal(kanonisch([NaN, -0, new Date(5)]), kanonisch([NaN, -0, new Date(5)]))
assert.equal(kanonisch({ f() {} }), kanonisch({ f: () => 1 }), 'Funktionen sind eine Marke (argsFabrik)')
assert.notEqual(kanonisch(new Error('a')), kanonisch(new Error('b')))
assert.notEqual(kanonisch(1n), kanonisch(2n))
assert.notEqual(kanonisch(1n), kanonisch(1), 'BigInt ≠ Zahl')
assert.notEqual(kanonisch(2n), kanonisch(2), 'BigInt ≠ Zahl, zweites Glied')
assert.equal(kanonisch('ö'), kanonisch('ö'), 'Darstellung der Zeichenkette ohne Einfluss')

// Gesamtweg: eine Fassung, die dieselben Zahlen intern anders hält, ist keine Abweichung; eine mit anderem Wert schon
const repo2 = neuesRepo()
try {
  const ZAHLEN = 'export function f() {\n  return [1, 2, 3]\n}\n'
  writeFileSync(join(repo2, 'f.mjs'), ZAHLEN)
  git(repo2, 'add', '.')
  git(repo2, 'commit', '-q', '-m', 'zahlen')
  const lauf2 = (neu) => {
    writeFileSync(join(repo2, 'f.mjs'), neu)
    return vergleicheAltNeu({ datei: 'f.mjs', funktion: 'f', faelle, ref: 'HEAD', wurzel: repo2 })
  }
  const dbl = 'export function f() {\n  const d = [0.5, 2, 3]\n  d[0] = 1\n  return d\n}\n'
  assert.equal((await lauf2(dbl)).gleich, true, 'Smi gegen Double ist gleich')
  assert.equal((await lauf2(dbl.replace('d[0] = 1', 'd[0] = 4'))).gleich, false, 'anderer Wert bleibt ungleich')
  assert.equal((await lauf2(dbl.replace('[0.5, 2, 3]', '[0.5, 3, 2]'))).gleich, false, 'andere Reihenfolge bleibt ungleich')
} finally {
  rmSync(repo2, { recursive: true, force: true })
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
// Sonde: Funktionen in der Rückgabe sind sonst nur eine Marke; die Sonde macht ihr Verhalten vergleichbar
const repo4 = neuesRepo()
try {
  const S = 'export function s(n) {\n  return { hat: (x) => x === n }\n}\n'
  writeFileSync(join(repo4, 's.mjs'), S)
  git(repo4, 'add', 's.mjs')
  git(repo4, 'commit', '-q', '-m', 's')
  const sFaelle = [1, 2].map((n) => ({ name: `n${n}`, args: [n], sonde: (r) => [r.hat(1), r.hat(2)] }))
  const sLauf = (neu) => {
    writeFileSync(join(repo4, 's.mjs'), neu)
    return vergleicheAltNeu({ datei: 's.mjs', funktion: 's', faelle: sFaelle, ref: 'HEAD', wurzel: repo4 })
  }
  assert.equal((await sLauf(S)).gleich, true)
  const sAnders = await sLauf(S.replace('x === n', 'x !== n'))
  assert.deepEqual(sAnders.abweichungen.map((a) => `${a.fall}:${a.was}`), ['n1:ergebnis', 'n2:ergebnis'])
} finally {
  rmSync(repo4, { recursive: true, force: true })
}

console.log('vergleich-alt-neu.test: grün')
