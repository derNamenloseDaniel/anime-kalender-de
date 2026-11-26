/**
 * Verdrahtung im echten Panel (Prüfer-Auflage PR 4505, 21.11.2026): `useStaffelGrenzen` lädt Verzeichnis und Folgenliste, `AntwortBereich`
 * reicht die Grenzen an die Anbieterzeilen. Gerendert wird das echte `DetailPanel` mit Fetch-Attrappe: mit Grenzen „Staffel 1–3 · Staffel 4 Fg. 1“,
 * ohne `s` oder ohne Verzeichniseintrag die durchgehende Zählung. Aufruf: npx tsx pipeline/check-staffel-anzeige-panel.ts (läuft in `check:logic`).
 */
import { act, createElement as h } from 'react'
import { createRoot } from 'react-dom/client'
import type { Release, Title } from '../shared/types.ts'
import { attrappeUhr, ignoriereCss, installiereMiniDom } from '../tools/mini-dom.ts'

/* Browser-Umgebung des Panels: Speicher, Beobachter, Adresse; alles Attrappen ohne Wirkung. */
const speicher = new Map<string, string>()
const ort = { hash: '', pathname: '/', search: '', href: 'http://x/', origin: 'http://x' }
class Beobachter {
  observe() {}
  unobserve() {}
  disconnect() {}
}
const lager = { getItem: (k: string) => speicher.get(k) ?? null, setItem: (k: string, w: string) => void speicher.set(k, w), removeItem: (k: string) => void speicher.delete(k) }
Object.assign(globalThis, { IntersectionObserver: Beobachter, ResizeObserver: Beobachter, history: { replaceState() {}, pushState() {}, state: null }, location: ort, localStorage: lager, sessionStorage: lager })

/* 900431 mit Grenzen, 900432 Liste ohne `s`, 900433 ohne Verzeichniseintrag (Liste läge da, wird aber nie gefragt). */
const S = [[1, 1, 45], [2, 46, 89], [3, 90, 136], [4, 137]]
const LISTEN: Record<string, unknown> = { 900431: { f: [], de: [[1, 137]], s: S }, 900432: { f: [], de: [[1, 137]] }, 900433: { f: [], de: [[1, 137]], s: S } }
const abgerufen: string[] = []
Object.assign(globalThis, {
  fetch: async (adresse: unknown) => {
    const url = String(adresse)
    abgerufen.push(url)
    const treffer = /folgen\/(\d+)\.json/.exec(url)
    const daten = url.includes('folgen/index.json') ? [900431, 900432] : treffer ? LISTEN[treffer[1]!] : undefined
    return { ok: Boolean(daten), status: daten ? 200 : 404, json: async () => daten ?? {} }
  },
})
ignoriereCss()
const { DetailPanel } = await import('../web/src/components/DetailPanel.tsx')

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const titel = (id: number): Title =>
  ({
    id,
    slug: `probe-${id}`,
    format: 'TV',
    jpYear: 2023,
    titleDe: 'Probe',
    genres: [],
    keywords: [],
    dubConfidence: 'high',
    streams: [{ platform: 'rtlplus', url: 'https://plus.rtl.de/probe', kind: 'stream', zugang: 'abo', dub: true, dubRanges: [{ from: 1, to: 136, dub: true }] }],
  }) as unknown as Title
const s4 = (id: number): Release =>
  ({
    slug: `probe-s4-${id}`,
    titleId: id,
    name: 'Probe – Staffel 4',
    platform: 'rtlplus',
    platformUrl: 'https://plus.rtl.de/probe',
    releaseType: 'batch',
    sources: ['https://www.anime2you.de/news/1'],
    schedule: { firstEpisodeDate: '2026-11-20', firstEpisodeNumber: 137, episodeCount: 1 },
  }) as unknown as Release

const uhr = attrappeUhr()
const dom = installiereMiniDom(
  { ...uhr, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), location: ort, scrollTo() {}, innerWidth: 400, getComputedStyle: () => ({}) } as never,
  () => ({}),
)
Object.assign(document, { querySelector: () => null, querySelectorAll: () => [], title: 'Start' })
const wurzel = createRoot(dom.wurzel as unknown as Element)

async function panelText(id: number): Promise<string> {
  const t = titel(id)
  const r = s4(id)
  const data = { titles: [t], titleById: new Map([[id, t]]), releases: [r], releaseBySlug: new Map([[r.slug, r]]), events: [], eventsByDate: new Map(), nurUntertitelByTitle: new Map(), releasesByTitle: new Map([[id, [r]]]), meta: {} }
  const e = { data, titleId: id, favorites: new Set(), hidden: new Set(), onToggleFavorite() {}, onToggleHidden() {}, onClose() {}, onFilterBy() {}, onOpenTitle() {} }
  await act(async () => wurzel.render(h(DetailPanel as never, e as never)))
  /* Verzeichnis, dann Liste: zwei Abrufe nacheinander, erst danach steht die Zeile. */
  for (let i = 0; i < 3; i++) await act(async () => void (await new Promise((fertig) => setTimeout(fertig, 5))))
  return (dom.wurzel.textContent ?? '').replace(/\s+/g, ' ')
}

const mit = await panelText(900431)
pruefe('Panel mit Grenzen: RTL+ „Staffel 1–3 · Staffel 4 Fg. 1“', mit.includes('Staffel 1–3 · Staffel 4 Fg. 1'), mit.slice(0, 600))
pruefe('Panel mit Grenzen: kein „seit 20.11.2026“ an der RTL+-Zeile', !mit.includes('seit 20.11.2026'), mit.slice(0, 600))
const ohneS = await panelText(900432)
pruefe('Liste ohne `s`: durchgehend „Fg. 1–136“, keine Staffeln', ohneS.includes('Fg. 1–136') && !ohneS.includes('Staffel 1–3'), ohneS.slice(0, 600))
const ohneEintrag = await panelText(900433)
pruefe('Ohne Verzeichniseintrag: keine Staffeln, Liste nicht abgerufen', !ohneEintrag.includes('Staffel 1–3') && !abgerufen.some((u) => u.includes('folgen/900433.json')), abgerufen.filter((u) => u.includes('folgen/')))
pruefe('Liste mit Grenzen genau einmal abgerufen (Folgenkasten und Zeile teilen den Abruf)', abgerufen.filter((u) => u.includes('folgen/900431.json')).length === 1, abgerufen.filter((u) => u.includes('folgen/900431.json')))

await act(async () => wurzel.unmount())
dom.entferne()
if (verletzt) {
  console.error(`${verletzt} Verletzung(en).`)
  process.exit(1)
}
console.log('check-staffel-anzeige-panel: ok (echtes Panel: Grenzen geladen und an die Anbieterzeile gereicht, Gegenfälle ohne s und ohne Eintrag)')
