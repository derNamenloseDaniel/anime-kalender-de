/** Test für tools/daten-detektiv/bericht.ts: Sortierung nach Hebel, Markdown, JSON und Delta zweier Läufe. */
import assert from 'node:assert/strict'
import { delta, json, markdown, sortiertNachHebel } from './daten-detektiv/bericht.ts'

const tr = (k, ort) => ({ schluessel: k, text: `T-${k}`, ort })
const mk = (id, treffer) => ({ id, name: `N-${id}`, folge: `F-${id}`, geprueft: 10, treffer })
const regeln = [mk('DD-22', [tr('a'), tr('b')]), mk('DD-01', [tr('c', '/r/c/')]), mk('DD-24', [])]

assert.deepEqual(sortiertNachHebel(regeln).map((r) => r.id), ['DD-01', 'DD-24', 'DD-22'], 'Hebel absteigend (3, 3, 0,6)')
assert.deepEqual(regeln.map((r) => r.id), ['DD-22', 'DD-01', 'DD-24'], 'Eingabe bleibt unverändert')

const md = markdown(regeln, 'Stand-X', '2026-11-26', 1)
assert.match(md, /^# Daten-Detektiv — Funde vom 2026-11-26/)
assert.match(md, /Datensatz-Stand: Stand-X/)
assert.match(md, /\| DD-01 N-DD-01 \| 3\.0 \| hart \| \*\*1\*\* \| 10 \| F-DD-01 \|/)
assert.match(md, /- T-c \[↗\]\(https:\/\/anime-kalender\.de\/r\/c\/\)/, 'Ort mit „/“ bekommt die Seitenadresse')
assert.match(md, /- … und 1 weitere \(vollständig im JSON\)/, 'über proRegel hinaus wird gekürzt')
assert.ok(!md.includes('## DD-24'), 'Regel ohne Treffer bekommt keinen Abschnitt')

const j = JSON.parse(json(regeln, 'S', 'H'))
assert.equal(j.regeln[0].id, 'DD-01')
assert.equal(j.regeln[0].hebel, 3)

assert.deepEqual(delta(undefined, regeln), [], 'ohne Vorlauf kein Delta')
const alt = { regeln: [mk('DD-22', [tr('a'), tr('weg')])] }
assert.deepEqual(delta(alt, [mk('DD-22', [tr('a'), tr('neu1')])]), ['DD-22: +1 −1 neu: neu1'])
assert.deepEqual(delta(alt, [mk('DD-22', [tr('a'), tr('weg')])]), [], 'unverändert: keine Zeile')
console.log('daten-detektiv-bericht.test: ok')
