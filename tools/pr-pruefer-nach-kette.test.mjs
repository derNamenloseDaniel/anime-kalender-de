/**
 * Test für tools/pr-pruefer-nach-kette.mjs und den Job `nach-kette` in pr-pruefer-nachtrag.yml: Entscheidung als Tabelle,
 * Ablauf mit eingespeistem gh (Kettenende -> Dispatch des Prüfers, kein Warten, kein rerun), Verdrahtung über die env-Namen der YAML.
 */
import fs from 'node:fs'
import { parse } from 'yaml'
import { MARKE_KETTE_OFFEN } from './pr-pruefer-kette-offen.mjs'
import { MARKE_OHNE_MODELL } from './pruefer-unfertig-wache.mjs'
import { KONTO_MS, neuesKonto } from './gh-ratelimit.mjs'
import { MAX_NEUSTARTS, entscheide, letztesUrteil, main } from './pr-pruefer-nach-kette.mjs'

const fehler = []
const gleich = (name, ist, soll) => {
  if (JSON.stringify(ist) === JSON.stringify(soll)) return console.log(`  ✓ ${name}`)
  fehler.push(name)
  console.error(`  ✗ ${name} — Ist ${JSON.stringify(ist)}, Soll ${JSON.stringify(soll)}`)
}

const KOPF = 'd'.repeat(40)
const ALT = 'a'.repeat(40)
const BOT = 'github-actions[bot]'
const urteil = (kopf, titel, mitMarke, login = BOT) => ({
  user: { login },
  body: `**Prüfer-Review** für ${kopf.slice(0, 9)} - Urteil: **${titel}**\n\nText\n${mitMarke ? `\n${MARKE_KETTE_OFFEN}\n` : ''}\n<!-- pruefer-modus: voll -->\n`,
})
const OFFEN = (kopf = KOPF) => urteil(kopf, 'nicht beurteilt, Kette lief noch', true)
const AENDERN = (kopf = KOPF) => urteil(kopf, 'aendern', false)
const OK = (kopf = KOPF) => urteil(kopf, 'ok', false)
const REPO = { full_name: 'o/r' }
const pr = (a = {}) => ({ number: 7, state: 'open', draft: false, body: '', head: { sha: KOPF, ref: 'claude/x', repo: REPO }, base: { ref: 'main', sha: 'e'.repeat(40), repo: REPO }, ...a })
const los = (e) => entscheide({ kommentare: [OFFEN()], kopf: KOPF, pr: pr(), ...e }).los

