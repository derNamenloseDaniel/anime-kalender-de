/**
 * Startet den CI-Prüfer (pr-pruefer.yml) neu, wenn auf einem offenen PR ein Nachtrag-Kommentar erscheint.
 * Aufruf aus .github/workflows/pr-pruefer-nachtrag.yml; nur Node-Bordmittel, der Kommentartext kommt nur über die Umgebung.
 * Der Prüfer liest die Kommentare bei jedem Start neu (tools/pr-nachtraege.mjs). Seit 21.11.2026 per Dispatch (pr-pruefer-start.mjs):
 * ein laufender Prüfer desselben PR bricht über die concurrency-Gruppe ab, kein cancel und kein Warten mehr.
 */
import { pathToFileURL } from 'node:url'
import { ghMitLimit, ghRoh, neuesKonto, warteSync } from './gh-ratelimit.mjs'
import { holeLauf } from './pr-kettenlog.mjs'
import { CI_BOT, NACHTRAG, VERTRAUT } from './pr-nachtraege.mjs'
import { PRUEFER_WORKFLOW, laeufeVon, starte } from './pr-pruefer-start.mjs'

const ABNAHME = /Abnahme Dirigent/i

/** Ja/Nein samt Grund: zählt der Kommentar als Prüfauftrag? `pr` = Antwort der API für den PR. */
export function entscheide({ body, kommentarLogin, assoziation, pr }) {
  const erste = String(body ?? '').split('\n')[0]
  if (!pr) return { los: false, grund: 'kein PR' }
  if (kommentarLogin === CI_BOT) return { los: false, grund: 'Kommentar des Prüfers selbst' }
  if (!NACHTRAG.test(body ?? '')) return { los: false, grund: 'kein Nachtrag' }
  if (ABNAHME.test(erste)) return { los: false, grund: 'Abnahme des Dirigenten, kein Prüfauftrag' }
  if (kommentarLogin !== pr.user?.login && !VERTRAUT.has(assoziation)) return { los: false, grund: 'Autor ohne Schreibrecht' }
  if (pr.state !== 'open') return { los: false, grund: 'PR nicht offen' }
  if (pr.draft) return { los: false, grund: 'Entwurf' }
  if (pr.head?.repo?.full_name !== pr.base?.repo?.full_name) return { los: false, grund: 'Fork' }
  if (String(pr.head?.ref ?? '').startsWith('daten/')) return { los: false, grund: 'Datenzweig' }
  return { los: true, grund: 'Nachtrag eines Berechtigten' }
}

/**
 * Hat der neueste Lauf den Kommentar schon gelesen? Ja, wenn dieser Versuch nach dem Kommentar startete und nicht abgebrochen oder
 * gescheitert ist: er liest die Kommentare erst im Schritt „Diff bereitlegen“. Ein zweiter Lauf auf demselben Kopf (12.11.2026, PR 3579:
 * Hand-Rerun, dann Neustart wartete ihn ab und startete ihn erneut) lieferte ein zweites, widersprüchliches Urteil.
 * Fehlt eine Zeit, gilt „nein“ (Neustart wie bisher).
 */
export function liestKommentarSchon(lauf, kommentarZeit) {
  const kommentar = Date.parse(kommentarZeit ?? '')
  const start = Date.parse(lauf.run_started_at ?? '')
  if (!Number.isFinite(kommentar) || !Number.isFinite(start) || start <= kommentar) return false
  return lauf.status !== 'completed' || lauf.conclusion === 'success'
}

/** Einstieg; Rückgabe ist der Exit-Code. 1 bei fehlenden Eingaben, unlesbarem PR oder gescheitertem Neustart (Abfrage, Dispatch): eine Zeile „FEHLGESCHLAGEN PR n Kopf h: Grund“ im Log, der Job wird rot und `laeufe-aufraeumen` sieht ihn; der Prüfer-Zustand ist dann der von vorher. */
export function main(env = process.env, { gh: ghBasis = ghRoh, warte = warteSync, jetzt = Date.now, konto = neuesKonto() } = {}) {
  // Bei „rate limit“ wartet ein Aufruf bis zum Reset, alle zusammen höchstens KONTO_MS (Job-Timeout im Workflow daraus abgeleitet).
  const gh = (args) => ghMitLimit(ghBasis, args, { warte, jetzt, konto })
  const repo = env.GITHUB_REPOSITORY
  const nr = env.PR_NUMMER
  if (!/^\d+$/.test(nr ?? '') || !repo) return console.log('Prüfer-Neustart: PR-Nummer oder Repo fehlt'), 1
  let pr = null
  try {
    pr = JSON.parse(gh(['api', `repos/${repo}/pulls/${nr}`]))
  } catch (e) {
    return console.log(`Prüfer-Neustart: PR nicht lesbar (${e.message.split('\n')[0]})`), 1
  }
  const urteil = entscheide({ body: env.KOMMENTAR, kommentarLogin: env.KOMMENTAR_LOGIN, assoziation: env.KOMMENTAR_ASSOZIATION, pr })
  if (!urteil.los) return console.log(`Prüfer-Neustart: nein (${urteil.grund})`), 0
  try {
    // Kette des Kopfes noch nicht fertig (oder nie gelaufen): ihr Ende startet den Prüfer, der dann auch diesen Kommentar liest.
    const kette = holeLauf(repo, pr.head.sha, gh)
    if (kette?.status !== 'completed') return console.log(`Prüfer-Neustart: nein (Kette für ${pr.head.sha.slice(0, 9)} nicht fertig, ihr Ende startet den Prüfer)`), 0
    const liste = JSON.parse(gh(['api', `repos/${repo}/actions/workflows/${PRUEFER_WORKFLOW}/runs?event=workflow_dispatch&per_page=30`, '-q', '.workflow_runs']))
    const lauf = laeufeVon(liste, pr.number)[0]
    if (lauf && liestKommentarSchon(lauf, env.KOMMENTAR_ZEIT)) return console.log(`Prüfer-Neustart: nein (Lauf ${lauf.id} startete nach dem Kommentar)`), 0
    starte(repo, pr.number, pr.head.sha, gh)
    console.log(`Prüfer-Neustart: ja, PR ${nr} Kopf ${pr.head.sha.slice(0, 9)} gestartet (${urteil.grund})`)
  } catch (e) {
    console.log(`Prüfer-Neustart: FEHLGESCHLAGEN PR ${nr} Kopf ${pr.head.sha.slice(0, 9)}: nicht neu gestartet (${e.message.split('\n')[0]})`)
    return 1
  }
  return 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(main())
