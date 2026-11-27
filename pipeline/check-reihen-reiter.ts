/**
 * Zusicherung (F157, Daniel 24.11.2026, freigegebenes Mockup-Bild am Commit 47f7bda363): Über dem Antwortkasten stehen die Staffeln der
 * REIHE als Karteikarten-Reiter; ein Reiter öffnet den Titel der Staffel auf dem Weg der Reihenliste. Nachtrag 24.11.2026 20:21–20:25:
 * nur Kurzform, voller Titel im Tooltip, die Reihenliste zeigt sie nicht noch einmal. Meldung 27.11.2026: Reiter nur an Hauptstaffeln (Filme,
 * Specials, eigene Serien ohne), Staffeln mit eigenem Namen tragen ihre Nummer. Geprüft an den echten,
 * eingefrorenen Fällen der Bühne (`web/buehne/faelle.json`): reine Liste und Lage je Reiter, dann das echte `DetailPanel` mit Klick und
 * Tastatur. Aufruf: npx tsx pipeline/check-reihen-reiter.ts (läuft in `check:logic`).
 */
import { readFileSync } from 'node:fs'
import { act, createElement as h } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { useLang } from '../web/src/lib/i18n.tsx'
import { ReihenListe } from '../web/src/components/detail/reihen-liste.tsx'
import { kastenFarbe, ReihenReiterKontext, ReihenReiterZeile } from '../web/src/components/detail/reihen-reiter.tsx'
import type { Dataset } from '../web/src/lib/data.ts'
import { reihenTeileVon } from '../web/src/components/detail/reihen-daten.ts'
import { reihenNameVon } from '../web/src/components/detail/reihen-namen.ts'
import type { FranchiseMember, Release, Title } from '../shared/types.ts'
import { attrappeUhr, feuere, ignoriereCss, installiereMiniDom, klicke, type MiniKnoten } from '../tools/mini-dom.ts'
import { festeUhr } from '../tools/feste-uhr.ts'
import { eindeutigeBeschriftung, reihenLageVon, reihenReiterVon, reiterKurzform } from '../web/src/components/detail/reihen-reiter-liste.ts'
import { reihenOrdnung } from '../web/src/components/detail/reihen-inhalt.tsx'
import { hauptstaffeln, staffelStaende } from '../shared/titles.ts'

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
/* Fester Tag statt Uhr: ob ein Teil ohne Synchro schon erschienen ist (Wild Card 2027 geplant), misst sich an ihm. */
const HEUTE = '2026-11-26'
const reiter = (id: number) => reihenReiterVon(offen(id), teile, 'Pokémon', titel, HEUTE)

/* Liste: Reiter nur bei der Hauptserie (Daniel 27.11.2026, „Reiter obwohl keine Hauptserie“ an Kishibe Rohan): Horizonte ist eine eigene
   Serie, Filme und Specials stehen in der Reihenliste. Hauptserie 12 Einträge mit Bereichen. */
const ohneHaupt = [14839, 5726, 1315].map((id) => reiter(id).length)
pruefe('keine Reiter ohne Hauptserie: eigene Serie (Horizonte), Film (Mewtu gegen Mew), Special', ohneHaupt.join() === '0,0,0', ohneHaupt)
const haupt = reiter(483).map((r) => r.label).join()
const HAUPT_REITER = '1–5,6–9,10–13,14–15,15–16,16a,16b,17–18,19,20–22,23–25,25'
pruefe('Hauptserie: 12 Reiter ohne „Staffel“, nach Nummer', haupt === HAUPT_REITER, haupt)
pruefe('Hauptserie: Ids in Staffelfolge', reiter(10852).map((r) => r.id).join() === '483,1349,1350,4745,5979,6415,6563,6802,7798,8283,10852,14838', reiter(10852).map((r) => r.id))
pruefe('Name am Reiter ist der Titel der Daten', reiter(483)[1]!.name === 'Pokémon Advanced Generation', reiter(483)[1]!.name)
/* Deutsche Staffelteilung als Sammeltitel: seit der Zusammenlegung ohne Bühnenfall, daher aus Horizonte nachgestellt. */
const staffel = (id: number, nr: number, bis: number) =>
  ({ ...offen(14839), id, titleDe: `Horizonte Staffel ${nr}`, staffelTitel: { sammel: 14839, nr, ab: 1 }, streams: [{ platform: 'netflix', url: 'https://x.invalid', dub: true, teilBereich: { von: 1, bis } }] }) as Title
