/**
 * Zusicherung: **ein Sammeltitel wird zu einem Titel je Staffel** (Daniel, 20.11.2026: „aufteilen in einzelne staffeln, statt alles in 1“;
 * `pipeline/lib/staffel-titel.ts`, `staffel-folgen.ts`, Phase `pipeline/bau/staffel-titel.ts`). Hier: Plan aus der Yaml, Wege, TOGGO-Blöcke,
 * Titel, Folgenliste, Riegel, Rückweg der Meldungen und `al` der Ausgabe — mit festen Fixtures (Grenzen wie Horizonte 45/44/47/offen).
 * Termine und TV-Zuordnung nach Folgentitel: `check-staffel-titel-termine.ts`. Läuft in `check:logic`.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { StreamLink, Title } from '../shared/types.ts'
import type { WatchLink } from '../shared/watchlink-typ.ts'
import { STAFFEL_ID_BASIS, istStaffelTitel, staffelVonTiteln, zurueckAufSammeltitel } from '../shared/staffel-titel.ts'
import { aktivTag, bereicheDerStaffel, laengsteStaffel, staffelDerFolge, staffelPlaene, teileStreams, teileTitel, teileWatchLinks, type StaffelPlan } from './lib/staffel-titel.ts'
import { folgenDerStaffel, teileFolgenDatei } from './lib/staffel-folgen.ts'
import { uebersetzeDatei } from './lib/ausgabe-kennung.ts'
import { gleicheKennungen, ladeStaffelEingaben, pruefeSchnitt } from './bau/staffel-titel.ts'
import { todayIso } from '../shared/time.ts'
import { beobachtungenDerSpanne, staffelVonJeMeldung } from './lib/urteil-spanne.ts'
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
pruefe('Riegel: mehrere Abweichungen stehen getrennt in einer Meldung', wirft(() => pruefeSchnitt('X', { ...gut, termineNachher: 116, fremdeBloecke: 1 }), /116 nachher; 1 TOGGO-Blöcke/))
pruefe('Kennungen gleich: dieselben', gleicheKennungen(['a', 'b'], new Set(['b', 'a'])))
pruefe('Kennungen: gleiche Zahl, andere Kennung → verschieden', !gleicheKennungen(['a', 'b'], new Set(['a', 'c'])))
pruefe('Kennungen: eine fehlt → verschieden', !gleicheKennungen(['a', 'b'], new Set(['a'])) && !gleicheKennungen(['a'], new Set(['a', 'b'])))

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
pruefe('Sammelsicht ohne Sammeltitel: unverändert', sammelSicht(nach, [{ titleId: 1 }] as never, []).titel === nach && sammelSicht(nach, [{ titleId: 1, slug: 'r' }] as never, []).releases.length === 1)
const ordner = mkdtempSync(join(tmpdir(), 'staffel-folgen-'))
try {
  const ziel = { index: [] as number[], zaehlung: {} as Record<number, [number, number] | [number, number, 1]> }
  schreibeFolgenEintrag(ordner, 5, { f: zeilen.slice(0, 2), de: [] }, [2, 0], undefined, ziel)
  schreibeFolgenEintrag(ordner, SAMMEL, datei, [137, 137, 1], { plan, titel: sammel, releases: [] }, ziel)
  pruefe('Schreiben: gewöhnlicher Titel wie bisher, Sammeltitel je Staffel', ziel.index.join() === '5,7000001,7000002,7000003' && JSON.stringify(ziel.zaehlung[5]) === '[2,0]' && ziel.zaehlung[SAMMEL]?.length === 3, JSON.stringify(ziel))
  pruefe('Schreiben: Datei der Staffel 2 liegt unter ihrer Kennung', JSON.parse(readFileSync(join(ordner, '7000002.json'), 'utf8')).f.length === 44)
  pruefe('Schreiben: gewöhnlicher Titel liegt unter seiner Kennung', JSON.parse(readFileSync(join(ordner, '5.json'), 'utf8')).f.length === 2)
  pruefe('Schreiben: Zeile außerhalb aller Staffeln bricht ab', wirft(() => schreibeFolgenEintrag(ordner, SAMMEL, { ...datei, f: [...zeilen, [140, 'x']] }, [1, 1], { plan: geschlossen!, titel: sammel, releases: [] }, ziel), /in keiner Staffel/))
} finally {
  rmSync(ordner, { recursive: true, force: true })
}

// --- Rückweg der Meldungen und al der Ausgabe -----------------------------------------------------------------------------------------
const staffelVon = staffelVonTiteln(titel)
pruefe('Meldung zu Staffel 2 Folge 3 → Sammeltitel Folge 48', JSON.stringify(zurueckAufSammeltitel(7_000_002, 3, staffelVon)) === '{"titel":158871,"folge":48}')
pruefe('Meldung zur Basis bleibt (alte Meldungen zählen durchlaufend)', JSON.stringify(zurueckAufSammeltitel(SAMMEL, 3, staffelVon)) === '{"titel":158871,"folge":3}')
pruefe('Folge 1 der Staffel 2 → Folge 46', zurueckAufSammeltitel(7_000_002, 1, staffelVon).folge === 46)
pruefe('Folge 0 (ganze Seite) bleibt 0', zurueckAufSammeltitel(7_000_003, 0, staffelVon).folge === 0)
pruefe('fremder Titel unverändert', JSON.stringify(zurueckAufSammeltitel(20, 5, staffelVon)) === '{"titel":20,"folge":5}')
const [planAktiv] = staffelPlaene([{ ...GRENZEN, aktiv: '2026-11-23' }]) as [StaffelPlan]
const titelAktiv = teileTitel(sammel, planAktiv)
pruefe('Phase: `aktiv` aus der Yaml steht nur an der Basis-Staffel', titelAktiv[3]!.staffelTitel?.aktiv === '2026-11-23' && titelAktiv.slice(0, 3).every((t) => t.staffelTitel?.aktiv === undefined))
pruefe('Phase: ohne `aktiv` kein Feld', titel.every((t) => !('aktiv' in (t.staffelTitel ?? {}))))
/* Befund 2 des Prüfers (PR 4592): alte durchlaufende Meldungen an der Basis gegen neue in der Zählung der Basis-Staffel, getrennt durch `aktiv`. */
const mitAktiv = staffelVonTiteln([{ id: SAMMEL, staffelTitel: { sammel: SAMMEL, ab: 137, aktiv: '2026-11-23' } }, { id: 7_000_001, staffelTitel: { sammel: SAMMEL, ab: 1 } }])
pruefe('Basis: Meldung vor `aktiv` zählt durchlaufend (Folge 5 bleibt 5)', JSON.stringify(zurueckAufSammeltitel(SAMMEL, 5, mitAktiv, '2026-11-22')) === '{"titel":158871,"folge":5}')
pruefe('Basis: Meldung ab `aktiv` zählt in Staffel 4 (Folge 1 → 137)', JSON.stringify(zurueckAufSammeltitel(SAMMEL, 1, mitAktiv, '2026-11-23')) === '{"titel":158871,"folge":137}')
pruefe('Basis: Meldung ohne Tag bleibt unverändert', zurueckAufSammeltitel(SAMMEL, 1, mitAktiv).folge === 1)
pruefe('Basis: Folge 0 (ganze Seite) bleibt 0 auch ab `aktiv`', zurueckAufSammeltitel(SAMMEL, 0, mitAktiv, '2026-12-01').folge === 0)
pruefe('Basis ohne `aktiv`: nie umgerechnet', zurueckAufSammeltitel(SAMMEL, 1, staffelVonTiteln([{ id: SAMMEL, staffelTitel: { sammel: SAMMEL, ab: 137 } }]), '2030-01-01').folge === 1)
pruefe('Staffel 1 (abgeleitet) rechnet unabhängig vom Tag zurück', zurueckAufSammeltitel(7_000_001, 7, mitAktiv, '2026-11-22').folge === 7)
pruefe('Spanne der Basis ab `aktiv` → 137.. (Beobachtungen tragen den Tag)', JSON.stringify(beobachtungenDerSpanne(SAMMEL, { von: 1, bis: 2 }, { anbieter: 'rtlplus', vorhanden: 'ja', tonDe: 'ja', art: 'seite', tag: '2026-11-24', kanal: false } as never, mitAktiv).map((b) => b.folge)) === '[137,138]')
/* Befund 4 des Prüfers (PR 4603): `aktiv` hängt nicht vom Merge-Tag ab, und durchlaufend gezählte Meldungen nach `aktiv` bleiben durchlaufend. */
pruefe('laengsteStaffel: 47 (Staffel 3), die offene zählt nicht', laengsteStaffel(planAktiv) === 47 && titelAktiv[3]!.staffelTitel?.laengste === 47 && titelAktiv.slice(0, 3).every((t) => t.staffelTitel?.laengste === undefined), JSON.stringify(titelAktiv[3]!.staffelTitel))
const gebaut = [{ id: SAMMEL, staffelTitel: { aktiv: '2026-11-23' } }, { id: 20 }]
pruefe('aktivTag: erster Bestand mit dem Schnitt → Tag nach dem Bau, unabhängig vom Merge-Tag', aktivTag([{ id: SAMMEL }], SAMMEL, '2026-12-05') === '2026-12-06' && aktivTag([], SAMMEL, '2026-11-22') === '2026-11-23')
pruefe('aktivTag: steht der Schnitt schon im Bestand, bleibt sein Tag (kein Wandern bei jedem Bau)', aktivTag(gebaut, SAMMEL, '2026-12-05') === '2026-11-23')
const mitGrenze = staffelVonTiteln([{ id: SAMMEL, staffelTitel: { sammel: SAMMEL, ab: 137, aktiv: '2026-11-23', laengste: 47 } }])
const nachAktiv = (folge: number) => zurueckAufSammeltitel(SAMMEL, folge, mitGrenze, '2026-11-25').folge
pruefe('Basis ab `aktiv`: RTL+ Folge 50 (durchlaufend gezählt) bleibt 50 statt 186', nachAktiv(50) === 50 && nachAktiv(136) === 136 && nachAktiv(137) === 137)
pruefe('Basis ab `aktiv`: Folge 1 und 47 zählen in Staffel 4 (137, 183)', nachAktiv(1) === 137 && nachAktiv(47) === 183)
{
  /* Verdrahtung der Phase: Der echte Lader (`ladeStaffelEingaben`) setzt `aktiv` aus dem ausgelieferten Bestand, nichts Hartes aus der Yaml. */
  const bestand = JSON.parse(readFileSync(new URL('../public/data/titles.json', import.meta.url), 'utf8')) as { id: number; staffelTitel?: { aktiv?: string } }[]
  const plaene = ladeStaffelEingaben().plaene
  pruefe('Phase: jeder Plan trägt `aktiv` aus `aktivTag` über dem ausgelieferten Bestand', plaene.length > 0 && plaene.every((p) => p.aktiv === aktivTag(bestand, p.sammel, todayIso())), JSON.stringify(plaene.map((p) => p.aktiv)))
  pruefe('Phase: kein fester Tag in der Yaml', !/^\s+aktiv:/m.test(readFileSync(new URL('../data/curated/horizonte-staffeln.yaml', import.meta.url), 'utf8')))
}
pruefe('Basis ab `aktiv`: Spanne 46–49 gemischt (46, 47 Staffel 4, 48, 49 durchlaufend)', JSON.stringify(beobachtungenDerSpanne(SAMMEL, { von: 46, bis: 49 }, { anbieter: 'rtlplus', vorhanden: 'ja', tonDe: 'ja', art: 'seite', tag: '2026-11-25', kanal: false } as never, mitGrenze).map((b) => b.folge)) === '[182,183,48,49]')
{
  /* Netflix hängt nur an Staffel 1 (7000001), RTL+ an allen vier: Eine Basis-Meldung zählt nach `aktiv` nur in Staffel 4, wenn ihre Adresse an der Basis hängt. */
  const bestandTitel = [{ id: SAMMEL, staffelTitel: { sammel: SAMMEL, ab: 137, aktiv: '2026-11-23', laengste: 47 } }, { id: 7_000_001, staffelTitel: { sammel: SAMMEL, ab: 1 } }]
  const je = staffelVonJeMeldung(bestandTitel)
  const folge = (titelDerAdresse: number[] | undefined, n: number, tag = '2026-11-25') => zurueckAufSammeltitel(SAMMEL, n, je(titelDerAdresse), tag).folge
  pruefe('Meldung je Adresse: RTL+ (Adresse an allen Staffeln) Folge 1 ab `aktiv` → 137', folge([7_000_001, SAMMEL], 1) === 137)
  pruefe('Meldung je Adresse: Netflix (Adresse nur an Staffel 1) Folge 7 bleibt 7, auch ab `aktiv`', folge([7_000_001], 7) === 7)
  pruefe('Meldung je Adresse: unbekannte Adresse bleibt durchlaufend', folge(undefined, 7) === 7)
  pruefe('Meldung je Adresse: Staffel-Titel außerhalb der Basis unberührt (Staffel 1 Folge 7 → 7)', zurueckAufSammeltitel(7_000_001, 7, je([7_000_001]), '2026-11-25').folge === 7)
}
const ak = (id: number) => ({ 7_000_002: 26461, [SAMMEL]: 14839, 527: 99 })[id] ?? id
const aus = uebersetzeDatei('titles.json', [titel[1], titel[3]], ak) as { id: number; al: number }[]
pruefe('Ausgabe: al eines Staffel-Titels zeigt auf den Sammeltitel (AniList-Link lebt), Felder bleiben', aus[0]!.id === 26461 && aus[0]!.al === SAMMEL && (aus[0] as { titleDe?: string }).titleDe === 'Pokémon Horizonte – Staffel 2', JSON.stringify(aus[0]))
pruefe('Ausgabe: al der Basis ist ihre eigene Kennung', aus[1]!.id === 14839 && aus[1]!.al === SAMMEL)
pruefe('Ausgabe: al gewöhnlicher Titel unverändert', (uebersetzeDatei('titles.json', [{ id: 20 }], ak) as { al: number }[])[0]!.al === 20)

