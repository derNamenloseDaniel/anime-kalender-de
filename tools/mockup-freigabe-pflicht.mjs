/**
 * Pflicht in der PR-Prüfkette (Daniel, 24.11.2026, F157): Ein freigegebenes Mockup ist die Vorgabe eines Baus, kein Entwurf, den der Bau
 * nachzieht. Ändert ein PR Seitencode (`web/src/`) und zugleich `titel`, `ersatz` oder `notiz` eines bestehenden Mockups unter
 * `web/buehne/mockups/` (oder löscht es), braucht er in der Beschreibung oder einem Kommentar von Autor bzw. Berechtigten die Zeile
 * „Mockup-Änderung freigegeben: <Daniel-Zitat>“. Anlass: PR 4896 baute die Reiter woanders und schrieb das Mockup auf den Bau um.
 *
 *   node tools/mockup-freigabe-pflicht.mjs
 *
 * Läuft immer die Gegenproben; die echte Prüfung nur im Ereignis `pull_request` (Basis `HEAD^1`, Beschreibung aus der Ereignisdatei,
 * Kommentare per `gh api`). Lokal und auf main ein Nullbefehl. Ein Mockup, dessen Felder sich nicht lesen lassen, zählt als geändert.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { ghApiJson } from './kind-mit-limit.mjs'
import { leseKommentare } from './patchnotes-kommentar.mjs'
import { ladeBasis } from './pr-basis.mjs'

const MOCKUP = /^web\/buehne\/mockups\/[^/]+\.tsx$/
const SEITE = /^web\/src\//
/** Die Freigabezeile; nach dem Doppelpunkt steht Daniels Wortlaut (mindestens ein paar Zeichen, kein leerer Platzhalter). */
export const FREIGABE = /^[ \t>*-]*Mockup-Änderung freigegeben:[ \t]*\S.{4,}$/m
const VERTRAUT = new Set(['OWNER', 'MEMBER', 'COLLABORATOR'])

const knapp = (text) => text.replace(/\s+/g, ' ').trim()

/** Wert einer Eigenschaft eines Objektliterals als Knoten, sonst undefined. */
function eigenschaft(objekt, name) {
  const p = objekt.properties.find((x) => ts.isPropertyAssignment(x) && (x.name.text ?? x.name.getText()) === name)
  return p?.initializer
}

/**
 * Die Felder, die das Bild eines Mockups festlegen: `titel` und je Variante `ersatz` und `notiz`, als Quelltext des Werts mit
 * vereinheitlichtem Leerraum. Ohne `mockup({ … })`-Aufruf mit Objekt `null` (wird als geändert gewertet).
 */
