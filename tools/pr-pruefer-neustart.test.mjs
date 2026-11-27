/**
 * Test für tools/pr-pruefer-neustart.mjs und .github/workflows/pr-pruefer-nachtrag.yml: Entscheidung als Tabelle,
 * Ablauf (Kette fertig? Prüfer schon nach dem Kommentar gestartet? sonst Dispatch) mit eingespeistem gh, Verdrahtung über die env-Namen der YAML.
 */
import fs from 'node:fs'
import { parse } from 'yaml'
import { KONTO_MS, neuesKonto } from './gh-ratelimit.mjs'
import { entscheide, main } from './pr-pruefer-neustart.mjs'

const fehler = []
const gleich = (name, ist, soll) => {
  if (JSON.stringify(ist) === JSON.stringify(soll)) return console.log(`  ✓ ${name}`)
  fehler.push(name)
  console.error(`  ✗ ${name} — Ist ${JSON.stringify(ist)}, Soll ${JSON.stringify(soll)}`)
}

const KOPF = 'd'.repeat(40)
const pr = (aendere = {}) => ({
  number: 7,
  state: 'open',
  draft: false,
  user: { login: 'claude[bot]' },
  head: { sha: KOPF, ref: 'fix/x', repo: { full_name: 'o/r' } },
  base: { repo: { full_name: 'o/r' } },
  ...aendere,
})
const los = (e) => entscheide({ body: '## Nachtrag eins', kommentarLogin: 'inhaber', assoziation: 'OWNER', pr: pr(), ...e }).los

// Entscheidung: jede Prüfung kippt allein das Urteil, der Basisfall ist ja.
gleich('Basisfall: Nachtrag des Inhabers', los({}), true)
gleich('**Nachtrag', los({ body: '**Nachtrag zwei' }), true)
gleich('# Nachbesserung', los({ body: '# Nachbesserung R2' }), true)
gleich('Nachtrag klein, führender Leerraum', los({ body: '  nachtrag drei' }), true)
gleich('Abnahme des Dirigenten', los({ body: '## Nachtrag (Abnahme Dirigent)\nok' }), false)
gleich('Abnahme nur in der ersten Zeile zählt', los({ body: '## Nachtrag\nsiehe Abnahme Dirigent' }), true)
gleich('anderer Kommentar', los({ body: 'Prüfer: ändern' }), false)
gleich('fremder Autor ohne Recht', los({ kommentarLogin: 'fremd', assoziation: 'NONE' }), false)
gleich('PR-Autor ohne Assoziation', los({ kommentarLogin: 'claude[bot]', assoziation: 'NONE' }), true)
gleich('Mitglied', los({ kommentarLogin: 'anderer', assoziation: 'MEMBER' }), true)
gleich('Bot des Prüfers', los({ kommentarLogin: 'github-actions[bot]', assoziation: 'NONE' }), false)
gleich('Bot des Prüfers, auch mit Schreibrecht', los({ kommentarLogin: 'github-actions[bot]', assoziation: 'MEMBER' }), false)
gleich('Issue ohne PR', los({ pr: null }), false)
gleich('PR geschlossen', los({ pr: pr({ state: 'closed' }) }), false)
gleich('Entwurf', los({ pr: pr({ draft: true }) }), false)
gleich('Fork', los({ pr: pr({ head: { sha: KOPF, ref: 'x', repo: { full_name: 'f/r' } } }) }), false)
gleich('Zweig daten/', los({ pr: pr({ head: { sha: KOPF, ref: 'daten/x', repo: { full_name: 'o/r' } } }) }), false)

