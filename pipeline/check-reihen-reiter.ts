/**
 * Zusicherung (F157, Daniel 24.11.2026, freigegebenes Mockup-Bild am Commit 47f7bda363): Über dem Antwortkasten stehen die Staffeln der
 * REIHE als Karteikarten-Reiter; ein Reiter öffnet den Titel der Staffel auf dem Weg der Reihenliste. Nachtrag 24.11.2026 20:21–20:25:
 * Reiter je Kategorie (Hauptserie, Filme, Specials …), nur Kurzform, voller Titel im Tooltip, die Reihenliste zeigt sie nicht noch einmal. Geprüft an den echten,
 * eingefrorenen Fällen der Bühne (`web/buehne/faelle.json`): reine Liste und Lage je Reiter, dann das echte `DetailPanel` mit Klick und
 * Tastatur. Aufruf: npx tsx pipeline/check-reihen-reiter.ts (läuft in `check:logic`).
 */
import { readFileSync } from 'node:fs'
import { act, createElement as h } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { useLang } from '../web/src/lib/i18n.tsx'
import { ReihenListe } from '../web/src/components/detail/reihen-liste.tsx'
import { ReihenReiterKontext } from '../web/src/components/detail/reihen-reiter.tsx'
import type { Dataset } from '../web/src/lib/data.ts'
import { reihenTeileVon } from '../web/src/components/detail/reihen-daten.ts'
import { reihenNameVon } from '../web/src/components/detail/reihen-namen.ts'
import type { FranchiseMember, Release, Title } from '../shared/types.ts'
import { attrappeUhr, ignoriereCss, installiereMiniDom, klicke, type MiniKnoten } from '../tools/mini-dom.ts'
import { reihenLageVon, reihenReiterVon } from '../web/src/components/detail/reihen-reiter-liste.ts'
import { reihenOrdnung } from '../web/src/components/detail/reihen-inhalt.tsx'

/** Die Gruppen der Reihenliste, wie das Panel sie den Reitern gibt (Überschriften als Schlüssel). */
const gruppenVon = (teile: FranchiseMember[], name: string) => reihenOrdnung(teile, name, ((k: string) => k) as never).gruppen

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
const reiter = (id: number) => reihenReiterVon(offen(id), teile, 'Pokémon', titel, gruppenVon(teile, 'Pokémon'))

/* Liste: Horizonte ist seit der Zusammenlegung (PR 4906/4920) ein Titel mit Staffel-Abschnitten, Reiter seiner Gruppe „Eigene Serien“;
   Hauptserie 12 Einträge mit Bereichen. */
pruefe('Horizonte: Reiter der eigenen Serien, Horizonte Nr. 5', JSON.stringify(reiter(14839).map((r) => [r.id, r.label])) === '[[6974,"1"],[8284,"2"],[13332,"3"],[13782,"4"],[14839,"5"],[14945,"6"],[15715,"7"]]', reiter(14839))
const haupt = reiter(483).map((r) => r.label).join()
pruefe('Hauptserie: 12 Reiter ohne „Staffel“, nach Nummer', haupt === '1–5,6–9,10–13,14–15,15–16,16,16,17–18,19,20–22,23–25,25', haupt)
pruefe('Hauptserie: Ids in Staffelfolge', reiter(10852).map((r) => r.id).join() === '483,1349,1350,4745,5979,6415,6563,6802,7798,8283,10852,14838', reiter(10852).map((r) => r.id))
pruefe('Name am Reiter ist der Titel der Daten', reiter(14839)[4]!.name === 'Pokémon Horizonte' && reiter(483)[1]!.name === 'Pokémon Advanced Generation', [reiter(14839)[4]!.name, reiter(483)[1]!.name])
/* Deutsche Staffelteilung als Sammeltitel: seit der Zusammenlegung ohne Bühnenfall, daher aus Horizonte nachgestellt. */
const staffel = (id: number, nr: number, bis: number) =>
  ({ ...offen(14839), id, titleDe: `Horizonte Staffel ${nr}`, staffelTitel: { sammel: 14839, nr, ab: 1 }, streams: [{ platform: 'netflix', url: 'https://x.invalid', dub: true, teilBereich: { von: 1, bis } }] }) as Title
