/**
 * Betrifft ein PR die Oberfläche? (27.11.2026, Issue 5209) Der Job `scope` der PR-Prüfkette fragt das einmal und gibt `aussehen=1|0` aus; die 19 Jobs
 * `PR-Aussehen – …` starten nur bei 1. Vorher startete jeder von ihnen für jeden PR, prüfte in einem Schritt dieselbe Frage und endete ohne Arbeit
 * (7 von 12 Ketten, Messung 27.11.2026: 19 Jobs, zusammen 286–324 s), hinter den Ketten-Jobs anderer PRs in der Warteschlange (20-Jobs-Grenze).
 *
 * Außer der Oberfläche zählen genau die Dateien, die diese Jobs ausführen: die Werkzeuge von check:panel und check:ansichten, deren direkte Importe
 * (Liste `tools/pr-aussehen-pfade.txt`, Test `tools/pr-aussehen-pfade.test.mjs`) und der Workflow selbst.
 * Aufruf (nur Node-Bordmittel, der Job hat kein `npm ci`): node tools/pr-aussehen-betroffen.mjs HEAD^1 HEAD >> "$GITHUB_OUTPUT"
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export const PFADE = /^(web\/src\/|web\/buehne\/|extension\/.*\.css$|\.github\/workflows\/pr-pruefung\.yml$|package\.json$|tools\/pr-aussehen-pfade\.txt$)/
export const LISTE_DATEI = 'tools/pr-aussehen-pfade.txt'

/** Die Pfade der Liste (ohne Kommentar- und Leerzeilen) als Menge; sie gelten wörtlich, nie als Muster. */
export const listeAus = (text) => new Set(text.split('\n').filter((z) => z !== '' && !z.startsWith('#')))

/** Löst eine der geänderten Dateien die Aussehen-Jobs aus? */
export const betroffen = (dateien, liste) => dateien.some((d) => PFADE.test(d) || liste.has(d))

/** Zeile für `$GITHUB_OUTPUT`: immer `aussehen=1` oder `aussehen=0`, nie leer (der Sammeljob lässt nur bei „0“ übersprungene Aussehen-Jobs zu). */
export function ausgabe(basis, kopf, ausfuehren = (args) => execFileSync('git', args, { encoding: 'utf8', timeout: 30_000, windowsHide: true }), lies = (p) => readFileSync(p, 'utf8')) {
  const dateien = ausfuehren(['diff', '--name-only', basis, kopf]).split('\n').filter(Boolean)
  return `aussehen=${betroffen(dateien, listeAus(lies(LISTE_DATEI))) ? '1' : '0'}`
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(ausgabe(process.argv[2] ?? 'HEAD^1', process.argv[3] ?? 'HEAD'))
}
