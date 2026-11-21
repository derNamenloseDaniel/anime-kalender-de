/** Tests für tools/diff-mutanten-klassen.mjs: je Klasse erzeugte Mutanten (als fertiger Quelltext), Negativfälle, Gültigkeit. */
import ts from 'typescript'
import { mutantenListe } from './diff-mutanten.mjs'

const fehler = []
const pruefe = (name, ok) => {
  if (ok) return console.log(`  ✓ ${name}`)
  fehler.push(name)
  console.error(`  ✗ ${name}`)
}

/** Mutierte Quelltexte der Klasse `klasse` (Namensanfang nach `Datei:Zeile `), alle Zeilen geändert. */
const mutiert = (q, klasse) => {
  const alleZeilen = new Set(q.split('\n').map((_, i) => i + 1))
  return mutantenListe('a.mjs', q, alleZeilen)
    .filter((m) => m.name.split(' ').slice(1).join(' ').startsWith(klasse))
    .map((m) => {
      const { suche, ersetze } = m.aenderungen[0]
      return q.replace(suche, () => ersetze)
    })
}
/** Syntaktisch gültig (TS-Parser meldet keine Fehler). */
const gueltig = (q) => ts.transpileModule(q, { reportDiagnostics: true, compilerOptions: { target: ts.ScriptTarget.ESNext } }).diagnostics.length === 0
const gleich = (liste, erwartet) => liste.length === erwartet.length && erwartet.every((e) => liste.includes(e))

// 1 Objekt-Eigenschaft entfernt
const O = 'objekt'
const o1 = mutiert('const x = { a: 1, b }', 'Objekt-Eigenschaft entfernt')
pruefe(`${O}: je Eigenschaft ein Mutant (Zuweisung und Kurzform)`, gleich(o1, ['const x = { ...{}, b }', 'const x = { a: 1, ...{} }']))
pruefe(`${O}: Spread wird ebenfalls entfernt`, mutiert('const x = { ...r, k: 2 }', 'Objekt-Eigenschaft entfernt').includes('const x = { ...{}, k: 2 }'))
pruefe(`${O}: einzige Eigenschaft`, gleich(mutiert('f({ z: 3 })', 'Objekt-Eigenschaft entfernt'), ['f({ ...{} })']))
pruefe(`${O}: Mutanten bleiben gültig`, o1.every(gueltig))
pruefe(`${O}: Destrukturierung und Typ erzeugen nichts`, mutiert('const { a, b } = c', 'Objekt-Eigenschaft').length === 0)
pruefe(`${O}: Name trägt den Eigenschaftsnamen`, mutantenListe('a.mjs', 'x = { a: 1, b: 2 }', new Set([1])).some((m) => m.name === 'a.mjs:1 Objekt-Eigenschaft entfernt b'))

// 2 Parameter-Vorgabe → 0
const V = 'vorgabe'
pruefe(`${V}: Funktion und Pfeil`, gleich(mutiert('function f(a = [], b) {}', 'Parameter-Vorgabe → 0'), ['function f(a = 0, b) {}']) && gleich(mutiert('const g = (s = "x") => s', 'Parameter-Vorgabe → 0'), ['const g = (s = 0) => s']))
pruefe(`${V}: zwei Vorgaben ergeben zwei Mutanten`, mutiert('const g = (a = {}, b = null) => a', 'Parameter-Vorgabe → 0').length === 2)
pruefe(`${V}: Vorgabe 0 ist kein Mutant`, mutiert('const g = (a = 0) => a', 'Parameter-Vorgabe → 0').length === 0)
pruefe(`${V}: Parameter ohne Vorgabe, Variable mit Wert erzeugen nichts`, mutiert('const g = (a) => a\nconst h = 5', 'Parameter-Vorgabe → 0').length === 0)
pruefe(`${V}: Mutanten bleiben gültig`, mutiert('const g = (a = [], b = {}) => a', 'Parameter-Vorgabe → 0').every(gueltig))

// 3 Zuweisung im Callback entfernt
const Z = 'callback'
const KL = 'Zuweisung im Callback entfernt'
pruefe(`${Z}: Anweisung im Block`, gleich(mutiert('xs.forEach((x) => { gesamt += x })', KL), ['xs.forEach((x) => { void 0 })']))
pruefe(`${Z}: Eigenschaftszuweisung im function-Callback`, gleich(mutiert('p.then(function (r) { o.wert = r })', KL), ['p.then(function (r) { void 0 })']))
pruefe(`${Z}: knapper Pfeilkörper`, gleich(mutiert('xs.map((x) => (n = x))', KL), ['xs.map((x) => (void 0))']))
pruefe(`${Z}: Zuweisung außerhalb eines Callbacks bleibt`, mutiert('let n\nn = 1\nfunction f() { n = 2 }', KL).length === 0)
pruefe(`${Z}: Funktion, die nicht Argument ist, bleibt`, mutiert('const f = () => { n = 2 }\nconst g = function () { m = 3 }', KL).length === 0)
pruefe(`${Z}: Zuweisung im Ausdruck (Wert genutzt) bleibt`, mutiert('xs.forEach((x) => { const r = (n = x) })', KL).length === 0)
pruefe(`${Z}: Mutanten bleiben gültig`, mutiert('xs.forEach((x) => { gesamt += x })\nxs.map((x) => (n = x))', KL).every(gueltig))

// 4 Parameter am Aufrufort entfernt
const A = 'aufruf'
const KA = 'Parameter am Aufrufort entfernt'
pruefe(`${A}: zwei Argumente: je eines weg`, gleich(mutiert('x = f(a, b)', KA), ['x = f(b)', 'x = f(a)']))
pruefe(`${A}: drei Argumente: jedes einmal`, gleich(mutiert('x = f(a, b, c)', KA), ['x = f(b, c)', 'x = f(a, c)', 'x = f(a, b)']))
pruefe(`${A}: einziges Argument, auch new`, gleich(mutiert('x = f(a)', KA), ['x = f()']) && gleich(mutiert('x = new M(a)', KA), ['x = new M()']))
pruefe(`${A}: Aufruf ohne Argumente erzeugt nichts`, mutiert('x = f()', KA).length === 0)
pruefe(`${A}: Mutanten bleiben gültig`, mutiert('x = f(a, g(b, c), ...d)', KA).every(gueltig))
pruefe(`${A}: Name trägt Aufruf und Stelle`, mutantenListe('a.mjs', 'x = f(a, b)', new Set([1])).some((m) => m.name === 'a.mjs:1 Parameter am Aufrufort entfernt f (2. von 2)'))

// 5 throw → if (false)
const T = 'throw'
const KT = 'throw → if (false)'
pruefe(`${T}: Anweisung mit Semikolon`, gleich(mutiert('function f() { throw new Error("x"); }', KT), ['function f() { { if (false) throw new Error("x"); } }']))
pruefe(`${T}: erneutes Werfen im catch`, gleich(mutiert('try { g() } catch (e) { throw e }', KT), ['try { g() } catch (e) { { if (false) throw e } }']))
pruefe(`${T}: ohne Klammer-if, else bleibt am äußeren if`, mutiert('if (a) throw e; else h()', KT).every(gueltig) && mutiert('if (a) throw e; else h()', KT).length === 1)
pruefe(`${T}: Zeichenkette und Kommentar erzeugen nichts`, mutiert('x = "throw e"\n// throw e', KT).length === 0)

if (fehler.length) {
  console.error(`diff-mutanten-klassen.test: ${fehler.length} Fall/Fälle rot`)
  process.exit(1)
}
console.log('diff-mutanten-klassen.test: alle Fälle grün')