const [st2, st1] = [staffel(990102, 2, 89), staffel(990101, 1, 45)]
pruefe('zwei Staffeln sind schon Reiter, Folge nach Nummer', reihenReiterVon(st2, teile, 'Pokémon', [st2, st1], []).map((r) => `${r.id}:${r.label}`).join() === '990101:1,990102:2')
pruefe('eine Staffel allein: keine Reiter', reihenReiterVon(st2, teile, 'Pokémon', [st2], []).length === 0)
/* Nachtrag Daniel 24.11.2026 20:21/20:24: Reiter je Kategorie der Reihe, Filme mit laufender Nummer (Mewtu gegen Mew = 1 …). */
const filme = reiter(5726)
pruefe('Film: Reiter der Filme 1..n in Reihenfolge der Reihenliste', filme.map((r) => r.label).join() === filme.map((_, i) => i + 1).join() && filme.slice(0, 4).map((r) => r.id).join() === '484,981,982,983', filme.map((r) => [r.id, r.label]))
pruefe('Film: Namen wie in Daniels Beispiel, nur Filme', filme[1]!.name === 'Pokémon 2: Die Macht des Einzelnen' && filme.every((r) => teile.find((m) => m.id === r.id)?.format === 'MOVIE'), filme.slice(0, 4).map((r) => r.name))
pruefe('Film: ohne Teile hinter „ohne Synchro“ (Toho Cinemas, Wild Card 2027)', !filme.some((r) => r.id === 10719 || r.id === 17885), filme.map((r) => r.id))
pruefe('Hauptserie zeigt nur Hauptserie, kein Film', reiter(483).every((r) => teile.find((m) => m.id === r.id)?.format === 'TV' && r.staffel), reiter(483))
pruefe('Special: Reiter der Specials, Film nicht darunter', reiter(1315).length > 1 && reiter(1315).every((r) => !r.staffel && teile.find((m) => m.id === r.id)?.format !== 'MOVIE'), reiter(1315).length)
pruefe('Film ohne Gruppen (Reihe noch nicht geordnet): keine Reiter', reihenReiterVon(offen(5726), teile, 'Pokémon', titel, []).length === 0)
pruefe('ohne Reihe: keine Reiter', reihenReiterVon(offen(10852), [], 'Pokémon', titel, []).length === 0)
const aot = faelle['attack-on-titan']!
const aotTitel = aot['titles.json'] as Title[]
const aotTeile = Object.values(aot['franchises.json'] as Record<string, FranchiseMember[]>)[0]!
const aotReiter = (id: number) => reihenReiterVon(aotTitel.find((t) => t.id === id)!, aotTeile, 'Attack on Titan', aotTitel, gruppenVon(aotTeile, 'Attack on Titan'))
pruefe('Attack on Titan: ohne Junior High', JSON.stringify(aotReiter(6282).map((r) => [r.id, r.label])) === '[[6282,"1"],[7496,"2"],[8669,"3 - Teil 1"],[10088,"3 - Teil 2"]]', aotReiter(6282))
pruefe('Attack on Titan: Final Season ohne Beschriftung öffnet ohne Reiter', aotReiter(10659).length === 0)
/* Eine Staffel in zwei Teilen (Sakamoto Days ohne den Eintrag 2027): Beschriftung „Teil 1/2“, aber kein Staffelstand. Brach die Bühne (disc-bereich-2). */
const sk = faelle['sakamoto-days']!
const skTitel = sk['titles.json'] as Title[]
const skTeile = (sk['franchises.json'] as Record<string, FranchiseMember[]>)['15940']!.filter((m) => m.id !== 17244)
let skReiter: unknown
try {
  skReiter = reihenReiterVon(skTitel.find((t) => t.id === 15940)!, skTeile, 'Sakamoto Days', skTitel, gruppenVon(skTeile, 'Sakamoto Days')).map((r) => [r.id, r.label])
} catch (fehler) {
  skReiter = String(fehler)
}
/*
 * Klasse zum Nachtrag (Daniel 24.11.2026 20:21–20:25), je Titel-Reihe-Paar: Reiter tragen nur die Kurzform, der volle Titel steht im
 * Namen; kein Reiter-Titel steht noch in der Reihenliste, und jeder Teil der Reihe bleibt erreichbar (Reiter oder Liste).
 */
