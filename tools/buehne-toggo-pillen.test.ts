/**
 * Test der Absprünge des Mockups `toggo-pillen` (`web/buehne/mockups/toggo-pillen-liste.ts`) an den echten, eingefrorenen Fällen der Bühne:
 * Pokémon (Staffel 1–5) → fünf Seiten, Pokémon Reisen (Staffel 23–25) → drei; führen alle Staffeln auf dieselbe Adresse, bleibt es bei einer Pille.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { staffelZiele } from '../web/buehne/mockups/toggo-pillen-liste.ts'
import { mockupMit } from '../web/buehne/register.ts'

const datei = fileURLToPath(new URL('../web/buehne/faelle.json', import.meta.url))
const faelle = JSON.parse(readFileSync(datei, 'utf8')).faelle as Record<string, { folgen: Record<string, { tg?: [number, string][] }> }>
const folgen = faelle['pokemon-horizonte']!.folgen

const sammel = staffelZiele(folgen['483']!.tg)!
assert.deepEqual(sammel.map((z) => z.label), ['S1', 'S2', 'S3', 'S4', 'S5'])
assert.deepEqual(sammel.map((z) => z.url.split('/').pop()), ['pokemon-indigo-liga', 'pokemon-orange-liga', 'pokemon-die-johto-reisen', 'pokemon-die-johto-liga-champions', 'pokemon-master-quest'])
assert.deepEqual(staffelZiele(folgen['10852']!.tg)!.map((z) => z.label), ['S23', 'S24', 'S25'])

// Gegenfall: alle Staffeln führen auf dieselbe Adresse (wie bei Netflix: ein Titel, eine Adresse) → nicht aufteilen; ebenso eine Staffel und keine Angabe.
const eine = 'https://www.toggo.de/pokemon/serien/pokemon-horizonte-die-serie-vse292'
assert.equal(staffelZiele([[1, eine], [2, eine], [3, eine], [4, eine]]), undefined)
assert.equal(staffelZiele([[1, eine]]), undefined)
assert.equal(staffelZiele(undefined), undefined)
assert.equal(staffelZiele(folgen['14838']!.tg), undefined)

// Teilen sich Staffeln eine Adresse, steht eine Beschriftung für beide; Reihenfolge nach Staffelnummer auch bei umgekehrter Eingabe.
const gemischt = staffelZiele([[16, 'https://x.invalid/b'], [15, 'https://x.invalid/a'], [16, 'https://x.invalid/a']])!
assert.deepEqual(gemischt.map((z) => [z.label, z.url]), [['S15–16', 'https://x.invalid/a'], ['S16', 'https://x.invalid/b']])

// Das Mockup ist angemeldet, zwei Varianten, beide Fälle gibt es.
await import('../web/buehne/mockups/toggo-pillen.tsx')
const m = mockupMit('toggo-pillen')!
assert.deepEqual(Object.keys(m.varianten), ['A', 'B'])
for (const f of m.faelle) assert.ok(f === 'pokemon-sammeltitel' || f === 'pokemon-reisen')
console.log('buehne-toggo-pillen: ok')
