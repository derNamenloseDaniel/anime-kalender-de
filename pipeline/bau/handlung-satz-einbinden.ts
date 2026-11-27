import { log, warn } from '../lib/util.ts'
import { ladeSaetze, satzDateiFehler, type SatzDatei } from '../lib/handlung-satz.ts'
import { type SynopsisEintrag } from './13-1-anreichern.ts'

/**
 * **Ein Satz Handlung je Titel** (nach `ergaenzeEigeneHandlungen`): `satz` kommt neben `de`/`en` in die Synopsen-Gruppe, `satzReihe` wenn er die Reihe beschreibt.
 * Eine fehlerhafte Datei bricht den Bau ab; ein Satz zu einem Titel, den der Bestand nicht führt, steht als Warnung im Protokoll.
 */
export function ergaenzeSaetze(synopses: Record<number, SynopsisEintrag>, bekannt: ReadonlySet<number>, dateien: SatzDatei[] = ladeSaetze()): number {
  const fehler = satzDateiFehler(dateien)
  if (fehler.length) throw new Error(`data/curated/ein-satz-handlung fehlerhaft:\n${fehler.join('\n')}`)
  let eingebunden = 0
  for (const { eintraege } of dateien) {
    for (const e of eintraege) {
      if (!bekannt.has(e.id)) { warn(`Ein-Satz-Handlung ${e.id}: Titel nicht im Bestand — Eintrag löschen`); continue }
      synopses[e.id] = { ...synopses[e.id], satz: e.satz.trim(), ...(e.umfang === 'reihe' ? { satzReihe: true as const } : {}) }
      eingebunden++
    }
  }
  log(`Ein-Satz-Handlung: ${eingebunden} eingebunden`)
  return eingebunden
}
