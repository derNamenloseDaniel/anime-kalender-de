/** Test der Urteilsregeln `saison-chip-urteil.mjs` aus festen Messwerten. Aufruf: node tools/saison-chip-urteil.test.mjs */
import assert from 'node:assert/strict'
import { urteilKarte, urteilSeite } from './saison-chip-urteil.mjs'

const gut = { knopfHoehe: 105, knopfRechts: 340, chipsRechts: [120, 200], zeileRechts: 210, gestrichelt: 1, laut: true }
assert.deepEqual(urteilKarte(gut, 'gekennzeichnet'), [])
assert.deepEqual(urteilKarte({ ...gut, zeileRechts: null, gestrichelt: 0, laut: false }, 'belegt'), [])
assert.equal(urteilKarte({ ...gut, knopfHoehe: 43 }, 'gekennzeichnet').length, 1, 'zu niedrig')
assert.equal(urteilKarte({ ...gut, knopfHoehe: 44 }, 'gekennzeichnet').length, 0, 'genau 44')
assert.equal(urteilKarte({ ...gut, chipsRechts: [341] }, 'gekennzeichnet').length, 1, 'Chip ragt über')
assert.equal(urteilKarte({ ...gut, chipsRechts: [340.4] }, 'gekennzeichnet').length, 0, 'Rundung')
assert.equal(urteilKarte({ ...gut, zeileRechts: 341 }, 'gekennzeichnet').length, 1, 'Zeile ragt über')
assert.equal(urteilKarte({ ...gut, gestrichelt: 0 }, 'gekennzeichnet').length, 1, 'gestrichelt fehlt')
assert.equal(urteilKarte({ ...gut, laut: false }, 'gekennzeichnet').length, 1, 'Zeile fehlt')
assert.equal(urteilKarte(gut, 'belegt').length, 1, 'belegte Karte mit Kennzeichnung')
assert.equal(urteilKarte({ ...gut, laut: false, gestrichelt: 0 }, 'gekennzeichnet').length, 1)
assert.deepEqual(urteilSeite(360, 360), [])
assert.equal(urteilSeite(361, 360).length, 1)
console.log('saison-chip-urteil: alle Zusicherungen ok')
{
  const { mitLautFixture } = await import('./saison-chip-urteil.mjs')
  const [ungerade, gerade, ohneTon] = mitLautFixture([
    { id: 1, streams: [{ platform: 'netflix', dub: true }, { platform: 'x', dub: false }] },
    { id: 2, streams: [{ platform: 'joyn', dub: true, dubAbgeleitet: 'kanal-erbt' }] },
    { id: 3 },
  ])
  assert.equal(ungerade.streams[0].dubAbgeleitet, 'joyn-pauschal', 'ungerade: gekennzeichnet')
  assert.equal(ungerade.streams[1].dubAbgeleitet, undefined, 'Weg ohne Tonspur bleibt')
  assert.equal(gerade.streams[0].dubAbgeleitet, undefined, 'gerade: belegt, alte Kennzeichnung entfällt')
  assert.deepEqual(ohneTon.streams, [])
  console.log('mitLautFixture: ok')
}
