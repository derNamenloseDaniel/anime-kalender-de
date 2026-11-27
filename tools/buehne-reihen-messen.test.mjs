/** Test für tools/buehne-reihen-messen.mjs: Wechselzählung am Rand und Bildpunkt-Bänder um die Kartenkanten (reine Funktionen). */
import assert from 'node:assert/strict'
import { kantenBand, wechsel } from './buehne-reihen-messen.mjs'

const innen = Array.from({ length: 6 }, () => [10, 10, 10])
const rand = (...abw) => abw.map((a) => (a ? [200, 10, 10] : [10, 10, 10]))
assert.equal(wechsel(rand(0, 0, 0, 0, 0, 0), innen), 0, 'alles gleich: kein Wechsel')
assert.equal(wechsel(rand(1, 1, 1, 1, 1, 1), innen), 0, 'durchgehend abweichend: kein Wechsel (Voll-Ring)')
assert.equal(wechsel(rand(1, 0, 1, 0, 1, 0), innen), 5, 'Strich-Lücke-Folge: fünf Wechsel')
assert.equal(wechsel(rand(0, 1, 1, 1, 0, 0), innen), 2)
assert.equal(wechsel([[10, 10, 22]], [[10, 10, 10]]), 0, 'Abstand 12 zählt noch nicht als Abweichung')
assert.equal(wechsel([[10, 10, 10], [10, 10, 23]], [[10, 10, 10], [10, 10, 10]]), 1, 'Abstand 13 ist Abweichung')

const c = { l: 100, t: 50, r: 160, b: 130 }
const b0 = kantenBand(c, 0)
assert.equal(b0.oben.length, 40, 'Breite 60 − 20 Randpunkte')
assert.equal(b0.links.length, 60, 'Höhe 80 − 20')
assert.deepEqual(b0.oben[0], [110, 50], 'obere Kante: erste Reihe')
assert.deepEqual(b0.unten[0], [110, 129], 'untere Kante liegt eine Reihe innerhalb von b')
assert.deepEqual(b0.links[0], [100, 60])
assert.deepEqual(b0.rechts[0], [159, 60])
const aussen = kantenBand(c, -2)
assert.deepEqual(aussen.oben[0], [110, 48], 'negativer Abstand liegt außerhalb des Covers')
assert.deepEqual(aussen.unten[0], [110, 131])
assert.deepEqual(aussen.rechts[0], [161, 60])
assert.equal(kantenBand({ l: 0, t: 0, r: 10, b: 10 }, 0).oben.length, 0, 'zu kleine Karte: keine negativen Längen')
console.log('buehne-reihen-messen.test: ok')
