// Wächter „Kopf ohne Urteil“ (19.11.2026): Tabellentest der reinen Funktionen, Ablauf mit eingespeistem gh, Abruffehler und die Verdrahtung in der Wachphase.
// Die Kommentartexte sind wörtlich die erste Zeile echter Urteile (Abruf 31.10.2026).
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { MARKE_OHNE_MODELL, hatUrteil, prueferZeilen } from './pruefer-unfertig-wache.mjs'
import { pruefpflichtig } from './pr-pruefer-start.mjs'

const BOT = 'github-actions[bot]'
const KOPF = 'c'.repeat(40)
const ALT = 'a'.repeat(40)
const k = (titel, kopf = KOPF, login = BOT, extra = '') => ({ user: { login }, body: `**Prüfer-Review** für ${kopf.slice(0, 9)} - Urteil: **${titel}**\n\nProtokoll${extra}` })

let faelle = 0
const gleich = (name, ist, soll) => {
  assert.deepEqual(ist, soll, name)
  faelle++
}

// Urteil ja/nein
gleich('ok ist ein Urteil', hatUrteil([k('ok')], KOPF), true)
gleich('aendern ist ein Urteil', hatUrteil([k('aendern')], KOPF), true)
gleich('ok mit Zusatz „Checks rot“ ist ein Urteil', hatUrteil([k('ok, Checks rot: PR-Prüfkette')], KOPF), true)
gleich('„nicht beurteilt, Kette lief noch“ ist keins', hatUrteil([k('nicht beurteilt, Kette lief noch')], KOPF), false)
gleich('„nicht beurteilt, Diff unvollständig“ ist keins', hatUrteil([k('nicht beurteilt, Diff unvollständig')], KOPF), false)
gleich('„nicht beurteilt, Basis offen“ gilt (gewolltes Warten)', hatUrteil([k('nicht beurteilt, Basis offen')], KOPF), true)
gleich('Urteil zu altem Kopf zählt nicht', hatUrteil([k('ok', ALT)], KOPF), false)
gleich('fremder Autor zählt nicht', hatUrteil([k('ok', KOPF, 'fremder')], KOPF), false)
gleich('Lauf ohne Modell (Altbestand) zählt nicht', hatUrteil([k('ok', KOPF, BOT, `\n${MARKE_OHNE_MODELL}`)], KOPF), false)
gleich('Zeile muss am Textanfang stehen', hatUrteil([{ user: { login: BOT }, body: `Hallo\n${k('ok').body}` }], KOPF), false)
gleich('keine Kommentare', hatUrteil([], KOPF), false)
gleich('kein Text, kein Nutzer', hatUrteil([{}, { user: { login: BOT } }], KOPF), false)

// Prüfpflicht: dieselbe Funktion wie der Job `ziel` in pr-pruefer.yml (tools/pr-pruefer-start.mjs)
const pr = (a = {}) => ({ number: 7, state: 'open', draft: false, head: { sha: KOPF, ref: 'claude/x', repo: { full_name: 'o/r' } }, base: { ref: 'main', repo: { full_name: 'o/r' } }, ...a })
gleich('Normalfall prüfpflichtig', pruefpflichtig([pr()]).length, 1)
gleich('Entwurf nicht', pruefpflichtig([pr({ draft: true })]).length, 0)
gleich('Fork nicht', pruefpflichtig([pr({ head: { sha: KOPF, ref: 'x', repo: { full_name: 'f/r' } } })]).length, 0)
gleich('Datenzweig nicht', pruefpflichtig([pr({ head: { sha: KOPF, ref: 'daten/neu', repo: { full_name: 'o/r' } } })]).length, 0)
gleich('zug-fahrt und zug-probe nicht', pruefpflichtig(['zug-fahrt', 'zug-probe'].map((ref) => pr({ head: { sha: KOPF, ref, repo: { full_name: 'o/r' } } }))).length, 0)
gleich('andere Basis nicht', pruefpflichtig([pr({ base: { ref: 'dev', repo: { full_name: 'o/r' } } })]).length, 0)
gleich('Basis zug ja', pruefpflichtig([pr({ base: { ref: 'zug', repo: { full_name: 'o/r' } } })]).length, 1)
const wf = fs.readFileSync(new URL('../.github/workflows/pr-pruefer.yml', import.meta.url), 'utf8')
gleich('Workflow prüft das Ziel mit demselben Modul', wf.includes('node tools/pr-pruefer-start.mjs'), true)

