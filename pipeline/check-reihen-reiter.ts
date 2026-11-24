/**
 * Zusicherung (F157, Daniel 24.11.2026, freigegebenes Mockup-Bild am Commit 47f7bda363): Über dem Antwortkasten stehen die Staffeln der
 * REIHE als Karteikarten-Reiter; ein Reiter öffnet den Titel der Staffel auf dem Weg der Reihenliste. Geprüft an den echten,
 * eingefrorenen Fällen der Bühne (`web/buehne/faelle.json`): reine Liste und Lage je Reiter, dann das echte `DetailPanel` mit Klick und
 * Tastatur. Aufruf: npx tsx pipeline/check-reihen-reiter.ts (läuft in `check:logic`).
 */
import { readFileSync } from 'node:fs'
import { act, createElement as h } from 'react'
import { createRoot } from 'react-dom/client'
import type { Dataset } from '../web/src/lib/data.ts'
import { reihenTeileVon } from '../web/src/components/detail/reihen-daten.ts'
import { reihenNameVon } from '../web/src/components/detail/reihen-namen.ts'
import type { FranchiseMember, Release, Title } from '../shared/types.ts'
import { attrappeUhr, ignoriereCss, installiereMiniDom, klicke, type MiniKnoten } from '../tools/mini-dom.ts'
import { reihenLageVon, reihenReiterVon } from '../web/src/components/detail/reihen-reiter-liste.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const faelle = JSON.parse(readFileSync(new URL('../web/buehne/faelle.json', import.meta.url), 'utf8')).faelle as Record<string, Record<string, unknown>>
const fall = faelle['pokemon-horizonte']!
const titel = fall['titles.json'] as Title[]
const teile = (fall['franchises.json'] as Record<string, FranchiseMember[]>)['483']!
const offen = (id: number) => titel.find((t) => t.id === id)!
const reiter = (id: number) => reihenReiterVon(offen(id), teile, 'Pokémon', titel)

/* Liste: Horizonte vier Staffeln nach Nummer, von jeder Staffel aus gleich; Hauptserie 12 Einträge mit Bereichen. */
for (const id of [26469, 26470, 26471, 14839]) {
  pruefe(`Horizonte von ${id}: 1–4`, JSON.stringify(reiter(id).map((r) => [r.id, r.label])) === '[[26469,"1"],[26470,"2"],[26471,"3"],[14839,"4"]]', reiter(id))
}
const haupt = reiter(483).map((r) => r.label).join()
pruefe('Hauptserie: 12 Reiter ohne „Staffel“, nach Nummer', haupt === '1–5,6–9,10–13,14–15,15–16,16,16,17–18,19,20–22,23–25,25', haupt)
pruefe('Hauptserie: Ids in Staffelfolge', reiter(10852).map((r) => r.id).join() === '483,1349,1350,4745,5979,6415,6563,6802,7798,8283,10852,14838', reiter(10852).map((r) => r.id))
pruefe('Name am Reiter ist der Titel der Daten', reiter(14839)[3]!.name === 'Pokémon Horizonte: Staffel 4 – Wunder in Sicht' && reiter(483)[1]!.name === 'Pokémon Advanced Generation', [reiter(14839)[3]!.name, reiter(483)[1]!.name])
pruefe('zwei Staffeln sind schon Reiter, Folge nach Nummer', reihenReiterVon(offen(14839), teile, 'Pokémon', [offen(14839), offen(26470)]).map((r) => r.id).join() === '26470,14839')
pruefe('eine Staffel allein: keine Reiter', reihenReiterVon(offen(14839), teile, 'Pokémon', [offen(14839)]).length === 0)
pruefe('Film und Special: keine Reiter', reiter(5726).length === 0 && reiter(1315).length === 0)
pruefe('ohne Reihe: keine Reiter', reihenReiterVon(offen(10852), [], 'Pokémon', titel).length === 0)
const aot = faelle['attack-on-titan']!
const aotTitel = aot['titles.json'] as Title[]
const aotTeile = Object.values(aot['franchises.json'] as Record<string, FranchiseMember[]>)[0]!
const aotReiter = (id: number) => reihenReiterVon(aotTitel.find((t) => t.id === id)!, aotTeile, 'Attack on Titan', aotTitel)
pruefe('Attack on Titan: ohne Junior High', JSON.stringify(aotReiter(6282).map((r) => [r.id, r.label])) === '[[6282,"1"],[7496,"2"],[8669,"3 - Teil 1"],[10088,"3 - Teil 2"]]', aotReiter(6282))
pruefe('Attack on Titan: Final Season ohne Beschriftung öffnet ohne Reiter', aotReiter(10659).length === 0)
/* Eine Staffel in zwei Teilen (Sakamoto Days ohne den Eintrag 2027): Beschriftung „Teil 1/2“, aber kein Staffelstand. Brach die Bühne (disc-bereich-2). */
const sk = faelle['sakamoto-days']!
const skTitel = sk['titles.json'] as Title[]
const skTeile = (sk['franchises.json'] as Record<string, FranchiseMember[]>)['15940']!.filter((m) => m.id !== 17244)
let skReiter: unknown
try {
  skReiter = reihenReiterVon(skTitel.find((t) => t.id === 15940)!, skTeile, 'Sakamoto Days', skTitel).map((r) => [r.id, r.label])
} catch (fehler) {
  skReiter = String(fehler)
}
/* Klasse: jeder Titel jedes Bühnenfalls mit Reihe und Reihenname wie im Panel (`reihenTeileVon`, `reihenNameVon`), Liste und Lage ohne Absturz. */
const abstuerze: string[] = []
let gerechnet = 0
for (const [name, f] of Object.entries(faelle)) {
  const alle = (f['titles.json'] ?? []) as Title[]
  const reihen = (f['franchises.json'] ?? {}) as Record<string, FranchiseMember[]>
  const daten = { titles: alle, titleById: new Map(alle.map((t) => [t.id, t])), releasesByTitle: new Map() } as unknown as Dataset
  for (const t of alle) {
    /* Erst ohne geladene `franchises.json` (das Panel rendert zuerst mit leerer Reihe, Teile aus `data.titles`), dann mit. */
    for (const reihe of [[], reihen[t.franchiseId ?? t.id] ?? []]) {
      try {
        const liste = reihenReiterVon(t, reihenTeileVon(t, reihe, daten), reihenNameVon(t, reihe, daten), alle)
        for (const r of liste) reihenLageVon(daten.titleById.get(r.id) ?? t, [], '2026-11-24')
        gerechnet++
      } catch (fehler) {
        abstuerze.push(`${name}/${t.id}: ${String(fehler).slice(0, 80)}`)
      }
    }
  }
}
pruefe(`alle Bühnenfälle ohne Absturz (${gerechnet} Titel-Reihe-Paare)`, gerechnet > 100 && abstuerze.length === 0, abstuerze.slice(0, 5))
pruefe('Staffel in zwei Teilen ohne Staffelstand: Teil 1, Teil 2 nach Kennung', JSON.stringify(skReiter) === '[[15940,"Teil 1"],[16333,"Teil 2"]]', skReiter)

