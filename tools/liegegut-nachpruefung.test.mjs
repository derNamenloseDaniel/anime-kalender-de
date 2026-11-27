/**
 * Test zu tools/liegegut-nachpruefung.mjs und seiner Verdrahtung in `meldeLiegt` und `main` (liegegut.mjs). Feste Zeiten, Attrappe-gh.
 */
import assert from 'node:assert/strict'
import { main, meldeLiegt } from './liegegut.mjs'
import { nachpruefungMeldung } from './liegegut-nachpruefung.mjs'

const JETZT = Date.parse('2026-11-28T06:00:00Z')
const aufrufe = []
const ghMit = (treffer) => (args) => {
  aufrufe.push(args.join(' '))
  if (args.some((a) => a.includes('repos/{owner}/{repo}/issues'))) return JSON.stringify(treffer)
  if (args[0] === 'pr' && args[1] === 'list') return '[]'
  return ''
}
const git = () => ''

// Zeile: Nummern aufsteigend, älteste Stunden aus der Merge-Zeit
assert.equal(nachpruefungMeldung(ghMit([{ nr: 5101, zu: '2026-11-28T02:30:00Z' }, { nr: 5100, zu: '2026-11-27T22:00:00Z' }]), JETZT), 'NACHPRÜFUNG OFFEN: 5100, 5101 (älteste seit 8 h)')
assert.ok(aufrufe[0].includes('labels=nachpruefung-offen') && aufrufe[0].includes('state=all'), 'fragt das Label, auch geschlossene (gemergte) PRs')
assert.equal(nachpruefungMeldung(ghMit([]), JETZT), null, 'ohne Treffer keine Zeile')
assert.equal(nachpruefungMeldung(ghMit([{ nr: 7, zu: null }]), JETZT), 'NACHPRÜFUNG OFFEN: 7', 'ohne Merge-Zeit ohne Altersangabe')
assert.equal(nachpruefungMeldung(ghMit([{ nr: 999, zu: null }, { nr: 5100, zu: '2026-11-28T03:00:00Z' }]), JETZT), 'NACHPRÜFUNG OFFEN: 999, 5100 (älteste seit 3 h)', 'Nummern numerisch sortiert, ein fehlendes Datum verfälscht das Alter nicht')
assert.throws(() => nachpruefungMeldung(() => 'kein json', JETZT), 'Müll statt JSON wirft (meldeLiegt macht daraus eine LIEGT?-Zeile)')

// Verdrahtung: Wachphase und Kommandozeile melden die Zeile
{
  const wache = []
  meldeLiegt(ghMit([{ nr: 5100, zu: '2026-11-28T00:00:00Z' }]), git, (t) => wache.push(t), JETZT)
  assert.ok(wache.includes('NACHPRÜFUNG OFFEN: 5100 (älteste seit 6 h)'), `meldeLiegt: ${JSON.stringify(wache)}`)
  const ausgabe = []
  main(ghMit([{ nr: 5100, zu: '2026-11-28T00:00:00Z' }]), git, (t) => ausgabe.push(t), JETZT)
  assert.ok(ausgabe.includes('NACHPRÜFUNG OFFEN: 5100 (älteste seit 6 h)'), `main: ${JSON.stringify(ausgabe)}`)
  const still = []
  meldeLiegt(ghMit([]), git, (t) => still.push(t), JETZT)
  assert.ok(!still.some((t) => t.startsWith('NACHPRÜFUNG')), 'ohne Treffer keine Zeile in der Wachphase')
}
console.log('liegegut-nachpruefung.test: Zeile, Label-Abfrage, Leerfall, Müll, Verdrahtung in meldeLiegt und main grün')