// Ablauf mit eingespeistem gh. `kette`: Läufe der PR-Prüfkette des Kopfes; `laeufe`: Prüfer-Läufe (Dispatch, neueste zuerst, PR im Laufnamen).
const DISPATCH = `api -X POST repos/o/r/actions/workflows/pr-pruefer.yml/dispatches -f ref=main -f inputs[pr]=7 -f inputs[sha]=${KOPF}`
const FERTIG = [{ id: 40, status: 'completed', conclusion: 'success' }]
const titel = (nr) => `PR-Prüfer #${nr} ${KOPF}`
function laufe(env, laeufe, { kette = FERTIG, pruefer = pr(), dispatchFehlt = false } = {}) {
  const aufrufe = []
  const wartet = []
  const gh = (args) => {
    const s = args.join(' ')
    aufrufe.push(s)
    if (args[1] === 'repos/o/r/pulls/7') return JSON.stringify(pruefer)
    // Wie die API: nur Kettenläufe der abgefragten head_sha (Ausgabe als TSV wie in holeLauf verlangt).
    if (args[1] === `repos/o/r/actions/workflows/pr-pruefung.yml/runs?head_sha=${KOPF}&event=pull_request&per_page=30`) return kette.map((l) => `${l.id}\t${l.status}\t${l.conclusion ?? ''}`).join('\n')
    if (args[1] === 'repos/o/r/actions/workflows/pr-pruefer.yml/runs?event=workflow_dispatch&per_page=30') return JSON.stringify(laeufe)
    if (s.includes('/dispatches')) {
      if (dispatchFehlt) throw new Error('HTTP 422: Workflow does not have workflow_dispatch trigger')
      return ''
    }
    throw new Error('unerwartet ' + s)
  }
  const mute = console.log
  const zeilen = []
  console.log = (z) => zeilen.push(z)
  const code = main({ GITHUB_REPOSITORY: 'o/r', PR_NUMMER: '7', KOMMENTAR: '## Nachtrag', KOMMENTAR_LOGIN: 'inhaber', KOMMENTAR_ASSOZIATION: 'OWNER', ...env }, { gh, warte: (ms) => wartet.push(ms) })
  console.log = mute
  return { code, starts: aufrufe.filter((a) => a.includes('/dispatches')), andere: aufrufe.filter((a) => /^run /.test(a)), wartet, zeilen, aufrufe }
}
// Läufe anderer PRs (#70 beginnt mit „7“) stehen dazwischen: nur der Lauf von PR 7 zählt.
const fremd = [{ id: 9, status: 'completed', conclusion: 'success', display_title: 'PR-Prüfer #70 x', run_started_at: '2026-11-12T15:00:00Z' }, { id: 3, status: 'in_progress', display_title: 'PR-Prüfer #8 x', run_started_at: '2026-11-12T15:00:00Z' }]
const ZEIT = '2026-11-12T14:31:55Z'
const lauf5 = (zusatz) => [fremd[0], { id: 5, status: 'in_progress', display_title: titel(7), run_started_at: '2026-11-12T14:32:37Z', ...zusatz }, fremd[1]]

