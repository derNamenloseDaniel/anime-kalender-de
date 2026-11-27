/**
 * Teilen-Knopf für Titel ohne Synchro (Daniel 27.11.2026) an den drei Stellen, die `check-teilen-knopf.ts` nicht rendert:
 * Datenbank-Karte, Kalender-Poster und die „Kopiert“-Beschriftung im Panel (`copiedSlug` gegen `teilenZiel`). Läuft auf dem
 * Mini-DOM mit der echten `useShare` und gestellter Zwischenablage. Aufruf: `npm run check:logic`.
 */
import { act, createElement as h } from 'react'
import { createRoot } from 'react-dom/client'
import type { ReleaseEvent, Title } from '../shared/types.ts'
import { teilenZiel } from '../shared/teilen.ts'
import { attrappeUhr, ignoriereCss, installiereMiniDom, klicke, type MiniKnoten } from '../tools/mini-dom.ts'
ignoriereCss()
const { DbKarte } = await import('../web/src/components/db-karte.tsx')
const { PosterKarte } = await import('../web/src/components/kalender/PosterKarte.tsx')
const { PanelAktionen } = await import('../web/src/components/detail/aktionen.tsx')
const { useLang } = await import('../web/src/lib/i18n.tsx')

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const uhr = attrappeUhr()
const dom = installiereMiniDom({ ...uhr, matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }) }, () => ({ src: '', srcset: '', sizes: '', decode: () => Promise.resolve() }))
const kopiert: string[] = []
Object.assign((globalThis as { window: object }).window, { location: { origin: 'https://example.test' } })
Object.assign(globalThis.navigator, { clipboard: { writeText: (w: string) => (kopiert.push(w), Promise.resolve()) } })
const wurzel = createRoot(dom.wurzel as unknown as Element)
const { t } = useLang()

const ohneSynchro = { id: 8117, slug: '8117', ohneSynchro: true, titleDe: 'Kishibe Rohan', format: 'TV', streams: [] } as unknown as Title
const mitSeite = { id: 15957, slug: '15957', titleDe: 'Mit Seite', format: 'TV', streams: [] } as unknown as Title
const teilenKnoepfe = () => dom.wurzel.finde((x: MiniKnoten) => x.tagName === 'BUTTON' && x.getAttribute('aria-label') === t('detail.share'))

console.log('\nDatenbank-Karte')
{
  const karte = (main: Title, copiedSlug?: string) =>
    h(DbKarte, { main, members: [main], data: { releasesByTitle: new Map() } as never, today: '2026-11-27', grouped: true, favorite: false, favorites: new Set<number>(), hidden: new Set<number>(), isHidden: false, onToggleFavorite() {}, onToggleHidden() {}, onOpenTitle() {}, share: (z: string) => (kopiert.push(z), Promise.resolve()), copiedSlug } as never)
  await act(async () => wurzel.render(karte(ohneSynchro)))
  pruefe('ohne Synchro: Teilen-Knopf steht', teilenKnoepfe().length === 1, dom.wurzel.textContent)
  kopiert.length = 0
  await act(async () => klicke(dom.wurzel, teilenKnoepfe()[0]!))
  pruefe('ohne Synchro: der Knopf teilt die Hash-Adresse des Titels', kopiert[0] === '#/woche?t=8117', kopiert)
  await act(async () => wurzel.render(karte(ohneSynchro, teilenZiel(ohneSynchro))))
  pruefe('ohne Synchro: zuletzt geteilt zeigt ✓', teilenKnoepfe()[0]?.textContent === '✓', teilenKnoepfe()[0]?.textContent)
  await act(async () => wurzel.render(karte(ohneSynchro, 't/8117/')))
  pruefe('ohne Synchro: fremdes Ziel zeigt kein ✓', teilenKnoepfe()[0]?.textContent !== '✓')
  await act(async () => wurzel.render(karte(mitSeite)))
  pruefe('mit Seite: Teilen-Knopf steht', teilenKnoepfe().length === 1)
}

console.log('\nKalender-Poster')
{
  const event = (titleId: number) => ({ id: 'e', releaseSlug: 'x', titleId, name: 'Kishibe Rohan', date: '2026-11-27', time: '17:00', releaseType: 'movie', platform: 'netflix' }) as ReleaseEvent
  const poster = (title: Title) => h(PosterKarte, { event: event(title.id), title, favorite: false, hidden: false, onToggleFavorite() {}, onToggleHidden() {}, onOpen() {} })
  await act(async () => wurzel.render(poster(ohneSynchro)))
  pruefe('ohne Synchro: Teilen-Knopf steht', teilenKnoepfe().length === 1, dom.wurzel.textContent)
  kopiert.length = 0
  await act(async () => klicke(dom.wurzel, teilenKnoepfe()[0]!))
  pruefe('ohne Synchro: kopiert die volle Hash-Adresse', kopiert.length === 1 && kopiert[0] === 'https://example.test/#/woche?t=8117', kopiert)
  pruefe('ohne Synchro: danach ✓', teilenKnoepfe()[0]?.textContent === '✓', teilenKnoepfe()[0]?.textContent)
  await act(async () => wurzel.render(poster(mitSeite)))
  pruefe('mit Seite: Teilen-Knopf steht', teilenKnoepfe().length === 1)
}

console.log('\nPanel: „Kopiert“-Beschriftung')
for (const [name, titel] of [['ohne Synchro', ohneSynchro], ['mit Seite', mitSeite]] as const) {
  await act(async () => wurzel.render(h(PanelAktionen, { title: titel, favorites: new Set<number>(), onToggleFavorite() {}, onToggleHidden() {}, t, trailer: null })))
  const knopf = () => dom.wurzel.finde((x: MiniKnoten) => x.tagName === 'BUTTON' && [t('detail.share'), t('kopf.kopiert')].includes(x.getAttribute('aria-label') ?? ''))[0]
  pruefe(`${name}: vor dem Klick „Teilen“`, knopf()?.getAttribute('aria-label') === t('detail.share'), knopf()?.getAttribute('aria-label'))
  await act(async () => klicke(dom.wurzel, knopf()!))
  pruefe(`${name}: nach dem Klick „Kopiert“`, knopf()?.getAttribute('aria-label') === t('kopf.kopiert'), knopf()?.getAttribute('aria-label'))
}
await act(async () => wurzel.unmount())
dom.entferne()

if (verletzt) {
  console.error(`\n${verletzt} Zusicherung(en) verletzt.`)
  process.exit(1)
}
console.log('\nTeilen-Knöpfe an Karten und Panel: alles in Ordnung.')
process.exit(0)
