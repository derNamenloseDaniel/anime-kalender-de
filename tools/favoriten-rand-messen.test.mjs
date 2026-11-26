/** Test für tools/favoriten-rand-messen.mjs: Berührung der Kachel-Ränder und Vergleich der Maße (reine Rechenfunktionen). */
import assert from 'node:assert/strict'
import { beruehrungen, gleicheMasse } from './favoriten-rand-messen.mjs'

const kachel = (i, x, aussen = 0) => ({ i, x, y: 0, w: 100, h: 100, aussen })
assert.deepEqual(beruehrungen([kachel(0, 0), kachel(1, 110)]), [], 'Abstand 10 px, kein Außenmaß: keine Berührung')
assert.deepEqual(beruehrungen([kachel(0, 0, 11), kachel(1, 110)]), [[0, 1]], 'Außenmaß 11 px erreicht die Nachbarkachel (nur in eine Richtung)')
assert.deepEqual(beruehrungen([kachel(0, 110, 11), kachel(1, 0)]), [[0, 1]], 'Außenmaß reicht auch nach links')
assert.deepEqual(beruehrungen([kachel(0, 0), kachel(1, 90)]), [[0, 1], [1, 0]], 'Überlappung: beide Richtungen')
assert.deepEqual(beruehrungen([kachel(0, 0, 10), kachel(1, 110)]), [], 'genau am Rand zählt nicht')
assert.deepEqual(beruehrungen([kachel(0, 0)]), [], 'eine Kachel berührt sich nicht selbst')

const a = [kachel(0, 0), kachel(1, 110)]
assert.deepEqual(gleicheMasse(a, a.map((k) => ({ ...k }))), [])
assert.deepEqual(gleicheMasse(a, a.map((k) => ({ ...k, x: k.x + 0.005 }))), [], 'unter 0,01 px gleich')
assert.deepEqual(gleicheMasse(a, [a[0]]), ['Anzahl 2 → 1'])
assert.deepEqual(gleicheMasse(a, [a[0], { ...a[1], w: 99 }]), ['Kachel 1 w: 100 → 99'])
console.log('favoriten-rand-messen.test: ok')
