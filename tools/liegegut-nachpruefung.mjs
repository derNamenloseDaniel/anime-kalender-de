/**
 * Offene Nachprüfungen für die Wachphase und den Nacht-Dirigenten (Daniel, 27.11.2026): Der Nacht-Merger setzt auf jeden gemergten
 * Stufe-2-PR das Label `nachpruefung-offen` (`markiereNachpruefung` in `nacht-merger.mjs`). Wer den Merge im Nachhinein geprüft hat
 * (Diff gegen Auftrag und Prüferbericht, Wirkung live), entfernt das Label; bis dahin steht der PR hier in einer Zeile.
 */
import { NACHPRUEFUNG_LABEL } from './nacht-merger.mjs'

const STUNDE = 3600 * 1000

/** Zeile `NACHPRÜFUNG OFFEN: 5100, 5101 (älteste seit 20 h)` oder null ohne offene Nachprüfung; `ghFn(args)` liefert stdout. */
export function nachpruefungMeldung(ghFn, jetzt) {
  const aus = ghFn(['api', '-X', 'GET', 'repos/{owner}/{repo}/issues', '-f', `labels=${NACHPRUEFUNG_LABEL}`, '-f', 'state=all', '-f', 'per_page=100', '--jq', '[.[] | {nr: .number, zu: .closed_at}]'])
  const offene = JSON.parse(aus)
  if (offene.length === 0) return null
  const seit = Math.min(...offene.map((p) => Date.parse(p.zu)).filter((t) => !Number.isNaN(t)))
  const alter = Number.isFinite(seit) ? ` (älteste seit ${Math.floor((jetzt - seit) / STUNDE)} h)` : ''
  return `NACHPRÜFUNG OFFEN: ${offene.map((p) => p.nr).sort((a, b) => a - b).join(', ')}${alter}`
}
