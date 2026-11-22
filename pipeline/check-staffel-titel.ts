/**
 * Zusicherung: **ein Sammeltitel wird zu einem Titel je Staffel** (Daniel, 20.11.2026: „aufteilen in einzelne staffeln, statt alles in 1“;
 * `pipeline/lib/staffel-titel.ts`, `staffel-folgen.ts`, Phase `pipeline/bau/staffel-titel.ts`). Hier: Plan aus der Yaml, Wege, TOGGO-Blöcke,
 * Titel, Folgenliste, Riegel, Rückweg der Meldungen und `al` der Ausgabe — mit festen Fixtures (Grenzen wie Horizonte 45/44/47/offen).
 * Termine und TV-Zuordnung nach Folgentitel: `check-staffel-titel-termine.ts`. Läuft in `check:logic`.
 */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { StreamLink, Title } from '../shared/types.ts'
import type { WatchLink } from '../shared/watchlink-typ.ts'
import { STAFFEL_ID_BASIS, istStaffelTitel, staffelVonTiteln, zurueckAufSammeltitel } from '../shared/staffel-titel.ts'
import { staffelPlaene, teileStreams, teileTitel, teileWatchLinks, type StaffelPlan } from './lib/staffel-titel.ts'
import { teileFolgenDatei } from './lib/staffel-folgen.ts'
import { uebersetzeDatei } from './lib/ausgabe-kennung.ts'
import { pruefeSchnitt } from './bau/staffel-titel.ts'
import { sammelSicht, schreibeFolgenEintrag } from './bau/staffel-folgen-schreiben.ts'

let fehler = 0
let faelle = 0
function pruefe(name: string, ok: boolean, info = ''): void {
  faelle++
  if (ok) return
  fehler++
  console.error(`✖ ${name}${info ? ` — ${info}` : ''}`)
}
const wirft = (f: () => unknown, muster: RegExp): boolean => {
  try {
    f()
    return false
  } catch (e) {
    return muster.test((e as Error).message)
  }
}

const SAMMEL = 158871
const GRENZEN = {
  anilistId: SAMMEL,
  titel: 'Pokémon Horizonte',
  basis: 4,
  staffeln: [
    { nr: 1, von: 1, bis: 45, folgen: 45, kennung: 7_000_001 },
    { nr: 2, von: 46, bis: 89, folgen: 44, kennung: 7_000_002 },
    { nr: 3, von: 90, bis: 136, folgen: 47, kennung: 7_000_003 },
    { nr: 4, von: 137, offen: true as const },
  ],
}

// --- Kennungsraum ---------------------------------------------------------------------------------------------------------------------
pruefe('Raum 7 bis unter 8 Mio.', STAFFEL_ID_BASIS === 7_000_000 && istStaffelTitel(7_000_000) && istStaffelTitel(7_999_999))
pruefe('nicht Staffel-Titel: AniList, eigene Titel (5 Mio.), 6 Mio., Testkennungen 9.000.0xx, aniSearch (10 Mio.)', [158871, 5_000_001, 6_000_000, 6_999_999, 8_000_000, 9_000_051, 10_000_000].every((id) => !istStaffelTitel(id)))