// --- Grenzen und Ränder (Mutanten der Diff-Probe) -------------------------------------------------------------------------------------
pruefe('Staffel der Folge an den Grenzen: 45 → 1, 46 → 2, 136 → 3, 137 → 4, 0 → keine', [45, 46, 136, 137, 999].map((n) => staffelDerFolge(plan, n)?.nr).join() === '1,2,3,4,4' && staffelDerFolge(plan, 0) === undefined)
pruefe('Bereich an der Grenze (45–46): je eine Folge in Staffel 1 und 2', JSON.stringify([1, 2].map((nr) => bereicheDerStaffel([{ from: 45, to: 46, dub: true }], plan.staffeln[nr - 1]!))) === '[[{"from":45,"to":45,"dub":true}],[{"from":1,"to":1,"dub":true}]]')
const bisVier = teileStreams([{ ...rtl, dubRanges: [{ from: 1, to: 140, dub: true }] }], plan).je.get(4)![0]!
pruefe('offene Staffel: teilBereich bis zur höchsten Folge des Weges (137–140)', JSON.stringify(bisVier.teilBereich) === '{"von":137,"bis":140}' && JSON.stringify(bisVier.dubRanges) === '[{"from":1,"to":4,"dub":true}]', JSON.stringify(bisVier))
const [eine] = staffelPlaene([{ anilistId: 5, basis: 1, staffeln: [{ nr: 1, von: 1 }] }])
pruefe('Plan ohne Titel: Name aus der Kennung; eine Staffel: kein sharedWith', eine!.titel === '5' && teileStreams([ohneBereich, rtl], eine!).je.get(1)!.every((s) => s.sharedWith === undefined))
pruefe('TOGGO-Hinweis behält Name und Adresse', l.je.get(2)!.find((x) => x.toggo)?.name === 'TOGGO' && l.je.get(2)!.find((x) => x.toggo)?.url === 'https://www.toggo.de/x')
pruefe('Titel tragen nur ihre Wege: Staffel 2 RTL+ 1–44, kein Netflix; TOGGO nur Staffel 2', JSON.stringify(titel[1]!.streams!.map((s) => [s.platform, s.dubRanges])) === '[["rtlplus",[{"from":1,"to":44,"dub":true}]]]' && titel[1]!.watchLinks!.every((x) => x.toggo!.every((b) => b.staffel === 2)), JSON.stringify(titel[1]!.streams))
pruefe('Titel tragen ihre Felder weiter (Kopie, nicht nur Kennung)', titel.every((t) => t.franchiseId === 527 && t.genres !== sammel.genres))
pruefe('Folgenliste: deutscher Bereich, der in der Staffel beginnt, bleibt dort (50–60 → 5–15)', JSON.stringify(folgenDerStaffel({ f: zeilen, de: [[50, 60]] }, plan.staffeln[1]!)!.de) === '[[5,15]]')
const kurzDe = teileFolgenDatei({ f: zeilen, de: [[1, 100]] }, plan)
pruefe('Zählung: abgeschlossene Staffel zählt bis zu ihrem Ende, auch wenn Deutsch früher endet (Staffel 3: [47, 11])', JSON.stringify(kurzDe.zaehlung.get(7_000_003)) === '[47,11]', JSON.stringify(kurzDe.zaehlung.get(7_000_003)))
const zwei = teileFolgenDatei({ f: [[45, 'a'], [46, 'b'], [47, 'c'], [90, 'd']], de: [] }, plan)
pruefe('Datei ab zwei Zeilen (Staffel 2: 2 Zeilen → Datei, Staffel 1 und 3: 1 Zeile → keine)', [...zwei.dateien.keys()].join() === '7000002', [...zwei.dateien.keys()].join())