// Ablauf mit eingespeistem gh. `ketten`: Läufe der PR-Prüfkette des Kopfes; `laeufe`: Prüfer-Läufe (Dispatch, PR im Laufnamen).
const JETZT = Date.parse('2026-11-19T12:00:00Z')
const vor = (min) => new Date(JETZT - min * 60_000).toISOString()
const P7 = 'PR-Prüfer #7 x'
function ablauf({ pulls = [pr()], ketten = [{ created_at: vor(90) }], laeufe = [{ status: 'completed', conclusion: 'success', display_title: P7 }], kommentare = [], commitMin = 90, fehler = null } = {}) {
  const aufrufe = []
  const gh = (...a) => {
    aufrufe.push(a.join(' '))
    if (fehler) throw new Error(fehler)
    const url = a.at(-1)
    if (url.includes('/pulls?state=open')) return JSON.stringify(pulls)
    if (url === 'repos/o/r/actions/workflows/pr-pruefer.yml/runs?event=workflow_dispatch&per_page=50') return JSON.stringify({ workflow_runs: laeufe })
    if (url.startsWith('repos/o/r/actions/workflows/pr-pruefung.yml/runs?head_sha=') && url.endsWith('&event=pull_request&per_page=30')) return JSON.stringify({ workflow_runs: url.includes(KOPF) ? ketten : [] })
    if (url.includes('/commits/')) return JSON.stringify({ commit: { committer: { date: vor(commitMin) } } })
    // Alle Seiten, als ein Feld je Seite: ohne --paginate/--slurp (oder mit vertauschter Reihenfolge) fehlen Kommentare hinter Seite 1.
    if (url.includes('/issues/7/comments') || url.includes('/issues/8/comments')) {
      if (a.slice(0, 3).join(' ') !== 'api --paginate --slurp') throw new Error('Kommentare ohne --paginate --slurp: ' + a.join(' '))
      // PR 8 (Kopf ALT) hat immer ein Urteil: trennt „je PR die eigenen Kommentare“ von „alle PRs gleich“.
      return JSON.stringify([url.includes('/issues/8/') ? [k('ok', ALT)] : kommentare])
    }
    throw new Error('unerwartet ' + url)
  }
  return { zeilen: prueferZeilen(gh, 'o/r', JETZT), aufrufe }
}
const MELDUNG = 'PRUEFER: PR #7 Kopf ccccccccc ohne Urteil seit 90 min (Grenze 45 min): Kette hängt oder fehlt, oder Start nach Kettenende ausgefallen? pr-pruefer-nachtrag.yml, Job nach-kette'
gleich('Kopf 90 min ohne Urteil: Meldung', ablauf().zeilen, [MELDUNG])
gleich('Kopf mit Urteil: still', ablauf({ kommentare: [k('ok')] }).zeilen, [])
gleich('Kopf nur mit „nicht beurteilt, Kette lief noch“ (Altbestand): Meldung', ablauf({ kommentare: [k('nicht beurteilt, Kette lief noch')] }).zeilen, [MELDUNG])
gleich('Kopf 44 min alt: still, ohne Kommentarabruf', (() => { const r = ablauf({ ketten: [{ created_at: vor(44) }] }); return [r.zeilen, r.aufrufe.some((a) => a.includes('/comments'))] })(), [[], false])
gleich('Kopf genau 45 min alt: still (Grenze ist „mehr als“)', ablauf({ ketten: [{ created_at: vor(45) }] }).zeilen, [])
gleich('Kopf 46 min alt: Meldung', ablauf({ ketten: [{ created_at: vor(46) }] }).zeilen.length, 1)
gleich('Prüfer-Lauf des PR läuft noch: still, kein weiterer Abruf je PR', (() => { const r = ablauf({ laeufe: [{ status: 'in_progress', display_title: P7 }] }); return [r.zeilen, r.aufrufe.length] })(), [[], 2])
gleich('Prüfer-Lauf wartet (queued): still', ablauf({ laeufe: [{ status: 'queued', display_title: P7 }] }).zeilen, [])
gleich('laufender Prüfer eines anderen PR (#70): zählt nicht, Meldung', ablauf({ laeufe: [{ status: 'in_progress', display_title: 'PR-Prüfer #70 x' }] }).zeilen, [MELDUNG])
gleich('ältester Kettenlauf zählt als Push-Zeit (neu gestartete Kette ändert sie nicht)', ablauf({ ketten: [{ created_at: vor(5) }, { created_at: vor(90) }] }).zeilen, [MELDUNG])
gleich('Kette fehlt ganz: Commit-Datum entscheidet (meldet die fehlende Kette)', ablauf({ ketten: [] }).zeilen, [MELDUNG])
gleich('Kette fehlt, junger Commit: still', ablauf({ ketten: [], commitMin: 10 }).zeilen, [])
gleich('Entwurf und Datenzweig: still, kein Abruf je PR, auch keine Laufliste', (() => { const r = ablauf({ pulls: [pr({ draft: true }), pr({ head: { sha: KOPF, ref: 'daten/x', repo: { full_name: 'o/r' } } })] }); return [r.zeilen, r.aufrufe.length] })(), [[], 1])
gleich('zwei PRs, nur #7 ohne Urteil: genau seine Zeile', ablauf({ pulls: [pr(), pr({ number: 8, head: { sha: ALT, ref: 'claude/y', repo: { full_name: 'o/r' } } })], kommentare: [] }).zeilen, [MELDUNG])
gleich('zwei PRs: die Prüfer-Laufliste nur einmal abgerufen', ablauf({ pulls: [pr(), pr({ number: 8, head: { sha: ALT, ref: 'claude/y', repo: { full_name: 'o/r' } } })] }).aufrufe.filter((a) => a.includes('pr-pruefer.yml/runs')).length, 1)
gleich('Normalbetrieb ohne offene PRs: ein Aufruf, keine Zeile', (() => { const r = ablauf({ pulls: [] }); return [r.zeilen, r.aufrufe.length] })(), [[], 1])