const [st2, st1] = [staffel(990102, 2, 89), staffel(990101, 1, 45)]
pruefe('zwei Staffeln sind schon Reiter, Folge nach Nummer', reihenReiterVon(st2, teile, 'Pokémon', [st2, st1], HEUTE).map((r) => `${r.id}:${r.label}`).join() === '990101:1,990102:2')
pruefe('eine Staffel allein: keine Reiter', reihenReiterVon(st2, teile, 'Pokémon', [st2], HEUTE).length === 0)
/* Teilstaffeln am Reiter kurz (Daniel, 26.11.2026): „Staffel 3 - Teil 1“ → „3.1“, Spannen und Einzelstaffeln wie bisher. */
pruefe('Reiter-Kurzform: Teilstaffel 3.1 und 3.2, Staffel 3, Spanne 1–5, Teil ohne Staffelnummer', [reiterKurzform('Staffel 3 - Teil 1'), reiterKurzform('Staffel 3 - Teil 2'), reiterKurzform('Staffel 3'), reiterKurzform('Staffel 1–5'), reiterKurzform('Teil 1'), reiterKurzform('Staffel 12 - Teil 10')].join('|') === '3.1|3.2|3|1–5|Teil 1|12.10')
const teilGlied = (id: number, name: string, jpYear: number) => ({ id, name, format: 'TV', jpYear, episodes: 12, jpStatus: 'FINISHED' }) as FranchiseMember
const teilStaffeln = [teilGlied(900901, 'Reihe', 2020), teilGlied(900902, 'Reihe Staffel 2', 2021), teilGlied(900903, 'Reihe Staffel 3 Teil 1', 2022), teilGlied(900904, 'Reihe Staffel 3 Teil 2', 2023)]
pruefe('Hauptserie mit Teilstaffeln: Reiter 1, 2, 3.1, 3.2, der Name bleibt lang', JSON.stringify(reihenReiterVon({ id: 900901 } as Title, teilStaffeln, 'Reihe', [], HEUTE).map((r) => [r.label, r.name])) === '[["1","Reihe"],["2","Reihe Staffel 2"],["3.1","Reihe Staffel 3 Teil 1"],["3.2","Reihe Staffel 3 Teil 2"]]')
pruefe('Reiter-Kurzform: nur am Ende, mit Zusatz bleibt es', reiterKurzform('Staffel 3 - Teil 1 Zusatz') === '3 - Teil 1 Zusatz')
/* Reiter ohne Synchro (26.11.2026): auch Hauptstaffeln und Sammeltitel-Staffeln tragen das Flag, erschienen vorausgesetzt. */
const ohneSt = { ...st2, ohneSynchro: true, jpStatus: 'FINISHED' } as Title
pruefe('Sammeltitel-Staffel ohne Synchro: Reiter trägt ohneSynchro, die andere nicht', reihenReiterVon(ohneSt, teile, 'Pokémon', [ohneSt, st1], HEUTE).map((r) => `${r.id}:${r.ohneSynchro}`).join() === '990101:false,990102:true')
const teileOhne = teile.map((m) => (m.id === 1349 ? { ...m, ohneSynchro: true, jpStatus: 'FINISHED' } : m)) as FranchiseMember[]
pruefe('Hauptserie: Staffel ohne Synchro trägt ohneSynchro, alle anderen nicht', reihenReiterVon(offen(483), teileOhne, 'Pokémon', titel, HEUTE).filter((r) => r.ohneSynchro).map((r) => r.id).join() === '1349')
pruefe('Hauptserie zeigt nur Hauptserie, kein Film', reiter(483).every((r) => teile.find((m) => m.id === r.id)?.format === 'TV' && r.staffel), reiter(483))
pruefe('ohne Reihe: keine Reiter', reihenReiterVon(offen(10852), [], 'Pokémon', titel, HEUTE).length === 0)
const aot = faelle['attack-on-titan']!
const aotTitel = aot['titles.json'] as Title[]
const aotTeile = Object.values(aot['franchises.json'] as Record<string, FranchiseMember[]>)[0]!
const aotReiter = (id: number) => reihenReiterVon(aotTitel.find((t) => t.id === id)!, aotTeile, 'Attack on Titan', aotTitel, HEUTE)
/* Final Season trägt einen eigenen Namen, die Reihenliste nummeriert sie trotzdem (4.1, 4.2): der Reiter folgt ihr. Junior High zählt sie
   als Staffel 2 neben Staffel 2, daher 2a/2b wie Pokémon 16a/16b. Bis 27.11.2026 fehlten hier Final Season und Junior High. */