// --- Urteile: Beobachtungen einer Meldung (Schleife aus `fetch-urteile.ts`) ---------------------------------------------------------------
const gemeinsam = { anbieter: 'netflix', vorhanden: 'ja', tonDe: 'ja', art: 'gemessen' as const, tag: '2026-11-22', kanal: false }
const zuStaffel = beobachtungenDerSpanne(7_000_002, { von: 3, bis: 4 }, gemeinsam, staffelVon)
pruefe('Urteile: Meldung zu Staffel 2, Folge 3–4 → Sammeltitel, Folge 48–49, Felder der Meldung bleiben', JSON.stringify(zuStaffel.map((b) => [b.titel, b.folge, b.anbieter, b.tonDe, b.tag])) === '[[158871,48,"netflix","ja","2026-11-22"],[158871,49,"netflix","ja","2026-11-22"]]', JSON.stringify(zuStaffel))
pruefe('Urteile: gewöhnlicher Titel und Basis unverändert, eine Beobachtung je Folge', JSON.stringify(beobachtungenDerSpanne(20, { von: 1, bis: 3 }, gemeinsam, staffelVon).map((b) => [b.titel, b.folge])) === '[[20,1],[20,2],[20,3]]' && beobachtungenDerSpanne(SAMMEL, { von: 5, bis: 5 }, gemeinsam, staffelVon)[0]!.folge === 5)
pruefe('Urteile: Spanne 0 (ganze Seite) bleibt 0', beobachtungenDerSpanne(7_000_002, { von: 0, bis: 0 }, gemeinsam, staffelVon)[0]!.folge === 0)
{
  const urteileQuelle = readFileSync(new URL('./fetch-urteile.ts', import.meta.url), 'utf8')
  pruefe('fetch-urteile: Schleife ruft beobachtungenDerSpanne mit der Staffelzuordnung je Meldung (Adresse) über titelAlle', /beobachtungenDerSpanne\(m\.titel_id, spanne, gemeinsam, staffelVon\(nachAdresse\(m\.url\)\)\)/.test(urteileQuelle) && /const staffelVon = staffelVonJeMeldung\(titelAlle\)/.test(urteileQuelle) && !/for \(let n = von; n <= bis; n\+\+\)/.test(urteileQuelle))
}

