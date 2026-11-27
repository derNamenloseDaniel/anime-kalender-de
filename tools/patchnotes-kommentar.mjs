/**
 * Ausweg aus der Patch-Notes-Prüfung per PR-Kommentar. Beschreibungen werden nie geändert; trifft die Textsuche
 * (`VERTAGUNG_IM_GRUND`) die Zeile falsch (z. B. eine Messung „der nächste Bau zeigt sie“), hätte der PR sonst keinen Weg.
 * Ein Kommentar von PR-Autor oder Repo-Berechtigten mit einer Zeile „Patch Notes: …“ ersetzt die Beschreibung für diese Prüfung
 * (der neueste Kommentar gewinnt); dann wird der Text der Beschreibung nicht mehr abgesucht, nur die Zeile selbst gilt.
 */
import { ghApiJson } from './kind-mit-limit.mjs'

const VERTRAUT = new Set(['OWNER', 'MEMBER', 'COLLABORATOR'])
const PATCH_NOTES_ZEILE = /^[ \t]*Patch Notes:[ \t]*\S.*$/im

/** Wirksame Beschreibung: die Zeile „Patch Notes: …“ des neuesten Kommentars eines Berechtigten, sonst die Beschreibung selbst. */
export function wirksameBeschreibung(beschreibung, kommentare, autor) {
  const zaehlt = (k) => k.user?.login === autor || VERTRAUT.has(k.author_association)
  const zeilen = kommentare.filter((k) => zaehlt(k)).map((k) => PATCH_NOTES_ZEILE.exec(k.body ?? '')?.[0])
  return zeilen.filter(Boolean).at(-1)?.trim() ?? beschreibung
}

/** Warntext, wenn das PR-Ereignis läuft, der Kommentar-Ausweg aber keinen Zugang hat (sonst gälte still nur die Beschreibung); sonst null. */
export function zugangsWarnung(env = process.env, name = 'Patch-Notes-Kommentar') {
  if (env.GITHUB_EVENT_NAME !== 'pull_request') return null
  const fehlt = [env.GITHUB_REPOSITORY ? null : 'GITHUB_REPOSITORY', env.GH_TOKEN || env.GITHUB_TOKEN ? null : 'GH_TOKEN'].filter(Boolean)
  return fehlt.length ? `⚠ ${name}: ${fehlt.join(' und ')} fehlt im PR-Ereignis, es gilt nur die Beschreibung (PR-Kommentare werden nicht gelesen)` : null
}

/**
 * Alle Kommentare des PR aus `api(args)` (GitHub-API); gemeinsamer Weg der Prüfungen, die Kommentare lesen. „Laut“ heißt eine Logzeile
 * (`console.error`), nicht rot: ohne Zugang oder bei Abruffehler kommt [] samt ⚠-Zeile, es gilt dann nur die Beschreibung.
 */
export function leseKommentare(pr, repo, api = ghApiJson, env = process.env, name = 'Patch-Notes-Pflicht') {
  const warnung = zugangsWarnung(env, name)
  if (warnung) console.error(`  ${warnung}`)
  if (!repo || !pr.number) return []
  try {
    return api(['--paginate', '--slurp', `repos/${repo}/issues/${pr.number}/comments`]).flat()
  } catch (fehler) {
    console.error(`  ⚠ ${name}: Kommentare nicht lesbar, es gilt die Beschreibung (${String(fehler.message).split('\n')[0]})`)
    return []
  }
}

/** Wie `wirksameBeschreibung`, die Kommentare kommen aus `leseKommentare`; ohne Kommentare gilt die Beschreibung. */
export function beschreibungMitKommentaren(pr, repo, api = ghApiJson, env = process.env) {
  return wirksameBeschreibung(pr.body ?? '', leseKommentare(pr, repo, api, env), pr.user?.login)
}
