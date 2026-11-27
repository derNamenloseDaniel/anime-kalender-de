/** Test für tools/daten-detektiv/regeln-termine.ts, Regel DD-01 (`datumMonoton`): Fixture-Bestand, kein Datensatz-Zugriff. */
import assert from 'node:assert/strict'
import { datumMonoton } from './daten-detektiv/regeln-termine.ts'

const ev = (slug, episode, date) => ({ releaseSlug: slug, episode, date })
const release = (slug, extra = {}) => ({ slug, name: `Name ${slug}`, releaseType: 'weekly', schedule: {}, ...extra })

const bestand = {
  heute: '2026-11-26',
  releases: [release('ok'), release('falsch'), release('disc', { releaseType: 'disc' }), release('tv', { tvLetzteSichtung: '2026-11-01' })],
  events: [
    ev('ok', 1, '2026-10-01'), ev('ok', 2, '2026-10-08'),
    ev('falsch', 1, '2026-10-01'), ev('falsch', 2, '2026-10-15'), ev('falsch', 3, '2026-10-08'),
    ev('disc', 1, '2026-10-10'), ev('disc', 2, '2026-10-01'),
    ev('tv', 5, '2026-10-10'), ev('tv', 78, '2026-10-01'),
  ],
}
const r = datumMonoton(bestand)
assert.equal(r.id, 'DD-01')
assert.deepEqual(r.treffer.map((t) => t.schluessel), ['falsch'], 'nur die Serie mit Folge 3 vor Folge 2; Disc und TV-Sichtung ausgenommen')
assert.match(r.treffer[0].text, /Name falsch: Folge 2 am 2026-10-15 \(gerechnet\), Folge 3 am 2026-10-08/)
assert.equal(r.treffer[0].ort, '/r/falsch/')
assert.equal(r.geprueft, 4, 'Nenner = Zahl der Releases mit Ereignissen')

const beobachtet = datumMonoton({ ...bestand, releases: [release('falsch', { schedule: { observed: { 2: '2026-10-15' } } })], events: bestand.events.filter((e) => e.releaseSlug === 'falsch') })
assert.match(beobachtet.treffer[0].text, /\(beobachtet\)/, 'beobachtete Folge wird so benannt')

const gleich = datumMonoton({ ...bestand, releases: [release('x')], events: [ev('x', 1, '2026-10-05'), ev('x', 1, '2026-10-01'), ev('x', 2, '2026-10-06')] })
assert.deepEqual(gleich.treffer, [], 'dieselbe Folge an zwei Tagen ist kein Widerspruch')
console.log('daten-detektiv-regeln-termine.test: ok')