// Abruffehler
gleich('Abruffehler: eigene Zeile, nur die erste Fehlerzeile', ablauf({ fehler: 'gh: HTTP 503\nzweite Zeile' }).zeilen, ['PRUEFER? Prüfer-Urteile nicht lesbar: gh: HTTP 503'])
gleich('kaputtes JSON: beginnt mit PRUEFER?', prueferZeilen(() => 'kein json', 'o/r', JETZT)[0].startsWith('PRUEFER? '), true)
gleich('Antwort ist kein Array (Fehlerobjekt): eigene Zeile', prueferZeilen(() => '{"message":"Not Found"}', 'o/r', JETZT)[0].startsWith('PRUEFER? '), true)

// Verdrahtung: die Wachphase ruft die Funktion wirklich auf (Prozess mit gh-Attrappe, die den Kopf-Hash des Tests liefert)
const { spawnSync } = await import('node:child_process')
const { mkdtempSync, rmSync, writeFileSync } = await import('node:fs')
const { pathToFileURL } = await import('node:url')
const { tmpdir } = await import('node:os')
const { join } = await import('node:path')
const ordner = mkdtempSync(join(tmpdir(), 'pruefer-unfertig-'))
const vorlader = pathToFileURL(fileURLToPath(new URL('./pr-nachrechnen-mock.mjs', import.meta.url))).href
const abruf = join(ordner, 'abruf-abgelehnt.mjs')
writeFileSync(abruf, "globalThis.fetch = async () => { throw new Error('offline') }\n")
const werkzeug = fileURLToPath(new URL('./laeufe-aufraeumen.mjs', import.meta.url))
const SCHLUESSEL = 'api repos/derNamenloseDaniel/anime-kalender-de/pulls?state=open&per_page=100'
const starte = (antwort, mehr = {}) => {
  writeFileSync(join(ordner, 'daten.json'), JSON.stringify({ [SCHLUESSEL]: antwort, ...mehr }))
  const env = { ...process.env, ATTRAPPE_LOG: join(ordner, 'log.txt'), ATTRAPPE_DATEN: join(ordner, 'daten.json'), LAUF_TOKEN: '' }
  const args = ['--import', vorlader, '--import', pathToFileURL(abruf).href, werkzeug, '--trocken', '--wurzel', ordner, '--gesundheit', join(ordner, 'fehlt.json')]
  return spawnSync(process.execPath, args, { encoding: 'utf8', windowsHide: true, timeout: 60_000, env })
}
const ruhig = starte({ aus: '[]' })
gleich('Prozess: keine offenen PRs, keine PRUEFER-Zeile', /^PRUEFER/m.test(ruhig.stdout), false)
const kaputt = starte({ fehler: 'HTTP 502' })
gleich('Prozess: Abruffehler als PRUEFER?-Zeile', /^PRUEFER\? Prüfer-Urteile nicht lesbar: HTTP 502$/m.test(kaputt.stdout), true)
// Positiver Prozessfall: offener PR, Kopf seit 2020 ohne Urteil -> die Zeile erreicht die Ausgabe der Wachphase.
const repoApi = 'api repos/derNamenloseDaniel/anime-kalender-de/'
const warnt = starte(
  { aus: JSON.stringify([pr()]) },
  {
    [`${repoApi}actions/workflows/pr-pruefer.yml/runs?event=workflow_dispatch&per_page=50`]: { aus: JSON.stringify({ workflow_runs: [] }) },
    [`${repoApi}actions/workflows/pr-pruefung.yml/runs?head_sha=${KOPF}&event=pull_request&per_page=30`]: { aus: JSON.stringify({ workflow_runs: [{ created_at: '2020-01-01T00:00:00Z' }] }) },
    'api --paginate --slurp repos/derNamenloseDaniel/anime-kalender-de/issues/7/comments': { aus: '[[]]' },
  },
)
gleich('Prozess: Kopf ohne Urteil steht als PRUEFER-Zeile in der Ausgabe', /^PRUEFER: PR #7 Kopf ccccccccc ohne Urteil seit \d+ min/m.test(warnt.stdout), true)
rmSync(ordner, { recursive: true, force: true })

console.log(`pruefer-unfertig-wache: ${faelle} Fälle grün (Urteil, Prüfpflicht, Ablauf, Abruffehler, Prozess)`)