/* Lage am Stichtag des Mockups (24.11.2026): Horizonte 4 läuft, 1–3 ruhen; Hauptserie 1–5 kommt, 23–25 läuft. */
const STICHTAG = '2026-11-24'
const releases = fall['releases.json'] as Release[]
const von = (id: number) => releases.filter((r) => r.titleId === id)
const lage = (id: number) => reihenLageVon(offen(id), von(id), STICHTAG)
pruefe('Horizonte: nur Staffel 4 läuft', [26469, 26470, 26471, 14839].map(lage).join() === 'ruht,ruht,ruht,laeuft', [26469, 26470, 26471, 14839].map(lage))
pruefe('Hauptserie: 1–5 kommt, 23–25 läuft', [483, 1349, 10852, 14838].map(lage).join() === 'kommt,ruht,laeuft,ruht', [483, 1349, 10852, 14838].map(lage))
pruefe('Staffel 4 vor dem Start (11.10.) kommt', reihenLageVon(offen(14839), von(14839), '2026-10-11') === 'kommt')
const mitten = von(26469).map((r) => ({ ...r, schedule: { ...r.schedule, observed: { 19: '2026-11-20', 20: '2026-11-21' } } }))
pruefe('Sichtung vor dem Staffelende: Staffel 1 und 2 laufen', reihenLageVon(offen(26469), mitten, STICHTAG) === 'laeuft' && reihenLageVon(offen(26470), mitten, STICHTAG) === 'laeuft')
const kurz = { ...offen(10852), streams: [{ platform: 'netflix', url: 'https://x.invalid', dub: true, teilBereich: { von: 1, bis: 2 } }] } as Title
pruefe('ohne Sammeltitel filtert keine Sichtung', reihenLageVon(kurz, von(10852), STICHTAG) === 'laeuft')
pruefe('bekannte Folgenzahl, Plan vorbei: ruht', reihenLageVon({ ...offen(14839), episodes: 12 }, von(14839), STICHTAG) === 'ruht')