// --- Plan aus der Yaml ----------------------------------------------------------------------------------------------------------------
const [plan] = staffelPlaene([GRENZEN]) as [StaffelPlan]
pruefe('Plan: vier Staffeln, Basis behält die Kennung des Sammeltitels', plan.staffeln.map((s) => s.kennung).join() === '7000001,7000002,7000003,158871', JSON.stringify(plan.staffeln))
pruefe('Plan: offene Staffel ohne bis', plan.staffeln[3]!.bis === undefined && plan.staffeln[2]!.bis === 136)
pruefe('ohne basis kein Plan (Phase ist ein No-op)', staffelPlaene([{ ...GRENZEN, basis: undefined }]).length === 0)
const ohneKennung = { ...GRENZEN, staffeln: GRENZEN.staffeln.map((s) => (s.nr === 2 ? { ...s, kennung: undefined } : s)) }
pruefe('basis, aber Staffel 2 ohne kennung: wirft', wirft(() => staffelPlaene([ohneKennung]), /Staffel 2 ohne gültige kennung/))
const fremdeKennung = { ...GRENZEN, staffeln: GRENZEN.staffeln.map((s) => (s.nr === 2 ? { ...s, kennung: 6_000_002 } : s)) }
pruefe('Kennung außerhalb des Staffel-Raums: wirft', wirft(() => staffelPlaene([fremdeKennung]), /Staffel 2 ohne gültige kennung/))
const doppelt = { ...GRENZEN, staffeln: GRENZEN.staffeln.map((s) => (s.nr === 2 ? { ...s, kennung: 7_000_001 } : s)) }
pruefe('doppelte Kennung: wirft', wirft(() => staffelPlaene([doppelt]), /doppelt/))
const basisMitKennung = { ...GRENZEN, staffeln: GRENZEN.staffeln.map((s) => (s.nr === 4 ? { ...s, kennung: 7_000_004 } : s)) }
pruefe('Basis mit eigener kennung: wirft', wirft(() => staffelPlaene([basisMitKennung]), /basis und trägt trotzdem/))
pruefe('basis ist keine Staffel: wirft', wirft(() => staffelPlaene([{ ...GRENZEN, basis: 5 }]), /keine Staffel/))

// --- Wege -----------------------------------------------------------------------------------------------------------------------------
const rtl: StreamLink = { platform: 'rtlplus', url: 'https://plus.rtl.de/x-p_1', dub: true, dubRanges: [{ from: 1, to: 136, dub: true }] } as StreamLink
const netflix: StreamLink = { platform: 'netflix', url: 'https://www.netflix.com/title/1', dub: true, dubRanges: [{ from: 2, to: 44, dub: true }] } as StreamLink
const ohneBereich: StreamLink = { platform: 'joyn', url: 'https://www.joyn.de/x', dub: true } as StreamLink
const w = teileStreams([rtl, netflix, ohneBereich], plan)
const rtlJe = [1, 2, 3, 4].map((nr) => w.je.get(nr)!.find((s) => s.platform === 'rtlplus'))
pruefe('RTL+ 1–136: Staffel 1 1–45, 2 1–44, 3 1–47 (in Staffelzählung)', JSON.stringify(rtlJe.slice(0, 3).map((s) => s?.dubRanges)) === JSON.stringify([[{ from: 1, to: 45, dub: true }], [{ from: 1, to: 44, dub: true }], [{ from: 1, to: 47, dub: true }]]), JSON.stringify(rtlJe.map((s) => s?.dubRanges)))
pruefe('RTL+: Staffel 4 ohne Weg (Bereich reicht nicht bis 137)', rtlJe[3] === undefined)
pruefe('RTL+: teilBereich in Anbieterzählung, sharedWith 3', JSON.stringify(rtlJe[1]?.teilBereich) === '{"von":46,"bis":89}' && rtlJe.slice(0, 3).every((s) => s?.sharedWith === 3), JSON.stringify(rtlJe[1]))
const nfJe = [1, 2, 3, 4].map((nr) => w.je.get(nr)!.find((s) => s.platform === 'netflix'))
pruefe('Netflix 2–44 nur Staffel 1, ohne sharedWith', nfJe[0]?.dubRanges?.[0]?.to === 44 && nfJe[0]?.sharedWith === undefined && nfJe.slice(1).every((s) => s === undefined))
pruefe('Weg ohne Bereiche: an jede Staffel, sharedWith 4', [1, 2, 3, 4].every((nr) => w.je.get(nr)!.some((s) => s.platform === 'joyn' && s.sharedWith === 4)) && w.ohneBereich === 1)
pruefe('Wege: nichts verloren', w.verloren === 0, String(w.verloren))
const nurTon = teileStreams([{ ...rtl, dubRanges: [{ from: 1, to: 45, dub: true }, { from: 46, to: 89, dub: false }] }], plan)
pruefe('dub je Staffel aus ihren Bereichen (Staffel 2 nur ohne Synchro → dub false)', nurTon.je.get(1)![0]!.dub === true && nurTon.je.get(2)![0]!.dub === false)
const [geschlossen] = staffelPlaene([{ ...GRENZEN, basis: 3, staffeln: GRENZEN.staffeln.slice(0, 3).map((s) => (s.nr === 3 ? { ...s, kennung: undefined } : s)) }])
pruefe('geschlossener Plan: Folgen hinter der letzten Staffel zählen als verloren', teileStreams([{ ...rtl, dubRanges: [{ from: 1, to: 140, dub: true }] }], geschlossen!).verloren === 4)

