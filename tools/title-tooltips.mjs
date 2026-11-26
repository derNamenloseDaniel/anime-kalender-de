#!/usr/bin/env node
/**
 * Wächter: native `title`-Tooltips in `web/src` (ohne Tests) dürfen nur weniger werden. Das `title`-Attribut zeigt den
 * Hinweis des Betriebssystems (fremde Gestalt, Verzögerung, auf dem Handy unsichtbar); die App nimmt `Tooltip`
 * (`web/src/components/ui.tsx`) oder bei langen Listen `data-hinweis` (`hinweis-flaeche.tsx`) (Daniel, 26.11.2026).
 * Gezählt im Syntaxbaum:
 *   - `title=…` an einem Element mit kleingeschriebenem Namen (`<button>`, `<a>`, `<iframe>`); Props eigener Komponenten
 *     (`<Button title=…>`, `<Chip title=…>`) zählen nicht, sie laufen schon durch `Tooltip`,
 *   - `x.title = …` (auch `document.title`) und `setAttribute('title', …)`.
 * Ist `title` kein Tooltip (iframe-Name für Screenreader, Tabtitel), steht in einem Kommentar derselben Zeile
 * `title-ok: <Grund>` (ohne Grund oder in einem String gilt es nicht); die Stelle zählt dann nicht.
 * Grenze: tools/title-tooltips-grenzen.json. Sie sinkt nur durch --festschreiben, nie von Hand nach oben.
 *
 *   node tools/title-tooltips.mjs                  prüfen (Exit 1 bei mehr Vorkommen als erlaubt)
 *   node tools/title-tooltips.mjs --liste          Datei:Zeile
 *   node tools/title-tooltips.mjs --festschreiben  Grenze auf den gesunkenen Stand setzen (erhöht nie)
 *   --quelle <git-ordner> --grenzen <datei>        andere Wurzel (für den Test)
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

const WURZEL = resolve(import.meta.dirname, '..')
const QUELLTEXT = /^web\/src\/.*\.(ts|tsx|js|jsx|mjs)$/
const TESTNAME = /\.test\.[cm]?[jt]sx?$/
const GRUND = /title-ok:\s*[^\s*/]/
const HINWEIS = 'Nur durch --festschreiben gesenkt, nie von Hand erhöht. Grundstand 26.11.2026.'

function quelldateien(quelle) {
  const getrackt = execFileSync('git', ['-C', quelle, 'ls-files', '-z'], { encoding: 'utf8', windowsHide: true, maxBuffer: 1 << 28 })
  return getrackt.split('\0').filter((p) => QUELLTEXT.test(p) && !TESTNAME.test(p)).sort()
}

const istKleinerName = (tag) => ts.isIdentifier(tag) && /^[a-z]/.test(tag.text)
const istTitelName = (n) => (ts.isIdentifier(n) || ts.isStringLiteralLike(n)) && n.text === 'title'

/** Native Element mit `title`-Attribut, `x.title = …` oder `setAttribute('title', …)`. */
function istTitelTooltip(n) {
  if (ts.isJsxAttribute(n) && istTitelName(n.name)) {
    const element = n.parent.parent
    return istKleinerName(element.tagName)
  }
  if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
    return ts.isPropertyAccessExpression(n.left) && n.left.name.text === 'title'
  }
  if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === 'setAttribute') {
    const [name] = n.arguments
    return name !== undefined && ts.isStringLiteralLike(name) && name.text === 'title'
  }
  return false
}

/** Zeilen (1-basiert) mit einem Kommentar `title-ok: <Grund>`: Kommentare hängen als Trivia an einem Token, nie in einem String. */
function ausnahmeZeilen(sf, text) {
  const zeilen = new Set()
  const kommentare = (pos) => ts.getTrailingCommentRanges(text, pos) ?? []
  const besuche = (n) => {
    for (const k of [...kommentare(n.pos), ...kommentare(n.end)]) {
      if (!GRUND.test(text.slice(k.pos, k.end))) continue
      const von = sf.getLineAndCharacterOfPosition(k.pos).line + 1
      const bis = sf.getLineAndCharacterOfPosition(k.end).line + 1
      for (let z = von; z <= bis; z++) zeilen.add(z)
    }
    ts.forEachChild(n, besuche)
  }
  besuche(sf)
  return zeilen
}

/** Fundstellen `pfad:zeile` einer Quelle, eine je Vorkommen. */
export function stellenInQuelle(pfad, text) {
  const sf = ts.createSourceFile(pfad, text, ts.ScriptTarget.Latest, true, pfad.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const frei = ausnahmeZeilen(sf, text)
  const funde = []
  const besuche = (n) => {
    const zeile = sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1
    if (istTitelTooltip(n) && !frei.has(zeile)) funde.push(`${pfad}:${zeile}`)
    ts.forEachChild(n, besuche)
  }
  besuche(sf)
  return funde
}

export function fundstellen(quelle) {
  return quelldateien(quelle).flatMap((pfad) => stellenInQuelle(pfad, readFileSync(join(quelle, pfad), 'utf8')))
}

function argument(name, vorgabe) {
  const i = process.argv.indexOf(name)
  return i >= 0 ? resolve(process.argv[i + 1]) : vorgabe
}

function zuViel(funde, erlaubt) {
  console.error(
    `✖ Native title-Tooltips in web/src: ${funde.length} statt höchstens ${erlaubt}.\n` +
      'Nimm <Tooltip> aus web/src/components/ui.tsx (lange Listen: data-hinweis, hinweis-flaeche.tsx); ist title kein Tooltip, steht „title-ok: Grund“ als Kommentar in der Zeile.\n' +
      'Fundstellen: node tools/title-tooltips.mjs --liste. Die Grenze wird nicht angehoben.',
  )
  return 1
}

export function main() {
  const quelle = argument('--quelle', WURZEL)
  const grenzDatei = argument('--grenzen', join(WURZEL, 'tools/title-tooltips-grenzen.json'))
  const funde = fundstellen(quelle)
  if (process.argv.includes('--liste')) {
    console.log(funde.join('\n'))
    return 0
  }
  const erlaubt = JSON.parse(readFileSync(grenzDatei, 'utf8')).erlaubt
  if (!Number.isInteger(erlaubt)) {
    console.error(`✖ ${grenzDatei}: Feld „erlaubt“ fehlt oder ist keine Zahl.`)
    return 1
  }
  if (funde.length > erlaubt) return zuViel(funde, erlaubt)
  if (process.argv.includes('--festschreiben')) {
    writeFileSync(grenzDatei, JSON.stringify({ _hinweis: HINWEIS, erlaubt: funde.length }, null, 2) + '\n')
    console.log(`Grenze auf ${funde.length} gesetzt.`)
    return 0
  }
  console.log(`title-Tooltips in Ordnung: ${funde.length} Vorkommen, höchstens ${erlaubt} erlaubt.`)
  return 0
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(main())
