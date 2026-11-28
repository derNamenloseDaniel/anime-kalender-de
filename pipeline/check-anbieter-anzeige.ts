/**
 * Zusicherung (Konzept Staffelzuschnitt, Schritt 3): Eine Staffel, die der Anbieter als eine führt (`FranchiseMember.anbieterStaffel`), steht als EIN Reiter
 * mit der Nummer der Reihe („1“ statt „Teil 1“/„Teil 2“), das Panel zeigt den Umschalter „Folge 1–11 | Folge 12–22“, die Reihenliste führt die Teile nicht noch
 * einmal, und der Absprung nennt beide aniSearch-Einträge. Ohne Feld bleibt alles wie es war. Geprüft am eingefrorenen Bühnenfall Sakamoto Days
 * (`web/buehne/faelle.json`, Kennungen 15940 und 16333 = Netflix-Zuschnitt 11 + 11) mit dem Feld, das `anbieter-zuschnitt` im Bau setzt. Läuft in `check:logic`.
 */
import { readFileSync } from 'node:fs'
import { act, createElement as h } from 'react'
import { createRoot } from 'react-dom/client'
import { teilBereich, anbieterSpanne, andereTeile, fasseAnbieterStaffeln, titelAlsReiter } from '../web/src/components/detail/anbieter-staffel.ts'
import { zaehlSpanne } from '../web/src/components/detail/antwort-davor.ts'
import { reihenNameVon } from '../web/src/components/detail/reihen-namen.ts'
import { reihenTeileVon } from '../web/src/components/detail/reihen-daten.ts'
import { reihenReiterVon } from '../web/src/components/detail/reihen-reiter-liste.ts'
import { weitereAnisearchVerweise } from '../web/src/components/detail/verweise.ts'
import type { Dataset } from '../web/src/lib/data.ts'
import type { FranchiseMember, Release, Title } from '../shared/types.ts'
import { attrappeUhr, ignoriereCss, installiereMiniDom, klicke, type MiniKnoten } from '../tools/mini-dom.ts'
import { festeUhr } from '../tools/feste-uhr.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const fall = (JSON.parse(readFileSync(new URL('../web/buehne/faelle.json', import.meta.url), 'utf8')).faelle as Record<string, Record<string, unknown>>)['sakamoto-days']!
const titel = fall['titles.json'] as Title[]
const releases = fall['releases.json'] as Release[]
const HEUTE = '2026-11-26'
const EINS = 15940
const ZWEI = 16333
const DRITTE = 17244
const frisch = (): FranchiseMember[] => JSON.parse(JSON.stringify(Object.values(fall['franchises.json'] as Record<string, FranchiseMember[]>)[0]))
const mitFeld = (): FranchiseMember[] => {
  const r = frisch()
  r.find((m) => m.id === EINS)!.anbieterStaffel = { nr: 1, teil: 1, von: 1, bis: 11 }
  r.find((m) => m.id === ZWEI)!.anbieterStaffel = { nr: 1, teil: 2, von: 12, bis: 22 }
  return r
}
const dsatz = { titleById: new Map(titel.map((t) => [t.id, t])) } as unknown as Dataset
const offen = (id: number) => titel.find((t) => t.id === id)!
const reiter = (reihe: FranchiseMember[], id: number) => reihenReiterVon(offen(id), reihenTeileVon(offen(id), reihe, dsatz), reihenNameVon(offen(id), reihe, dsatz), titel, HEUTE, reihe)
const kurz = (liste: ReturnType<typeof reiter>) => liste.map((r) => `${r.id}:${r.label}`).join()