const ab = laufe({}, [fremd[0], { id: 5, status: 'completed', conclusion: 'success', display_title: titel(7) }])
gleich('Kette fertig, Lauf vor dem Kommentar: genau ein Dispatch für PR und Kopf, Exit 0', [ab.starts, ab.code], [[DISPATCH], 0])
gleich('kein cancel, kein rerun, kein Warten (concurrency bricht ab)', [ab.andere, ab.wartet], [[], []])
gleich('Logzeile nennt PR, Kopf (9 Zeichen) und Grund', ab.zeilen, ['Prüfer-Neustart: ja, PR 7 Kopf ddddddddd gestartet (Nachtrag eines Berechtigten)'])
// Zwei Läufe von PR 7: der neueste (zuerst gelistet) begann nach dem Kommentar und hat ihn gelesen; der ältere davor zählt nicht.
const zwei = laufe({ KOMMENTAR_ZEIT: ZEIT }, [{ id: 6, status: 'in_progress', display_title: titel(7), run_started_at: '2026-11-12T14:33:00Z' }, { id: 5, status: 'completed', conclusion: 'success', display_title: titel(7), run_started_at: '2026-11-12T14:00:00Z' }])
gleich('zwei Läufe des PR: der neueste entscheidet (startete nach dem Kommentar), kein Dispatch, Exit 0', [zwei.starts, zwei.zeilen, zwei.code], [[], ['Prüfer-Neustart: nein (Lauf 6 startete nach dem Kommentar)'], 0])
gleich('kein Prüfer-Lauf des PR (nur fremde): Dispatch', laufe({}, fremd).starts, [DISPATCH])
gleich('gar kein Prüfer-Lauf: Dispatch', laufe({}, []).starts, [DISPATCH])
gleich('Kette des Kopfes läuft noch: kein Dispatch (ihr Ende startet den Prüfer), Exit 0', (() => { const r = laufe({}, [], { kette: [{ id: 41, status: 'in_progress' }] }); return [r.starts, r.code, r.zeilen] })(), [[], 0, ['Prüfer-Neustart: nein (Kette für ddddddddd nicht fertig, ihr Ende startet den Prüfer)']])
gleich('Kette neu gestartet (neuester läuft, älterer fertig): kein Dispatch', laufe({}, [], { kette: [{ id: 42, status: 'queued' }, ...FERTIG] }).starts, [])
gleich('Kette nie gelaufen: kein Dispatch', laufe({}, [], { kette: [] }).starts, [])
gleich('Kette abgebrochen, ältere fertig: Dispatch (abgebrochene zählt nicht)', laufe({}, [], { kette: [{ id: 43, status: 'completed', conclusion: 'cancelled' }, ...FERTIG] }).starts, [DISPATCH])
gleich('Kette rot: Dispatch (der Prüfer urteilt auch bei roter Kette)', laufe({}, [], { kette: [{ id: 44, status: 'completed', conclusion: 'failure' }] }).starts, [DISPATCH])
const kaputt = laufe({}, [], { dispatchFehlt: true })
gleich('Dispatch scheitert: Exit 1, Zeile mit PR, Kopf und Grund', [kaputt.code, kaputt.zeilen.some((z) => z.includes('FEHLGESCHLAGEN PR 7 Kopf ' + KOPF.slice(0, 9) + ': nicht neu gestartet (HTTP 422'))], [1, true])
gleich('Erfolg: Exit 0 ohne FEHLGESCHLAGEN', [ab.code, ab.zeilen.some((z) => z.includes('FEHLGESCHLAGEN'))], [0, false])
gleich('gh-Absturz bei der Lauf-Abfrage: Exit 1', (() => {
  const mute = console.log
  console.log = () => {}
  const gh = (args) => {
    if (args[1].includes('/runs?')) throw new Error('boom')
    return JSON.stringify(pr())
  }
  const code = main({ GITHUB_REPOSITORY: 'o/r', PR_NUMMER: '7', KOMMENTAR: '## Nachtrag', KOMMENTAR_LOGIN: 'inhaber', KOMMENTAR_ASSOZIATION: 'OWNER' }, { gh, warte: () => {} })
  console.log = mute
  return code
})(), 1)
gleich('Abnahme-Kommentar: nichts', laufe({ KOMMENTAR: '## Nachtrag (Abnahme Dirigent)' }, []).starts, [])
gleich('fremder Autor: nichts', laufe({ KOMMENTAR_LOGIN: 'x', KOMMENTAR_ASSOZIATION: 'NONE' }, []).starts, [])
gleich('PR-Autor ohne Recht (über main): Dispatch', laufe({ KOMMENTAR_LOGIN: 'claude[bot]', KOMMENTAR_ASSOZIATION: 'NONE' }, []).starts, [DISPATCH])
gleich('PR-Nummer fehlt: Exit 1', laufe({ PR_NUMMER: '' }, []).code, 1)
gleich('Absturz von gh: Exit 1, kein Neustart', (() => {
  const mute = console.log
  console.log = () => {}
  const code = main({ GITHUB_REPOSITORY: 'o/r', PR_NUMMER: '7' }, { gh: () => { throw new Error('boom') }, warte: () => {} })
  console.log = mute
  return code
})(), 1)

// Rate limit beim PR-Lesen: bis zum Reset warten (Zeit eingespeist), dann einmal neu; ein anderer Fehler wartet nicht.
function mitFehler(text, reset) {
  const wartet = []
  const aufrufe = []
  let ersterPrAufruf = true
  const gh = (args) => {
    aufrufe.push(args.join(' '))
    if (args[1] === 'rate_limit') return JSON.stringify({ resources: { core: { reset } } })
    if (args[1] === 'repos/o/r/pulls/7' && ersterPrAufruf) {
      ersterPrAufruf = false
      throw new Error(text)
    }
    if (args[1] === 'repos/o/r/pulls/7') return JSON.stringify(pr())
    if (args[1]?.includes('/workflows/pr-pruefung.yml/runs')) return '40\tcompleted\tsuccess'
    if (args[1]?.includes('/workflows/pr-pruefer.yml/runs')) return '[]'
    return ''
  }
  const mute = console.log
  const zeilen = []
  console.log = (z) => zeilen.push(z)
  const env = { GITHUB_REPOSITORY: 'o/r', PR_NUMMER: '7', KOMMENTAR: '## Nachtrag', KOMMENTAR_LOGIN: 'inhaber', KOMMENTAR_ASSOZIATION: 'OWNER' }
  const code = main(env, { gh, warte: (ms) => wartet.push(ms), jetzt: () => 1_000_000_000_000, konto: neuesKonto({ datei: '' }) })
  console.log = mute
  return { code, wartet, zeilen, aufrufe }
}
const LIMIT_TEXT = 'gh api repos/o/r/pulls/7 Exit 1: HTTP 403: API rate limit exceeded for installation'
const limit = mitFehler(LIMIT_TEXT, 1_000_000_000 + 60)
gleich('rate limit: wartet bis zum Reset (62 s), dann Neustart, Exit 0', [limit.code, limit.wartet, limit.aufrufe.includes(DISPATCH)], [0, [62_000], true])
const fern = mitFehler(LIMIT_TEXT, 1_000_000_000 + 7200)
gleich('rate limit mit Reset in 2 h: nicht gewartet (jenseits des Zeitkontos), Exit 1, Grund im Log', [fern.code, fern.wartet, fern.zeilen.some((z) => z.includes('rate limit') && z.includes('nicht gewartet'))], [1, [], true])
const anders = mitFehler('gh api repos/o/r/pulls/7 Exit 1: HTTP 404: Not Found', 1_000_000_000 + 60)
gleich('anderer Fehler: kein Warten, Exit 1, Grund im Log', [anders.code, anders.wartet, anders.zeilen.some((z) => z.includes('404'))], [1, [], true])