// Normalfall seit 21.11.2026: Push -> Kette -> Kettenende -> Kopf ohne Urteil -> Start.
gleich('keine Kommentare (Kopf frisch gepusht): Start', los({ kommentare: [] }), true)
gleich('Kopf ohne Urteil, Kette rot (failure): trotzdem Start', los({ kommentare: [], kette: 'failure' }), true)
gleich('Basisfall: letztes Urteil „Kette offen“', los({}), true)
gleich('letztes Urteil aendern (echt): kein Start', los({ kommentare: [OFFEN(), AENDERN()] }), false)
gleich('letztes Urteil ok: kein Start (Kette nachgerechnet, Urteil bleibt)', los({ kommentare: [OFFEN(), OK()] }), false)
gleich('Kette-offen-Kommentar nach aendern: Start', los({ kommentare: [AENDERN(), OFFEN()] }), true)
gleich('Kommentar eines Menschen mit Marke und Urteilszeile ist kein Prüfer-Urteil: Kopf ohne Urteil, Start', los({ kommentare: [urteil(KOPF, 'nicht beurteilt, Kette lief noch', true, 'inhaber')] }), true)
gleich('Mensch schreibt Urteil „ok“ ab: zählt nicht, Start', los({ kommentare: [urteil(KOPF, 'ok', false, 'inhaber')] }), true)
gleich('Kette-offen-Kommentar nur zu altem Kopf: der aktuelle Kopf hat kein Urteil, Start', los({ kommentare: [OFFEN(ALT)] }), true)
gleich('Urteil zu altem Kopf, keins zum aktuellen: Start', los({ kommentare: [OK(ALT)] }), true)
gleich('Titel „nicht beurteilt“ ohne Marke: kein Start', los({ kommentare: [urteil(KOPF, 'nicht beurteilt, Kette lief noch', false)] }), false)
// Prüfpflicht (früher: Job-Bedingung in pr-pruefer.yml, Lauf „skipped“): jetzt vor dem Dispatch.
gleich('Datenzweig: kein Start', los({ kommentare: [], pr: pr({ head: { sha: KOPF, ref: 'daten/x', repo: REPO } }) }), false)
gleich('zug-fahrt und zug-probe: kein Start', ['zug-fahrt', 'zug-probe'].map((ref) => los({ kommentare: [], pr: pr({ head: { sha: KOPF, ref, repo: REPO } }) })), [false, false])
gleich('Fork: kein Start', los({ kommentare: [], pr: pr({ head: { sha: KOPF, ref: 'x', repo: { full_name: 'f/r' } } }) }), false)
gleich('Basis dev: kein Start', los({ kommentare: [], pr: pr({ base: { ref: 'dev', sha: 'e'.repeat(40), repo: REPO } }) }), false)
gleich('Basis zug: Start', los({ kommentare: [], pr: pr({ base: { ref: 'zug', sha: 'e'.repeat(40), repo: REPO } }) }), true)
// Marken-Pfad („Basis offen“-Kommentar): erst nach grüner Kette neu (trennt `!== success` von `=== success`).
gleich('Marke, Basis offen, Kette rot: kein Start', los({ kommentare: [OFFEN()], basisOffen: true, kette: 'failure' }), false)
gleich('Marke, Basis offen, Kette grün: Start', los({ kommentare: [OFFEN()], basisOffen: true, kette: 'success' }), true)
gleich('Marke, Basis offen, Kette unbekannt (null): kein Start', los({ kommentare: [OFFEN()], basisOffen: true, kette: null }), false)
gleich('Marke, Basis nicht offen, Kette rot: Start', los({ kommentare: [OFFEN()], basisOffen: false, kette: 'failure' }), true)
gleich('Kopf ohne Urteil, Basis offen und Kette rot: trotzdem Start (es folgt der Kommentar „Basis offen“)', los({ kommentare: [], basisOffen: true, kette: 'failure' }), true)
gleich('PR geschlossen', los({ pr: pr({ state: 'closed' }) }), false)
gleich('PR Entwurf', los({ pr: pr({ draft: true }) }), false)
gleich('Kopf des PR inzwischen ein anderer', los({ pr: pr({ head: { sha: ALT, ref: 'claude/x', repo: REPO } }) }), false)
gleich('kein PR', los({ pr: null }), false)
gleich('Grenze: Starts erlaubt bis zur Anzahl', MAX_NEUSTARTS, 2)
gleich('zweites Kette-offen: noch Start', los({ kommentare: [OFFEN(), OFFEN()] }), true)
gleich('drittes Kette-offen: Schluss (Schleifenschutz)', los({ kommentare: [OFFEN(), OFFEN(), OFFEN()] }), false)
// Läufe ohne Modell (Altbestand) verbrauchen die Grenze nicht (Prüfer-Befund 13.11.2026), echte „Kette offen“ weiter.
const STUB = (kopf = KOPF) => ({ user: { login: BOT }, body: `${OFFEN(kopf).body}\n${MARKE_OHNE_MODELL}\n` })
gleich('vier Läufe ohne Modell: weiter Start', los({ kommentare: [STUB(), STUB(), STUB(), STUB()] }), true)
gleich('drei Läufe ohne Modell und drei echte Kette-offen: Schluss', los({ kommentare: [STUB(), STUB(), STUB(), OFFEN(), OFFEN(), OFFEN()] }), false)
gleich('letztesUrteil: neuester zum Kopf, nicht der zum alten Kopf', letztesUrteil([OFFEN(), AENDERN(ALT)], KOPF).body.includes('nicht beurteilt'), true)

// Ablauf mit eingespeistem gh: drei Leseaufrufe höchstens, dann genau ein Dispatch (kein rerun, kein Warten).
const DISPATCH = `api -X POST repos/o/r/actions/workflows/pr-pruefer.yml/dispatches -f ref=main -f inputs[pr]=7 -f inputs[sha]=${KOPF}`
function laufe({ kommentare, pulls = [pr()], fehlerBei = null, env = {} }) {
  const aufrufe = []
  const wartet = []
  const gh = (args) => {
    const s = args.join(' ')
    aufrufe.push(s)
    if (fehlerBei && s.includes(fehlerBei)) throw new Error('boom')
    if (args[1] === `repos/o/r/commits/${KOPF}/pulls`) return JSON.stringify(pulls)
    if (args.includes('--slurp')) return JSON.stringify([kommentare])
    if (args[1] === 'repos/o/r/pulls/5') return 'open\n'
    return ''
  }
  const mute = console.log
  const zeilen = []
  console.log = (z) => zeilen.push(z)
  const code = main({ GITHUB_REPOSITORY: 'o/r', KOPF_SHA: KOPF, KETTE_ERGEBNIS: 'success', ...env }, { gh, warte: (ms) => wartet.push(ms) })
  console.log = mute
  return { code, starts: aufrufe.filter((a) => a.includes('/dispatches')), andere: aufrufe.filter((a) => /^run /.test(a)), aufrufe, wartet, zeilen }
}

