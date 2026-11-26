/**
 * Die Blase der Reiter (`reiter-blase.tsx`, Daniel 26.11.2026): statt eines `title` je Reiter steht eine Blase je Leiste, ihr Text
 * entsteht erst für den offenen Reiter. Gerendert wird die echte `ReiterZeile` mit Reitern aus `reiterVon` (Staffel 2 kommt am
 * 03.01.2027), gezeigt per Maus, Tastaturfokus und Fingertipp; fester Stichtag, Zeitgeber über die Attrappe-Uhr.
 * Aufruf: npx tsx pipeline/check-reiter-blase.ts (läuft in `check:logic`).
 */
import { act, createElement as h } from 'react'
import { createRoot } from 'react-dom/client'
import type { Release } from '../shared/types.ts'
import { attrappeUhr, feuere, installiereMiniDom, klicke, MiniKnoten } from '../tools/mini-dom.ts'
import { reiterVon } from '../web/src/components/detail/staffel-reiter-liste.ts'
import { ReiterZeile } from '../web/src/components/detail/staffel-reiter.tsx'
import { TIPP_DAUER } from '../web/src/components/detail/reiter-blase.tsx'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const HEUTE = '2026-11-26'
const abschnitt = (nr: number, von: number, bis: number, deutsch: number) => ({ nr, von, bis, offen: false, deutsch, folgen: [] })
const neu = { slug: 'reihe-s2', titleId: 900801, name: 'Reihe: Staffel 2', platform: 'crunchyroll', platformUrl: 'https://x.invalid', releaseType: 'weekly', sources: ['https://x.invalid'], schedule: { firstEpisodeDate: '2027-01-03', firstEpisodeNumber: 13, episodeCount: 12 } } as unknown as Release
const sn = { 1: 'Reihe: Der Anfang', 2: 'Reihe: Staffel 2 – Die Rückkehr', 3: 'Reihe: Das Ende' }
const reiter = reiterVon([abschnitt(1, 1, 12, 12), abschnitt(2, 13, 24, 0), abschnitt(3, 25, 36, 0)], [neu], HEUTE, sn)

/* Mini-DOM: Rechtecke je Reiter-Nummer (50 px Abstand), damit die Blase am gezeigten Reiter steht; `:focus-visible` nach `tastatur`. */
let tastatur = false
const uhr = attrappeUhr()
const dom = installiereMiniDom({ ...uhr, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), innerWidth: 1000, innerHeight: 800 } as never, () => ({}))
class Beobachter {
  observe() {}
  disconnect() {}
}
Object.assign(globalThis, { ResizeObserver: Beobachter, Element: MiniKnoten })
Object.assign(MiniKnoten.prototype, {
  getBoundingClientRect(this: MiniKnoten) {
    const nr = Number(/-reiter-(\d+)$/.exec(this.getAttribute('id') ?? '')?.[1] ?? 0)
    const breite = this.tagName === 'HTML' ? 1000 : 44
    return { left: nr * 50, top: 300, right: nr * 50 + breite, bottom: 344, width: breite, height: 44 }
  },
  matches: (wahl: string) => wahl === ':focus-visible' && tastatur,
})
const html = dom.wurzel.parentNode!
const wurzel = createRoot(dom.wurzel as unknown as Element)
const gewaehlt: string[] = []
const zeile = (kennung: string) => h(ReiterZeile, { reiter, aktiv: 0, kennung, beiWahl: (i: number) => void gewaehlt.push(`${kennung}${i}`) })
await act(async () => wurzel.render(h('div', null, zeile('a'), zeile('b'))))
const tabs = dom.wurzel.finde((k) => k.getAttribute('role') === 'tab')
const [a1, a2, a3, b1] = [tabs[0]!, tabs[1]!, tabs[2]!, tabs[3]!]
const blasen = () => html.finde((k) => k.getAttribute('role') === 'tooltip')
const text = () => blasen().map((k) => k.textContent).join('|')
const los = (art: string, ziel: MiniKnoten) => act(async () => feuere(dom.wurzel, art, ziel))
const beschrieben = () => tabs.map((k) => k.getAttribute('aria-describedby') === blasen()[0]?.getAttribute('id'))