// Zweiter Lauf desselben PR (12.11.2026, PRs 3579/3584): ein Lauf, der nach dem Kommentar startete, hat ihn schon gelesen.
gleich('3579: Lauf 14:32:37 nach Kommentar 14:31:55, läuft: kein Dispatch', laufe({ KOMMENTAR_ZEIT: ZEIT }, lauf5()).starts, [])
gleich('3584: Lauf 4 s nach dem Kommentar, läuft: nichts', laufe({ KOMMENTAR_ZEIT: '2026-11-12T14:40:00Z' }, lauf5({ run_started_at: '2026-11-12T14:40:04Z' })).starts, [])
gleich('Lauf nach dem Kommentar fertig und success: nichts', laufe({ KOMMENTAR_ZEIT: ZEIT }, lauf5({ status: 'completed', conclusion: 'success' })).starts, [])
gleich('Lauf nach dem Kommentar abgebrochen: Dispatch', laufe({ KOMMENTAR_ZEIT: ZEIT }, lauf5({ status: 'completed', conclusion: 'cancelled' })).starts, [DISPATCH])
gleich('Lauf nach dem Kommentar fehlgeschlagen: Dispatch', laufe({ KOMMENTAR_ZEIT: ZEIT }, lauf5({ status: 'completed', conclusion: 'failure' })).starts, [DISPATCH])
gleich('Lauf vor dem Kommentar gestartet, läuft: Dispatch (concurrency bricht ihn ab)', laufe({ KOMMENTAR_ZEIT: ZEIT }, lauf5({ run_started_at: '2026-11-12T14:24:36Z' })).starts, [DISPATCH])
gleich('Lauf startete genau zur Kommentarzeit: Dispatch (Grenze)', laufe({ KOMMENTAR_ZEIT: ZEIT }, lauf5({ run_started_at: ZEIT, status: 'completed', conclusion: 'success' })).starts, [DISPATCH])
gleich('Kommentarzeit fehlt: Dispatch wie bisher', laufe({ KOMMENTAR_ZEIT: undefined }, lauf5({ status: 'completed', conclusion: 'success' })).starts, [DISPATCH])
gleich('Kommentarzeit unlesbar: Dispatch wie bisher', laufe({ KOMMENTAR_ZEIT: 'gestern' }, lauf5({ status: 'completed', conclusion: 'success' })).starts, [DISPATCH])
gleich('Laufzeit fehlt: Dispatch wie bisher', laufe({ KOMMENTAR_ZEIT: ZEIT }, lauf5({ run_started_at: undefined, status: 'completed', conclusion: 'success' })).starts, [DISPATCH])
gleich('Lauf eines anderen PR nach dem Kommentar: zählt nicht, Dispatch', laufe({ KOMMENTAR_ZEIT: ZEIT }, fremd).starts, [DISPATCH])

