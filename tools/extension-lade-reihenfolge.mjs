/**
 * Ladereihenfolge der Content-Skripte: Ein Skript, das beim Laden (nicht erst in einer Funktion) `globalThis.akX` liest,
 * braucht `akX` von einem früheren Skript derselben `manifest.json`-Gruppe oder von sich selbst. Der Browser lädt jede Gruppe
 * in Manifest-Reihenfolge, die Sandkasten-Tests (`extension/test-lader.cjs`) ebenso; steht der Schreiber hinter dem Leser,
 * liest der Leser `undefined` und die Erweiterung fällt still aus. Leser in Funktionskörpern zählen nicht (sie laufen erst
 * nach dem Laden aller Dateien); sofort aufgerufene Funktionen (`(() => {…})()`) laufen beim Laden und zählen.
 * `ladeVerstoesse` ist rein (Manifest und Lesefunktion kommen als Parameter) und wird von tools/extension-lade-reihenfolge.test.mjs gefahren.
 */
import ts from 'typescript'

const AK = /^ak[A-Z0-9]/

function istGlobalAk(n) {
  return ts.isPropertyAccessExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'globalThis' && AK.test(n.name.text)
}

/** Namen, die `code` beim Laden liest, und Namen, die es beim Laden schreibt (`globalThis.akX = …` außerhalb von Funktionen). */
export function ladeZugriffe(code) {
  const quelle = ts.createSourceFile('skript.js', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
  const liest = new Set()
  const schreibt = new Set()
  const gehe = (n, tief) => {
    let t = tief
    if (ts.isFunctionLike(n)) {
      const sofort = ts.isCallExpression(n.parent) && n.parent.expression === n
      const eingeklammert = ts.isParenthesizedExpression(n.parent) && ts.isCallExpression(n.parent.parent) && n.parent.parent.expression === n.parent
      if (!sofort && !eingeklammert) t = tief + 1
    }
    if (istGlobalAk(n) && t === 0) {
      const p = n.parent
      const ziel = ts.isBinaryExpression(p) && p.left === n && p.operatorToken.kind === ts.SyntaxKind.EqualsToken
      ;(ziel ? schreibt : liest).add(n.name.text)
    }
    ts.forEachChild(n, (k) => gehe(k, t))
  }
  gehe(quelle, 0)
  return { liest, schreibt }
}

/** Jeder Verstoß als Text; leer = Reihenfolge passt. `lies(datei)` liefert den Quelltext. */
export function ladeVerstoesse(manifest, lies) {
  const fehler = []
  for (const [nr, gruppe] of (manifest.content_scripts ?? []).entries()) {
    const js = (gruppe.js ?? []).filter((d) => d.endsWith('.js'))
    const zugriffe = js.map((d) => ladeZugriffe(lies(d)))
    const erste = new Map()
    zugriffe.forEach((z, i) => {
      for (const n of z.schreibt) if (!erste.has(n)) erste.set(n, i)
    })
    zugriffe.forEach((z, i) => {
      for (const n of z.liest) {
        const wo = erste.get(n)
        if (wo === undefined) fehler.push(`Gruppe ${nr}: ${js[i]} liest beim Laden ${n}, aber kein Skript der Gruppe setzt es`)
        else if (wo > i) fehler.push(`Gruppe ${nr}: ${js[i]} liest beim Laden ${n}, das erst ${js[wo]} setzt (später im Manifest)`)
      }
    })
  }
  return fehler
}
