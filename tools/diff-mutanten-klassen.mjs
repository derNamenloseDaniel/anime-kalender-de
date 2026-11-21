/**
 * Feste Mutantenklassen für tools/diff-mutanten.mjs (21.11.2026): Fehler, die Operator-Mutanten nicht erzeugen und
 * die Tests oft durchlassen. Je Klasse eine Funktion `(node, q) => [{ art, von, bis, ersetze }]`; Offsets liegen
 * immer innerhalb von `node`, damit `mutantenListe` Anker und Ersatz aus dem Knotentext bilden kann.
 *   Objekt-Eigenschaft entfernt   `{ a: 1, b }` → `{ ...{}, b }`   (je Eigenschaft; bleibt gültig ohne Kommaarbeit)
 *   Parameter-Vorgabe → 0         `(x = []) =>` → `(x = 0) =>`
 *   Zuweisung im Callback entfernt  `cb(() => { s = 1 })` → `void 0`
 *   Parameter am Aufrufort entfernt `f(a, b)` → `f(b)` und `f(a)`
 *   throw e → if (false)          `throw e;` → `{ if (false) throw e; }`
 */
import ts from 'typescript'

const K = ts.SyntaxKind

/** Eigenschaft eines Objektliterals (Zuweisung, Kurzform, Spread) wird durch `...{}` ersetzt. */
function eigenschaftEntfernt(node) {
  if (!node.parent || !ts.isObjectLiteralExpression(node.parent)) return []
  if (!(ts.isPropertyAssignment(node) || ts.isShorthandPropertyAssignment(node) || ts.isSpreadAssignment(node))) return []
  const name = ts.isSpreadAssignment(node) ? '...' : node.name.getText()
  return [{ art: `Objekt-Eigenschaft entfernt ${name}`, von: node.getStart(), bis: node.end, ersetze: '...{}' }]
}

/** Vorgabewert eines Funktionsparameters wird 0. */
function vorgabeNull(node) {
  if (!ts.isParameter(node) || !node.initializer) return []
  const i = node.initializer
  return [{ art: `Parameter-Vorgabe → 0 ${node.name.getText()}`, von: i.getStart(), bis: i.end, ersetze: '0' }]
}

const istZuweisung = (n) => ts.isBinaryExpression(n) && n.operatorToken.kind >= K.FirstAssignment && n.operatorToken.kind <= K.LastAssignment

/** Nächste umgebende Funktion (ohne die Zuweisung selbst). */
function umgebendeFunktion(node) {
  for (let p = node.parent; p; p = p.parent) if (ts.isFunctionLike(p)) return p
  return null
}

/** Zuweisung als eigene Anweisung (oder knapper Pfeilkörper) in einer Funktion, die als Argument übergeben wird. */
function zuweisungImCallback(node) {
  if (!istZuweisung(node)) return []
  let oben = node
  while (ts.isParenthesizedExpression(oben.parent)) oben = oben.parent
  const fn = umgebendeFunktion(node)
  const alsAnweisung = ts.isExpressionStatement(oben.parent)
  const alsKoerper = fn && ts.isArrowFunction(fn) && fn.body === oben
  if (!(alsAnweisung || alsKoerper) || !fn || !ts.isCallExpression(fn.parent) || !fn.parent.arguments.includes(fn)) return []
  return [{ art: 'Zuweisung im Callback entfernt', von: node.getStart(), bis: node.end, ersetze: 'void 0' }]
}

/** Je Argument ein Mutant: Argument samt einem Komma weg (folgendes, sonst vorangehendes). */
function argumentEntfernt(node) {
  if (!(ts.isCallExpression(node) || ts.isNewExpression(node)) || !node.arguments?.length) return []
  const args = node.arguments
  const callee = node.expression.getText()
  return args.map((a, i) => {
    const [von, bis] = i + 1 < args.length ? [a.getStart(), args[i + 1].getStart()] : [i > 0 ? args[i - 1].end : a.getStart(), a.end]
    return { art: `Parameter am Aufrufort entfernt ${callee} (${i + 1}. von ${args.length})`, von, bis, ersetze: '' }
  })
}

/** `throw` wird nie erreicht; Klammern, damit ein folgendes `else` nicht am inneren `if` hängt. */
function throwNie(node, q) {
  if (!ts.isThrowStatement(node)) return []
  return [{ art: 'throw → if (false)', von: node.getStart(), bis: node.end, ersetze: `{ if (false) ${q.slice(node.getStart(), node.end)} }` }]
}

/** Alle festen Klassen für einen Knoten. */
export const klassenMutanten = (node, q) => [eigenschaftEntfernt, vorgabeNull, zuweisungImCallback, argumentEntfernt, throwNie].flatMap((f) => f(node, q))
