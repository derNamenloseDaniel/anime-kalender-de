/** Test für tools/ak-von.mjs: AniList-Kennung → `ak` aus data/kennungen.json (echte Datei, kein Netz). */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { akVon } from './ak-von.mjs'

const roh = JSON.parse(readFileSync(new URL('../data/kennungen.json', import.meta.url), 'utf8'))
// Zeile: [alt, anilist, ak?, ...]; ohne dritten Eintrag gilt der erste (siehe ak-von.mjs).
const [erste] = roh.titel.filter((z) => z[3] !== undefined && z[3] !== z[1])
assert.ok(erste, 'Fixture: ein Eintrag mit eigener ak-Kennung')
assert.equal(akVon(erste[1]), erste[3], 'AniList-Kennung liefert die ak-Kennung (dritte Spalte)')
assert.equal(akVon(String(erste[1])), erste[3], 'Zeichenkette wird wie Zahl behandelt')

const ohneAk = roh.titel.find((z) => z[3] === undefined)
if (ohneAk) assert.equal(akVon(ohneAk[1]), ohneAk[0], 'ohne ak-Spalte gilt die erste')

assert.throws(() => akVon(999999999), /Keine Kennung für AniList 999999999/, 'unbekannte positive Kennung wirft')
assert.equal(akVon(0), 0, 'Null und Negatives gehen unverändert durch')
console.log('ak-von.test: ok')
