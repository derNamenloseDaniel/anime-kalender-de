/**
 * Test für tools/pr-pruefer-basis-offen.mjs und seine Verdrahtung: Stapel-PR mit offenem Basis-PR und roter Kette ->
 * Kopfzeile in kettenlog.txt -> kettenOffen (Marke „nicht beurteilt“) -> Neustart nach grüner Kette (pr-pruefer-nach-kette.mjs).
 * Gegenfälle: Basis gemergt, kein Hinweis, grüne Kette, Abruffehler = altes Verhalten. Kein Netz, keine Uhr.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { baueDateien, schreibeKettenlog } from './pr-kettenlog.mjs'
import { kettenOffen, main as keMain } from './pr-pruefer-kette-offen.mjs'
import { MARKE_KETTE_OFFEN } from './pr-pruefer-kette-offen.mjs'
import { basisNummer, basisZeile } from './pr-pruefer-basis-offen.mjs'
import { entscheide, main as nkMain } from './pr-pruefer-nach-kette.mjs'

const fehler = []
const gleich = (name, ist, soll) => {
  if (JSON.stringify(ist) === JSON.stringify(soll)) return console.log(`  ✓ ${name}`)
  fehler.push(name)
  console.error(`  ✗ ${name} — Ist ${JSON.stringify(ist)}, Soll ${JSON.stringify(soll)}`)
}

const SHA = 'e'.repeat(40)
const ROT = { id: 9, status: 'completed', conclusion: 'failure' }
const GRUEN = { id: 9, status: 'completed', conclusion: 'success' }
const TEXT = 'mergen nach #3435\n\nStapel-PR'

gleich('Nummer: „mergen nach #N“', basisNummer('mergen nach #3435'), 3435)
gleich('Nummer: „erst nach #N“ (Stapel-Schreibweise)', basisNummer('erst nach #3090 (Teil 2)'), 3090)
gleich('Nummer: „mergen nach PR 12“ mitten im Text', basisNummer('Hinweis: Mergen nach PR 12.'), 12)
gleich('Nummer: „erst nach 5 Minuten“ ist kein Hinweis', basisNummer('Wird erst nach 5 Minuten sichtbar.'), null)
gleich('Nummer: „mergen nach 7 Tagen“ ist kein Hinweis', basisNummer('mergen nach 7 Tagen'), null)
gleich('Nummer: „erst nach PR12“ ohne Leerzeichen', basisNummer('erst nach PR12'), 12)
gleich('Nummer: Zitat vor echtem Hinweis zählt nicht', basisNummer('> erst nach #111\n\nmergen nach #222'), 222)
gleich('Nummer: nur Zitat -> kein Hinweis', basisNummer('> erst nach #111'), null)
gleich('Nummer: Inline-Code vor echtem Hinweis zählt nicht', basisNummer('Muster `erst nach #111` im Text.\nerst nach #222'), 222)
gleich('Nummer: nur Codeblock -> kein Hinweis', basisNummer('```\nmergen nach #333\n```\nText'), null)
gleich('Nummer: nach dem Codeblock steht der echte Hinweis', basisNummer('```\nmergen nach #333\n```\nerst nach #444'), 444)
gleich('Nummer: kein Hinweis', basisNummer('fix: nichts'), null)
gleich('Nummer: leerer Text', basisNummer(undefined), null)

const zeile = (a) => basisZeile({ beschreibung: TEXT, lauf: ROT, basisStand: 'open', ...a })
gleich('Zeile: rote Kette, Basis offen -> Zeile mit Nummer', zeile({}).startsWith('BASIS OFFEN: PR #3435 '), true)
gleich('Zeile: Basis gemergt (closed) -> keine', zeile({ basisStand: 'closed' }), '')
gleich('Zeile: Basisstand unbekannt (Abruffehler) -> keine', zeile({ basisStand: '' }), '')
gleich('Zeile: grüne Kette -> keine', zeile({ lauf: GRUEN }), '')
gleich('Zeile: Kette noch laufend -> keine (das ist „Kette lief noch“)', zeile({ lauf: { id: 9, status: 'in_progress', conclusion: '' } }), '')
gleich('Zeile: kein Kettenlauf -> keine', zeile({ lauf: null }), '')
gleich('Zeile: kein Hinweis im PR-Text -> keine', zeile({ beschreibung: 'fix: nichts' }), '')

// kettenOffen: Zeile steht in den ersten drei Zeilen; dieselbe Zeile weiter unten (PR-Ausgabe) zählt nicht.
const dateien = (basis) => baueDateien({ kopf: SHA, lauf: ROT, jobs: [{ name: 'a', status: 'completed', conclusion: 'failure', log: 'x' }], basis }).uebersicht
gleich('kettenOffen: rote Kette mit Basiszeile', kettenOffen(dateien(zeile({}))), true)
gleich('kettenOffen: rote Kette ohne Basiszeile (altes Verhalten: aendern bleibt)', kettenOffen(dateien('')), false)
gleich('kettenOffen: Basiszeile erst als vierte Zeile (PR-Ausgabe) zählt nicht', kettenOffen(`a\nb\nc\n${zeile({})}\n`), false)
gleich('kettenOffen: Zeile mit fremdem Wortlaut zählt nicht', kettenOffen('HINWEIS\nBASIS OFFEN: PR #1 egal\nLauf\n'), false)

// Ablauf über schreibeKettenlog mit eingespeistem gh, dann der CLI-Exit-Code von kette-offen (0 = nicht beurteilt statt aendern).
async function kettenlogMit({ basisStand, lauf = ROT, text = TEXT }) {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'basis-offen-'))
  const besch = path.join(ordner, 'pr-beschreibung.txt')
  fs.writeFileSync(besch, text)
  const gh = (args) => {
    const a = args.join(' ')
    if (a.includes('/pulls/3435')) {
      if (basisStand === 'FEHLER') throw new Error('boom')
      return `${basisStand}\n`
    }
    if (a.includes('/workflows/pr-pruefung.yml/runs')) return `${lauf.id}\t${lauf.status}\t${lauf.conclusion}\n`
    if (a.includes('/jobs?')) return '1\tbau\tcompleted\tfailure\n'
    return 'zeile\n'
  }
  await schreibeKettenlog({ repo: 'o/r', sha: SHA, ordner, frist: 0, gh, warte: async () => {}, jetzt: () => 0, beschreibung: besch })
  const datei = path.join(ordner, 'kettenlog.txt')
  const code = keMain([datei])
  const kopf = fs.readFileSync(datei, 'utf8').split('\n').slice(0, 4)
  fs.rmSync(ordner, { recursive: true, force: true })
  return { code, kopf }
}
const a1 = await kettenlogMit({ basisStand: 'open' })
gleich('Ablauf: Basis offen, Kette rot -> Exit 0 (nicht beurteilt)', a1.code, 0)
gleich('Ablauf: Basiszeile steht vor dem Lauf-Satz', a1.kopf[1].startsWith('BASIS OFFEN: PR #3435') && a1.kopf[2].includes('abgeschlossen (failure)'), true)
gleich('Ablauf: Basis gemergt -> Exit 1 (aendern bleibt)', (await kettenlogMit({ basisStand: 'closed' })).code, 1)
gleich('Ablauf: Abruffehler der Basis -> Exit 1 (aendern bleibt)', (await kettenlogMit({ basisStand: 'FEHLER' })).code, 1)
gleich('Ablauf: Basis offen, Kette grün -> Exit 1', (await kettenlogMit({ basisStand: 'open', lauf: GRUEN })).code, 1)
gleich('Ablauf: kein Hinweis im PR-Text -> Exit 1', (await kettenlogMit({ basisStand: 'open', text: 'fix: x' })).code, 1)

// Neustart nach grüner Kette (nach-kette): Tabelle der Entscheidung ...
const BOT = 'github-actions[bot]'
const OFFEN = { user: { login: BOT }, body: `**Prüfer-Review** für ${SHA.slice(0, 9)} - Urteil: **nicht beurteilt, Kette lief noch**\n\n${MARKE_KETTE_OFFEN}\n` }
const REPO = { full_name: 'o/r' }
const pr = { number: 7, state: 'open', draft: false, head: { sha: SHA, ref: 'claude/stapel', repo: REPO }, base: { ref: 'main', sha: 'a'.repeat(40), repo: REPO }, body: TEXT }
const los = (e) => entscheide({ kommentare: [OFFEN], kopf: SHA, pr, ...e }).los
gleich('nach-kette: Basis offen, Kette rot -> kein Start', los({ basisOffen: true, kette: ROT.conclusion }), false)
gleich('nach-kette: Basis offen, Kette grün -> Start', los({ basisOffen: true, kette: GRUEN.conclusion }), true)
gleich('nach-kette: Basis offen, Kettenergebnis unbekannt -> kein Start', los({ basisOffen: true, kette: null }), false)
gleich('nach-kette: Basis nicht offen, Kette rot -> Start wie bisher', los({ basisOffen: false, kette: ROT.conclusion }), true)

// ... und über main mit eingespeistem gh (Verdrahtung: Basisstand wird abgefragt, das Kettenergebnis kommt aus workflow_run über env).
const DISPATCH = `api -X POST repos/o/r/actions/workflows/pr-pruefer.yml/dispatches -f ref=main -f inputs[pr]=7 -f inputs[sha]=${SHA}`
function lauf({ basisStand, kette, body = TEXT }) {
  const gh = (args) => {
    const a = args.join(' ')
    if (a === `api repos/o/r/commits/${SHA}/pulls`) return JSON.stringify([{ ...pr, body }])
    if (a.includes('/pulls/3435')) {
      if (basisStand === 'FEHLER') throw new Error('boom')
      return `${basisStand}\n`
    }
    if (args.includes('--slurp')) return JSON.stringify([[OFFEN]])
    gh.aenderungen.push(a)
    return ''
  }
  gh.aenderungen = []
  const mute = console.log
  console.log = () => {}
  const code = nkMain({ GITHUB_REPOSITORY: 'o/r', KOPF_SHA: SHA, KETTE_ERGEBNIS: kette.conclusion }, { gh, warte: () => {} })
  console.log = mute
  return { code, start: gh.aenderungen }
}
gleich('main: Basis offen, Kette rot -> kein Start, Exit 0', (() => { const r = lauf({ basisStand: 'open', kette: ROT }); return [r.code, r.start] })(), [0, []])
gleich('main: Basis offen, Kette grün -> Start', lauf({ basisStand: 'open', kette: GRUEN }).start, [DISPATCH])
gleich('main: Basis gemergt, Kette rot -> Start (altes Verhalten)', lauf({ basisStand: 'closed', kette: ROT }).start, [DISPATCH])
gleich('main: Abruffehler beim Basisstand, Kette rot -> Start (altes Verhalten)', lauf({ basisStand: 'FEHLER', kette: ROT }).start, [DISPATCH])
gleich('main: kein Hinweis im PR-Text, Kette rot -> Start (altes Verhalten)', lauf({ basisStand: 'open', kette: ROT, body: 'fix' }).start, [DISPATCH])

console.log(`Prüfer Basis offen: ${fehler.length === 0 ? 'alle Fälle grün' : fehler.length + ' Fälle rot'}`)
process.exit(fehler.length === 0 ? 0 : 1)