const frisch = laufe({ kommentare: [] })
gleich('Kettenende, Kopf ohne Urteil: genau ein Dispatch mit PR und Kopf, Exit 0', [frisch.starts, frisch.code], [[DISPATCH], 0])
gleich('Kettenende: kein rerun, kein cancel, kein Warten', [frisch.andere, frisch.wartet], [[], []])
gleich('Kettenende: zwei Leseaufrufe plus Dispatch', frisch.aufrufe.length, 3)
gleich('Kreislauf: Marke da: Dispatch', laufe({ kommentare: [OFFEN()] }).starts, [DISPATCH])
gleich('Kreislauf: dritter Kommentar: kein Dispatch, Exit 0', (() => { const r = laufe({ kommentare: [OFFEN(), OFFEN(), OFFEN()] }); return [r.starts, r.code] })(), [[], 0])
gleich('Kreislauf: nach Start ein echtes aendern: kein Dispatch', laufe({ kommentare: [OFFEN(), AENDERN()] }).starts, [])
gleich('Kreislauf: nach Start ok: kein Dispatch', laufe({ kommentare: [OFFEN(), OK()] }).starts, [])
// Stapel-PR: Basis aus der Beschreibung, Kette aus der env (keine Laufabfrage mehr).
const STAPEL = pr({ body: 'mergen nach #5\n' })
gleich('Basis offen, Marke, Kette failure aus env: kein Dispatch', laufe({ kommentare: [OFFEN()], pulls: [STAPEL], env: { KETTE_ERGEBNIS: 'failure' } }).starts, [])
gleich('Basis offen, Marke, Kette success aus env: Dispatch', laufe({ kommentare: [OFFEN()], pulls: [STAPEL], env: { KETTE_ERGEBNIS: 'success' } }).starts, [DISPATCH])
gleich('Datenzweig: kein Dispatch, kein Kommentarabruf', (() => { const r = laufe({ kommentare: [], pulls: [pr({ head: { sha: KOPF, ref: 'daten/x', repo: REPO } })] }); return [r.starts, r.aufrufe.length, r.code] })(), [[], 1, 0])
gleich('Ausfall des Starts (gh-Fehler beim Dispatch): Exit 1, Zeile FEHLGESCHLAGEN, Kopf bleibt ohne Urteil (Wache nach 45 min)', (() => { const r = laufe({ kommentare: [], fehlerBei: '/dispatches' }); return [r.code, r.zeilen.some((z) => z.includes('FEHLGESCHLAGEN'))] })(), [1, true])
gleich('kein offener PR zum Kopf: nichts, Exit 0', (() => { const r = laufe({ kommentare: [OFFEN()], pulls: [] }); return [r.starts, r.code] })(), [[], 0])
gleich('PR zum Kopf geschlossen: nichts', laufe({ kommentare: [OFFEN()], pulls: [pr({ state: 'closed' })] }).starts, [])
const abbruch = laufe({ kommentare: [OFFEN()], fehlerBei: '/issues/7/comments' })
gleich('gh-Fehler beim Kommentar-Abruf: Exit 1, Zeile FEHLGESCHLAGEN', [abbruch.code, abbruch.zeilen.some((z) => z.includes('FEHLGESCHLAGEN Kopf ' + KOPF.slice(0, 9))), abbruch.starts], [1, true, []])
// Kontingent erschöpft (PR 4467): auch dieser Job wartet bis zum Reset, aber alle Warteplätze zusammen nur bis zum Zeitkonto.
// Jeder verschiedene gh-Aufruf scheitert beim ersten Mal mit „rate limit“, Reset 5 min voraus = 302 s je Wartezeit: zwei passen, die dritte nicht.
function mitLimit(kommentare) {
  const wartet = []
  const schon = new Set()
  const gh = (args) => {
    const s = args.join(' ')
    if (args[1] === 'rate_limit') return JSON.stringify({ resources: { core: { reset: 1_000_000_000 + 300 } } })
    if (!schon.has(s)) {
      schon.add(s)
      throw new Error(`gh ${s} Exit 1: HTTP 403: API rate limit exceeded`)
    }
    if (args[1] === `repos/o/r/commits/${KOPF}/pulls`) return JSON.stringify([pr()])
    if (args.includes('--slurp')) return JSON.stringify([kommentare])
    return ''
  }
  const mute = console.log
  const zeilen = []
  console.log = (z) => zeilen.push(z)
  const code = main({ GITHUB_REPOSITORY: 'o/r', KOPF_SHA: KOPF }, { gh, warte: (ms) => wartet.push(ms), jetzt: () => 1_000_000_000_000, konto: neuesKonto({ datei: '' }) })
  console.log = mute
  return { code, wartet, zeilen }
}
const dauerLimit = mitLimit([])
gleich('Dauer-Limit: zwei Warten à 302 s, die dritte scheitert ohne zu warten, Exit 1 mit „nicht gewartet“ im Log', [dauerLimit.wartet, dauerLimit.code, dauerLimit.zeilen.some((z) => z.includes('FEHLGESCHLAGEN') && z.includes('nicht gewartet'))], [[302_000, 302_000], 1, true])
gleich('Dauer-Limit: Summe der Wartezeiten <= Zeitkonto', dauerLimit.wartet.reduce((s, ms) => s + ms, 0) <= KONTO_MS, true)
gleich('Kopf fehlt: Exit 1', (() => { const m = console.log; console.log = () => {}; const c = main({ GITHUB_REPOSITORY: 'o/r' }, { gh: () => '', warte: () => {} }); console.log = m; return c })(), 1)