console.log('\nReiter:')
pruefe('ohne Feld unverändert: „Teil 1“, „Teil 2“, „2“', kurz(reiter(frisch(), EINS)) === `${EINS}:Teil 1,${ZWEI}:Teil 2,${DRITTE}:2`, kurz(reiter(frisch(), EINS)))
pruefe('mit Feld: ein Reiter „1“ für beide Teile, dann „2“', kurz(reiter(mitFeld(), EINS)) === `${EINS}:1,${DRITTE}:2`, kurz(reiter(mitFeld(), EINS)))
pruefe('offen ist Teil 2: der Reiter „1“ öffnet Teil 2 (den offenen), nicht Teil 1', kurz(reiter(mitFeld(), ZWEI)) === `${ZWEI}:1,${DRITTE}:2`, kurz(reiter(mitFeld(), ZWEI)))
pruefe('offen ist eine andere Staffel: der Reiter „1“ öffnet Teil 1', kurz(fasseAnbieterStaffeln(reiter(frisch(), EINS), mitFeld(), DRITTE)) === `${EINS}:1,${DRITTE}:2`, kurz(fasseAnbieterStaffeln(reiter(frisch(), EINS), mitFeld(), DRITTE)))
pruefe('Umschalter-Teile in Reihenfolge mit Folgenbereich des Anbieters', JSON.stringify(reiter(mitFeld(), EINS)[0]!.teile) === JSON.stringify([{ id: EINS, von: 1, bis: 11 }, { id: ZWEI, von: 12, bis: 22 }]), reiter(mitFeld(), EINS)[0]!.teile)
pruefe('Reiter ohne Anbieter-Staffel tragen keine Teile', reiter(mitFeld(), EINS)[1]!.teile === undefined)
pruefe('Reihenliste lässt beide Teile der Anbieter-Staffel weg, nicht nur den des Reiters', [EINS, ZWEI, DRITTE].every((id) => titelAlsReiter(reiter(mitFeld(), EINS)).has(id)), [...titelAlsReiter(reiter(mitFeld(), EINS))])
pruefe('Beschriftung des Umschalters: „Folge 1–11“, ein einzelner Teil „Folge 13“', teilBereich({ von: 1, bis: 11 }) === 'Folge 1–11' && teilBereich({ von: 13, bis: 13 }) === 'Folge 13')

console.log('\nStone Ocean (Reihennummer 6) und Steel Ball Run (7.1 / 7.2–3, PR 5261):')
{
  const NAME = "JoJo's Bizarre Adventure"
  const glied = (id: number, name: string, episodes: number, jpStart: string): FranchiseMember => ({ id, name, format: id >= 6 ? 'ONA' : 'TV', episodes, jpStart, jpYear: Number(jpStart.slice(0, 4)) })
  const jojo = (stoneOcean: boolean): FranchiseMember[] => {
    const r = [
      glied(1, NAME, 26, '2012-10-06'),
      glied(2, `${NAME} Staffel 2`, 48, '2014-03-31'),
      glied(3, `${NAME} Staffel 3`, 39, '2016-04-01'),
      glied(4, `${NAME} Staffel 4`, 39, '2018-10-05'),
      glied(5, `${NAME} Staffel 5`, 26, '2020-10-02'),
      glied(6, `${NAME}: Stone Ocean`, 12, '2021-12-01'),
      glied(7, `${NAME}: Stone Ocean Part 2`, 26, '2022-09-01'),
      glied(8, `${NAME}: Steel Ball Run - Phase 1`, 1, '2026-03-01'),
      glied(9, `${NAME}: Steel Ball Run - Phase 2-3`, 11, '2026-04-01'),
    ]
    if (stoneOcean) {
      r[5]!.anbieterStaffel = { nr: 6, teil: 1, von: 1, bis: 12 }
      r[6]!.anbieterStaffel = { nr: 6, teil: 2, von: 13, bis: 38 }
    }
    return r
  }
  const reiterJojo = (r: FranchiseMember[], id: number) => reihenReiterVon({ id, titleDe: NAME, format: 'ONA' } as Title, r, NAME, [], HEUTE, r)
  const vorher = reiterJojo(jojo(false), 6).map((r) => `${r.id}:${r.label}`).join()
  const nachher = reiterJojo(jojo(true), 6).map((r) => `${r.id}:${r.label}`).join()
  pruefe('Stone Ocean ohne Feld: zwei Reiter 6.1 und 6.2, Steel Ball Run 7.1 und 7.2–3', vorher === '1:1,2:2,3:3,4:4,5:5,6:6.1,7:6.2,8:7.1,9:7.2–3', vorher)
  pruefe('Stone Ocean mit Feld: EIN Reiter „6“, Steel Ball Run bleibt 7.1 und 7.2–3', nachher === '1:1,2:2,3:3,4:4,5:5,6:6,8:7.1,9:7.2–3', nachher)
  pruefe('Stone Ocean: der Reiter „6“ öffnet Teil 2, wenn Teil 2 offen ist, sonst Teil 1', reiterJojo(jojo(true), 7)[5]?.id === 7 && reiterJojo(jojo(true), 1)[5]?.id === 6, [reiterJojo(jojo(true), 7)[5]?.id, reiterJojo(jojo(true), 1)[5]?.id])
  pruefe('Stone Ocean: Umschalter „Folge 1–12“ und „Folge 13–38“', reiterJojo(jojo(true), 6)[5]?.teile?.map(teilBereich).join() === 'Folge 1–12,Folge 13–38', reiterJojo(jojo(true), 6)[5]?.teile)
}

