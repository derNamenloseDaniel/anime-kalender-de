/**
 * Quellenzeile unter der Handlung (28.11.2026, Daniel: „es soll immer nur maximal 1 quelle dort stehen“): JoJo Steel Ball Run zeigte
 * vier Quellen und die Lizenz. Jetzt genau eine: bei unserem Text (Satz, eigene Zusammenfassung) „anime-kalender.de“, Erklärung, Quellen
 * und Lizenz erst nach einem Tipp (geht am Handy, anders als ein Tooltip); bei fremdem Text der Anbieter. Aufruf: `npm run check:logic`.
 */
import { act, createElement as h } from 'react'
import { createRoot } from 'react-dom/client'
import type { Synopsis } from '../web/src/lib/data.ts'
import { ignoriereCss, installiereMiniDom, klicke, type MiniKnoten } from '../tools/mini-dom.ts'
ignoriereCss()
await import('../web/src/lib/i18n-spaet.ts')
const { HandlungAbschnitt } = await import('../web/src/components/detail/abschnitte.tsx')
const { plotVon } = await import('../web/src/components/detail/plot.ts')

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const g = globalThis as Record<string, unknown>
g.ResizeObserver = g.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} }
const dom = installiereMiniDom({ matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) } as never, () => ({}))

const LANG = 'Ein langer deutscher Text über die Handlung. '.repeat(10)
const EIGEN = {
  quellen: [
    { name: 'Wikipedia (EN)', url: 'https://en.wikipedia.org/wiki/Steel_Ball_Run' },
    { name: 'Wikipedia (DE)', url: 'https://de.wikipedia.org/wiki/JoJo%27s_Bizarre_Adventure' },
    { name: 'aniSearch', url: 'https://www.anisearch.de/anime/21986,x' },
  ],
  lizenz: 'CC BY-SA 4.0',
}
const ANISEARCH = { name: 'anisearch.de', url: 'https://www.anisearch.de/anime/1,x' }

const alle = (k: MiniKnoten, f: (k: MiniKnoten) => boolean, aus: MiniKnoten[] = []): MiniKnoten[] => (f(k) && aus.push(k), k.childNodes.forEach((c) => alle(c, f, aus)), aus)
const knopf = (text: string) => alle(dom.wurzel as unknown as MiniKnoten, (k) => k.tagName === 'BUTTON' && k.textContent.includes(text))[0]
const links = () => alle(dom.wurzel as unknown as MiniKnoten, (k) => k.tagName === 'A').map((k) => k.attribute.get('href'))
const text = () => (dom.wurzel as unknown as MiniKnoten).textContent
const vorkommen = (s: string, teil: string) => s.split(teil).length - 1

const wurzel = createRoot(dom.wurzel as unknown as Element)

/** Rendert die Karte echt in den Mini-DOM; `nachher` darf klicken, danach wird der Zustand gelesen. */
async function rendere(synopsis: Synopsis, offen: boolean, nachher: () => Promise<void> | void = () => {}): Promise<void> {
  const { plot } = plotVon({ synopsis, anilistId: 7, ersatz: undefined })
  const Karte = () => h(HandlungAbschnitt, { plot, t: (k: string) => k, plotOffen: offen, setPlotOffen: () => {} })
  await act(async () => wurzel.render(h(Karte)))
  await act(async () => { await nachher() })
}

await rendere({ de: LANG, eigen: EIGEN, satz: 'Ein Satz.' } as Synopsis, false)
pruefe('eigener Text: genau eine Quelle, „anime-kalender.de“', vorkommen(text(), 'detail.plotQuelle') === 1 && text().includes('anime-kalender.de'), text())
pruefe('eigener Text: keine Wikipedia-/aniSearch-Links, keine Lizenz auf den ersten Blick', links().length === 0 && !text().includes('CC BY-SA'), links())
await rendere({ de: LANG, eigen: EIGEN, satz: 'Ein Satz.' } as Synopsis, false, async () => klicke(dom.wurzel as unknown as MiniKnoten, knopf('anime-kalender.de')!))
pruefe('eigener Text, Tipp: Erklärung steht da', text().includes('detail.plotUnserHinweis'), text())
pruefe('eigener Text, Tipp: alle drei Quellen und die Lizenzseite verlinkt', JSON.stringify(links()) === JSON.stringify([...EIGEN.quellen.map((q) => q.url), 'https://creativecommons.org/licenses/by-sa/4.0/deed.de']), links())
pruefe('eigener Text, Tipp: Lizenzname steht da, die Quellenzeile bleibt eine', text().includes('CC BY-SA 4.0') && vorkommen(text(), 'detail.plotQuelle') === 1, text())
await rendere({ de: LANG, eigen: EIGEN } as Synopsis, true)
pruefe('eigener Volltext (aufgeklappt, ohne Satz): ebenfalls „anime-kalender.de“, keine Links', text().includes('anime-kalender.de') && links().length === 0, links())

await rendere({ de: LANG, deSource: ANISEARCH, satz: 'Ein Satz.' } as Synopsis, false)
pruefe('Satz über fremdem Volltext: „anime-kalender.de“, kein aniSearch-Link', text().includes('anime-kalender.de') && links().length === 0, text())
await rendere({ de: LANG, deSource: ANISEARCH, satz: 'Ein Satz.' } as Synopsis, false, async () => klicke(dom.wurzel as unknown as MiniKnoten, knopf('anime-kalender.de')!))
pruefe('Satz, Tipp: der Anbieter des Volltexts steht in der Erklärung', JSON.stringify(links()) === JSON.stringify([ANISEARCH.url]) && text().includes('detail.plotUnserHinweis'), links())
await rendere({ de: LANG, deSource: ANISEARCH, satz: 'Ein Satz.' } as Synopsis, true)
pruefe('Satz, Volltext aufgeklappt: genau eine Quelle, der Anbieter, nicht „anime-kalender.de“', JSON.stringify(links()) === JSON.stringify([ANISEARCH.url]) && !text().includes('anime-kalender.de') && vorkommen(text(), 'detail.plotQuelle') === 1, text())

await rendere({ de: LANG, deSource: ANISEARCH } as Synopsis, false)
pruefe('fremder Text ohne Satz: genau eine Quelle, aniSearch verlinkt, kein „anime-kalender.de“', JSON.stringify(links()) === JSON.stringify([ANISEARCH.url]) && !text().includes('anime-kalender.de') && !text().includes('ⓘ'), text())

console.log(`check-handlung-quelle-zeile: ${verletzt === 0 ? 'alle Fälle grün' : `${verletzt} verletzt`}`)
process.exit(verletzt === 0 ? 0 : 1)
