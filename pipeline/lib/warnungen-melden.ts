/**
 * Meldet die Warnungs-Zusammenfassung am Bau-Ende. Eigene Datei, weil `warnungen-zaehlen.ts` über `util.ts` im Importgraph von `fetch.ts`
 * liegt: dort muss jedes Schreibziel ein fester Pfad sein (`tools/fetch-schreibziele.mjs`), das Step Summary ist keiner.
 */
import { appendFileSync } from 'node:fs'
import { warnungsZusammenfassung } from './warnungen-zaehlen.ts'

/** Am Bau-Ende: Zeile ins Log, im GitHub-Actions-Lauf zusätzlich ins Step Summary. */
export function meldeWarnungen(zusammenfassungsDatei = process.env.GITHUB_STEP_SUMMARY): void {
  const zeile = warnungsZusammenfassung()
  console.log(`[pipeline] ${zeile}`)
  if (zusammenfassungsDatei) appendFileSync(zusammenfassungsDatei, `${zeile}\n\n`, 'utf8')
}
