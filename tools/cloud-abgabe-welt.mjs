/**
 * gh-Anschluss von `cloud-abgabe.mjs`: nur REST (`gh api`, Cloud-Sitzungen und App-Token ohne GraphQL), jeder Wert als Argument-Feld oder
 * JSON über stdin, nie in einem Shell-Text. Schreibende Aufrufe (PR, Kommentar, Label) werden nie wiederholt; die Logik liest vorher neu.
 * Nur 404 heißt „fehlt“, jeder andere gh-Fehler wirft (Exit 2 im Aufrufer).
 */
import { LIMIT_STAPEL_MS, mitLimit } from './kind-mit-limit.mjs'
import { stufeVon } from './nacht-merger-welt.mjs'

const REPO_STANDARD = 'derNamenloseDaniel/anime-kalender-de'
const LABEL_FARBE = { 0: '0e8a16', 1: 'fbca04', 2: 'd93f0b' }
const STUFE_LIMIT_MS = 90_000

/** `gh` mit optionalem stdin; Rückgabe stdout. */
export const ghEchtMitEingabe = (args, eingabe) =>
  mitLimit('gh', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...(eingabe === undefined ? {} : { input: eingabe }) }, { limitMs: LIMIT_STAPEL_MS })

const fehlerText = (e) => `${e.message}\n${e.stderr ?? ''}\n${e.stdout ?? ''}`
const ist404 = (e) => /HTTP 404/.test(fehlerText(e))
const kodiert = (pfad) => pfad.split('/').map(encodeURIComponent).join('/')

export function echteWelt({ gh = ghEchtMitEingabe, repo = process.env.GITHUB_REPOSITORY || REPO_STANDARD, zeile = (t) => console.log(t), stufeAus } = {}) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error('GITHUB_REPOSITORY ungültig')
  const besitzer = repo.split('/')[0]
  const lesen = (args) => gh(['api', ...args])
  const schreiben = (methode, pfad, daten) => gh(['api', '-X', methode, `repos/${repo}/${pfad}`, '--input', '-'], JSON.stringify(daten))
  const stufeLauf = stufeAus ?? ((args) => mitLimit(args[0], args.slice(1), { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }, { limitMs: STUFE_LIMIT_MS }))
  return {
    zeile,
    datei: (zweig, name) => {
      try {
        return lesen(['-H', 'Accept: application/vnd.github.raw', `repos/${repo}/contents/${name}?ref=${encodeURIComponent(zweig)}`])
      } catch (e) {
        if (ist404(e)) return null
        throw e
      }
    },
    zweigSha: (zweig) => {
      try {
        return lesen([`repos/${repo}/git/ref/heads/${kodiert(zweig)}`, '--jq', '.object.sha']).trim() || null
      } catch (e) {
        if (ist404(e)) return null
        throw e
      }
    },
    offenerPr: (zweig) => {
      const liste = JSON.parse(lesen([`repos/${repo}/pulls?state=open&head=${encodeURIComponent(`${besitzer}:${zweig}`)}&per_page=100`]))
      const pr = liste.find((p) => p.head?.ref === zweig && p.head?.repo?.full_name === repo)
      return pr ? { nummer: pr.number } : null
    },
    prAnlegen: ({ titel, text, zweig }) => {
      try {
        return { nummer: JSON.parse(schreiben('POST', 'pulls', { title: titel, head: zweig, base: 'main', body: text })).number }
      } catch (e) {
        if (/HTTP 422/.test(fehlerText(e)) && /already exists/i.test(fehlerText(e))) return null
        throw e
      }
    },
    kommentare: (nr) =>
      lesen([`repos/${repo}/issues/${nr}/comments?per_page=100`, '--paginate', '--jq', '.[] | .body | @json'])
        .split('\n')
        .filter((z) => z.trim() !== '')
        .map((z) => JSON.parse(z)),
    kommentarSchreiben: (nr, text) => void schreiben('POST', `issues/${nr}/comments`, { body: text }),
    stufe: (nr) => stufeVon(nr, stufeLauf),
    labels: (nr) => lesen([`repos/${repo}/issues/${nr}/labels?per_page=100`, '--paginate', '--jq', '.[].name']).split('\n').filter((z) => z !== ''),
    labelAnlegen: (name) => {
      try {
        lesen([`repos/${repo}/labels/${encodeURIComponent(name)}`])
      } catch (e) {
        if (!ist404(e)) throw e
        void schreiben('POST', 'labels', { name, color: LABEL_FARBE[name.slice(-1)] ?? 'ededed', description: 'Prüfstufe (tools/pr-stufe.mjs), gesetzt von cloud-abgabe' })
      }
    },
    labelSetzen: (nr, name) => void schreiben('POST', `issues/${nr}/labels`, { labels: [name] }),
    labelEntfernen: (nr, name) => {
      try {
        gh(['api', '-X', 'DELETE', `repos/${repo}/issues/${nr}/labels/${encodeURIComponent(name)}`])
      } catch (e) {
        if (!ist404(e)) throw e
      }
    },
  }
}
