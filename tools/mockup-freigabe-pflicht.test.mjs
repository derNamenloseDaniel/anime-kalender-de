/** Test von `tools/mockup-freigabe-pflicht.mjs`: Gegenproben, echtes Mockup `staffel-abschnitt`, Kommentare per API-Attrappe, Eintrag in der Kette. */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { beschreibungMitKommentaren, bewerte, bildFelder, gegenproben, geaenderteFelder } from './mockup-freigabe-pflicht.mjs'

assert.deepEqual(gegenproben(), [], 'alle Gegenproben halten')

// Echtes Mockup: Titel und Felder der Variante A werden gelesen.
const echt = readFileSync(new URL('../web/buehne/mockups/staffel-abschnitt.tsx', import.meta.url), 'utf8')
const felder = bildFelder(echt)
assert.deepEqual([...felder.keys()], ['titel', 'A.ersatz', 'A.notiz'])
assert.equal(felder.get('titel'), "'Staffel-Reiter an der roten Box und im Folgenbereich (F157)'")
// Anlass PR 4896: Titel und notiz auf den Bau umgeschrieben, ersatz geleert, dazu web/src geändert — ohne Freigabezeile rot.
const vorher = echt.replace('{}', '{ AntwortKasten: KastenMitReitern }')
assert.deepEqual(geaenderteFelder(vorher, echt), [], 'ersatz auf {} geleert ist der Bauschritt')
assert.deepEqual(geaenderteFelder(echt, vorher), ['A.ersatz'], 'ersatz gefüllt zählt')
const umgeschrieben = echt.replace('an der roten Box und im Folgenbereich', 'an der Abschnittsbox')
assert.deepEqual(geaenderteFelder(echt, umgeschrieben), ['titel'])
const pr = (beschreibung) => ({ aenderungen: [['M', 'web/src/components/detail/folgen-bereich.tsx'], ['M', 'web/buehne/mockups/staffel-abschnitt.tsx']], lies: (ref) => (ref === 'basis' ? vorher : umgeschrieben), beschreibung })
assert.equal(bewerte(pr('Patch Notes: keine – Umbau')).ok, false, 'Anlass 4896 ohne Freigabe rot')
assert.match(bewerte(pr('')).grund, /staffel-abschnitt\.tsx \(titel\)/)
assert.equal(bewerte(pr('Mockup-Änderung freigegeben: „die Reiter am Antwortkasten genau wie im Mockup“')).ok, true)

// Kommentare: Autor und Berechtigte zählen, Fremde nicht; Abruffehler lässt die Beschreibung gelten.
const kopf = { number: 7, body: 'B', user: { login: 'autor' } }
const api = () => [[
  { user: { login: 'autor' }, author_association: 'NONE', body: 'Mockup-Änderung freigegeben: vom Autor' },
  { user: { login: 'fremd' }, author_association: 'NONE', body: 'Mockup-Änderung freigegeben: fremd' },
  { user: { login: 'pflege' }, author_association: 'MEMBER', body: 'Mockup-Änderung freigegeben: Mitglied' },
]]
const gesamt = beschreibungMitKommentaren(kopf, 'o/r', api)
assert.ok(gesamt.includes('vom Autor') && gesamt.includes('Mitglied') && !gesamt.includes('fremd'), gesamt)
const fehler = console.error
console.error = () => {}
assert.equal(beschreibungMitKommentaren(kopf, 'o/r', () => { throw new Error('403') }), 'B')
console.error = fehler
assert.equal(beschreibungMitKommentaren({ ...kopf, number: undefined }, 'o/r', api), 'B', 'ohne PR-Nummer nur die Beschreibung')

// Der Wächter läuft in der PR-Kette (check:logic, Logik mit GH_TOKEN wie die Patch-Notes-Pflicht).
const liste = readFileSync(new URL('./check-logic-liste.txt', import.meta.url), 'utf8').split('\n')
assert.ok(liste.includes('tools/mockup-freigabe-pflicht.mjs'), 'in tools/check-logic-liste.txt')

console.log('mockup-freigabe-pflicht: ok (15 Gegenproben, echtes Mockup, Anlass 4896, Kommentare, Kette)')