// --- TOGGO-Blöcke ---------------------------------------------------------------------------------------------------------------------
const toggo = (staffel: number, von: number, bis: number) => ({ staffel, von, bis, ab: '2026-01-01T00:00', ende: '2026-12-31T23:59' })
const tg: WatchLink = { name: 'TOGGO', url: 'https://www.toggo.de/x', kind: 'stream', toggo: [toggo(1, 1, 45), toggo(2, 1, 20), toggo(2, 21, 44), toggo(3, 1, 47), toggo(4, 1, 1)] } as WatchLink
const disc: WatchLink = { name: 'Amazon', url: 'https://www.amazon.de/dp/X', kind: 'buy' } as WatchLink
const l = teileWatchLinks([tg, disc], plan)
pruefe('TOGGO: Blöcke nach Feld staffel (1/2/1/1)', [1, 2, 3, 4].map((nr) => l.je.get(nr)!.find((x) => x.toggo)?.toggo?.length ?? 0).join() === '1,2,1,1')
pruefe('TOGGO: Summe der Blöcke bleibt, keiner fremd', l.bloecke === 5 && l.fremd === 0)
pruefe('anderer Hinweis (Kauf) an jeder Staffel', [1, 2, 3, 4].every((nr) => l.je.get(nr)!.some((x) => x.name === 'Amazon')))
pruefe('TOGGO-Block einer unbekannten Staffel zählt fremd', teileWatchLinks([{ ...tg, toggo: [toggo(5, 1, 3)] }], plan).fremd === 1)

// --- Titel ----------------------------------------------------------------------------------------------------------------------------
const sammel = {
  id: SAMMEL,
  slug: 'pokemon-horizons-the-series-158871',
  titleDe: 'Pokémon Horizonte',
  malId: 53876,
  anisearchId: 17947,
  franchiseId: 527,
  eigenesWerk: true,
  deErstausgabe: { von: '2024-02-02', publisher: 'polyband', synchro: true },
  streams: [rtl, netflix],
  watchLinks: [tg],
  genres: [],
  keywords: [],
} as unknown as Title
const titel = teileTitel(sammel, plan)
pruefe('vier Titel, Kennungen 7000001–7000003 und 158871', titel.map((t) => t.id).join() === '7000001,7000002,7000003,158871')
pruefe('Namen „… – Staffel N“', titel.map((t) => t.titleDe).join('|') === 'Pokémon Horizonte – Staffel 1|Pokémon Horizonte – Staffel 2|Pokémon Horizonte – Staffel 3|Pokémon Horizonte – Staffel 4')
pruefe('Folgenzahl je Staffel, offene ohne', titel.map((t) => t.episodes ?? '-').join() === '45,44,47,-')
pruefe('staffelTitel: Sammeltitel, Nummer, erste Folge', JSON.stringify(titel[1]!.staffelTitel) === '{"sammel":158871,"nr":2,"ab":46}' && titel[3]!.staffelTitel?.nr === 4)
pruefe('Basis behält Slug und MAL; abgeleitete eigener Slug, ohne MAL', titel[3]!.slug === sammel.slug && titel[3]!.malId === 53876 && titel[0]!.slug === 'pokemon-horizonte-staffel-1-7000001' && titel[0]!.malId === undefined)
pruefe('Erstausgabe nur an Staffel 1', titel[0]!.deErstausgabe?.von === '2024-02-02' && titel.slice(1).every((t) => !t.deErstausgabe))
pruefe('Reihe und eigenesWerk bleiben', titel.every((t) => t.franchiseId === 527 && t.eigenesWerk === true && t.anisearchId === 17947))
pruefe('Sammeltitel selbst unverändert (Kopien)', sammel.titleDe === 'Pokémon Horizonte' && sammel.streams!.length === 2 && sammel.streams![0]!.dubRanges![0]!.to === 136)

