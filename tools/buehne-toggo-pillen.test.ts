/**
 * Test der Staffelknöpfe an TOGGO-Pillen (`web/src/lib/staffel-ziele.ts`, `web/src/components/detail/staffel-knoepfe.tsx`) an den echten, eingefrorenen Fällen der Bühne:
 * Pokémon (Staffel 1–5) → fünf Knöpfe, Pokémon Reisen (Staffel 23–25) → drei; führen alle Staffeln auf dieselbe Adresse, bleibt es bei einer Pille.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { staffelSpanne, staffelZiele } from '../web/src/lib/staffel-ziele.ts'
import { mitStaffelKnoepfen } from '../web/src/components/detail/staffel-knoepfe.tsx'
import { Pille } from '../web/src/components/detail/pille.tsx'
import { mockupMit } from '../web/buehne/register.ts'

const datei = fileURLToPath(new URL('../web/buehne/faelle.json', import.meta.url))
const faelle = JSON.parse(readFileSync(datei, 'utf8')).faelle as Record<string, { folgen: Record<string, { tg?: [number, string][] }> }>
const folgen = faelle['pokemon-horizonte']!.folgen

const sammel = staffelZiele(folgen['483']!.tg)!
assert.deepEqual(sammel.map((z) => z.nummer), ['1', '2', '3', '4', '5'])
assert.deepEqual(sammel.map((z) => z.url.split('/').pop()), ['pokemon-indigo-liga', 'pokemon-orange-liga', 'pokemon-die-johto-reisen', 'pokemon-die-johto-liga-champions', 'pokemon-master-quest'])
assert.deepEqual(staffelSpanne(sammel), { von: 1, bis: 5 })
const reisen = staffelZiele(folgen['10852']!.tg)!
assert.deepEqual(reisen.map((z) => z.nummer), ['23', '24', '25'])
assert.deepEqual(staffelSpanne(reisen), { von: 23, bis: 25 })

// Gegenfall: alle Staffeln führen auf dieselbe Adresse (wie bei Netflix: ein Titel, eine Adresse) → nicht aufteilen; ebenso eine Staffel und keine Angabe.
const eine = 'https://www.toggo.de/pokemon/serien/pokemon-horizonte-die-serie-vse292'
assert.equal(staffelZiele([[1, eine], [2, eine], [3, eine], [4, eine]]), undefined)
assert.equal(staffelZiele([[1, eine]]), undefined)
assert.equal(staffelZiele(undefined), undefined)
assert.equal(staffelZiele(folgen['14838']!.tg), undefined)

// Teilen sich Staffeln eine Adresse, steht eine Beschriftung für beide; Reihenfolge nach Staffelnummer auch bei umgekehrter Eingabe.
const gemischt = staffelZiele([[16, 'https://x.invalid/b'], [15, 'https://x.invalid/a'], [16, 'https://x.invalid/a']])!
assert.deepEqual(gemischt.map((z) => [z.nummer, z.url]), [['15–16', 'https://x.invalid/a'], ['16', 'https://x.invalid/b']])
assert.deepEqual(staffelSpanne(gemischt), { von: 15, bis: 16 })

// Die Pille: nur die TOGGO-Pille wird zur Knopffläche (gleicher key), alles andere bleibt dieselbe Instanz.
const t = ((k: string, v?: Record<string, string | number>) => (k === 'detail.staffelBereich' ? `Staffel ${v!.von}–${v!.bis}` : `Staffel ${v!.n}`)) as never
const toggo = createElement(Pille, { key: 'sw-TOGGO-https://x', name: 'TOGGO', farbe: '#ff0066', url: 'https://www.toggo.de/pokemon' })
const netflix = createElement(Pille, { key: 'sw-Netflix-https://n', name: 'Netflix', url: 'https://www.netflix.com/x' })
assert.equal(mitStaffelKnoepfen([toggo, netflix], undefined, t)[0], toggo)
const neu = mitStaffelKnoepfen([toggo, netflix], sammel, t)
assert.equal(neu[1], netflix)
assert.equal((neu[0] as { key: string }).key, 'sw-TOGGO-https://x')
const html = renderToStaticMarkup(createElement('div', null, neu))
assert.match(html, /TOGGO · Staffel 1–5/)
assert.equal((html.match(/min-h-11/g) ?? []).length, 5)
assert.match(html, /aria-label="TOGGO, Staffel 3"/)
assert.match(html, /href="https:\/\/www\.toggo\.de\/pokemon\/serien\/pokemon-die-johto-reisen"[^>]*target="_blank"/)
assert.doesNotMatch(html, /href="https:\/\/www\.toggo\.de\/pokemon"/)
assert.match(renderToStaticMarkup(createElement('div', null, mitStaffelKnoepfen([toggo], gemischt, t))), /aria-label="TOGGO, Staffel 15–16"/)

// Das Mockup ist angemeldet, eine Variante (A, entschieden F158), beide Fälle gibt es.
await import('../web/buehne/mockups/toggo-pillen.tsx')
const m = mockupMit('toggo-pillen')!
assert.deepEqual(Object.keys(m.varianten), ['A'])
for (const f of m.faelle) assert.ok(f === 'pokemon-sammeltitel' || f === 'pokemon-reisen')
console.log('buehne-toggo-pillen: ok')