export function bildFelder(quelltext) {
  const datei = ts.createSourceFile('m.tsx', quelltext, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  let def
  const suche = (k) => {
    if (!def && ts.isCallExpression(k) && ts.isIdentifier(k.expression) && k.expression.text === 'mockup' && ts.isObjectLiteralExpression(k.arguments[0] ?? k)) def = k.arguments[0]
    ts.forEachChild(k, suche)
  }
  suche(datei)
  if (!def) return null
  const felder = new Map()
  const titel = eigenschaft(def, 'titel')
  if (titel) felder.set('titel', knapp(titel.getText()))
  const varianten = eigenschaft(def, 'varianten')
  if (!varianten || !ts.isObjectLiteralExpression(varianten)) return felder
  for (const v of varianten.properties) {
    if (!ts.isPropertyAssignment(v) || !ts.isObjectLiteralExpression(v.initializer)) continue
    const name = v.name.text ?? v.name.getText()
    for (const feld of ['ersatz', 'notiz']) {
      const wert = eigenschaft(v.initializer, feld)
      if (wert) felder.set(`${name}.${feld}`, knapp(wert.getText()))
    }
  }
  return felder
}

/**
 * Geänderte Bildfelder zwischen zwei Fassungen (`null` = Datei fehlt oder unlesbar: alle bzw. „?“). `ersatz` auf `{}` leeren zählt nicht:
 * das ist der vorgesehene Bauschritt, „Nachher“ zeigt dann die echte Komponente (Skill mockups); das Bild prüft der Bildvergleich.
 */
export function geaenderteFelder(alt, neu) {
  const a = alt === null ? null : bildFelder(alt)
  const n = neu === null ? null : bildFelder(neu)
  if (a === null) return []
  if (n === null) return ['?']
  const geleert = (k) => k.endsWith('.ersatz') && n.get(k) === '{}'
  return [...new Set([...a.keys(), ...n.keys()])].filter((k) => a.get(k) !== n.get(k) && !geleert(k))
}

/**
 * Urteil für einen PR. `aenderungen`: Zeilen von `git diff --name-status --no-renames` als [status, pfad]; `lies(ref, pfad)` gibt den
 * Dateitext an `basis` bzw. `HEAD` oder null.
 */
export function bewerte({ aenderungen, lies, beschreibung }) {
  if (!aenderungen.some(([, p]) => SEITE.test(p))) return { ok: true, grund: 'keine Änderung unter web/src/' }
  const funde = aenderungen
    .filter(([s, p]) => MOCKUP.test(p) && (s === 'M' || s === 'D'))
    .map(([s, p]) => ({ pfad: p, felder: geaenderteFelder(lies('basis', p), s === 'D' ? null : lies('HEAD', p)) }))
    .filter((f) => f.felder.length)
  if (!funde.length) return { ok: true, grund: 'kein freigegebenes Mockup im Bild geändert' }
  const liste = funde.map((f) => `${f.pfad} (${f.felder.join(', ')})`).join('; ')
  if (FREIGABE.test(beschreibung)) return { ok: true, grund: `Mockup-Änderung freigegeben: ${liste}` }
  return {
    ok: false,
    grund:
      `Der PR ändert Seitencode und zugleich das Bild eines Mockups: ${liste}.\n` +
      '  Gebaut wird nach dem Bild des freigegebenen Mockup-Commits; das Mockup ändert nur Daniel. Mockup-Felder zurücksetzen,\n' +
      '  oder Daniels Freigabe als Zeile „Mockup-Änderung freigegeben: <Zitat>“ in Beschreibung oder Kommentar nennen.',
  }
}

/** Beschreibung samt Kommentaren von Autor und Berechtigten (die Freigabe kann nachgereicht werden); Abruffehler: nur die Beschreibung. */
export function beschreibungMitKommentaren(pr, repo, api = ghApiJson, env = process.env) {
  const beschreibung = pr.body ?? ''
  const kommentare = leseKommentare(pr, repo, api, env, 'Mockup-Freigabe')
  if (!kommentare.length) return beschreibung
  const zaehlt = (k) => k.user?.login === pr.user?.login || VERTRAUT.has(k.author_association)
  return [beschreibung, ...kommentare.filter(zaehlt).map((k) => k.body ?? '')].join('\n')
}

const ALT = "mockup({ name: 'x', titel: 'T', varianten: { A: { ersatz: { AntwortKasten: K }, notiz: 'n' } } })"

/** Gegenproben aus festen Fällen; jede steht für einen Zweig der Regel. */
export function gegenproben() {
  const mit = (neu, extra = {}) => ({
    aenderungen: [['M', 'web/src/x.tsx'], ['M', 'web/buehne/mockups/m.tsx']],
    lies: (ref) => (ref === 'basis' ? ALT : neu),
    beschreibung: '',
    ...extra,
  })
  const faelle = [
    ['notiz geändert mit web/src ist rot', mit(ALT.replace("'n'", "'neu'")), false],
    ['titel geändert ist rot', mit(ALT.replace("'T'", "'T2'")), false],
    ['ersatz getauscht ist rot', mit(ALT.replace('AntwortKasten: K', 'AntwortKasten: L')), false],
    ['ersatz auf {} geleert (Nachher = echte Komponente) ist grün', mit(ALT.replace('{ AntwortKasten: K }', '{}')), true],
    ['Variante entfernt ist rot', mit(ALT.replace("A: { ersatz: { AntwortKasten: K }, notiz: 'n' }", '')), false],
    ['Mockup gelöscht ist rot', mit(null, { aenderungen: [['M', 'web/src/x.tsx'], ['D', 'web/buehne/mockups/m.tsx']] }), false],
    ['unlesbare neue Fassung ist rot', mit('kaputt('), false],
    ['nur Leerraum geändert ist grün', mit(ALT.replace('{ AntwortKasten: K }', '{\n        AntwortKasten: K\n      }')), true],
    ['zeiten geändert ist grün', mit(ALT.replace("name: 'x',", "name: 'x', zeiten: {},")), true],
    ['ohne web/src ist grün', mit(ALT.replace("'n'", "'neu'"), { aenderungen: [['M', 'web/buehne/mockups/m.tsx']] }), true],
    ['neues Mockup ist grün', mit(ALT, { aenderungen: [['M', 'web/src/x.tsx'], ['A', 'web/buehne/mockups/m.tsx']] }), true],
    ['Datei unter mockups/unterordner zählt nicht', mit(ALT.replace("'n'", "'neu'"), { aenderungen: [['M', 'web/src/x.tsx'], ['M', 'web/buehne/mockups/a/m.tsx']] }), true],
    ['Freigabezeile mit Zitat ist grün', mit(ALT.replace("'n'", "'neu'"), { beschreibung: 'Text\nMockup-Änderung freigegeben: „die Reiter bleiben“ (Daniel)\n' }), true],
    ['Freigabezeile ohne Zitat ist rot', mit(ALT.replace("'n'", "'neu'"), { beschreibung: 'Mockup-Änderung freigegeben:' }), false],
    ['Freigabe mitten im Satz zählt nicht', mit(ALT.replace("'n'", "'neu'"), { beschreibung: 'keine Mockup-Änderung freigegeben: nein, gar nicht' }), false],
  ]
  return faelle.filter(([, eingabe, soll]) => bewerte(eingabe).ok !== soll).map(([name]) => name).concat(faelle.length === 15 ? [] : ['Fallzahl'])
}

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60_000 })

function main() {
  const fehler = gegenproben()
  for (const name of fehler) console.error(`  ✖ Mockup-Freigabe (Gegenprobe): ${name}`)
  if (fehler.length) process.exit(1)
  console.log('  ✓ Mockup-Freigabe: 15 Gegenproben')
  if (process.env.GITHUB_EVENT_NAME !== 'pull_request') return console.log('  – Mockup-Freigabe: nur im PR-Ereignis geprüft (hier nicht).')
  const pr = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')).pull_request
  const basis = ladeBasis(git)
  const aenderungen = git('diff', '--name-status', '--no-renames', basis, 'HEAD').split('\n').filter(Boolean).map((z) => z.split('\t'))
  // Gelesen wird nur, was es gibt (M: beide Stände, D: nur die Basis); ein Fehler bricht die Prüfung ab statt sie zu verschweigen.
  const lies = (ref, pfad) => git('show', `${ref === 'basis' ? basis : 'HEAD'}:${pfad}`)
  const urteil = bewerte({ aenderungen, lies, beschreibung: beschreibungMitKommentaren(pr, process.env.GITHUB_REPOSITORY) })
  if (!urteil.ok) {
    console.error(`  ✖ Mockup-Freigabe: ${urteil.grund}`)
    process.exit(1)
  }
  console.log(`  ✓ Mockup-Freigabe: ${urteil.grund}`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