/* Echtes Panel: Attrappen für Speicher, Beobachter, Adresse; `franchises.json` aus dem Fall, alles andere 404. */
const speicher = new Map<string, string>()
const ort = { hash: '', pathname: '/', search: '', href: 'http://x/', origin: 'http://x' }
class Beobachter {
  observe() {}
  unobserve() {}
  disconnect() {}
}
const lager = { getItem: (k: string) => speicher.get(k) ?? null, setItem: (k: string, w: string) => void speicher.set(k, w), removeItem: (k: string) => void speicher.delete(k) }
Object.assign(globalThis, { IntersectionObserver: Beobachter, ResizeObserver: Beobachter, history: { replaceState() {}, pushState() {}, state: null }, location: ort, localStorage: lager, sessionStorage: lager })
Object.assign(globalThis, {
  fetch: async (adresse: unknown) => {
    const daten = String(adresse).includes('franchises.json') ? fall['franchises.json'] : undefined
    return { ok: Boolean(daten), status: daten ? 200 : 404, json: async () => daten ?? {} }
  },
})
ignoriereCss()
const { DetailPanel } = await import('../web/src/components/DetailPanel.tsx')

let fokus: MiniKnoten | undefined
const verhindert: string[] = []
const dom = installiereMiniDom(
  { ...attrappeUhr(), matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), location: ort, scrollTo() {}, innerWidth: 400, getComputedStyle: () => ({}) } as never,
  () => ({}),
)
Object.assign(document, { querySelector: () => null, querySelectorAll: () => [], title: 'Start' })
Object.assign(globalThis, { requestAnimationFrame: () => 0, cancelAnimationFrame() {} })
const knotenArt = Object.getPrototypeOf(dom.wurzel) as MiniKnoten
Object.assign(knotenArt, {
  closest: () => null,
  querySelector: () => null,
  querySelectorAll(this: MiniKnoten, wahl: string) {
    return wahl.includes('role="tab"') ? this.finde((k) => k.getAttribute('role') === 'tab') : []
  },
  focus(this: MiniKnoten) {
    fokus = this
  },
})
const wurzel = createRoot(dom.wurzel as unknown as Element)
const geoeffnet: number[] = []
const data = { titles: titel, titleById: new Map(titel.map((t) => [t.id, t])), releases, releaseBySlug: new Map(releases.map((r) => [r.slug, r])), events: [], eventsByDate: new Map(), releasesByTitle: new Map(titel.map((t) => [t.id, von(t.id)])), meta: {} }

async function zeige(id: number) {
  const e = { data, titleId: id, favorites: new Set(), hidden: new Set(), onToggleFavorite() {}, onToggleHidden() {}, onClose() {}, onFilterBy() {}, onOpenTitle: (n: number) => geoeffnet.push(n) }
  await act(async () => wurzel.render(h(DetailPanel as never, e as never)))
  for (let i = 0; i < 3; i++) await act(async () => void (await new Promise((fertig) => setTimeout(fertig, 5))))
  const leiste = dom.wurzel.finde((k) => k.getAttribute('data-reihen-reiter') !== null)[0]
  const tabs = leiste?.finde((k) => k.getAttribute('role') === 'tab') ?? []
  return { leiste, tabs, panel: dom.wurzel.finde((k) => k.getAttribute('role') === 'tabpanel' && (k.getAttribute('id') ?? '').startsWith('reihe-'))[0] }
}
const text = (k: MiniKnoten) => (k.textContent ?? '').trim()