// Verdrahtung: Job, Auslöser und env-Namen aus der YAML.
const wf = parse(fs.readFileSync(new URL('../.github/workflows/pr-pruefer-nachtrag.yml', import.meta.url), 'utf8'))
const job = wf.jobs['nach-kette']
const schritt = job.steps.find((s) => s.name === 'Prüfer nach Kettenende starten')
gleich('Job nur beim Ende der Kette eines Pull-Request-Laufs, nicht bei cancelled', job.if, "github.event_name == 'workflow_run' && github.event.workflow_run.event == 'pull_request' && github.event.workflow_run.conclusion != 'cancelled'")
gleich('Auslöser: Ende der PR-Prüfkette', wf.on.workflow_run, { workflows: ['PR-Prüfkette'], types: ['completed'] })
gleich('Schritt ruft das Skript ohne Argumente', schritt.run, 'node tools/pr-pruefer-nach-kette.mjs')
gleich('Kopf und Ergebnis kommen aus workflow_run, nur über env', [schritt.env.KOPF_SHA, schritt.env.KETTE_ERGEBNIS], ['${{ github.event.workflow_run.head_sha }}', '${{ github.event.workflow_run.conclusion }}'])
gleich('run enthält keinen Ausdruck', schritt.run.includes('${{'), false)
// Zeitbudget: 5 min für Checkout und vier Aufrufe plus Zeitkonto für „rate limit“; kein Warten auf den Prüfer mehr.
const budgetMin = (5 * 60_000 + KONTO_MS) / 60_000
gleich(`Zeitbudget: 5 min + Zeitkonto = ${budgetMin} min = timeout-minutes ${job['timeout-minutes']}`, job['timeout-minutes'], budgetMin)
gleich('Gruppe trennt Nachtrag (PR-Nummer) und Kettenende (Kopf), cancelled eigene Gruppe', wf.concurrency.group, "pr-pruefer-nachtrag-${{ github.event_name == 'pull_request_target' && 'basis-' || '' }}${{ github.event.issue.number || github.event.workflow_run.head_sha || github.event.pull_request.number }}${{ github.event.workflow_run.conclusion == 'cancelled' && '-abgebrochen' || '' }}")
gleich('Rechte: Aktionen schreiben (Dispatch), sonst lesen', wf.permissions, { contents: 'read', 'pull-requests': 'read', actions: 'write' })

console.log(`Prüfer nach Kette: ${fehler.length === 0 ? 'alle Fälle grün' : fehler.length + ' Fälle rot'}`)
process.exit(fehler.length === 0 ? 0 : 1)