const KURZFORM = /^(\d+(–\d+)?( - Teil \d+)?|Teil \d+)$/
const nachtragFehler: string[] = []
function klasseNachtrag(wo: string, liste: ReturnType<typeof reihenReiterVon>, rTeile: FranchiseMember[], rName: string): void {
  const ids = new Set(liste.map((r) => r.id))
  const inListe = reihenOrdnung(rTeile, rName, ((k: string) => k) as never, ids).gruppen.flatMap((g) => g.teile.map((m) => m.id))
  const fehler = [
    ...liste.filter((r) => !KURZFORM.test(r.label) || !r.name || r.name === r.label).map((r) => `Kurzform ${r.label}/${r.name}`),
    ...inListe.filter((id) => ids.has(id)).map((id) => `doppelt ${id}`),
    ...rTeile.filter((m) => !ids.has(m.id) && !inListe.includes(m.id)).map((m) => `unerreichbar ${m.id}`),
  ]
  if (fehler.length) nachtragFehler.push(`${wo}: ${fehler.slice(0, 3).join(', ')}`)
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
        const [rTeile, rName] = [reihenTeileVon(t, reihe, daten), reihenNameVon(t, reihe, daten)]
        const liste = reihenReiterVon(t, rTeile, rName, alle, gruppenVon(rTeile, rName))
        for (const r of liste) reihenLageVon(daten.titleById.get(r.id) ?? t, [], '2026-11-24')
        klasseNachtrag(`${name}/${t.id}`, liste, rTeile, rName)
        gerechnet++
      } catch (fehler) {
        abstuerze.push(`${name}/${t.id}: ${String(fehler).slice(0, 80)}`)
      }
    }
  }
}
pruefe(`alle Bühnenfälle ohne Absturz (${gerechnet} Titel-Reihe-Paare)`, gerechnet > 100 && abstuerze.length === 0, abstuerze.slice(0, 5))
pruefe('alle Bühnenfälle: Kurzform, kein Titel in Reiter und Reihenliste, keiner unerreichbar', nachtragFehler.length === 0, nachtragFehler.slice(0, 5))
pruefe('Staffel in zwei Teilen ohne Staffelstand: Teil 1, Teil 2 nach Kennung', JSON.stringify(skReiter) === '[[15940,"Teil 1"],[16333,"Teil 2"]]', skReiter)

/* Lage am Stichtag des Mockups (24.11.2026): Horizonte läuft; Hauptserie 1–5 kommt, 23–25 läuft. */
const STICHTAG = '2026-11-24'
const releases = fall['releases.json'] as Release[]
const von = (id: number) => releases.filter((r) => r.titleId === id)
const lage = (id: number) => reihenLageVon(offen(id), von(id), STICHTAG)
pruefe('Horizonte läuft', lage(14839) === 'laeuft', lage(14839))
pruefe('Hauptserie: 1–5 kommt, 23–25 läuft', [483, 1349, 10852, 14838].map(lage).join() === 'kommt,ruht,laeuft,ruht', [483, 1349, 10852, 14838].map(lage))
const gesichtet = (bis: number) => von(14839).map((r) => ({ ...r, schedule: { ...r.schedule, observed: { [bis - 1]: '2026-11-20', [bis]: '2026-11-21' } } }))
pruefe('Sichtung vor dem Staffelende: Staffel 1 und 2 laufen', reihenLageVon(st1, gesichtet(20), STICHTAG) === 'laeuft' && reihenLageVon(st2, gesichtet(20), STICHTAG) === 'laeuft')
pruefe('Sichtung über das Ende von Staffel 1 hinaus: Staffel 1 läuft nicht mehr, Staffel 2 schon', [st1, st2].map((s) => reihenLageVon(s, gesichtet(60), STICHTAG)).join() !== 'laeuft,laeuft' && reihenLageVon(st2, gesichtet(60), STICHTAG) === 'laeuft', [st1, st2].map((s) => reihenLageVon(s, gesichtet(60), STICHTAG)))
const kurz = { ...offen(10852), streams: [{ platform: 'netflix', url: 'https://x.invalid', dub: true, teilBereich: { von: 1, bis: 2 } }] } as Title
pruefe('ohne Sammeltitel filtert keine Sichtung', reihenLageVon(kurz, von(10852), STICHTAG) === 'laeuft')
pruefe('Plan vorbei: mit bekannter Folgenzahl ruht, ohne läuft', reihenLageVon({ ...offen(8464), episodes: 12 }, von(8464), STICHTAG) === 'ruht' && reihenLageVon({ ...offen(8464), episodes: undefined }, von(8464), STICHTAG) === 'laeuft')

