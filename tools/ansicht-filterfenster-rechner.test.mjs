/** Test für tools/ansicht-filterfenster-rechner.mjs: die Abstands-Urteile (`abstandsAbweichungen`) an festen Messwerten. */
import assert from 'node:assert/strict'
import { abstandsAbweichungen } from './ansicht-filterfenster-rechner.mjs'

assert.deepEqual(abstandsAbweichungen('woche', { scrollerUeberFuss: 0, scrollerUeberRand: 0 }), [], 'saubere Messung: keine Abweichung')
assert.deepEqual(abstandsAbweichungen('woche', { scrollerUeberFuss: 0.5, scrollerUeberRand: 0.5 }), [], 'Grenze 0,5 px gilt noch als in Ordnung')
assert.deepEqual(abstandsAbweichungen('woche', { scrollerUeberFuss: null, scrollerUeberRand: -3 }), [], 'ohne Fuß-Messung keine Fuß-Aussage')

const a = abstandsAbweichungen('datenbank', { scrollerUeberFuss: 4.4, scrollerUeberRand: 0 })
assert.equal(a.length, 1)
assert.match(a[0], /^datenbank: Scroller reicht über die Oberkante des Fußes \(4 px\)$/)

const b = abstandsAbweichungen('woche', { scrollerUeberFuss: 0, scrollerUeberRand: 6.6 })
assert.equal(b.length, 1)
assert.match(b[0], /Scrollbar liegt 7 px außerhalb des Fensters/)

assert.equal(abstandsAbweichungen('x', { scrollerUeberFuss: 2, scrollerUeberRand: 2 }).length, 2, 'beide Abweichungen werden gemeldet')
console.log('ansicht-filterfenster-rechner.test: ok')