const AOT_REITER = '[[6282,"1"],[7496,"2a"],[7730,"2b"],[8669,"3.1"],[10088,"3.2"],[10659,"4.1"],[12819,"4.2"]]'
pruefe('Attack on Titan: Staffeln mit eigenem Namen tragen die Nummer der Reihenliste', JSON.stringify(aotReiter(6282).map((r) => [r.id, r.label])) === AOT_REITER, aotReiter(6282))
pruefe('Attack on Titan: Final Season öffnet mit derselben Leiste', JSON.stringify(aotReiter(10659).map((r) => [r.id, r.label])) === AOT_REITER, aotReiter(10659))
/* Daniels Meldung 27.11.2026 an den Bühnenfällen (Kennungen ak): Tokyo Revengers hatte als Hauptserie keine Reiter, weil drei der vier
   Staffeln eigene Namen tragen; Kishibe Rohan (OVA, /t/8117/) hatte die Reiter der Gruppe „Specials & OVAs“. */
function reiterImFall(fallName: string, id: number): string {
  const f = faelle[fallName]!
  const alle = f['titles.json'] as Title[]
  const t = alle.find((x) => x.id === id)!
  const reihe = (f['franchises.json'] as Record<string, FranchiseMember[]>)[t.franchiseId ?? t.id] ?? []
  const daten = { titles: alle, titleById: new Map(alle.map((x) => [x.id, x])), releasesByTitle: new Map() } as unknown as Dataset
  const [rTeile, rName] = [reihenTeileVon(t, reihe, daten), reihenNameVon(t, reihe, daten)]
  return reihenReiterVon(t, rTeile, rName, alle, HEUTE).map((r) => `${r.id}:${r.label}`).join()
}
/* Die Fassung von 1993 ist Hauptserie, aber allein in ihrer Zählgruppe: die Reiter der Neuverfilmung (2025, 2027) gehören nicht zu ihr. */
const yaiba = (faelle['yaiba-joyn']!['franchises.json'] as Record<string, FranchiseMember[]>)['15908']!
const yaibaReiter = (id: number) => reihenReiterVon({ id } as Title, yaiba, 'Yaiba', [], HEUTE).map((r) => `${r.id}:${r.label}`).join()
pruefe('Yaiba 1993 ohne Reiter, die Neuverfilmung mit 1 und 2', yaibaReiter(1994) === '' && yaibaReiter(15908) === '15908:1,17067:2', [yaibaReiter(1994), yaibaReiter(15908)])
const TR = '11705:1,13789:2,15022:3,15957:4'
const trJe = [11705, 13789, 15957].map((id) => reiterImFall('tokyo-revengers', id))
pruefe('Meldung: Tokyo Revengers zeigt an jeder Staffel die Reiter 1–4', trJe.every((r) => r === TR), trJe)
pruefe('Meldung: Kishibe Rohan (OVA, ak 8117) ohne Reiter, die JoJo-Hauptserie mit Reitern', reiterImFall('fernsehtag-jojo', 8117) === '' && reiterImFall('fernsehtag-jojo', 7040).startsWith('6041:1,7040:2'), [reiterImFall('fernsehtag-jojo', 8117), reiterImFall('fernsehtag-jojo', 7040)])
/* Eine Staffel in zwei Teilen (Sakamoto Days ohne den Eintrag 2027): Beschriftung „Teil 1/2“, aber kein Staffelstand. Brach die Bühne (disc-bereich-2). */
const sk = faelle['sakamoto-days']!
const skTitel = sk['titles.json'] as Title[]
const skTeile = (sk['franchises.json'] as Record<string, FranchiseMember[]>)['15940']!.filter((m) => m.id !== 17244)
let skReiter: unknown
try {
  skReiter = reihenReiterVon(skTitel.find((t) => t.id === 15940)!, skTeile, 'Sakamoto Days', skTitel, HEUTE).map((r) => [r.id, r.label])
} catch (fehler) {
  skReiter = String(fehler)
}
/*
 * Klasse zum Nachtrag (Daniel 24.11.2026 20:21–20:25), je Titel-Reihe-Paar: Reiter tragen nur die Kurzform, der volle Titel steht im
 * Namen; kein Reiter-Titel steht noch in der Reihenliste, und jeder Teil der Reihe bleibt erreichbar (Reiter oder Liste).
 */
