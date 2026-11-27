/** Test für tools/ansicht-hover-cover-zeilen.mjs: erwartete Cover je Zeile und die Lage-Urteile der Hover-Karte. */
import assert from 'node:assert/strict'
import { erwarteteCover, lageAbweichungen } from './ansicht-hover-cover-zeilen.mjs'

const woche = {
  titles: [{ id: 1, coverImage: 'a.jpg' }, { id: 2, coverImage: 'b.jpg' }, { id: 3, coverImage: undefined }],
  events: [
    { titleId: 1, name: 'Naruto', platform: 'disc' },
    { titleId: 2, name: 'Naruto Shippuden', platform: 'disc' },
    { titleId: 3, name: 'Bleach', platform: 'tv' },
  ],
}
assert.deepEqual(erwarteteCover(woche, 'disc', 'Naruto Shippuden Box'), ['b.jpg'], 'längster Name gewinnt')
assert.deepEqual(erwarteteCover(woche, 'disc', 'Naruto Box'), ['a.jpg'])
assert.deepEqual(erwarteteCover(woche, 'tv', 'Naruto'), [], 'Plattform wird beachtet')
assert.deepEqual(erwarteteCover(woche, 'tv', 'Bleach'), [], 'ohne Cover nichts erwartet')
assert.deepEqual(erwarteteCover(woche, undefined, 'Bleach Naruto').sort(), ['a.jpg'].sort(), 'ohne Plattform zählen alle, längster Name entscheidet')

const fenster = { breite: 1280, hoehe: 900 }
const zeile = { x: 100, y: 400, width: 400, height: 40 }
const gut = { karte: { x: 360, y: 440 + 8, width: 200, height: 300 }, zeile, zeiger: { x: 340, y: 420 }, fenster }
assert.deepEqual(lageAbweichungen(gut), [], 'Karte neben dem Zeiger, unter der Zeile')

const draussen = lageAbweichungen({ ...gut, karte: { ...gut.karte, x: 1200 } })
assert.ok(draussen.some((t) => /liegt nicht im sichtbaren Bereich/.test(t)), 'rechts aus dem Fenster')
const weit = lageAbweichungen({ ...gut, zeiger: { x: 100, y: 420 } })
assert.ok(weit.some((t) => /liegt nicht neben dem Zeiger/.test(t)), 'zu weit vom Zeiger')
const nah = lageAbweichungen({ ...gut, zeiger: { x: 355, y: 420 } })
assert.ok(nah.some((t) => /liegt nicht neben dem Zeiger/.test(t)), 'zu dicht am Zeiger (unter 8 px)')
const hoch = lageAbweichungen({ ...gut, karte: { ...gut.karte, y: 600 } })
assert.ok(hoch.some((t) => /unmittelbar unter oder über der Zeile/.test(t)), 'Karte weit von der Zeile')
console.log('ansicht-hover-cover-zeilen.test: ok')
