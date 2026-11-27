/**
 * Verdrahtung im echten Panel (Prüfer-Auflage PR 5208, 27.11.2026): `AntwortBereich` reicht die Nachleger-Zeile an den roten Kasten.
 * Gerendert wird das echte `DetailPanel`; Netflix hat Folge 1–8 längst gebracht, Crunchyroll legt ab Folge 4 nach (mit Uhrzeit).
 * Fehlt der Prop `nachleger` im Kasten, fehlt die Zeile. Aufruf: npx tsx pipeline/check-nachleger-panel.ts (läuft in `check:logic`).
 */
import { act, createElement as h } from 'react'
import { createRoot } from 'react-dom/client'
import type { Release, Title } from '../shared/types.ts'
import { attrappeUhr, ignoriereCss, installiereMiniDom } from '../tools/mini-dom.ts'

const speicher = new Map<string, string>()
const ort = { hash: '', pathname: '/', search: '', href: 'http://x/', origin: 'http://x' }
class Beobachter {
  observe() {}
  unobserve() {}
  disconnect() {}
}
const lager = { getItem: (k: string) => speicher.get(k) ?? null, setItem: (k: string, w: string) => void speicher.set(k, w), removeItem: (k: string) => void speicher.delete(k) }
Object.assign(globalThis, { IntersectionObserver: Beobachter, ResizeObserver: Beobachter, history: { replaceState() {}, pushState() {}, state: null }, location: ort, localStorage: lager, sessionStorage: lager })
Object.assign(globalThis, { fetch: async () => ({ ok: false, status: 404, json: async () => ({}) }) })
ignoriereCss()
const { DetailPanel } = await import('../web/src/components/DetailPanel.tsx')

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const ID = 900601
const titel = {
  id: ID,
  slug: 'probe-nachleger',
  format: 'TV',
  jpYear: 2023,
  titleDe: 'Probe',
  genres: [],
  keywords: [],
  dubConfidence: 'high',
  streams: [
    { platform: 'netflix', url: 'https://netflix.com/probe', kind: 'stream', zugang: 'abo', dub: true },
    { platform: 'crunchyroll', url: 'https://crunchyroll.com/probe', kind: 'stream', zugang: 'abo', dub: true },
  ],
} as unknown as Title
const plan = (platform: string, schedule: object): Release =>
  ({ slug: `probe-${platform}`, titleId: ID, name: 'Probe', platform, platformUrl: `https://${platform}.com/probe`, releaseType: 'weekly', sources: ['https://example.org/a'], schedule }) as unknown as Release
const releases = [
  plan('netflix', { firstEpisodeDate: '2020-01-01', firstEpisodeNumber: 1, episodeCount: 8 }),
  plan('crunchyroll', { firstEpisodeDate: '2999-01-01', firstEpisodeNumber: 4, episodeCount: 3, time: '17:00' }),
]

const dom = installiereMiniDom(
  { ...attrappeUhr(), matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), location: ort, scrollTo() {}, innerWidth: 400, getComputedStyle: () => ({}) } as never,
  () => ({}),
)
Object.assign(document, { querySelector: () => null, querySelectorAll: () => [], title: 'Start' })
const wurzel = createRoot(dom.wurzel as unknown as Element)
const data = { titles: [titel], titleById: new Map([[ID, titel]]), releases, releaseBySlug: new Map(releases.map((r) => [r.slug, r])), events: [], eventsByDate: new Map(), releasesByTitle: new Map([[ID, releases]]), meta: {} }
const e = { data, titleId: ID, favorites: new Set(), hidden: new Set(), onToggleFavorite() {}, onToggleHidden() {}, onClose() {}, onFilterBy() {}, onOpenTitle() {} }
await act(async () => wurzel.render(h(DetailPanel as never, e as never)))
const text = (dom.wurzel.textContent ?? '').replace(/\s+/g, ' ')
pruefe('Panel: Nachleger-Zeile mit Anbieter, Folge und Uhrzeit steht im Kasten', /Crunchyroll: Folge 4 am .* um 17:00 Uhr/.test(text), text.slice(0, 600))

await act(async () => wurzel.unmount())
dom.entferne()
if (verletzt) {
  console.error(`${verletzt} Verletzung(en).`)
  process.exit(1)
}
console.log('check-nachleger-panel: ok (echtes Panel reicht die Nachleger-Zeile an den roten Kasten)')