/* Reihenliste mit Reitern am Kasten (statisch): Reiter-Titel zählen nicht am Schalter „ohne Synchro“, ohne übrige Teile keine Karte. */
const glied = (id: number, mehr: Partial<FranchiseMember> = {}) => ({ id, name: `Reihe ${id}`, format: 'TV', jpYear: 2000 + (id % 100), episodes: 12, ...mehr }) as FranchiseMember
function listeMitReitern(teileListe: FranchiseMember[], reiterIds: number[]): string {
  const reiterListe = reiterIds.map((id) => ({ id, label: String(id), name: `Reihe ${id}`, staffel: true }))
  const liste = () => {
    const { t } = useLang()
    const eigenschaften = { reihenTeile: teileListe, t, reihenName: 'Reihe', title: { id: reiterIds[0] } as Title, favorites: new Set<number>(), wechselt: false, wechsleZu() {} }
    const zustand = { reiheOhneOffen: null, reihenSchluessel: 1, reiheSuche: { reihe: 1, text: '' }, setReiheOhneOffen() {}, setReiheSuche() {} }
    return h(ReihenListe, { ...eigenschaften, ...zustand })
  }
  return renderToStaticMarkup(h(ReihenReiterKontext.Provider, { value: { data: {} as Dataset, reiter: reiterListe, wechsleZu() {} } }, h(liste)))
}
const kleineReihe = [glied(900001), glied(900002, { ohneSynchro: true }), glied(900003, { format: 'MOVIE', episodes: 1 }), glied(900004, { format: 'MOVIE', episodes: 1 })]
pruefe('Spur: Schalter zählt den Reiter-Titel ohne Synchro nicht', !listeMitReitern(kleineReihe, [900001, 900002]).includes('type="checkbox"') && listeMitReitern(kleineReihe, [900001]).includes('type="checkbox"'))
const grosseReihe = [...kleineReihe, ...Array.from({ length: 13 }, (_, i) => glied(900010 + i, { format: 'MOVIE', episodes: 1 }))]
pruefe('Übersicht: Schalter zählt den Reiter-Titel ohne Synchro nicht', listeMitReitern(grosseReihe, [900001]).includes('data-reihe-uebersicht') && !listeMitReitern(grosseReihe, [900001, 900002]).includes('type="checkbox"'))
pruefe('alle Teile als Reiter: keine Reihen-Karte', listeMitReitern(kleineReihe, [900001, 900002, 900003, 900004]) === '' && listeMitReitern(kleineReihe, [900001, 900002]) !== '')

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

async function zeige(id: number, d: object = data) {
  const e = { data: d, titleId: id, favorites: new Set(), hidden: new Set(), onToggleFavorite() {}, onToggleHidden() {}, onClose() {}, onFilterBy() {}, onOpenTitle: (n: number) => geoeffnet.push(n) }
  await act(async () => wurzel.render(h(DetailPanel as never, e as never)))
  for (let i = 0; i < 3; i++) await act(async () => void (await new Promise((fertig) => setTimeout(fertig, 5))))
  const leiste = dom.wurzel.finde((k) => k.getAttribute('data-reihen-reiter') !== null)[0]
  const tabs = leiste?.finde((k) => k.getAttribute('role') === 'tab') ?? []
  return { leiste, tabs, panel: dom.wurzel.finde((k) => k.getAttribute('role') === 'tabpanel' && (k.getAttribute('id') ?? '').startsWith('reihe-'))[0] }
}
const text = (k: MiniKnoten) => (k.textContent ?? '').trim()