// Verdrahtung: die Namen aus der YAML speisen main; der Mutant „anderer env-Name“ bleibt so nicht grün.
const wf = parse(fs.readFileSync(new URL('../.github/workflows/pr-pruefer-nachtrag.yml', import.meta.url), 'utf8'))
const job = wf.jobs.neustart
const schritt = job.steps.find((s) => s.name === 'Prüfer neu starten')
gleich('Auslöser: issue_comment created, Ende der PR-Prüfkette, Merge einer Basis (pull_request_target closed)', wf.on, {
  issue_comment: { types: ['created'] },
  workflow_run: { workflows: ['PR-Prüfkette'], types: ['completed'] },
  pull_request_target: { types: ['closed'] },
})
gleich('Rechte: Aktionen schreiben, sonst lesen', wf.permissions, { contents: 'read', 'pull-requests': 'read', actions: 'write' })
gleich('Bedingung: nur PR-Kommentare, nicht vom Prüfer', job.if, "github.event.issue.pull_request != null && github.event.comment.user.login != 'github-actions[bot]'")
gleich('Schritt ruft das Skript ohne Argumente', schritt.run, 'node tools/pr-pruefer-neustart.mjs')
gleich('Kommentartext nur über env', Object.entries(schritt.env).filter(([, w]) => w.includes('comment.body')).map(([s]) => s), ['KOMMENTAR'])
gleich('run enthält keinen Ausdruck', schritt.run.includes('${{'), false)
gleich('YAML reicht die Kommentarzeit durch (comment.created_at)', schritt.env.KOMMENTAR_ZEIT, '${{ github.event.comment.created_at }}')
// Dauer-Limit durch main: jeder verschiedene Aufruf scheitert beim ersten Mal mit „rate limit“ (Reset 5 min voraus = 302 s Wartezeit).
// Das Zeitkonto deckt zwei dieser Wartezeiten (604 s), die dritte (302 s > 296 s Rest) nicht mehr: Exit 1, Summe der echten Warten <= KONTO_MS.
const dauer = (() => {
  const wartet = []
  const schon = new Set()
  const gh = (args) => {
    const s = args.join(' ')
    if (args[1] === 'rate_limit') return JSON.stringify({ resources: { core: { reset: 1_000_000_000 + 300 } } })
    if (!schon.has(s)) {
      schon.add(s)
      throw new Error(`gh ${s} Exit 1: HTTP 403: API rate limit exceeded`)
    }
    if (args[1] === 'repos/o/r/pulls/7') return JSON.stringify(pr())
    if (args[1]?.includes('/workflows/pr-pruefung.yml/runs')) return '40\tcompleted\tsuccess'
    return '[]'
  }
  const mute = console.log
  console.log = () => {}
  const code = main({ GITHUB_REPOSITORY: 'o/r', PR_NUMMER: '7', KOMMENTAR: '## Nachtrag', KOMMENTAR_LOGIN: 'inhaber', KOMMENTAR_ASSOZIATION: 'OWNER' }, { gh, warte: (ms) => wartet.push(ms), jetzt: () => 1_000_000_000_000, konto: neuesKonto({ datei: '' }) })
  console.log = mute
  return { code, wartet }
})()
gleich('Dauer-Limit: zwei Warten (302 s), dann Schluss ohne weiteres Warten, Exit 1', [dauer.wartet, dauer.code], [[302_000, 302_000], 1])
gleich('Dauer-Limit: Summe der Wartezeiten <= Zeitkonto', dauer.wartet.reduce((s, ms) => s + ms, 0) <= KONTO_MS, true)
// Zeitbudget: 5 min für Checkout, vier Abfragen und Dispatch (kein Warten auf einen abgebrochenen Lauf mehr) plus Zeitkonto.
const budgetMin = (5 * 60_000 + KONTO_MS) / 60_000
gleich(`Zeitbudget: 5 min + Zeitkonto = ${budgetMin} min = timeout-minutes ${job['timeout-minutes']}`, job['timeout-minutes'], budgetMin)
const ausYaml = Object.fromEntries(Object.keys(schritt.env).map((s) => [s, { PR_NUMMER: '7', KOMMENTAR: '## Nachtrag', KOMMENTAR_LOGIN: 'inhaber', KOMMENTAR_ASSOZIATION: 'OWNER' }[s] ?? 'x']))
gleich('env-Namen der YAML lösen den Neustart aus', laufe({ ...ausYaml, KOMMENTAR: '## Nachtrag', GITHUB_REPOSITORY: 'o/r' }, []).starts, [DISPATCH])

console.log(`Prüfer-Neustart: ${fehler.length === 0 ? 'alle Fälle grün' : fehler.length + ' Fälle rot'}`)
process.exit(fehler.length === 0 ? 0 : 1)
