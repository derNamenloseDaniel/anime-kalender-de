// Zusicherung: Der Aufklapper der überholten Meldungen öffnet und schließt wirklich (echter Klick im Mini-DOM); der Zähler im Kopf bleibt dabei bei den geltenden.
import { act, createElement as h } from 'react'
import { createRoot } from 'react-dom/client'
import assert from 'node:assert/strict'
import type { NewsMeldung } from '../shared/types.ts'
import type { Dataset } from '../web/src/lib/data.ts'
import { ignoriereCss, installiereMiniDom, klicke, type MiniKnoten } from './mini-dom.ts'
ignoriereCss()
await import('../web/src/lib/i18n-spaet.ts')
const { NeuigkeitenKarte } = await import('../web/src/components/detail/neuigkeiten.tsx')

const g = globalThis as Record<string, unknown>
g.ResizeObserver = g.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} }
const dom = installiereMiniDom({ matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) } as never, () => ({}))
const wurzelKnoten = dom.wurzel as unknown as MiniKnoten

const daten = { releaseBySlug: new Map(), releases: [], titleById: new Map() } as unknown as Dataset
const zeile = (am: string, m: Partial<NewsMeldung>) => ({ am, teilId: 1, m: { art: 'angekuendigt', datum: '2026-12-01', ...m } as NewsMeldung })
const zeilen = [
  zeile('2026-11-20', { datum: '2026-11-20' }),
  zeile('2026-10-01', { ersetzt: { datum: '2026-10-03', quelle: 'https://x.test/a' } } as Partial<NewsMeldung>),
  zeile('2026-10-05', { art: 'verspaetet', zurueckgezogen: {} } as Partial<NewsMeldung>),
]

const alle = (k: MiniKnoten, f: (k: MiniKnoten) => boolean, aus: MiniKnoten[] = []): MiniKnoten[] => (f(k) && aus.push(k), k.childNodes.forEach((c) => alle(c, f, aus)), aus)
const knopf = (teil: string) => alle(wurzelKnoten, (k) => k.tagName === 'BUTTON' && k.textContent.includes(teil))[0]
const zaehler = () => alle(wurzelKnoten, (k) => k.tagName === 'SPAN' && (k.attribute.get('class') ?? '').includes('tabular-nums') && /^[0-9]+$/.test(k.textContent))[0]?.textContent
const eintraege = () => alle(wurzelKnoten, (k) => k.tagName === 'LI').length

const wurzel = createRoot(dom.wurzel as unknown as Element)
await act(async () => wurzel.render(h(NeuigkeitenKarte, { data: daten, zeilen })))
assert.equal(eintraege(), 1, 'zu: nur die geltende Meldung')
assert.equal(zaehler(), '1', 'zu: Zähler zählt nur Geltendes')
assert.equal(knopf('überholte')?.attribute.get('aria-expanded'), 'false', 'zu: aria-expanded false')

await act(async () => klicke(wurzelKnoten, knopf('überholte')!))
assert.equal(eintraege(), 3, 'Klick: die zwei überholten erscheinen')
assert.equal(knopf('weniger')?.attribute.get('aria-expanded'), 'true', 'auf: Knopf trägt „weniger“, aria-expanded true')
assert.equal(zaehler(), '1', 'auf: Zähler bleibt bei den geltenden')

await act(async () => klicke(wurzelKnoten, knopf('weniger')!))
assert.equal(eintraege(), 1, 'zweiter Klick: wieder zu')
assert.ok(knopf('2 überholte Meldungen'), 'zu: Aufklapper nennt wieder die Zahl')

console.log('neuigkeiten-ueberholt-klick: ok')
process.exit(0)