const hz = await zeige(14839)
pruefe('Panel Horizonte: Leiste mit role=tablist und 7 Reitern der eigenen Serien', hz.leiste?.getAttribute('role') === 'tablist' && hz.tabs.map(text).join() === '1,2,3,4,5,6,7', hz.tabs.map(text))
pruefe('gewählt ist der offene Titel (5), nur er per Tab erreichbar', hz.tabs.map((k) => `${k.getAttribute('aria-selected')}/${k.getAttribute('tabindex')}`).join() === 'false/-1,false/-1,false/-1,false/-1,true/0,false/-1,false/-1')
pruefe('Kasten ist das tabpanel des gewählten Reiters', hz.panel?.getAttribute('aria-labelledby') === 'reihe-14839-reiter-14839' && hz.tabs.every((k) => k.getAttribute('aria-controls') === 'reihe-14839-kasten'))
pruefe('Kasten steht im tabpanel', (hz.panel?.finde((k) => k.tagName === 'SECTION').length ?? 0) === 1)
pruefe('Beschriftung ohne Staffelnummer nennt nur den Titel', hz.tabs[1]?.getAttribute('aria-label') === 'Pokémon-Generationen', hz.tabs[1]?.getAttribute('aria-label'))
/* Aussehen aus den Klassen: gewählter Reiter in der Farbe der Kastenhülle, Tippfläche ≥ 44 px (Stufe × 4 px bzw. [n rem] × 16 px), kein Scrollbalken. */
const klasse = (k: MiniKnoten | undefined) => k?.getAttribute('class') ?? ''
const kastenHuelle = klasse(hz.panel?.finde((k) => k.tagName === 'SECTION')[0]).split(' ').filter((k) => /^(dark:)?(border|bg)-/.test(k))
pruefe('gewählter Reiter trägt Rand und Fläche des Kastens', kastenHuelle.length >= 2 && kastenHuelle.every((k) => klasse(hz.tabs[4]).split(' ').includes(k)), [kastenHuelle, klasse(hz.tabs[4])])
pruefe('nicht gewählte Reiter ruhig grau', !kastenHuelle.some((k) => klasse(hz.tabs[0]).split(' ').includes(k)) && klasse(hz.tabs[0]).includes('bg-ak-flaeche-2'), klasse(hz.tabs[0]))
const pxVon = (klassen: string, vorsatz: string) => {
  const m = new RegExp(`(?:^| )${vorsatz}-(?:(\\d+)|\\[([\\d.]+)rem\\])(?= |$)`).exec(klassen)
  return m ? (m[1] ? Number(m[1]) * 4 : Number(m[2]) * 16) : 0
}
pruefe('Tippfläche jedes Reiters ≥ 44 × 44 px', hz.tabs.every((k) => pxVon(klasse(k), 'min-h') >= 44 && pxVon(klasse(k), 'min-w') >= 44), hz.tabs.map(klasse))
pruefe('Akzentstrich nur am gewählten Reiter', hz.tabs.map((k) => k.finde((x) => klasse(x).split(' ').includes('bg-ak-akzent')).length).join() === '0,0,0,0,1,0,0')
pruefe('kein Scrollbalken, vor der Messung kein Pfeil', klasse(hz.leiste).includes('[scrollbar-width:none]') && klasse(hz.leiste).includes('[&::-webkit-scrollbar]:hidden') && dom.wurzel.finde((k) => k.getAttribute('data-pfeil') !== null).length === 0)
fokus = undefined
const druecke = (ziel: MiniKnoten, key: string) => {
  const e = { type: 'keydown', key, target: ziel, bubbles: true, cancelable: true, defaultPrevented: false, timeStamp: 0, preventDefault() { verhindert.push(key) }, stopPropagation() {} }
  for (const capture of [true, false]) (dom.wurzel.hoerer.get('keydown') ?? []).filter((x) => x.capture === capture).forEach((x) => x.f(e))
}
await act(async () => druecke(hz.tabs[4]!, 'ArrowLeft'))
pruefe('Taste ← fokussiert Reiter 4, öffnet nichts', text(fokus ?? hz.tabs[0]!) === '4' && fokus !== undefined && geoeffnet.length === 0, [fokus && text(fokus), geoeffnet])
/* Weiter vom fokussierten Reiter aus (nicht vom gewählten): ← auf Reiter 4 führt zu 3. */
await act(async () => druecke(hz.tabs[3]!, 'ArrowLeft'))
pruefe('zweites ← geht vom fokussierten Reiter aus (Reiter 3)', fokus !== undefined && text(fokus) === '3' && geoeffnet.length === 0, fokus && text(fokus))
await act(async () => druecke(hz.tabs[4]!, 'Home'))
pruefe('Pos1 fokussiert Reiter 1 und unterdrückt das Seitenrollen', fokus !== undefined && text(fokus) === '1' && verhindert.join() === 'ArrowLeft,ArrowLeft,Home', verhindert)
await act(async () => klicke(dom.wurzel, hz.tabs[1]!))
pruefe('Klick auf Reiter 2 öffnet Pokémon-Generationen über den Weg der Reihenliste', geoeffnet.join() === '8284', geoeffnet)