const KURZFORM = /^(\d+[a-z]?(–\d+)?(\.\d+)?|Teil \d+)$/
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
/* Klasse zur Meldung 27.11.2026: Reiter nur an Hauptstaffeln (oder Sammeltitel-Staffeln), und jede nummerierte Hauptstaffel hat welche. */
const meldungFehler: string[] = []
function klasseMeldung(wo: string, t: Title, liste: ReturnType<typeof reihenReiterVon>, rTeile: FranchiseMember[], rName: string): void {
  const haupt = hauptstaffeln(rTeile)
  const stand = staffelStaende(haupt, rName)
  if (liste.length && !t.staffelTitel && !haupt.some((m) => m.id === t.id)) meldungFehler.push(`${wo}: Reiter ohne Hauptserie`)
  if (!liste.length && stand.size >= 2 && stand.has(t.id)) meldungFehler.push(`${wo}: Hauptstaffel ohne Reiter`)
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
        const liste = reihenReiterVon(t, rTeile, rName, alle, HEUTE)
        for (const r of liste) reihenLageVon(daten.titleById.get(r.id) ?? t, [], '2026-11-24')
        klasseNachtrag(`${name}/${t.id}`, liste, rTeile, rName)
        klasseMeldung(`${name}/${t.id}`, t, liste, rTeile, rName)
        gerechnet++
      } catch (fehler) {
        abstuerze.push(`${name}/${t.id}: ${String(fehler).slice(0, 80)}`)
      }
    }
  }
}
pruefe(`alle Bühnenfälle ohne Absturz (${gerechnet} Titel-Reihe-Paare)`, gerechnet > 100 && abstuerze.length === 0, abstuerze.slice(0, 5))
pruefe('alle Bühnenfälle: Kurzform, kein Titel in Reiter und Reihenliste, keiner unerreichbar', nachtragFehler.length === 0, nachtragFehler.slice(0, 5))
pruefe('alle Bühnenfälle: Reiter nur an Hauptstaffeln, jede nummerierte Hauptstaffel mit Reitern', meldungFehler.length === 0, meldungFehler.slice(0, 5))
const rohe = (labels: string[]) => labels.map((label, i) => ({ id: i + 1, label, name: `T${i + 1}`, staffel: true, ohneSynchro: false }))
pruefe('Eindeutigkeit: gleiche Beschriftung a, b in Listenreihenfolge; einmalige und Überlappung bleiben', eindeutigeBeschriftung(rohe(['14–15', '15–16', '16', '16', '25', '16'])).map((r) => r.label).join() === '14–15,15–16,16a,16b,25,16c')
pruefe('Staffel in zwei Teilen ohne Staffelstand: Teil 1, Teil 2 nach Kennung', JSON.stringify(skReiter) === '[[15940,"Teil 1"],[16333,"Teil 2"]]', skReiter)

/* Lage am Stichtag des Mockups (24.11.2026): Horizonte läuft; Hauptserie 1–5 kommt, 23–25 läuft. */
const STICHTAG = '2026-11-24'
const releases = fall['releases.json'] as Release[]
const von = (id: number) => releases.filter((r) => r.titleId === id)
const lage = (id: number) => reihenLageVon(offen(id), von(id), STICHTAG)
pruefe('Horizonte läuft', lage(14839) === 'laeuft', lage(14839))
pruefe('Horizonte vor dem Start (2022) kommt', reihenLageVon(offen(14839), von(14839), '2022-01-01') === 'kommt', reihenLageVon(offen(14839), von(14839), '2022-01-01'))
pruefe('Hauptserie: 1–5 kommt, 23–25 läuft', [483, 1349, 10852, 14838].map(lage).join() === 'kommt,ruht,laeuft,ruht', [483, 1349, 10852, 14838].map(lage))
const gesichtet = (bis: number) => von(14839).map((r) => ({ ...r, schedule: { ...r.schedule, observed: { [bis - 1]: '2026-11-20', [bis]: '2026-11-21' } } }))
pruefe('Sichtung vor dem Staffelende: Staffel 1 und 2 laufen', reihenLageVon(st1, gesichtet(20), STICHTAG) === 'laeuft' && reihenLageVon(st2, gesichtet(20), STICHTAG) === 'laeuft')
pruefe('Sichtung über das Ende von Staffel 1 hinaus: Staffel 1 läuft nicht mehr, Staffel 2 schon', [st1, st2].map((s) => reihenLageVon(s, gesichtet(60), STICHTAG)).join() !== 'laeuft,laeuft' && reihenLageVon(st2, gesichtet(60), STICHTAG) === 'laeuft', [st1, st2].map((s) => reihenLageVon(s, gesichtet(60), STICHTAG)))
pruefe('Sichtung genau bis zur letzten Folge von Staffel 1: Staffel 1 läuft nicht mehr', reihenLageVon(st1, gesichtet(45), STICHTAG) !== 'laeuft' && reihenLageVon(st2, gesichtet(45), STICHTAG) === 'laeuft', [st1, st2].map((s) => reihenLageVon(s, gesichtet(45), STICHTAG)))
const kurz = { ...offen(10852), streams: [{ platform: 'netflix', url: 'https://x.invalid', dub: true, teilBereich: { von: 1, bis: 2 } }] } as Title
pruefe('ohne Sammeltitel filtert keine Sichtung', reihenLageVon(kurz, von(10852), STICHTAG) === 'laeuft')
pruefe('Plan vorbei: mit bekannter Folgenzahl ruht, ohne läuft', reihenLageVon({ ...offen(8464), episodes: 12 }, von(8464), STICHTAG) === 'ruht' && reihenLageVon({ ...offen(8464), episodes: undefined }, von(8464), STICHTAG) === 'laeuft')