console.log('\nFolgenzeile und Absprung:')
{
  const reihe = mitFeld()
  pruefe('Spanne des Anbieters nur für Teil 2 (beginnt nicht bei Folge 1)', anbieterSpanne(reihe, EINS) === undefined && JSON.stringify(anbieterSpanne(reihe, ZWEI)) === '{"von":12,"bis":22}')
  pruefe('Teil 2 mit 4 erschienenen Folgen: „Folge 12–15 von 22“', JSON.stringify(zaehlSpanne([], 4, 11, { von: 12, bis: 22 })) === '{"nr":"12–15","gesamt":22}', zaehlSpanne([], 4, 11, { von: 12, bis: 22 }))
  pruefe('ohne Anbieter und ohne Termine keine Spanne (wie vorher)', zaehlSpanne([], 4, 11) === undefined)
  const weitere = weitereAnisearchVerweise(andereTeile(reihe, EINS).map((x) => ({ titel: offen(x.id), teil: x.teil })))
  pruefe('Absprung von Teil 1 nennt den aniSearch-Eintrag von Teil 2 als Direktlink', JSON.stringify(weitere.map((v) => [v.name, v.ziel])) === '[["aniSearch Teil 2","https://www.anisearch.de/anime/19797"]]', weitere)
  const zurueck = weitereAnisearchVerweise(andereTeile(reihe, ZWEI).map((x) => ({ titel: offen(x.id), teil: x.teil })))
  pruefe('Absprung von Teil 2 nennt Teil 1', zurueck[0]?.name === 'aniSearch Teil 1' && zurueck[0]?.ziel.endsWith('/19307'), zurueck)
  pruefe('ohne Feld keine weiteren Absprünge', andereTeile(frisch(), EINS).length === 0)
}

/* Echtes Panel mit Klick: Attrappen wie in check-reihen-reiter.ts. */
const speicher = new Map<string, string>()
const ort = { hash: '', pathname: '/', search: '', href: 'http://x/', origin: 'http://x' }
class Beobachter {
  observe() {}
  unobserve() {}
  disconnect() {}
}
const lager = { getItem: (k: string) => speicher.get(k) ?? null, setItem: (k: string, w: string) => void speicher.set(k, w), removeItem: (k: string) => void speicher.delete(k) }
Object.assign(globalThis, { IntersectionObserver: Beobachter, ResizeObserver: Beobachter, history: { replaceState() {}, pushState() {}, state: null }, location: ort, localStorage: lager, sessionStorage: lager })
let franchisen: unknown = {}
Object.assign(globalThis, {
  fetch: async (adresse: unknown) => {
    const daten = String(adresse).includes('franchises.json') ? franchisen : undefined
    return { ok: Boolean(daten), status: daten ? 200 : 404, json: async () => daten ?? {} }
  },
})
ignoriereCss()
const { DetailPanel } = await import('../web/src/components/DetailPanel.tsx')
const echteUhr = festeUhr(`${HEUTE}T12:00:00Z`)
const dom = installiereMiniDom(
  { ...attrappeUhr(), matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), location: ort, scrollTo() {}, innerWidth: 400, innerHeight: 800, getComputedStyle: () => ({}) } as never,
  () => ({}),
)
Object.assign(document, { querySelector: () => null, querySelectorAll: () => [], title: 'Start' })
Object.assign(globalThis, { requestAnimationFrame: () => 0, cancelAnimationFrame() {} })
const knotenArt = Object.getPrototypeOf(dom.wurzel) as MiniKnoten
Object.assign(knotenArt, { closest: () => null, querySelector: () => null, querySelectorAll: () => [], focus() {}, getBoundingClientRect: () => ({ left: 0, top: 300, right: 44, bottom: 344, width: 44, height: 44 }) })
const wurzel = createRoot(dom.wurzel as unknown as Element)
const geoeffnet: number[] = []
const data = { titles: titel, titleById: new Map(titel.map((t) => [t.id, t])), releases, releaseBySlug: new Map(releases.map((r) => [r.slug, r])), events: [], eventsByDate: new Map(), nurUntertitelByTitle: new Map(), releasesByTitle: new Map(titel.map((t) => [t.id, releases.filter((r) => r.titleId === t.id)])), meta: {} }