pruefe('vorab: kein Reiter trägt einen title, keine Blase im DOM', tabs.length === 6 && tabs.every((k) => k.getAttribute('title') === null) && blasen().length === 0, tabs.map((k) => k.getAttribute('title')))

/* Maus: Zeigen öffnet mit vollem Namen aus `sn` und der Zeile zur Marke; nur der gezeigte Reiter verweist auf die Blase. */
await los('mouseover', a2)
pruefe('Maus auf Staffel 2: voller Name und Grund der Marke', text() === 'Reihe: Staffel 2 – Die Rückkehr\n○ = Folge 13 bei Crunchyroll am 03.01.2027', text())
pruefe('aria-describedby nur am offenen Reiter', beschrieben().join() === 'false,true,false,false,false,false', beschrieben())
const linksBei2 = blasen()[0]?.style.left
await los('mouseover', a3)
pruefe('Wechsel ohne Wegzeigen: eine Blase, Staffel 3 ohne Marke nur mit Namen', blasen().length === 1 && text() === 'Reihe: Das Ende', text())
pruefe('die Blase wandert zum neuen Reiter (neu gemessen)', linksBei2 !== undefined && blasen()[0]?.style.left !== linksBei2, [linksBei2, blasen()[0]?.style.left])
await los('mouseout', a3)
pruefe('Wegzeigen schließt, kein Verweis bleibt', blasen().length === 0 && beschrieben().every((x) => !x))
await act(async () => klicke(dom.wurzel, a1))
pruefe('Mausklick ohne Zeigen öffnet keine Blase, wählt aber', blasen().length === 0 && gewaehlt.join() === 'a0', [text(), gewaehlt])

/* Fokus: nur Tastaturfokus (`:focus-visible`) öffnet; Verlassen schließt; die Blase der anderen Leiste schließt die erste. */
await los('focusin', a1)
pruefe('Klickfokus öffnet nichts', blasen().length === 0)
tastatur = true
await los('focusin', a1)
pruefe('Tastaturfokus öffnet Staffel 1', text() === 'Reihe: Der Anfang', text())
await los('focusin', b1)
pruefe('Fokus in der zweiten Leiste: höchstens eine Blase im Fenster', blasen().length === 1 && text() === 'Reihe: Der Anfang' && tabs[3]!.getAttribute('aria-describedby') !== null && a1.getAttribute('aria-describedby') === null, [blasen().length, beschrieben()])
await los('focusout', b1)
pruefe('Fokus weg: zu', blasen().length === 0)
tastatur = false

/* Fingertipp: erst der Klick öffnet (iOS verbraucht sonst den ersten Tipp), nach TIPP_DAUER zu; ein zweiter Tipp verlängert. */
await los('touchstart', a2)
pruefe('Berühren allein öffnet noch nicht', blasen().length === 0)
await act(async () => klicke(dom.wurzel, a2))
pruefe('Tipp öffnet die Blase und wählt den Reiter', text().startsWith('Reihe: Staffel 2 – Die Rückkehr\n') && gewaehlt.at(-1) === 'a1', [text(), gewaehlt])
const schiebe = (ms: number) => uhr.schiebe(ms, async (f) => act(async () => f()))
await schiebe(TIPP_DAUER - 1000)
await los('touchstart', a2)
await act(async () => klicke(dom.wurzel, a2))
await schiebe(TIPP_DAUER - 1000)
pruefe('zweiter Tipp startet die Frist neu', blasen().length === 1)
await schiebe(1000)
pruefe(`nach ${TIPP_DAUER} ms zu`, blasen().length === 0)
await los('mouseover', a3)
pruefe('nach einem Tipp öffnet das nachgereichte Zeigen nichts', blasen().length === 0)

await act(async () => wurzel.unmount())
dom.entferne()
if (verletzt) {
  console.error(`\n${verletzt} Zusicherung(en) verletzt.`)
  process.exit(1)
}
console.log('check-reiter-blase: ok (Maus, Tastaturfokus, Fingertipp mit Frist, eine Blase, Text nur am offenen Reiter)')