/* Reihenliste mit Reitern am Kasten (statisch): Reiter-Titel zählen nicht am Schalter „ohne Synchro“, ohne übrige Teile keine Karte. */
const glied = (id: number, mehr: Partial<FranchiseMember> = {}) => ({ id, name: `Reihe ${id}`, format: 'TV', jpYear: 2000 + (id % 100), episodes: 12, ...mehr }) as FranchiseMember
function listeMitReitern(teileListe: FranchiseMember[], reiterIds: number[]): string {
  const reiterListe = reiterIds.map((id) => ({ id, label: String(id), name: `Reihe ${id}`, staffel: true, ohneSynchro: false }))
  const liste = () => {
    const { t } = useLang()
    const eigenschaften = { reihenTeile: teileListe, t, reihenName: 'Reihe', title: { id: reiterIds[0] } as Title, favorites: new Set<number>(), wechselt: false, wechsleZu() {} }
    const zustand = { reihenSchluessel: 1, reiheSuche: { reihe: 1, text: '' }, setReiheSuche() {} }
    return h(ReihenListe, { ...eigenschaften, ...zustand })
  }
  return renderToStaticMarkup(h(ReihenReiterKontext.Provider, { value: { data: {} as Dataset, reiter: reiterListe, wechsleZu() {} } }, h(liste)))
}
const kleineReihe = [glied(900001), glied(900002, { ohneSynchro: true }), glied(900003, { format: 'MOVIE', episodes: 1 }), glied(900004, { format: 'MOVIE', episodes: 1 })]
pruefe('Spur: kein Schalter mehr, der Teil ohne Synchro steht immer in der Liste (nicht, wenn er Reiter ist)', !listeMitReitern(kleineReihe, [900001]).includes('type="checkbox"') && listeMitReitern(kleineReihe, [900001]).includes('data-reihe-teil="900002"') && !listeMitReitern(kleineReihe, [900001, 900002]).includes('data-reihe-teil="900002"'))
const grosseReihe = [...kleineReihe, ...Array.from({ length: 13 }, (_, i) => glied(900010 + i, { format: 'MOVIE', episodes: 1 }))]
pruefe('Übersicht: kein Schalter mehr', listeMitReitern(grosseReihe, [900001]).includes('data-reihe-uebersicht') && !listeMitReitern(grosseReihe, [900001]).includes('type="checkbox"'))
pruefe('alle Teile als Reiter: keine Reihen-Karte', listeMitReitern(kleineReihe, [900001, 900002, 900003, 900004]) === '' && listeMitReitern(kleineReihe, [900001, 900002]) !== '')