pruefe('Tooltip: voller Titel am Reiter (title)', hz.tabs.map((k) => k.getAttribute('title')).join('|') === reiter(14839).map((r) => r.name).join('|'), hz.tabs.map((k) => k.getAttribute('title')))
/* Reihenliste: große Reihe als Übersicht; Gruppen mit Zahl (`data-reihe-gruppe`), die Reiter-Titel fehlen in ihrer Gruppe. */
const gruppenZahl = () => dom.wurzel.finde((k) => k.getAttribute('data-reihe-gruppe') !== null).map((k) => `${k.getAttribute('data-reihe-gruppe')}=${text(k).replace(/\D+/g, '')}`).join()
pruefe('Horizonte: Eigene Serien ganz als Reiter, fehlen in der Liste; Hauptserie und Filme ganz', gruppenZahl() === 'Hauptserie=12,Filme=24,Specials & OVAs=23', gruppenZahl())

const film = await zeige(5726)
const filmLabels = film.tabs.map(text)
pruefe('Film der Reihe: Reiter der Filme 1..n, gewählt Nr. 16', film.leiste?.getAttribute('role') === 'tablist' && filmLabels.join() === filmLabels.map((_, i) => i + 1).join() && filmLabels.length === reiter(5726).length && film.tabs[15]?.getAttribute('aria-selected') === 'true', filmLabels)
pruefe('Film: Tooltip und aria-label tragen den vollen Titel, ohne „Staffel“', film.tabs[0]?.getAttribute('title') === 'Pokémon: Der Film - Mewtu gegen Mew' && film.tabs[0]?.getAttribute('aria-label') === 'Pokémon: Der Film - Mewtu gegen Mew', [film.tabs[0]?.getAttribute('title'), film.tabs[0]?.getAttribute('aria-label')])
pruefe('Film: Filme fehlen in der Reihenliste, die übrigen Gruppen bleiben', gruppenZahl() === 'Hauptserie=12,Eigene Serien=7,Specials & OVAs=23', gruppenZahl())
/* Ein Titel ohne Reihe (eigene Kennung, keine Reihenteile): keine Leiste, kein tabpanel um den Kasten. */
const allein = { ...offen(5726), id: 990001, franchiseId: 990001, titleDe: 'Ohne Reihe', titleEn: 'Ohne Reihe', titleRomaji: 'Ohne Reihe' } as Title
const ohneReihe = await zeige(990001, { ...data, titles: [allein], titleById: new Map([[allein.id, allein]]), releasesByTitle: new Map() })
pruefe('Titel ohne Reihe: keine Reihen-Reiter, kein tabpanel', ohneReihe.leiste === undefined && ohneReihe.panel === undefined)

await act(async () => wurzel.unmount())
dom.entferne()
if (verletzt) {
  console.error(`\n${verletzt} Zusicherung(en) verletzt.`)
  process.exit(1)
}
console.log('check-reihen-reiter: ok (Liste je Kategorie: Horizonte/Hauptserie/Filme/Specials/AoT, Kurzform und keine Doppelung in allen Bühnenfällen, Lage 7 Fälle, echtes Panel: ARIA, Tooltip, Tastatur, Klick öffnet Titel, Reihenliste ohne Reiter-Titel)')
