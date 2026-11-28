// Zusicherung: Im Panel sind nur geltende Meldungen offen sichtbar; zurückgezogene und ersetzte stehen hinter einem Aufklapper, der Zähler zählt nur Geltendes.
import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import type { NewsMeldung } from '../shared/types.ts'
import type { Dataset } from '../web/src/lib/data.ts'
import { NeuigkeitenKarte } from '../web/src/components/detail/neuigkeiten.tsx'
import { trenneUeberholte, type Zeile } from '../web/src/components/detail/neuigkeiten-regeln.ts'

const daten = { releaseBySlug: new Map(), releases: [], titleById: new Map() } as unknown as Dataset
const zeile = (am: string, m: Partial<NewsMeldung>): Zeile => ({ am, teilId: 1, m: { art: 'angekuendigt', datum: '2026-12-01', ...m } as NewsMeldung })

const gilt = zeile('2026-11-20', { art: 'angekuendigt', datum: '2026-11-20' })
const ersetzt = zeile('2026-10-01', { ersetzt: { datum: '2026-10-03', quelle: 'https://x.test/a' } } as Partial<NewsMeldung>)
const zurueck = zeile('2026-10-05', { art: 'verspaetet', zurueckgezogen: {} } as Partial<NewsMeldung>)

const t = trenneUeberholte([gilt, ersetzt, zurueck])
assert.equal(t.gueltig.length, 1, 'eine geltende Meldung')
assert.equal(t.ueberholt.length, 2, 'ersetzte und zurückgezogene sind überholt')

const html = renderToStaticMarkup(<NeuigkeitenKarte data={daten} zeilen={[gilt, ersetzt, zurueck]} />)
assert.match(html, /2 überholte Meldungen/, 'Aufklapper nennt die Zahl')
assert.match(html, /aria-expanded="false"/, 'Aufklapper ist zu')
assert.doesNotMatch(html, /zurückgezogen|ersetzt durch/, 'überholte Meldung vor dem Klick nicht sichtbar')
assert.doesNotMatch(html, /line-through/, 'nichts Durchgestrichenes vor dem Klick')
assert.equal((html.match(/<li/g) ?? []).length, 1, 'nur die geltende Meldung steht offen')
assert.match(html, />1<\/span>/, 'Zähler im Kopf zählt nur Geltendes')

const eine = renderToStaticMarkup(<NeuigkeitenKarte data={daten} zeilen={[gilt, zurueck]} />)
assert.match(eine, /1 überholte Meldung</, 'Einzahl')

const nurAlt = renderToStaticMarkup(<NeuigkeitenKarte data={daten} zeilen={[ersetzt, zurueck]} />)
assert.equal((nurAlt.match(/<li/g) ?? []).length, 0, 'sind alle überholt, steht nur der Aufklapper')
assert.match(nurAlt, /2 überholte Meldungen/, 'Aufklapper bleibt')
assert.doesNotMatch(nurAlt, /tabular-nums text-ak-text">\d/, 'kein Zähler im Kopf ohne Geltendes')

const ohne = renderToStaticMarkup(<NeuigkeitenKarte data={daten} zeilen={[gilt]} />)
assert.doesNotMatch(ohne, /überholte/, 'ohne Überholtes kein Aufklapper')

console.log('neuigkeiten-ueberholt: ok')