/* Reiterzeile allein (statisch): 900101 läuft, 900102 ohne Synchro und gewählt, 900103 ohne Synchro; nur 900101 steht in `lagen`. */
const zeileReiter = [900101, 900102, 900103].map((id) => ({ id, label: String(id - 900100), name: `Reihe ${id}`, staffel: true, ohneSynchro: id !== 900101 }))
const zeilenHtml = renderToStaticMarkup(h(ReihenReiterZeile, { reiter: zeileReiter, aktiv: 900102, lagen: new Map([[900101, { lage: 'laeuft' as const }]]), farbe: 'bg-ak-test-kasten border-ak-akzent', kennung: 'z', beiWahl() {} }))
const knopf = (id: number) => new RegExp(`<button[^>]*id="z-reiter-${id}"[^>]*>(.*?)</button>`).exec(zeilenHtml)
const klassenVon = (id: number) => (/class="([^"]*)"/.exec(knopf(id)?.[0] ?? '')?.[1] ?? '').split(' ')
const labelVon = (id: number) => /aria-label="([^"]*)"/.exec(knopf(id)?.[0] ?? '')?.[1]
pruefe('Reiterzeile: gewählter Teil ohne Synchro trägt die Kastenfläche, gestrichelt, groß', ['bg-ak-test-kasten', 'border-dashed', 'border-ak-sehr-leise', 'min-h-[3.25rem]'].every((k) => klassenVon(900102).includes(k)) && !klassenVon(900102).includes('border-ak-akzent'), klassenVon(900102))
pruefe('Reiterzeile: nicht gewählter Teil ohne Synchro grau und gestrichelt, ohne Kastenfläche', ['bg-ak-flaeche-2', 'border-dashed', 'min-h-11'].every((k) => klassenVon(900103).includes(k)) && !klassenVon(900103).includes('bg-ak-test-kasten'), klassenVon(900103))
pruefe('Reiterzeile: Marke und „läuft“ nur am Reiter mit Lage, ohne Eintrag in lagen ruht er', (knopf(900101)?.[1] ?? '').includes('data-lage="laeuft"') && !/data-lage/.test(`${knopf(900102)?.[1]}${knopf(900103)?.[1]}`), [knopf(900101)?.[1], knopf(900102)?.[1]])
pruefe('Reiterzeile: aria-label mit Lage und ohne Synchro, nichts Leeres angehängt', [labelVon(900101), labelVon(900102)].join('|') === 'Staffel 1: Reihe 900101, läuft|Staffel 2: Reihe 900102, ohne deutsche Synchro', [labelVon(900101), labelVon(900102)])

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
/* Das Panel nimmt `today` aus der Uhr: fest auf den Stichtag der Liste oben. */
const echteUhr = festeUhr(`${HEUTE}T12:00:00Z`)

let fokus: MiniKnoten | undefined
const verhindert: string[] = []
const dom = installiereMiniDom(
  { ...attrappeUhr(), matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), location: ort, scrollTo() {}, innerWidth: 400, innerHeight: 800, getComputedStyle: () => ({}) } as never,
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
  getBoundingClientRect: () => ({ left: 0, top: 300, right: 44, bottom: 344, width: 44, height: 44 }),
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

/* Hauptserie, offen ist 23–25 (Nr. 11 von 12). Seit 27.11.2026 haben nur Hauptstaffeln Reiter; Horizonte und die Filme prüft der Schluss. */
const hz = await zeige(10852)
const GEWAEHLT = 10
const nurGewaehlt = (an: string, aus: string) => hz.tabs.map((_, i) => (i === GEWAEHLT ? an : aus)).join()
pruefe('Panel Hauptserie: Leiste mit role=tablist und 12 Reitern', hz.leiste?.getAttribute('role') === 'tablist' && hz.tabs.map(text).join() === HAUPT_REITER, hz.tabs.map(text))
pruefe('gewählt ist der offene Titel (Nr. 11), nur er per Tab erreichbar', hz.tabs.map((k) => `${k.getAttribute('aria-selected')}/${k.getAttribute('tabindex')}`).join() === nurGewaehlt('true/0', 'false/-1'))
pruefe('Kasten ist das tabpanel des gewählten Reiters', hz.panel?.getAttribute('aria-labelledby') === 'reihe-10852-reiter-10852' && hz.tabs.every((k) => k.getAttribute('aria-controls') === 'reihe-10852-kasten'))
pruefe('Kasten steht im tabpanel', (hz.panel?.finde((k) => k.tagName === 'SECTION').length ?? 0) === 1)
/* Aussehen aus den Klassen: gewählter Reiter in der Farbe der Kastenhülle, Tippfläche ≥ 44 px (Stufe × 4 px bzw. [n rem] × 16 px), kein Scrollbalken. */
const klasse = (k: MiniKnoten | undefined) => k?.getAttribute('class') ?? ''
const kastenHuelle = klasse(hz.panel?.finde((k) => k.tagName === 'SECTION')[0]).split(' ').filter((k) => /^(dark:)?(border|bg)-/.test(k))
pruefe('gewählter Reiter trägt Rand und Fläche des Kastens', kastenHuelle.length >= 2 && kastenHuelle.every((k) => klasse(hz.tabs[GEWAEHLT]).split(' ').includes(k)), [kastenHuelle, klasse(hz.tabs[GEWAEHLT])])
pruefe('nicht gewählte Reiter ruhig grau', !kastenHuelle.some((k) => klasse(hz.tabs[0]).split(' ').includes(k)) && klasse(hz.tabs[0]).includes('bg-ak-flaeche-2'), klasse(hz.tabs[0]))
const pxVon = (klassen: string, vorsatz: string) => {
  const m = new RegExp(`(?:^| )${vorsatz}-(?:(\\d+)|\\[([\\d.]+)rem\\])(?= |$)`).exec(klassen)
  return m ? (m[1] ? Number(m[1]) * 4 : Number(m[2]) * 16) : 0
}
pruefe('Tippfläche jedes Reiters ≥ 44 × 44 px', hz.tabs.every((k) => pxVon(klasse(k), 'min-h') >= 44 && pxVon(klasse(k), 'min-w') >= 44), hz.tabs.map(klasse))
pruefe('Akzentstrich nur am gewählten Reiter', hz.tabs.map((k) => k.finde((x) => klasse(x).split(' ').includes('bg-ak-akzent')).length).join() === nurGewaehlt('1', '0'))
pruefe('kein Scrollbalken, vor der Messung kein Pfeil', klasse(hz.leiste).includes('[scrollbar-width:none]') && klasse(hz.leiste).includes('[&::-webkit-scrollbar]:hidden') && dom.wurzel.finde((k) => k.getAttribute('data-pfeil') !== null).length === 0)
fokus = undefined
const druecke = (ziel: MiniKnoten, key: string) => {
  const e = { type: 'keydown', key, target: ziel, bubbles: true, cancelable: true, defaultPrevented: false, timeStamp: 0, preventDefault() { verhindert.push(key) }, stopPropagation() {} }
  for (const capture of [true, false]) (dom.wurzel.hoerer.get('keydown') ?? []).filter((x) => x.capture === capture).forEach((x) => x.f(e))
}
await act(async () => druecke(hz.tabs[GEWAEHLT]!, 'ArrowLeft'))
pruefe('Taste ← fokussiert den Reiter davor (20–22), öffnet nichts', text(fokus ?? hz.tabs[0]!) === '20–22' && fokus !== undefined && geoeffnet.length === 0, [fokus && text(fokus), geoeffnet])
/* Weiter vom fokussierten Reiter aus (nicht vom gewählten): ← auf 20–22 führt zu 19. */
await act(async () => druecke(hz.tabs[GEWAEHLT - 1]!, 'ArrowLeft'))
pruefe('zweites ← geht vom fokussierten Reiter aus (19)', fokus !== undefined && text(fokus) === '19' && geoeffnet.length === 0, fokus && text(fokus))
await act(async () => druecke(hz.tabs[GEWAEHLT]!, 'Home'))
pruefe('Pos1 fokussiert Reiter 1–5 und unterdrückt das Seitenrollen', fokus !== undefined && text(fokus) === '1–5' && verhindert.join() === 'ArrowLeft,ArrowLeft,Home', verhindert)
await act(async () => klicke(dom.wurzel, hz.tabs[1]!))
pruefe('Klick auf Reiter 6–9 öffnet Advanced Generation über den Weg der Reihenliste', geoeffnet.join() === '1349', geoeffnet)

