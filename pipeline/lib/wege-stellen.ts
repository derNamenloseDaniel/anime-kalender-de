/**
 * Findet im Bau per Syntaxbaum jede Stelle, die einem Titel Wege anlegt (`streams`, `watchLinks`), und prüft, ob sie `istTot` kennt.
 * Anlass: Eine Runde ohne `istTot` (MOTN-Runde `13-3-1-tmdb-wege.ts`) legte Adressen an, die die Linkprüfung als tot kennt.
 * Der Wächter `check-wege-stellen-istot.ts` hält die Funde gegen `wege-stellen-geprueft.json`.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'

/** Eigenschaften, die Wege eines Titels tragen. */
export const WEGE_FELDER: ReadonlySet<string> = new Set(['streams', 'watchLinks'])
const ANLEGEN = new Set(['push', 'unshift', 'splice'])

export interface WegeStelle {
  /** `datei::Funktion`, ohne Zeilennummer, damit Umbauten die Liste nicht brechen. */
  schluessel: string
  /** Zeile (1-basiert) nur zur Anzeige. */
  zeile: number
  /** Welche der `TOT_FRAGEN` die äußerste benannte Funktion der Stelle im Rumpf benutzt. */
  fragen: string[]
}

function feldName(e: ts.Node): string | undefined {
  return ts.isPropertyAccessExpression(e) ? e.name.text : undefined
}

function istLeeresArray(e: ts.Expression): boolean {
  return ts.isArrayLiteralExpression(e) && e.elements.length === 0
}

/** `x.streams.filter(…)` und `x.streams ?? []` allein legen nichts an: nur Wegnehmen bzw. Vorgabe. */
function nurWegnehmen(e: ts.Expression): boolean {
  if (istLeeresArray(e)) return true
  return ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && e.expression.name.text === 'filter'
}

function benannteFunktion(n: ts.Node): string | undefined {
  if (ts.isFunctionDeclaration(n) || ts.isMethodDeclaration(n)) return n.name?.getText()
  if (ts.isVariableDeclaration(n) && n.initializer && (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer))) return n.name.getText()
  return undefined
}

/** Äußerste benannte Funktion; auf oberster Ebene `(Modul)`. */
function aeussereFunktion(n: ts.Node): ts.Node | undefined {
  let aussen: ts.Node | undefined
  for (let p: ts.Node | undefined = n; p; p = p.parent) if (benannteFunktion(p)) aussen = p
  return aussen
}

/** Bezeichner im Rumpf benutzt, nicht nur als Parameter deklariert: ein entfernter `if (istTot(url))` lässt die Signatur stehen. */
function benutzt(n: ts.Node, name: string): boolean {
  let ja = false
  const geh = (k: ts.Node): void => {
    if (ja || ts.isParameter(k)) return
    if (ts.isIdentifier(k) && k.text === name) ja = true
    else ts.forEachChild(k, geh)
  }
  geh(n)
  return ja
}

/** Die Tot-Fragen, die der Bau kennt: beide Quellen zusammen, Handbeleg allein, Linkprüfung allein. */
export const TOT_FRAGEN = ['istTot', 'toteAdressen', 'lautPruefungTot'] as const

/** Bezeichner, die in der Funktion aus einem Wege-Feld gelesen werden (`const wege = t.streams ?? []`). */
function aliasse(fn: ts.Node): Set<string> {
  const out = new Set<string>()
  const geh = (k: ts.Node): void => {
    if (ts.isVariableDeclaration(k) && ts.isIdentifier(k.name) && k.initializer && !nurWegnehmen(k.initializer)) {
      let liestFeld = false
      const such = (m: ts.Node): void => {
        if (WEGE_FELDER.has(feldName(m) ?? '')) liestFeld = true
        else ts.forEachChild(m, such)
      }
      such(k.initializer)
      if (liestFeld) out.add(k.name.text)
    }
    ts.forEachChild(k, geh)
  }
  geh(fn)
  return out
}

/** Alle Stellen einer Quelltext-Datei, die Wege anlegen. */
export function findeWegeStellen(datei: string, text: string): WegeStelle[] {
  const sf = ts.createSourceFile(datei, text, ts.ScriptTarget.Latest, true)
  const funde: WegeStelle[] = []
  const melde = (n: ts.Node): void => {
    const fn = aeussereFunktion(n)
    funde.push({
      schluessel: `${datei}::${fn ? benannteFunktion(fn) : '(Modul)'}`,
      zeile: sf.getLineAndCharacterOfPosition(n.getStart()).line + 1,
      fragen: TOT_FRAGEN.filter((f) => benutzt(fn ?? sf, f)),
    })
  }
  const aliasJeFunktion = new Map<ts.Node, Set<string>>()
  const geh = (n: ts.Node): void => {
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && WEGE_FELDER.has(feldName(n.left) ?? '') && !nurWegnehmen(n.right)) melde(n)
    else if (ts.isPropertyAssignment(n) && WEGE_FELDER.has(n.name.getText()) && !nurWegnehmen(n.initializer)) melde(n)
    else if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && ANLEGEN.has(n.expression.name.text)) {
      const ziel = n.expression.expression
      const feld = feldName(ziel)
      const fn = aeussereFunktion(n) ?? sf
      if (!aliasJeFunktion.has(fn)) aliasJeFunktion.set(fn, aliasse(fn))
      const alias = ts.isIdentifier(ziel) && aliasJeFunktion.get(fn)!.has(ziel.text)
      // `splice(i, 1)` nimmt nur weg; erst ab drittem Argument legt es an.
      const nurLoeschen = n.expression.name.text === 'splice' && n.arguments.length <= 2
      if ((WEGE_FELDER.has(feld ?? '') || alias) && !nurLoeschen) melde(n)
    }
    ts.forEachChild(n, geh)
  }
  geh(sf)
  return funde
}

function dateienUnter(wurzel: string, ordner: string): string[] {
  return readdirSync(join(wurzel, ordner), { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith('.ts') && !/(^check-|\.test\.|^kulisse-)/.test(d.name))
    .map((d) => `${ordner}/${d.name}`)
}

/** Bau und Bibliothek: alles, was den Datensatz baut (Prüfungen, Tests und Kulissen legen keine echten Wege an). */
export function alleWegeStellen(wurzel: string): WegeStelle[] {
  return ['pipeline/bau', 'pipeline/lib'].flatMap((o) => dateienUnter(wurzel, o)).sort().flatMap((d) => findeWegeStellen(d, readFileSync(join(wurzel, d), 'utf8')))
}

export interface StellenSumme {
  anzahl: number
  fragen: string[]
  zeilen: number[]
}

/** Je Schlüssel: Anzahl der Stellen und die Tot-Fragen der Funktion. */
export function zusammenfassen(stellen: readonly WegeStelle[]): Map<string, StellenSumme> {
  const out = new Map<string, StellenSumme>()
  for (const s of stellen) {
    const e = out.get(s.schluessel) ?? { anzahl: 0, fragen: s.fragen, zeilen: [] }
    e.anzahl++
    e.zeilen.push(s.zeile)
    out.set(s.schluessel, e)
  }
  return out
}
