import type { Release, Title } from '../../shared/types.ts'
import { deutschLautAnisearch, deutschGeplantLautAnisearch } from './ohne-beleg.ts'

/**
 * **Ein Termin, dessen Quelle nur den Originalton nennt, gehört nie in den Kalender** (Daniel, 14.10.2026, Beerus; seit 26.11.2026 auch mit
 * Deutsch-Beleg: `expandEvents` erzeugt für `sprache: 'omu'` keine Ereignisse, `shared/nur-deutsch.ts`). Die Releases bleiben im Datensatz;
 * ob ein Titel nur OmU-Termine hat, fragt `omuOhneDeutschBeleg` weiter. Sind alle Termine eines Titels
 * solche OmU-Termine (`nurOmuTitel`) und hat er keine deutschen Sprechrollen, verschiebt ihn `hinter-toggle.ts` aus dem Hauptbestand.
 */
export function omuOhneDeutschBeleg(t: Title | undefined): boolean {
  if (!t) return false
  if (t.streams.some((s) => s.dub === true) || t.deErstausgabe) return false
  if (t.ankuendigung?.synchro === 'angekuendigt') return false
  return !deutschLautAnisearch(t) && !deutschGeplantLautAnisearch(t.id)
}

/**
 * **Ein Titel, dessen Termine alle nur Originalton nennen, steht nicht im Hauptbestand** (Daniel, 26.10.2026, Beerus: „keiner der
 * Anbieter hat deutsche Synchro“). Ein einziger Termin ohne `sprache: 'omu'` (oder nur `offen`, also unklar) hält ihn drin, ebenso jeder
 * Deutsch-Beleg derselben Regel wie bei den Terminen (`omuOhneDeutschBeleg`). Widerlegte Termine zählen nicht.
 */
export function nurOmuTitel(titles: Map<number, Title>, releases: Release[]): Set<number> {
  const sprachen = new Map<number, (string | undefined)[]>()
  for (const r of releases) {
    if (r.widerlegt) continue
    sprachen.set(r.titleId, [...(sprachen.get(r.titleId) ?? []), r.sprache])
  }
  return new Set([...sprachen.keys()].filter((id) => sprachen.get(id)!.every((s) => s === 'omu') && omuOhneDeutschBeleg(titles.get(id))))
}

/**
 * **Ein `hinweis` an einem Release eines `nurOmuTitel` erreicht keinen Besucher**: Termine entfallen, der Titel steht nicht im
 * Hauptbestand, und „ohne Synchro“ sagt dort dasselbe. Der Bau warnt, die YAML bleibt (Rascal, Beerus; 09.11.2026).
 */
export function hinweiseAnVerworfenen(titles: Map<number, Title>, releases: Release[]): string[] {
  const verworfen = nurOmuTitel(titles, releases)
  return releases
    .filter((r) => r.hinweis && !r.widerlegt && verworfen.has(r.titleId))
    .map((r) => `Hinweis an „${r.slug}“ erreicht keinen Besucher: nur Originalton-Termine, der Titel steht ohne Synchro.`)
}
