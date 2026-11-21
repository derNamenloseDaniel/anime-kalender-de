/**
 * Start des CI-Prüfers (pr-pruefer.yml): welche PRs prüfpflichtig sind. Nur Node-Bordmittel.
 */

// Zweige, für die der Prüfer nie läuft (Sammler- und Zugzweige).
const OHNE_PRUEFER = (ref) => ref.startsWith('daten/') || ref === 'zug-fahrt' || ref === 'zug-probe'

/** Offene PRs, für die der Prüfer laufen muss: kein Entwurf, kein Fork, kein Daten- oder Zugzweig, Basis main oder zug. */
export function pruefpflichtig(pulls) {
  return pulls.filter((p) => !p.draft && p.state === 'open' && p.head?.repo?.full_name === p.base?.repo?.full_name && ['main', 'zug'].includes(p.base?.ref) && !OHNE_PRUEFER(String(p.head?.ref ?? '')))
}