// --- Riegel ---------------------------------------------------------------------------------------------------------------------------
const gut = { termineVorher: 117, termineNachher: 117, idsGleich: true, wegeVerloren: 0, bloeckeVorher: 102, bloeckeNachher: 102, fremdeBloecke: 0 }
pruefe('Riegel: stimmig wirft nicht', !wirft(() => pruefeSchnitt('X', gut), /./))
pruefe('Riegel: Termin fehlt', wirft(() => pruefeSchnitt('X', { ...gut, termineNachher: 116 }), /Termine 117 vorher, 116 nachher/))
pruefe('Riegel: ev.id geändert', wirft(() => pruefeSchnitt('X', { ...gut, idsGleich: false }), /ev\.id/))
pruefe('Riegel: Wege verloren', wirft(() => pruefeSchnitt('X', { ...gut, wegeVerloren: 1 }), /in keiner Staffel/))
pruefe('Riegel: TOGGO-Block fehlt', wirft(() => pruefeSchnitt('X', { ...gut, bloeckeNachher: 101 }), /TOGGO-Blöcke 102 vorher, 101 nachher/))
pruefe('Riegel: fremder TOGGO-Block', wirft(() => pruefeSchnitt('X', { ...gut, fremdeBloecke: 1 }), /unbekannten Staffel/))

// --- Folgenliste ----------------------------------------------------------------------------------------------------------------------
const zeilen: [number, string][] = Array.from({ length: 122 }, (_, i) => [i + 1, `Folge ${i + 1}`])
const datei = { f: zeilen, de: [[1, 137]] as [number, number][], min: 25, s: [[1, 1, 45]], h: [[50, 'Hinweis'], [3, 'früh']] as [number, string][] }
const fd = teileFolgenDatei(datei, plan)
pruefe('Folgenliste: 45/44/33 Zeilen, Staffel 4 ohne Datei', [7_000_001, 7_000_002, 7_000_003].map((k) => fd.dateien.get(k)?.f.length).join() === '45,44,33' && !fd.dateien.has(SAMMEL))
pruefe('Folgenliste: Staffel 2 zählt ab 1, Titel bleibt', JSON.stringify(fd.dateien.get(7_000_002)!.f[0]) === '[1,"Folge 46"]')
pruefe('Folgenliste: deutsch je Staffel umgezählt', JSON.stringify(fd.dateien.get(7_000_003)!.de) === '[[1,47]]')
pruefe('Folgenliste: ohne Staffelreiter, Hinweis wandert mit', fd.dateien.get(7_000_002)!.s === undefined && JSON.stringify(fd.dateien.get(7_000_002)!.h) === '[[5,"Hinweis"]]' && fd.dateien.get(7_000_001)!.min === 25)
pruefe('Zählung: 45/44/47, offene Staffel [1,1,1]', JSON.stringify([7_000_001, 7_000_002, 7_000_003, SAMMEL].map((k) => fd.zaehlung.get(k))) === '[[45,45],[44,44],[47,47],[1,1,1]]', JSON.stringify([...fd.zaehlung]))
pruefe('Folgenliste: keine Zeile verloren', fd.verloren === 0)
pruefe('Folgenliste: Zeile hinter geschlossenem Plan zählt verloren', teileFolgenDatei({ ...datei, f: [...zeilen, [140, 'x']] }, geschlossen!).verloren === 1)

