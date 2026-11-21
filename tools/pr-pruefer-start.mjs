/**
 * Start des CI-Prüfers (seit 21.11.2026 nur `workflow_dispatch`): `.github/workflows/pr-pruefer.yml` startet nicht mehr mit dem Push,
 * sondern erst, wenn die PR-Prüfkette des Kopfes fertig ist (pr-pruefer-nach-kette.mjs) oder ein Nachtrag kommt (pr-pruefer-neustart.mjs).
 * Beide rufen `starte`; der Job `ziel` in pr-pruefer.yml ruft `main` und prüft die Eingaben gegen die API, weil jeder mit Schreibrecht
 * dispatchen kann. Nur Node-Bordmittel.
 * Umgebung von `main`: GITHUB_REPOSITORY, PR_EINGABE, SHA_EINGABE (leer = aktueller Kopf), GITHUB_OUTPUT.
 */
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
import { ghMitLimit, ghRoh, neuesKonto, warteSync } from './gh-ratelimit.mjs'

export const PRUEFER_WORKFLOW = 'pr-pruefer.yml'
// Zweige, für die der Prüfer nie läuft (Sammler- und Zugzweige).
const OHNE_PRUEFER = (ref) => ref.startsWith('daten/') || ref === 'zug-fahrt' || ref === 'zug-probe'
// Der Zweigname geht als Ausgabe in die env anderer Jobs (Mutationsprobe); nur harmlose Zeichen.
const ZWEIG_ZEICHEN = /^[A-Za-z0-9._/-]+$/

/** Offene PRs, für die der Prüfer laufen muss: kein Entwurf, kein Fork, kein Daten- oder Zugzweig, Basis main oder zug. */
export function pruefpflichtig(pulls) {
  return pulls.filter((p) => !p.draft && p.state === 'open' && p.head?.repo?.full_name === p.base?.repo?.full_name && ['main', 'zug'].includes(p.base?.ref) && !OHNE_PRUEFER(String(p.head?.ref ?? '')))
}

/** Anzeigename eines Prüfer-Laufs (`run-name` in pr-pruefer.yml): Dispatch-Läufe tragen den SHA von main, der PR steht nur hier. */
export const laufTitel = (nr) => `PR-Prüfer #${nr} `

/** Läufe des Prüfers für PR `nr` aus einer Laufliste der API (Reihenfolge bleibt, neueste zuerst). */
export function laeufeVon(laeufe, nr) {
  return (laeufe ?? []).filter((l) => String(l.display_title ?? '').startsWith(laufTitel(nr)))
}

/** Ziel des Prüfers: `{ los, grund }`, bei `los` dazu pr, sha, basis, zweig. `pr` = API-Antwort, `sha` = Eingabe (leer = aktueller Kopf). */
export function ziel(pr, sha) {
  if (!pr || pruefpflichtig([pr]).length === 0) return { los: false, grund: 'PR nicht prüfpflichtig (geschlossen, Entwurf, Fork, Daten- oder Zugzweig, andere Basis)' }
  if (sha && pr.head.sha !== sha) return { los: false, grund: `Kopf inzwischen ${String(pr.head.sha).slice(0, 9)}, der neue Kettenlauf startet den Prüfer` }
  if (!/^[0-9a-f]{40}$/.test(pr.head.sha ?? '') || !/^[0-9a-f]{40}$/.test(pr.base?.sha ?? '') || !ZWEIG_ZEICHEN.test(pr.head.ref)) return { los: false, grund: 'Kopf, Basis oder Zweigname unerwartet geformt' }
  return { los: true, grund: 'prüfpflichtig, Kopf aktuell', pr: pr.number, sha: pr.head.sha, basis: pr.base.sha, zweig: pr.head.ref }
}

/** Startet pr-pruefer.yml (Fassung von main) für PR `nr` am Kopf `sha`: ein Aufruf. Ein laufender Prüfer desselben PR bricht ab (concurrency). */
export function starte(repo, nr, sha, gh) {
  gh(['api', '-X', 'POST', `repos/${repo}/actions/workflows/${PRUEFER_WORKFLOW}/dispatches`, '-f', 'ref=main', '-f', `inputs[pr]=${nr}`, '-f', `inputs[sha]=${sha}`])
}

/** Einstieg des Jobs `ziel`; Rückgabe ist der Exit-Code. 1 nur bei ungültiger Eingabe oder Abruffehler („FEHLGESCHLAGEN …“ im Log). */
export function main(env = process.env, { gh: ghBasis = ghRoh, warte = warteSync, jetzt = Date.now, konto = neuesKonto() } = {}) {
  const gh = (args) => ghMitLimit(ghBasis, args, { warte, jetzt, konto })
  const repo = env.GITHUB_REPOSITORY
  const nr = env.PR_EINGABE ?? ''
  const sha = env.SHA_EINGABE ?? ''
  if (!repo || !/^\d+$/.test(nr) || !/^([0-9a-f]{40})?$/.test(sha)) return console.log('Prüfer-Ziel: FEHLGESCHLAGEN, Eingabe pr (Zahl) oder sha (40 Hex-Zeichen oder leer) ungültig'), 1
  let pr
  try {
    pr = JSON.parse(gh(['api', `repos/${repo}/pulls/${nr}`]))
  } catch (e) {
    return console.log(`Prüfer-Ziel: FEHLGESCHLAGEN PR ${nr} nicht lesbar (${e.message.split('\n')[0]})`), 1
  }
  const z = ziel(pr, sha)
  console.log(`Prüfer-Ziel: PR ${nr} ${z.los ? 'ja' : 'nein'} (${z.grund})`)
  const zeilen = z.los ? ['los=1', `pr=${z.pr}`, `sha=${z.sha}`, `basis=${z.basis}`, `zweig=${z.zweig}`] : ['los=0']
  if (env.GITHUB_OUTPUT) fs.appendFileSync(env.GITHUB_OUTPUT, zeilen.join('\n') + '\n')
  return 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(main())