const hz = await zeige(14839)
pruefe('Panel Horizonte 4: Leiste mit role=tablist und 4 Reitern', hz.leiste?.getAttribute('role') === 'tablist' && hz.tabs.map(text).join() === '1,2,3,4', hz.tabs.map(text))
pruefe('gewählt ist der offene Titel (4), nur er per Tab erreichbar', hz.tabs.map((k) => `${k.getAttribute('aria-selected')}/${k.getAttribute('tabindex')}`).join() === 'false/-1,false/-1,false/-1,true/0')
pruefe('Kasten ist das tabpanel des gewählten Reiters', hz.panel?.getAttribute('aria-labelledby') === 'reihe-14839-reiter-14839' && hz.tabs.every((k) => k.getAttribute('aria-controls') === 'reihe-14839-kasten'))
pruefe('Kasten steht im tabpanel', (hz.panel?.finde((k) => k.tagName === 'SECTION').length ?? 0) === 1)
pruefe('Beschriftung nennt Staffel und Titel', hz.tabs[1]?.getAttribute('aria-label') === 'Staffel 2: Pokémon Horizonte: Staffel 2 – Die Suche nach Laqua', hz.tabs[1]?.getAttribute('aria-label'))
/* Aussehen aus den Klassen: gewählter Reiter in der Farbe der Kastenhülle, Tippfläche ≥ 44 px (Stufe × 4 px bzw. [n rem] × 16 px), kein Scrollbalken. */
const klasse = (k: MiniKnoten | undefined) => k?.getAttribute('class') ?? ''
const kastenHuelle = klasse(hz.panel?.finde((k) => k.tagName === 'SECTION')[0]).split(' ').filter((k) => /^(dark:)?(border|bg)-/.test(k))
pruefe('gewählter Reiter trägt Rand und Fläche des Kastens', kastenHuelle.length >= 4 && kastenHuelle.every((k) => klasse(hz.tabs[3]).split(' ').includes(k)), [kastenHuelle, klasse(hz.tabs[3])])
pruefe('nicht gewählte Reiter ruhig grau', !kastenHuelle.some((k) => klasse(hz.tabs[0]).split(' ').includes(k)) && klasse(hz.tabs[0]).includes('bg-ak-flaeche-2'), klasse(hz.tabs[0]))
const pxVon = (klassen: string, vorsatz: string) => {
  const m = new RegExp(`(?:^| )${vorsatz}-(?:(\\d+)|\\[([\\d.]+)rem\\])(?= |$)`).exec(klassen)
  return m ? (m[1] ? Number(m[1]) * 4 : Number(m[2]) * 16) : 0
}
pruefe('Tippfläche jedes Reiters ≥ 44 × 44 px', hz.tabs.every((k) => pxVon(klasse(k), 'min-h') >= 44 && pxVon(klasse(k), 'min-w') >= 44), hz.tabs.map(klasse))
pruefe('Akzentstrich nur am gewählten Reiter', hz.tabs.map((k) => k.finde((x) => klasse(x).split(' ').includes('bg-ak-akzent')).length).join() === '0,0,0,1')
pruefe('kein Scrollbalken, vor der Messung kein Pfeil', klasse(hz.leiste).includes('[scrollbar-width:none]') && klasse(hz.leiste).includes('[&::-webkit-scrollbar]:hidden') && dom.wurzel.finde((k) => k.getAttribute('data-pfeil') !== null).length === 0)
fokus = undefined
const druecke = (ziel: MiniKnoten, key: string) => {
  const e = { type: 'keydown', key, target: ziel, bubbles: true, cancelable: true, defaultPrevented: false, timeStamp: 0, preventDefault() { verhindert.push(key) }, stopPropagation() {} }
  for (const capture of [true, false]) (dom.wurzel.hoerer.get('keydown') ?? []).filter((x) => x.capture === capture).forEach((x) => x.f(e))
}
await act(async () => druecke(hz.tabs[3]!, 'ArrowLeft'))
pruefe('Taste ← fokussiert Staffel 3, öffnet nichts', text(fokus ?? hz.tabs[0]!) === '3' && fokus !== undefined && geoeffnet.length === 0, [fokus && text(fokus), geoeffnet])
/* Weiter vom fokussierten Reiter aus (nicht vom gewählten): ← auf Staffel 3 führt zu 2. */
await act(async () => druecke(hz.tabs[2]!, 'ArrowLeft'))
pruefe('zweites ← geht vom fokussierten Reiter aus (Staffel 2)', fokus !== undefined && text(fokus) === '2' && geoeffnet.length === 0, fokus && text(fokus))
await act(async () => druecke(hz.tabs[3]!, 'Home'))
pruefe('Pos1 fokussiert Staffel 1 und unterdrückt das Seitenrollen', fokus !== undefined && text(fokus) === '1' && verhindert.join() === 'ArrowLeft,ArrowLeft,Home', verhindert)
await act(async () => klicke(dom.wurzel, hz.tabs[1]!))
pruefe('Klick auf Reiter 2 öffnet Staffel 2 über den Weg der Reihenliste', geoeffnet.join() === '26470', geoeffnet)

const film = await zeige(5726)
pruefe('Film der Reihe: keine Reihen-Reiter, kein tabpanel', film.leiste === undefined && film.panel === undefined)

await act(async () => wurzel.unmount())
dom.entferne()
if (verletzt) {
  console.error(`\n${verletzt} Zusicherung(en) verletzt.`)
  process.exit(1)
}
console.log('check-reihen-reiter: ok (Liste Horizonte/Hauptserie/AoT, Lage 7 Fälle, echtes Panel: ARIA, Tastatur, Klick öffnet Titel, Film ohne Reiter)')
