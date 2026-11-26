/**
 * Feste Mutantenklassen für tools/diff-mutanten.mjs (21.11.2026): Fehler, die Operator-Mutanten nicht erzeugen und
 * die Tests oft durchlassen. Je Klasse eine Funktion `(node, q) => [{ art, von, bis, ersetze }]`; Offsets liegen
 * immer innerhalb von `node`, damit `mutantenListe` Anker und Ersatz aus dem Knotentext bilden kann.
 *   Objekt-Eigenschaft entfernt   `{ a: 1, b }` → `{ ...{}, b }`   (je Eigenschaft; bleibt gültig ohne Kommaarbeit)
 *   Parameter-Vorgabe → 0 / leer  `(x = [1]) =>` → `(x = 0) =>` und `(x = []) =>` (leer nur bei nicht leerem Text-/Listen-/Objektliteral)
 *   Zuweisung im Callback entfernt  `cb(() => { s = 1 })` → `void 0`
 *   Parameter am Aufrufort entfernt `f(a, b)` → `f(b)` und `f(a)`
 *   throw e → if (false)          `throw e;` → `{ if (false) throw e; }`
 *   Anweisung → if (false)        `x = 1;` / `return x` in einem Block → `{ if (false) x = 1; }` (Prüfer 4109 A5: der Text bleibt stehen, ein Regex-Test trifft ihn weiter)
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

/** Leerer Wert derselben Art für ein nicht leeres Zeichenketten-, Listen- oder Objektliteral, sonst null. */
function leererWert(i) {
  if ((ts.isStringLiteral(i) || ts.isNoSubstitutionTemplateLiteral(i)) && i.text !== '') return '""'
  if (ts.isArrayLiteralExpression(i) && i.elements.length) return '[]'
  if (ts.isObjectLiteralExpression(i) && i.properties.length) return '{}'
  return null
}

/** Vorgabewert eines Funktionsparameters wird 0 und, bei nicht leerem Literal, leer (`"x"` → `""`); 0 allein ändert die Art, ein typtreuer Test fängt es zu leicht. */
function vorgabeNull(node) {
  if (!ts.isParameter(node) || !node.initializer) return []
  const i = node.initializer
  const name = node.name.getText()
  const leer = leererWert(i)
  return [
    { art: `Parameter-Vorgabe → 0 ${name}`, von: i.getStart(), bis: i.end, ersetze: '0' },
    ...(leer ? [{ art: `Parameter-Vorgabe → leer ${name}`, von: i.getStart(), bis: i.end, ersetze: leer }] : []),
  ]
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
  if (!(ts.isCallExpression(node) || ts.isNewExpression(node))) return []
  const args = node.arguments ?? []
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

/** Zuweisung oder `return` als Anweisung in einem Block wird nie ausgeführt (Aufrufe deckt „Aufruf entfernt“, throw die Klasse darüber). */
function anweisungNie(node, q) {
  const zuweisung = ts.isExpressionStatement(node) && istZuweisung(node.expression)
  if (!(zuweisung || ts.isReturnStatement(node)) || !ts.isBlock(node.parent)) return []
  return [{ art: 'Anweisung → if (false)', von: node.getStart(), bis: node.end, ersetze: `{ if (false) ${q.slice(node.getStart(), node.end)} }` }]
}

/** Alle festen Klassen für einen Knoten. */
export const klassenMutanten = (node, q) => [eigenschaftEntfernt, vorgabeNull, zuweisungImCallback, argumentEntfernt, throwNie, anweisungNie].flatMap((f) => f(node, q))
