/**
 * Die gesetzten Filter der Datenbank als Chips (`web/src/components/filter/AktiveChips.tsx`, Filterkonzept S5, 23.11.2026): der Name nennt den Zustand
 * („Netflix, entfernen" bzw. „… ausgeschlossen, entfernen"), ein Tipp nimmt genau diesen einen Filter zurück, die Tippfläche ist 44 px hoch
 * (`TIPPFLAECHE_HOCH`; gemessen im Browser: `tools/ansicht-filterfenster-s5.mjs`). Mini-DOM wie `check-suchhinweis-lauf.ts`. Aufruf: `npm run check:logic`.
 */
import { act, createElement as h } from 'react'
import { createRoot } from 'react-dom/client'
import { attrappeUhr, ignoriereCss, installiereMiniDom, klicke, type MiniKnoten } from '../tools/mini-dom.ts'
import { EMPTY_FILTERS, emptyLists, type FilterState } from '../web/src/lib/filters.ts'
ignoriereCss()
await import('../web/src/lib/i18n-spaet.ts')
const { AktiveChips } = await import('../web/src/components/filter/AktiveChips.tsx')

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const uhr = attrappeUhr()
const dom = installiereMiniDom({ ...uhr, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) }, () => ({}))

const filter: FilterState = { ...EMPTY_FILTERS, platforms: ['netflix'], excluded: { ...emptyLists(), releaseTypes: ['disc'] } }
const geaendert: FilterState[] = []
const wurzel = createRoot(dom.wurzel as unknown as Element)
await act(async () => wurzel.render(h(AktiveChips, { filters: filter, onChange: (f: FilterState) => void geaendert.push(f) })))

const knoepfe = dom.wurzel.finde((k: MiniKnoten) => k.tagName === 'BUTTON')
const namen = knoepfe.map((k: MiniKnoten) => k.getAttribute('aria-label') ?? k.textContent)
console.log('\nAktive Chips:')
pruefe('Name eines Einschlusses: „Netflix entfernen"', namen.includes('Netflix entfernen'), namen)
pruefe('Name eines Ausschlusses nennt den Zustand: „… ausgeschlossen, entfernen"', namen.some((n) => /ausgeschlossen, entfernen$/.test(n ?? '') && /Disc|DVD/.test(n ?? '')), namen)
pruefe('Liste mit Rolle `list`', dom.wurzel.finde((k: MiniKnoten) => k.tagName === 'UL' && k.getAttribute('role') === 'list').length === 1)
pruefe('Tippfläche 44 px hoch (TIPPFLAECHE_HOCH) an jedem Chip', knoepfe.every((k: MiniKnoten) => /after:h-11/.test(k.getAttribute('class') ?? '')), knoepfe.map((k: MiniKnoten) => k.getAttribute('class')))

const netflix = knoepfe.find((k: MiniKnoten) => k.getAttribute('aria-label') === 'Netflix entfernen')!
klicke(dom.wurzel, netflix)
pruefe('Netflix-Chip entfernt nur die Plattform, der Disc-Ausschluss bleibt', geaendert.length === 1 && geaendert[0]!.platforms.length === 0 && geaendert[0]!.excluded.releaseTypes[0] === 'disc', geaendert)
const aus = knoepfe.find((k: MiniKnoten) => /ausgeschlossen, entfernen$/.test(k.getAttribute('aria-label') ?? ''))!
klicke(dom.wurzel, aus)
pruefe('Ausschluss-Chip entfernt nur den Ausschluss, Netflix bleibt', geaendert.length === 2 && geaendert[1]!.excluded.releaseTypes.length === 0 && geaendert[1]!.platforms[0] === 'netflix', geaendert[1])

await act(async () => wurzel.unmount())
if (verletzt) {
  console.error(`\n${verletzt} Zusicherung(en) verletzt.`)
  process.exit(1)
}
console.log('\nAktive Chips: alle Zusicherungen erfüllt.')