/* Tooltip: kein `title` je Reiter, die Blase entsteht beim Zeigen (`reiter-blase.tsx`; Verhalten in check-reiter-blase.ts). */
const html = dom.wurzel.parentNode!
async function blasenText(k: MiniKnoten | undefined): Promise<string> {
  if (!k) return ''
  await act(async () => feuere(dom.wurzel, 'mouseover', k))
  const inhalt = html.finde((x) => x.getAttribute('role') === 'tooltip').map((x) => x.textContent).join('|')
  await act(async () => feuere(dom.wurzel, 'mouseout', k))
  return inhalt
}
const ersteZeile = (s: string) => s.split('\n')[0]
const hzBlasen: string[] = []
for (const k of hz.tabs) hzBlasen.push(await blasenText(k))
pruefe('Tooltip: kein title, die Blase nennt den vollen Titel (erste Zeile)', hz.tabs.every((k) => k.getAttribute('title') === null) && hzBlasen.map(ersteZeile).join('|') === reiter(10852).map((r) => r.name).join('|'), hzBlasen)
pruefe('Tooltip: ohne Teil ohne Synchro keine Gestrichelt-Zeile', hzBlasen.every((b) => !b.includes('gestrichelt')), hzBlasen)
/* Reihenliste: große Reihe als Übersicht; Gruppen mit Zahl (`data-reihe-gruppe`), die Reiter-Titel fehlen in ihrer Gruppe. */
const gruppenZahl = () => dom.wurzel.finde((k) => k.getAttribute('data-reihe-gruppe') !== null).map((k) => `${k.getAttribute('data-reihe-gruppe')}=${text(k).replace(/\D+/g, '')}`).join()
pruefe('Hauptserie ganz als Reiter, fehlt in der Liste; eigene Serien, Filme, Specials ganz', gruppenZahl() === 'Eigene Serien=8,Filme=26,Specials & OVAs=86', gruppenZahl())
/* Keine Hauptserie, keine Leiste (Daniel 27.11.2026): Horizonte (eigene Serie) und ein Film zeigen alle Gruppen der Reihenliste (die eigene aufgeklappt). */
const gruppenNamen = () => dom.wurzel.finde((k) => k.getAttribute('data-reihe-gruppe') !== null).map((k) => k.getAttribute('data-reihe-gruppe')).join()
for (const [wer, id] of [['Horizonte', 14839], ['Film Mewtu gegen Mew', 5726]] as const) {
  const p = await zeige(id)
  pruefe(`Panel ${wer}: keine Reiter, kein tabpanel, die Reihenliste zeigt alle Gruppen`, p.leiste === undefined && p.panel === undefined && gruppenNamen() === 'Hauptserie,Eigene Serien,Filme,Specials & OVAs', [p.tabs.length, gruppenNamen()])
}
const hauptPanel = await zeige(10852)
const hauptAria = hauptPanel.tabs[0]?.getAttribute('aria-label') ?? ''
const hauptBlase = await blasenText(hauptPanel.tabs[0])
pruefe('Hauptserie: aria-label nennt Staffel und Titel', hauptAria.startsWith(`Staffel ${text(hauptPanel.tabs[0]!)}: ${ersteZeile(hauptBlase)}`), hauptAria)
/* Der Grund der Marke kommt aus den Lagen am Kasten (`ReihenReiterAmKasten`): die erste Serie kommt mit der DVD am 27.11.2026. */
pruefe('Hauptserie: Reiter 1–5 nennt Titel und Grund des Rings', text(hauptPanel.tabs[0]!) === '1–5' && hauptBlase === 'Pokémon\n○ = DVD am 27.11.2026', hauptBlase)
/* Ein Titel ohne Reihe (eigene Kennung, keine Reihenteile): keine Leiste, kein tabpanel um den Kasten. */
const allein = { ...offen(5726), id: 990001, franchiseId: 990001, titleDe: 'Ohne Reihe', titleEn: 'Ohne Reihe', titleRomaji: 'Ohne Reihe' } as Title
const ohneReihe = await zeige(990001, { ...data, titles: [allein], titleById: new Map([[allein.id, allein]]), releasesByTitle: new Map() })
pruefe('Titel ohne Reihe: keine Reihen-Reiter, kein tabpanel', ohneReihe.leiste === undefined && ohneReihe.panel === undefined)
/* Der gewählte Reiter trägt Fläche und Randfarbe des Kastens, auch die mit Dunkelthema-Vorsatz; Abstand, Rundung und Randbreite bleiben am Kasten. */
const farbe = kastenFarbe('rounded-lg p-3 bg-ak-flaeche dark:bg-ak-flaeche-2 border border-ak-rand dark:border-ak-akzent')
pruefe('kastenFarbe: Fläche und Randfarbe samt dark:-Klassen, ohne Abstand und Rundung', farbe === 'bg-ak-flaeche dark:bg-ak-flaeche-2 border-ak-rand dark:border-ak-akzent', farbe)