// --- Folgenlisten im echten Aufrufer (`schreibeFolgenDateien`, Kindprozess mit AK_ROOT) ---------------------------------------------------
{
  const wurzel = mkdtempSync(join(tmpdir(), 'staffel-folgen-bau-'))
  try {
    for (const d of ['data', 'public']) mkdirSync(join(wurzel, d, d === 'public' ? 'data' : ''), { recursive: true })
    const folgen = (n: number) => Array.from({ length: n }, (_, i) => ({ nr: i + 1, datum: '2023-04-14', minuten: 24, de: `Folge ${i + 1}` }))
    writeFileSync(join(wurzel, 'data', 'anisearch-folgen.json'), JSON.stringify({ 801: { folgen: folgen(5) }, 802: { folgen: folgen(2) } }))
    writeFileSync(join(wurzel, 'data', 'anisearch.json'), JSON.stringify({ 900501: { anisearchId: 801 }, 900502: { anisearchId: 802 } }))
    writeFileSync(join(wurzel, 'data', 'folgen-hinweise.yaml'), '- { anilistId: 900501, folge: 5, art: hinweis, text: Fünf }\n')
    writeFileSync(join(wurzel, 'data', 'kino-ankuendigungen.yaml'), '[]\n')
    /* Staffelgrenzen der Kulisse (`ladeStaffelGrenzen`): ohne sie kennt der Bau keinen Stapel-Termin für den Titel (`letzteFolgen`). */
    mkdirSync(join(wurzel, 'data', 'curated'), { recursive: true })
    writeFileSync(join(wurzel, 'data', 'curated', 'horizonte-staffeln.yaml'), 'titel:\n- anilistId: 900501\n  basis: 2\n  staffeln:\n    - { nr: 1, von: 1, bis: 3, folgen: 3, kennung: 7000001 }\n    - { nr: 2, von: 4, offen: true }\n')
    const tsx = createRequire(import.meta.url).resolve('tsx/cli')
    const lauf = spawnSync(process.execPath, [tsx, fileURLToPath(new URL('./lib/kulisse-staffel-folgen.ts', import.meta.url))], { env: { ...process.env, AK_ROOT: wurzel }, encoding: 'utf8', windowsHide: true, timeout: 120_000 })
    const aus = JSON.parse(lauf.stdout.trim().split('\n').at(-1) || '{}') as { index?: number[]; zaehlung?: Record<string, number[]>; dateien?: Record<string, { f: unknown[][]; de: number[][]; s?: unknown }> }
    pruefe('Folgenliste im Bau: Sammeltitel geteilt (Staffel 1 und Basis), gewöhnlicher Titel wie bisher', lauf.status === 0 && aus.index?.join() === '900501,900502,7000001', `${lauf.status} ${aus.index} ${lauf.stderr.slice(-300)}`)
    pruefe('Folgenliste im Bau: Staffel 1 drei Zeilen, Basis zwei ab 1, deutsch aus den Wegen des Sammeltitels', aus.dateien?.['7000001']?.f.length === 3 && JSON.stringify(aus.dateien?.['900501']?.f.map((z) => z[0])) === '[1,2]' && JSON.stringify(aus.dateien?.['900501']?.de) === '[[1,2]]' && JSON.stringify(aus.dateien?.['7000001']?.de) === '[[1,3]]', JSON.stringify(aus.dateien))
    pruefe('Folgenliste im Bau: Zählung je Staffel, offene Basis mit dritter Stelle', JSON.stringify(aus.zaehlung) === '{"900501":[2,2,1],"900502":[2,0],"7000001":[3,3]}', JSON.stringify(aus.zaehlung))
    pruefe('Folgenliste im Bau: Hinweis nur am Titel, der einen hat; beim Sammeltitel in die Staffel umgezählt (Folge 5 → Basis Folge 2)', !JSON.stringify(aus.dateien?.['900502']).includes('"h"') && JSON.stringify(aus.dateien?.['900501']).includes('"h":[[2,"Fünf"]]') && !JSON.stringify(aus.dateien?.['7000001']).includes('"h"'), JSON.stringify(aus.dateien))
  } finally {
    rmSync(wurzel, { recursive: true, force: true })
  }
}

console.log(`check-staffel-titel: ${faelle} Fälle, ${fehler} Fehler`)
process.exit(fehler ? 1 : 0)