// --- Folgenliste schreiben: Sammelsicht und Schreiben -----------------------------------------------------------------------------------
const nach = [{ id: 1 }, ...titel] as Title[]
const sicht = sammelSicht(nach, [{ titleId: 7_000_002, slug: 'neu' }, { titleId: 1, slug: 'a' }] as never, [{ plan, titel: sammel, releases: [{ titleId: SAMMEL, slug: 'alt' }] as never }])
pruefe('Sammelsicht: Staffel-Titel weg, Sammeltitel vor dem Schnitt da', sicht.titel.map((t) => t.id).join() === `1,${SAMMEL}` && sicht.titel[1] === sammel)
pruefe('Sammelsicht: Releases des Sammeltitels statt der Staffeln', sicht.releases.map((r) => r.slug).join() === 'a,alt')
pruefe('Sammelsicht ohne Sammeltitel: unverändert', sammelSicht(nach, [], []).titel === nach)
const ordner = mkdtempSync(join(tmpdir(), 'staffel-folgen-'))
try {
  const ziel = { index: [] as number[], zaehlung: {} as Record<number, [number, number] | [number, number, 1]> }
  schreibeFolgenEintrag(ordner, 5, { f: zeilen.slice(0, 2), de: [] }, [2, 0], undefined, ziel)
  schreibeFolgenEintrag(ordner, SAMMEL, datei, [137, 137, 1], { plan, titel: sammel, releases: [] }, ziel)
  pruefe('Schreiben: gewöhnlicher Titel wie bisher, Sammeltitel je Staffel', ziel.index.join() === '5,7000001,7000002,7000003' && JSON.stringify(ziel.zaehlung[5]) === '[2,0]' && ziel.zaehlung[SAMMEL]?.length === 3, JSON.stringify(ziel))
  pruefe('Schreiben: Datei der Staffel 2 liegt unter ihrer Kennung', JSON.parse(readFileSync(join(ordner, '7000002.json'), 'utf8')).f.length === 44)
  pruefe('Schreiben: Zeile außerhalb aller Staffeln bricht ab', wirft(() => schreibeFolgenEintrag(ordner, SAMMEL, { ...datei, f: [...zeilen, [140, 'x']] }, [1, 1], { plan: geschlossen!, titel: sammel, releases: [] }, ziel), /in keiner Staffel/))
} finally {
  rmSync(ordner, { recursive: true, force: true })
}

// --- Rückweg der Meldungen und al der Ausgabe -----------------------------------------------------------------------------------------
const staffelVon = staffelVonTiteln(titel)
pruefe('Meldung zu Staffel 2 Folge 3 → Sammeltitel Folge 48', JSON.stringify(zurueckAufSammeltitel(7_000_002, 3, staffelVon)) === '{"titel":158871,"folge":48}')
pruefe('Meldung zur Basis bleibt (alte Meldungen zählen durchlaufend)', JSON.stringify(zurueckAufSammeltitel(SAMMEL, 3, staffelVon)) === '{"titel":158871,"folge":3}')
pruefe('Folge 0 (ganze Seite) bleibt 0', zurueckAufSammeltitel(7_000_003, 0, staffelVon).folge === 0)
pruefe('fremder Titel unverändert', JSON.stringify(zurueckAufSammeltitel(20, 5, staffelVon)) === '{"titel":20,"folge":5}')
const ak = (id: number) => ({ 7_000_002: 26461, [SAMMEL]: 14839, 527: 99 })[id] ?? id
const aus = uebersetzeDatei('titles.json', [titel[1], titel[3]], ak) as { id: number; al: number }[]
pruefe('Ausgabe: al eines Staffel-Titels zeigt auf den Sammeltitel (AniList-Link lebt)', aus[0]!.id === 26461 && aus[0]!.al === SAMMEL, JSON.stringify(aus[0]))
pruefe('Ausgabe: al der Basis ist ihre eigene Kennung', aus[1]!.id === 14839 && aus[1]!.al === SAMMEL)
pruefe('Ausgabe: al gewöhnlicher Titel unverändert', (uebersetzeDatei('titles.json', [{ id: 20 }], ak) as { al: number }[])[0]!.al === 20)

console.log(`check-staffel-titel: ${faelle} Fälle, ${fehler} Fehler`)
process.exit(fehler ? 1 : 0)
