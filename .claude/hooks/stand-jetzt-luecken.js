// Lücken zwischen stand.md und den Jetzt-Dateien (gehört zu stand-waechter.js, Lehre 249): Daniel-Punkte außerhalb von
// „## Daniel-Todo“ ohne Zeile unter „### Jetzt“/„### Später“, und Jetzt-Dateien, die stand.md nicht nennt.
const fs = require('node:fs')

const KENNUNG = /\b[FE]\d+\b/
const MARKE_OHNE_KENNUNG = /wartet: Daniel|E-Zeile folgt/
const MARKE_SANDUHR = /⏳\s*(?:\*\*)?([FE]\d+)\b/u

/** Zeilen eines `##`/`###`-Abschnitts ab Überschrift `kopf` bis zur nächsten Überschrift der Stufe `grenze`. */
function abschnitt(zeilen, kopf, grenze) {
  const von = zeilen.findIndex((z) => z.startsWith(kopf))
  if (von < 0) return []
  let bis = zeilen.findIndex((z, i) => i > von && z.startsWith(grenze))
  if (bis < 0) bis = zeilen.length
  return zeilen.slice(von + 1, bis)
}

/** Kennungen aller Zeilen unter „### Jetzt“ und „### Später“. */
function kennungenInDanielTodo(zeilen) {
  const liste = [...abschnitt(zeilen, '### Jetzt', '#'), ...abschnitt(zeilen, '### Später', '#')]
  return new Set(liste.filter((z) => z.startsWith('- ')).map((z) => KENNUNG.exec(z.replace(/\]\([^)]*\)/g, ']'))?.[0]).filter(Boolean))
}

/** Zeilen außerhalb von „## Daniel-Todo“ und außerhalb des Auto-Blocks (pr-zeilen). */
function handzeilenAusserhalb(zeilen) {
  const von = zeilen.findIndex((z) => z.startsWith('## Daniel-Todo'))
  let bis = von < 0 ? -1 : zeilen.findIndex((z, i) => i > von && z.startsWith('## '))
  if (von >= 0 && bis < 0) bis = zeilen.length
  const imTodo = (i) => von >= 0 && i > von && i < bis
  let imBlock = false
  return zeilen.filter((z, i) => {
    if (z.includes('<!-- pr-zeilen')) imBlock = true
    else if (z.includes('<!-- /pr-zeilen')) imBlock = false
    else return !imBlock && !imTodo(i) && z.startsWith('- ')
    return false
  })
}

/** Meldungen zu Zeilen mit Daniel-Marke ohne Jetzt-/Später-Zeile derselben Kennung. `titelVon(zeile)` kürzt auf den Titel. */
function punkteOhneJetzt(zeilen, titelVon) {
  const bekannt = kennungenInDanielTodo(zeilen)
  const meldungen = []
  for (const z of handzeilenAusserhalb(zeilen)) {
    const sanduhr = MARKE_SANDUHR.exec(z)
    const gemeint = sanduhr ? !bekannt.has(sanduhr[1]) : MARKE_OHNE_KENNUNG.test(z)
    if (gemeint) meldungen.push(`Daniel-Punkt ohne Jetzt-Zeile: ${titelVon(z)} — Jetzt-Zeile anlegen oder Marke streichen (kein Daniel-Punkt)`)
  }
  return meldungen
}

/** Namen der Dateien (keine Unterordner) in `ordner`; [] wenn er fehlt. */
function jetztOrdnerDateien(ordner) {
  try {
    return fs.readdirSync(ordner, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name)
  } catch {
    return []
  }
}

/** Meldungen zu offenen `.md`-Jetzt-Dateien (ohne „erledigt-“), deren Name in stand.md fehlt. `namen` ist die Dateiliste des Ordners. */
function dateienOhneZeile(text, namen) {
  return namen
    .filter((n) => /\.md$/i.test(n) && !n.startsWith('erledigt-'))
    .filter((n) => !text.includes(n) && !text.includes(encodeURIComponent(n)))
    .map((n) => `Jetzt-Datei ohne Zeile in stand.md: ${n} — eintragen oder erledigt- voranstellen`)
}

module.exports = { punkteOhneJetzt, dateienOhneZeile, jetztOrdnerDateien }
