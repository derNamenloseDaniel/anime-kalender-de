/** Test der Bewertung von `tools/buehne-pfeile-messen.mjs` (reine Funktion, feste Zahlen: Leiste 300 px, 722 px breit) und der Exit-Codes des Laufs mit Attrappe-Browser. */
import assert from 'node:assert/strict'
import { bewerte, exitVon, lauf } from './buehne-pfeile-messen.mjs'

const gut = () => ({
  links: { pfeilL: 'fehlt', pfeilR: 'an', rand: 'reiter' },
  mitte: { pfeilL: 'an', pfeilR: 'an' },
  rechts: { pfeilL: 'an', pfeilR: 'fehlt', rand: 'reiter' },
  klick: { c: 300, nachRechts: 301, nachLinks: 0 },
  flaeche: { oben: true, unten: true, seitlich: true },
})
const mit = (pfad, wert) => {
  const m = gut()
  const [a, b] = pfad.split('.')
  m[a][b] = wert
  return m
}

assert.deepEqual(bewerte(gut()), [], 'gute Messung ohne Befund')
// Je Prüfung ein roter Fall.
assert.equal(bewerte(mit('links.pfeilL', 'an')).length, 1, 'Pfeil links ganz links müsste fehlen')
assert.equal(bewerte(mit('rechts.pfeilR', 'an')).length, 1, 'Pfeil rechts ganz rechts müsste fehlen')
assert.equal(bewerte(mit('mitte.pfeilR', 'fehlt')).length, 1, 'Mitte: beide Pfeile')
assert.equal(bewerte(mit('klick.nachRechts', 302)).length, 0, 'Klick: 2 px Snap sind erlaubt')
assert.equal(bewerte(mit('klick.nachRechts', 303)).length, 1, 'Klick: 3 px über der Leiste ist zu weit')
assert.equal(bewerte(mit('klick.nachRechts', 100)).length, 1, 'Klick: rollt zu wenig')
assert.equal(bewerte(mit('klick.nachLinks', 301)).length, 1, 'Klick links rollt nicht zurück')
assert.equal(bewerte(mit('links.rand', 'pfeil links')).length, 1, 'Rand des ersten Reiters fängt der Pfeil ab')
assert.equal(bewerte(mit('rechts.rand', 'pfeil rechts')).length, 1, 'Rand des letzten Reiters fängt der Pfeil ab')
assert.equal(bewerte(mit('flaeche.seitlich', false)).length, 1, 'Trefferfläche zu schmal')

// Exit-Code: Messlauf 0 auch bei Befunden, streng 1 nur mit Befund.
assert.equal(exitVon(3, false), 0, 'Messlauf mit Befunden: Exit 0')
assert.equal(exitVon(3, true), 1, 'streng mit Befunden: Exit 1')
assert.equal(exitVon(0, true), 0, 'streng ohne Befunde: Exit 0')
// Der Browser wird auch beim Abbruch geschlossen.
let zu = 0
const attrappe = async () => ({ browser: { close: async () => { zu++ } }, seite: { waitForTimeout: async () => {}, goto: async () => { throw new Error('Bühne fehlt') } } })
await assert.rejects(lauf({ starte: attrappe, ausgabe: () => {} }), /Bühne fehlt/)
assert.equal(zu, 1, 'Browser nach Abbruch geschlossen')

console.log('buehne-pfeile-messen: ok (10 Bewertungsfälle, 3 Exit-Fälle, Abbruch schließt den Browser)')
