/**
 * Wächter „Kopf ohne Urteil“ (19.11.2026): Seit 21.11.2026 startet der CI-Prüfer (pr-pruefer.yml) erst am Ende der PR-Prüfkette
 * (pr-pruefer-nach-kette.mjs). Hängt oder fehlt die Kette oder fällt der Start aus, bleibt ein Kopf still ohne Urteil: Diese Wache meldet
 * jeden offenen, prüfpflichtigen PR, dessen Kopf seit mehr als 45 min kein Prüfer-Urteil hat. „Basis offen“ gilt als Urteil (der Prüfer
 * wartet dort gewollt auf den Basis-Merge).
 */
import { PRUEFER_WORKFLOW, laeufeVon, pruefpflichtig } from './pr-pruefer-start.mjs'

// Kette (Median rund 5 min, bei Runner-Stau bis 20) plus Prüfer (höchstens 31,5 min Budget, meist 5–15) liegen fast immer darunter.
export const OHNE_URTEIL_MIN = 45

const BOT = 'github-actions[bot]'
/** Steht im Kommentar eines Prüfer-Laufs, der bei laufender Kette ohne Modell endete (bis 19.11.2026 kommentiert, pr-pruefer.yml): kein Urteil. */
export const MARKE_OHNE_MODELL = '<!-- pruefer-ohne-modell -->'
const URTEIL = /^\*\*Prüfer-Review\*\* für (\S+) - Urteil: \*\*(.*)\*\*/

/** Hat der Kopf ein Prüfer-Urteil? „nicht beurteilt“ (Kette lief noch, Diff unvollständig) zählt nicht, „Basis offen“ schon. */
export function hatUrteil(kommentare, kopf) {
  return kommentare.some((k) => {
    if (k.user?.login !== BOT || String(k.body ?? '').includes(MARKE_OHNE_MODELL)) return false
    const treffer = URTEIL.exec(String(k.body ?? '').split('\n')[0])
    if (!treffer || treffer[1] !== kopf.slice(0, 9)) return false
    return !treffer[2].startsWith('nicht beurteilt') || treffer[2].includes('Basis offen')
  })
}

/** Minuten seit dem Push des Kopfes: frühester Lauf der PR-Prüfkette, ohne Kettenlauf das Commit-Datum (fehlende Kette meldet sich so auch). */
function kopfAlter(gh, repo, sha, jetzt) {
  const ketten = JSON.parse(gh('api', `repos/${repo}/actions/workflows/pr-pruefung.yml/runs?head_sha=${sha}&event=pull_request&per_page=30`)).workflow_runs ?? []
  if (ketten.length) return (jetzt - Math.min(...ketten.map((l) => Date.parse(l.created_at)))) / 60_000
  const commit = JSON.parse(gh('api', `repos/${repo}/commits/${sha}`))
  return (jetzt - Date.parse(commit.commit?.committer?.date)) / 60_000
}

/** Wachzeilen: je Kopf ohne Urteil eine `PRUEFER:`-Zeile; ein Abruffehler wird zur eigenen Zeile `PRUEFER? …`. `gh(...args)` gibt den JSON-Text zurück. */
export function prueferZeilen(gh, repo, jetzt = Date.now()) {
  try {
    const zeilen = []
    const pulls = pruefpflichtig(JSON.parse(gh('api', `repos/${repo}/pulls?state=open&per_page=100`)))
    // Ein Abruf für alle PRs: Prüfer-Läufe tragen den SHA von main, der PR steht im Laufnamen.
    const laeufe = pulls.length ? JSON.parse(gh('api', `repos/${repo}/actions/workflows/${PRUEFER_WORKFLOW}/runs?event=workflow_dispatch&per_page=50`)).workflow_runs ?? [] : []
    for (const pr of pulls) {
      const kopf = pr.head.sha
      // Läuft der Prüfer für diesen PR (queued/in_progress), kommt das Urteil noch.
      if (laeufeVon(laeufe, pr.number).some((l) => l.status !== 'completed')) continue
      const alter = kopfAlter(gh, repo, kopf, jetzt)
      if (alter <= OHNE_URTEIL_MIN) continue
      const kommentare = JSON.parse(gh('api', '--paginate', '--slurp', `repos/${repo}/issues/${pr.number}/comments`)).flat()
      if (hatUrteil(kommentare, kopf)) continue
      zeilen.push(`PRUEFER: PR #${pr.number} Kopf ${kopf.slice(0, 9)} ohne Urteil seit ${Math.round(alter)} min (Grenze ${OHNE_URTEIL_MIN} min): Kette hängt oder fehlt, oder Start nach Kettenende ausgefallen? pr-pruefer-nachtrag.yml, Job nach-kette`)
    }
    return zeilen
  } catch (fehler) {
    return [`PRUEFER? Prüfer-Urteile nicht lesbar: ${String(fehler.message).split('\n')[0]}`]
  }
}
