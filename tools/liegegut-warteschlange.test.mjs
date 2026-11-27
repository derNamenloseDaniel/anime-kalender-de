/**
 * Test zu tools/liegegut-warteschlange.mjs und seiner Verdrahtung in `meldeLiegt` und `main` (liegegut.mjs). Feste Zeiten, Attrappe-gh.
 */
import assert from 'node:assert/strict'
import { main, meldeLiegt } from './liegegut.mjs'
import { QUEUE_MIN, warteschlangeMeldung } from './liegegut-warteschlange.mjs'

const JETZT = Date.parse('2026-11-27T13:00:00Z')
const vor = (min) => new Date(JETZT - min * 60000).toISOString()
const lauf = (workflowName, displayTitle, min) => ({ workflowName, displayTitle, createdAt: vor(min) })
const aufrufe = []
const ghMit = (laeufe) => (args) => {
  aufrufe.push(args.join(' '))
  if (args[0] === 'run' && args[1] === 'list') return JSON.stringify(laeufe)
  if (args[0] === 'pr' && args[1] === 'list') return '[]'
  if (args.includes('-X')) return '[]'
  return ''
}
const git = () => ''

assert.equal(QUEUE_MIN, 30)
const meldung = warteschlangeMeldung(ghMit([lauf('PR-Prüfer', 'PR-Prüfer #5162 a1b2c3d4e', 45), lauf('Abnahme — Freigabe', 'Nachtrag 5151', 90), lauf('PR-Prüfer', 'PR-Prüfer #5163 abc', 29)]), JETZT)
assert.equal(meldung, 'WARTESCHLANGE: Abnahme — Freigabe Nachtrag 5151 (90 min), PR-Prüfer #5162 a1b2c3d4e (45 min) stehen auf queued; ohne sie kommt eine verworfene Freigabe nicht zurück')
assert.ok(aufrufe[0].includes('--status queued'), 'fragt nur wartende Läufe')
assert.notEqual(warteschlangeMeldung(ghMit([lauf('PR-Prüfer', 'PR-Prüfer #1 x', 30)]), JETZT), null, 'genau 30 min zählt')
assert.equal(warteschlangeMeldung(ghMit([lauf('PR-Prüfer', 'PR-Prüfer #1 x', 29)]), JETZT), null, 'unter 30 min keine Zeile')
assert.equal(warteschlangeMeldung(ghMit([lauf('Deploy', 'Deploy', 120)]), JETZT), null, 'andere Workflows zählen nicht')
assert.equal(warteschlangeMeldung(ghMit([]), JETZT), null)
const viele = Array.from({ length: 7 }, (_, i) => lauf('PR-Prüfer', `PR-Prüfer #${i} x`, 40 + i))
assert.match(warteschlangeMeldung(ghMit(viele), JETZT), /^WARTESCHLANGE: .*\(46 min\), .* und 2 weitere stehen auf queued/, 'ab dem sechsten nur gezählt, älteste zuerst')
assert.throws(() => warteschlangeMeldung(() => 'kein json', JETZT))

// Verdrahtung: Wachphase und Kommandozeile melden die Zeile
{
  const lang = [lauf('PR-Prüfer', 'PR-Prüfer #5162 abc', 50)]
  const wache = []
  meldeLiegt(ghMit(lang), git, (t) => wache.push(t), JETZT)
  assert.ok(wache.some((t) => t.startsWith('WARTESCHLANGE: PR-Prüfer #5162 abc (50 min)')), `meldeLiegt: ${JSON.stringify(wache)}`)
  const ausgabe = []
  main(ghMit(lang), git, (t) => ausgabe.push(t), JETZT)
  assert.ok(ausgabe.some((t) => t.startsWith('WARTESCHLANGE: PR-Prüfer #5162 abc (50 min)')), `main: ${JSON.stringify(ausgabe)}`)
  const still = []
  meldeLiegt(ghMit([]), git, (t) => still.push(t), JETZT)
  assert.ok(!still.some((t) => t.startsWith('WARTESCHLANGE')), 'ohne lange Läufe keine Zeile')
}
console.log('liegegut-warteschlange.test: Schwelle, Filter, Sortierung, Kürzung, Müll, Verdrahtung in meldeLiegt und main grün')