/* Die Seite lädt `franchises.json` einmal und merkt sie (`gemerkt`): dasselbe Objekt, dessen Glieder das Feld bekommen oder verlieren. */
const geladen = frisch()
franchisen = { [EINS]: geladen }
async function zeige(id: number, reihe: FranchiseMember[]) {
  for (const m of geladen) m.anbieterStaffel = reihe.find((x) => x.id === m.id)?.anbieterStaffel
  const e = { data, titleId: id, favorites: new Set(), hidden: new Set(), onToggleFavorite() {}, onToggleHidden() {}, onClose() {}, onFilterBy() {}, onOpenTitle: (n: number) => geoeffnet.push(n) }
  await act(async () => wurzel.render(h(DetailPanel as never, e as never)))
  for (let i = 0; i < 3; i++) await act(async () => void (await new Promise((fertig) => setTimeout(fertig, 5))))
  const tabs = dom.wurzel.finde((k) => k.getAttribute('data-reihen-reiter') !== null)[0]?.finde((k) => k.getAttribute('role') === 'tab') ?? []
  const umschalter = dom.wurzel.finde((k) => k.getAttribute('data-teil-umschalter') !== null)[0]
  const flaggen = dom.wurzel.finde((k) => k.getAttribute('data-flaggen') !== null)[0]
  return { tabs, umschalter, knoepfe: umschalter?.finde((k) => k.getAttribute('role') === 'tab') ?? [], flaggen }
}
const text = (k: MiniKnoten) => (k.textContent ?? '').trim()
const klasse = (k: MiniKnoten) => k.getAttribute('class') ?? ''

console.log('\nPanel:')
{
  const ohne = await zeige(EINS, frisch())
  pruefe('ohne Feld: Reiter „Teil 1“, „Teil 2“, „2“ und kein Umschalter', ohne.tabs.map(text).join() === 'Teil 1,Teil 2,2' && !ohne.umschalter, ohne.tabs.map(text))
  const mit = await zeige(EINS, mitFeld())
  pruefe('mit Feld: zwei Reiter „1“ und „2“', mit.tabs.map(text).join() === '1,2', mit.tabs.map(text))
  pruefe('Umschalter mit „Folge 1–11“ und „Folge 12–22“, der offene Teil gewählt', mit.knoepfe.map(text).join() === 'Folge 1–11,Folge 12–22' && mit.knoepfe.map((k) => k.getAttribute('aria-selected')).join() === 'true,false', mit.knoepfe.map(text))
  const pxMin = (k: MiniKnoten) => Number(/(?:^| )min-h-(\d+)(?= |$)/.exec(klasse(k))?.[1] ?? 0) * 4
  pruefe('Tippfläche jedes Umschalter-Knopfs ≥ 44 px, nur ak-Klassen', mit.knoepfe.every((k) => pxMin(k) >= 44) && !/(?:^|\s)(?:slate-|sky-|dark:)/.test(klasse(mit.umschalter!) + mit.knoepfe.map(klasse).join(' ')), mit.knoepfe.map(klasse))
  geoeffnet.length = 0
  await act(async () => klicke(dom.wurzel, mit.knoepfe[1]!))
  pruefe('Klick auf „Folge 12–22“ öffnet Teil 2 (16333) auf dem Weg der Reiter', geoeffnet.join() === String(ZWEI), geoeffnet)
  const zwei = await zeige(ZWEI, mitFeld())
  pruefe('offen ist Teil 2: Umschalter wählt „Folge 12–22“', zwei.knoepfe.map((k) => k.getAttribute('aria-selected')).join() === 'false,true', zwei.knoepfe.map((k) => k.getAttribute('aria-selected')))
  const links = (k: MiniKnoten | undefined) => (k?.finde((x) => x.tagName === 'A') ?? []).map((a) => `${text(a)}|${a.getAttribute('href')}`)
  pruefe('Flaggen: der eigene aniSearch-Eintrag und der von Teil 1', links(zwei.flaggen).some((l) => l.endsWith('/19797')) && links(zwei.flaggen).some((l) => l.startsWith('aniSearch Teil 1') && l.endsWith('/19307')), links(zwei.flaggen))
}
await act(async () => wurzel.unmount())
echteUhr()

if (verletzt) {
  console.error(`\n${verletzt} Zusicherung(en) verletzt`)
  process.exit(1)
}
console.log('\nOK')