/* Gestrichelt-Zeile im Tooltip, live: die Reiterzeile allein mit einem Teil ohne Synchro (bis 27.11.2026 am Horizonte-Reiter 7 geprüft). */
await act(async () => wurzel.render(h(ReihenReiterZeile, { reiter: zeileReiter, aktiv: 900101, lagen: new Map(), farbe: '', kennung: 'z', beiWahl() {} })))
const zeilenTabs = dom.wurzel.finde((k) => k.getAttribute('role') === 'tab')
const [mitBlase, ohneBlase] = [await blasenText(zeilenTabs[2]), await blasenText(zeilenTabs[0])]
pruefe('Tooltip: Reiter ohne Synchro erklärt den gestrichelten Rand in der letzten Zeile', mitBlase.endsWith('\ngestrichelt = ohne deutsche Synchro') && !ohneBlase.includes('gestrichelt'), [mitBlase, ohneBlase])

await act(async () => wurzel.unmount())
dom.entferne()
echteUhr()
if (verletzt) {
  console.error(`\n${verletzt} Zusicherung(en) verletzt.`)
  process.exit(1)
}
console.log('check-reihen-reiter: ok (Reiter nur an Hauptstaffeln: Hauptserie/AoT/Tokyo Revengers mit, Horizonte/Filme/Specials/Kishibe Rohan ohne, Kurzform und keine Doppelung in allen Bühnenfällen, Lage 9 Fälle, echtes Panel: ARIA, Tooltip, Tastatur, Klick öffnet Titel, Reihenliste ohne Reiter-Titel)')
