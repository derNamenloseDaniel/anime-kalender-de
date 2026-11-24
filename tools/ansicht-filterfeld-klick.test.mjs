/* Regel `klickDanebenAbweichungen`: feste Messwerte (offene Filterfelder vor und nach dem Klick, offene Panels, Karte außerhalb gefunden). */
import assert from 'node:assert/strict'
import { klickDanebenAbweichungen } from './ansicht-filterfeld-klick.mjs'

const gut = { vorher: 1, nachher: 0, panel: 0, karte: true }
const mit = (aendere) => klickDanebenAbweichungen('X', aendere({ ...gut }))

assert.deepEqual(klickDanebenAbweichungen('X', gut), [], 'sauberer Fall')
assert.deepEqual(mit((m) => ({ ...m, vorher: 0 })), ['X: Filterfeld nicht aufgegangen'], 'nie grün durch Nichtstun')
assert.deepEqual(mit((m) => ({ ...m, karte: false })), ['X: keine Karte außerhalb des Filterfeldes zum Anklicken'], 'nie grün ohne Klickziel')
assert.deepEqual(mit((m) => ({ ...m, nachher: 1 })), ['X: Klick daneben schließt das Filterfeld nicht'], 'Feld bleibt offen')
assert.deepEqual(mit((m) => ({ ...m, panel: 1 })), ['X: Klick daneben öffnet die Karte dahinter'], 'Karte öffnet')
assert.deepEqual(mit((m) => ({ ...m, nachher: 1, panel: 1 })).length, 2, 'beides')
console.log('ansicht-filterfeld-klick: ok (6 Fälle)')
