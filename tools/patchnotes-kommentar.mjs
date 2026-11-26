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
export function zugangsWarnung(env = process.env) {
  if (env.GITHUB_EVENT_NAME !== 'pull_request') return null
  const fehlt = [env.GITHUB_REPOSITORY ? null : 'GITHUB_REPOSITORY', env.GH_TOKEN || env.GITHUB_TOKEN ? null : 'GH_TOKEN'].filter(Boolean)
  return fehlt.length ? `⚠ Patch-Notes-Kommentar: ${fehlt.join(' und ')} fehlt im PR-Ereignis, es gilt nur die Beschreibung (Kommentar „Patch Notes: …“ wirkt nicht)` : null
}

/** Wie `wirksameBeschreibung`, die Kommentare kommen aus `api(args)` (GitHub-API); ein Abruffehler lässt die Beschreibung gelten. */
export function beschreibungMitKommentaren(pr, repo, api = ghApiJson, env = process.env) {
  const beschreibung = pr.body ?? ''
  const warnung = zugangsWarnung(env)
  if (warnung) console.error(`  ${warnung}`)
  if (!repo || !pr.number) return beschreibung
  try {
    const kommentare = api(['--paginate', '--slurp', `repos/${repo}/issues/${pr.number}/comments`]).flat()
    return wirksameBeschreibung(beschreibung, kommentare, pr.user?.login)
  } catch (fehler) {
    console.error(`  ⚠ Patch-Notes-Pflicht: Kommentare nicht lesbar, es gilt die Beschreibung (${String(fehler.message).split('\n')[0]})`)
    return beschreibung
  }
}
