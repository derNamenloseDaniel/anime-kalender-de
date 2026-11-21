/**
 * Startet den CI-Prüfer, sobald die PR-Prüfkette eines Kopfes fertig ist (seit 21.11.2026 der einzige Start nach einem Push; vorher
 * startete der Prüfer mit dem Push, sah die Kette laufen, schwieg und wurde von hier neu gestartet). Aufruf aus
 * .github/workflows/pr-pruefer-nachtrag.yml (Ereignis workflow_run der „PR-Prüfkette“); nur Node-Bordmittel.
 * Umgebung: GITHUB_REPOSITORY, KOPF_SHA (head_sha des Kettenlaufs), KETTE_ERGEBNIS (seine conclusion); kein Kommentartext.
 */
import { pathToFileURL } from 'node:url'
import { ghMitLimit, ghRoh, neuesKonto, warteSync } from './gh-ratelimit.mjs'
import { CI_BOT } from './pr-nachtraege.mjs'
import { basisNummer } from './pr-pruefer-basis-offen.mjs'
import { MARKE_KETTE_OFFEN } from './pr-pruefer-kette-offen.mjs'
import { MARKE_OHNE_MODELL } from './pruefer-unfertig-wache.mjs'
import { pruefpflichtig, starte } from './pr-pruefer-start.mjs'

/** Höchstens so viele „Kette offen“-Urteile je Kopf (Schleifenschutz bei wiederholten Ketten). */
export const MAX_NEUSTARTS = 2

/** Neuester Kommentar des Prüfer-Bots zu diesem Kopf (Liste der API, älteste zuerst) oder null. */
export function letztesUrteil(kommentare, kopf) {
  const kurz = `**Prüfer-Review** für ${kopf.slice(0, 9)} `
  return [...kommentare].reverse().find((k) => k.user?.login === CI_BOT && String(k.body ?? '').startsWith(kurz)) ?? null
}

/** Ja/Nein samt Grund: soll der Prüfer jetzt starten? `pr` = API-Antwort des PR, `kette` = conclusion des Kettenlaufs. */
export function entscheide({ kommentare, kopf, pr, basisOffen = false, kette = null }) {
  if (!pr) return { los: false, grund: 'kein offener PR zum Kopf' }
  if (pr.state !== 'open' || pr.draft) return { los: false, grund: 'PR nicht offen oder Entwurf' }
  if (pr.head?.sha !== kopf) return { los: false, grund: 'Kopf inzwischen ein anderer' }
  if (pruefpflichtig([pr]).length === 0) return { los: false, grund: 'Kopf nicht prüfpflichtig (Fork, Daten- oder Zugzweig, andere Basis)' }
  const letztes = letztesUrteil(kommentare, kopf)
  // Kopf ohne Urteil: der Normalfall nach einem Push. Auch eine rote Kette bekommt ihr Urteil („ok, Checks rot: …“ oder „aendern“).
  if (!letztes) return { los: true, grund: 'Kette fertig, Kopf ohne Urteil' }
  // Ein Urteil bleibt (Kette nachgerechnet oder neu gestartet): neu prüft nur ein Nachtrag (pr-pruefer-neustart.mjs).
  if (!String(letztes.body).includes(MARKE_KETTE_OFFEN)) return { los: false, grund: 'Kopf hat ein Urteil' }
  const kurz = `**Prüfer-Review** für ${kopf.slice(0, 9)} `
  // Läufe ohne Modell (Altbestand bis 19.11.2026) kosten fast nichts und zählen nicht gegen die Grenze.
  const bisher = kommentare.filter((k) => k.user?.login === CI_BOT && String(k.body ?? '').startsWith(kurz) && String(k.body).includes(MARKE_KETTE_OFFEN) && !String(k.body).includes(MARKE_OHNE_MODELL)).length
  if (bisher > MAX_NEUSTARTS) return { los: false, grund: `schon ${bisher} Mal „Kette offen“ (Grenze ${MAX_NEUSTARTS})` }
  // Stapel-PR, Basis noch offen: eine rote Kette ist erwartet, der Prüfer urteilt erst nach grüner Kette (Marke „Basis offen“).
  if (basisOffen && kette !== 'success') return { los: false, grund: 'Basis noch offen und Kette nicht grün' }
  return { los: true, grund: basisOffen ? 'Basis gemergt oder Kette grün: Prüfer sah sie unfertig' : 'Kette fertig, Prüfer sah sie unfertig' }
}

/** Ist der in der PR-Beschreibung genannte Basis-PR noch offen? Abruffehler zählen als „nein“ (altes Verhalten). */
function basisIstOffen(repo, pr, gh) {
  const nr = basisNummer(pr.body)
  if (!nr) return false
  try {
    return gh(['api', `repos/${repo}/pulls/${nr}`, '-q', '.state']).trim() === 'open'
  } catch {
    return false
  }
}

/** Einstieg; Rückgabe ist der Exit-Code. 1 nur bei Eingabe- oder Abruffehlern („FEHLGESCHLAGEN …“ im Log). */
export function main(env = process.env, { gh: ghBasis = ghRoh, warte = warteSync, jetzt = Date.now, konto = neuesKonto() } = {}) {
  // Bei „rate limit“ wartet ein Aufruf bis zum Reset, alle zusammen höchstens KONTO_MS (Job-Timeout im Workflow daraus abgeleitet).
  const gh = (args) => ghMitLimit(ghBasis, args, { warte, jetzt, konto })
  const repo = env.GITHUB_REPOSITORY
  const kopf = env.KOPF_SHA
  if (!repo || !/^[0-9a-f]{40}$/.test(kopf ?? '')) return console.log('Prüfer nach Kette: Repo oder Kopf fehlt'), 1
  try {
    const pulls = JSON.parse(gh(['api', `repos/${repo}/commits/${kopf}/pulls`]))
    const pr = pulls.find((p) => p.state === 'open' && p.head?.sha === kopf) ?? null
    if (!pr) return console.log('Prüfer nach Kette: nein (kein offener PR zum Kopf)'), 0
    if (pruefpflichtig([pr]).length === 0) return console.log('Prüfer nach Kette: nein (Kopf nicht prüfpflichtig)'), 0
    const kommentare = JSON.parse(gh(['api', '--paginate', '--slurp', `repos/${repo}/issues/${pr.number}/comments`])).flat()
    const basisOffen = basisIstOffen(repo, pr, gh)
    const urteil = entscheide({ kommentare, kopf, pr, basisOffen, kette: env.KETTE_ERGEBNIS ?? null })
    if (!urteil.los) return console.log(`Prüfer nach Kette: nein (${urteil.grund})`), 0
    starte(repo, pr.number, kopf, gh)
    console.log(`Prüfer nach Kette: ja, PR ${pr.number} Kopf ${kopf.slice(0, 9)} gestartet (${urteil.grund})`)
  } catch (e) {
    console.log(`Prüfer nach Kette: FEHLGESCHLAGEN Kopf ${kopf.slice(0, 9)}: nicht gestartet (${e.message.split('\n')[0]})`)
    return 1
  }
  return 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(main())
