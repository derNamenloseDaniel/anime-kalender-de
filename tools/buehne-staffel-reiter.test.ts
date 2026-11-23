/**
 * Test der Reiterliste des Mockups `staffel-abschnitt` (F157, `web/buehne/mockups/staffel-reiter-liste.ts`) an den echten, eingefrorenen
 * Fällen der Bühne: Pokémon Horizonte (4 deutsche Staffel-Titel), Pokémon-Hauptserie (12 Einträge für die Staffeln 1 bis 25),
 * ein Film der Reihe (keine Reiter).
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { FranchiseMember, Title } from '../shared/types.ts'
import { reiterVon } from '../web/buehne/mockups/staffel-reiter-liste.ts'

const datei = fileURLToPath(new URL('../web/buehne/faelle.json', import.meta.url))
const faelle = JSON.parse(readFileSync(datei, 'utf8')).faelle as Record<string, Record<string, unknown>>
const fall = faelle['pokemon-horizonte']!
const titel = fall['titles.json'] as Title[]
const teile = (fall['franchises.json'] as Record<string, FranchiseMember[]>)['483']!
const offen = (id: number) => titel.find((t) => t.id === id)!
const reiter = (id: number) => reiterVon(offen(id), teile, 'Pokémon', titel)

// Horizonte: vier Staffeln in der Reihenfolge der Nummern, gleich von jeder Staffel aus.
for (const id of [26469, 26470, 26471, 14839]) {
  assert.deepEqual(reiter(id).map((r) => [r.id, r.label]), [[26469, '1'], [26470, '2'], [26471, '3'], [14839, '4']], `Horizonte von ${id}`)
}

// Hauptserie: 12 Einträge, Beschriftung ohne „Staffel“, nach Staffelnummer; „16“ gibt es zweimal (zwei Einträge der Daten).
assert.deepEqual(
  reiter(483).map((r) => r.label),
  ['1–5', '6–9', '10–13', '14–15', '15–16', '16', '16', '17–18', '19', '20–22', '23–25', '25'],
)
assert.deepEqual(reiter(10852).map((r) => r.id).slice(0, 3), [483, 1349, 1350])
assert.equal(reiter(10852).length, 12)

// Kein Reiter: Film der Reihe, Special, und ein Titel, der in der Liste fehlt.
assert.equal(reiter(5726).length, 0, 'Film')
assert.equal(reiter(1315).length, 0, 'Special')
assert.equal(reiterVon(offen(10852), teile.slice(0, 0), 'Pokémon', titel).length, 0, 'ohne Reihe')
// Eine einzelne Horizonte-Staffel ohne Geschwister zeigt keine Reiter.
assert.equal(reiterVon(offen(14839), teile, 'Pokémon', [offen(14839)]).length, 0, 'ein Reiter allein')

console.log('buehne-staffel-reiter: ok (Horizonte 4, Pokémon 12, Film/Special/leer/allein 0)')
