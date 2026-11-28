/**
 * Zusicherung: **`schreibeZusatzdateien()` (`13-4-zusatzdateien.ts`) schreibt `franchises.json` mit den Neuverfilmungen** — der Aufruf
 * `markiereRemakes(reihen, <Titel>)` sitzt innerhalb von `markiereEigeneWerke(...)` im `writeJson` auf `franchises.json`. Fiele er weg,
 * blieben alle Funktionstests grün, und Yaiba 2025 hieße wieder „Staffel 2". Prüft den Syntaxbaum des Bau-Schritts; das Ergebnis im
 * Bestand zeigt die Warnung in `check-remake-zaehlung-bestand.ts`. Läuft in `check:logic`.
 */
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const FUNKTION = 'schreibeZusatzdateien'

const aufruf = (n: ts.Node | undefined, name: string): n is ts.CallExpression =>
  n !== undefined && ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === name

/** Alle Abweichungen von `writeJson(`${OUT}/franchises.json`, markiereAnbieterStaffeln(markiereEigeneWerke(markiereRemakes(reihen, <Titel>), mitStaffelTiteln(<Handlisten>, <Titel>)), titles.values()))`. */
export function verdrahtungsFehler(quelltext: string): string[] {
  const datei = ts.createSourceFile('x.ts', quelltext, ts.ScriptTarget.Latest, true)
  const rumpf = datei.statements.find((s): s is ts.FunctionDeclaration => ts.isFunctionDeclaration(s) && s.name?.text === FUNKTION)?.body
  if (!rumpf) return [`${FUNKTION} nicht gefunden`]
  const schreiber: ts.CallExpression[] = []
  const besuche = (n: ts.Node): void => {
    if (aufruf(n, 'writeJson') && n.arguments[0]?.getText(datei).includes('franchises.json')) schreiber.push(n)
    ts.forEachChild(n, besuche)
  }
  besuche(rumpf)
  if (schreiber.length !== 1) return [`franchises.json muss genau einmal geschrieben werden (gefunden: ${schreiber.length})`]
  const fehler: string[] = []
  // Der Anbieter-Zuschnitt (Stone Ocean Teil 1/2) steht außen herum; ohne ihn fehlt `anbieterStaffel` still.
  const aussen = schreiber[0]!.arguments[1]
  if (!aufruf(aussen, 'markiereAnbieterStaffeln') || aussen.arguments.length !== 2 || aussen.arguments[1]?.getText(datei) !== 'titles.values()') {
    return ['franchises.json muss aus markiereAnbieterStaffeln(<Reihen>, titles.values()) kommen']
  }
  const eigene = aussen.arguments[0]
  if (!aufruf(eigene, 'markiereEigeneWerke') || eigene.arguments.length !== 2 || !aufruf(eigene.arguments[1], 'mitStaffelTiteln')) return ['franchises.json muss aus markiereEigeneWerke(<Reihen>, mitStaffelTiteln(…)) kommen']
  const remakes = eigene.arguments[0]
  if (!aufruf(remakes, 'markiereRemakes')) return ['markiereEigeneWerke muss die Reihen aus markiereRemakes(reihen, <Titel>) bekommen']
  if (remakes.arguments.length !== 2) fehler.push(`markiereRemakes braucht genau Reihen und Titel (gefunden: ${remakes.arguments.length} Argumente)`)
  if (remakes.arguments[0]?.getText(datei) !== 'reihen') fehler.push(`markiereRemakes muss die Reihen bekommen (gefunden: ${remakes.arguments[0]?.getText(datei)})`)
  const titel = remakes.arguments[1]
  if (titel?.getText(datei) !== 'fuerReihen') {
    fehler.push(`markiereRemakes muss die Titel der Reihen (fuerReihen: ausgeliefert samt Katalog) bekommen (gefunden: ${titel?.getText(datei)})`)
  }
  return fehler
}

let verletzt = 0
let faelle = 0
function pruefe(name: string, ok: boolean, info = ''): void {
  faelle++
  if (ok) return
  verletzt++
  console.error(`FEHLER: ${name} ${info}`)
}

const quelle = readFileSync(new URL('./bau/13-4-zusatzdateien.ts', import.meta.url), 'utf8')
pruefe('Bau-Schritt ist verdrahtet', verdrahtungsFehler(quelle).length === 0, verdrahtungsFehler(quelle).join('; '))

const AUFRUF = 'markiereRemakes(reihen, fuerReihen)'
pruefe('Vorlage enthält den Aufruf genau einmal', quelle.split(AUFRUF).length === 2)
const abweichungen: [string, string][] = [
  ['Aufruf entfernt', quelle.replace(AUFRUF, 'reihen')],
  ['Aufruf hinter `0 &&`', quelle.replace(AUFRUF, '0 && ' + AUFRUF)],
  ['leere Titelliste', quelle.replace(AUFRUF, 'markiereRemakes(reihen, [])')],
  ['Titel aus der Bau-Karte statt der ausgelieferten (ohne aniSearch-Kennung)', quelle.replace(AUFRUF, 'markiereRemakes(reihen, [...titles.values()])')],
  ['falsche Reihen', quelle.replace(AUFRUF, 'markiereRemakes({}, fuerReihen)')],
  ['Staffel-Titel nicht als eigene Werke', quelle.replace(', mitStaffelTiteln(ladeAlleEigenenWerke(), titles.values())', '')],
  ['Aufruf mit drittem Argument', quelle.replace(AUFRUF, 'markiereRemakes(reihen, fuerReihen, {})')],
  ['Aufruf außerhalb der Schreibzeile', quelle.replace(AUFRUF, 'reihen').replace('  writeJson(`${OUT}/franchises.json`', `  ${AUFRUF}\n  writeJson(\`\${OUT}/franchises.json\``)],
  ['Anbieter-Zuschnitt fehlt', quelle.replace('markiereAnbieterStaffeln(markiereEigeneWerke(', 'markiereEigeneWerke(').replace('titles.values())), titles.values()))', 'titles.values())))')],
  ['Anbieter-Zuschnitt um falschen Inhalt', quelle.replace('markiereAnbieterStaffeln(markiereEigeneWerke(', 'markiereAnbieterStaffeln(markiereRemakes(reihen, fuerReihen) || markiereEigeneWerke(')],
  ['Anbieter-Zuschnitt ohne Titel', quelle.replace('titles.values())), titles.values()))', 'titles.values())), []))')],
  ['zweites Schreiben ohne Markierung', quelle.replace('  writeJson(`${OUT}/franchises.json`', '  writeJson(`${OUT}/franchises.json`, reihen)\n  writeJson(`${OUT}/franchises.json`')],
]
pruefe('Jede Abweichung ändert den Quelltext wirklich', abweichungen.every(([, text]) => text !== quelle))
for (const [name, text] of abweichungen) pruefe(`Abweichung erkannt: ${name}`, verdrahtungsFehler(text).length > 0)

console.log(`check-remake-verdrahtung: ${faelle} Zusicherungen, ${verletzt} verletzt`)
if (verletzt) process.exit(1)
