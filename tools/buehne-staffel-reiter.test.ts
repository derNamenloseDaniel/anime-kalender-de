/**
 * Test der Reiterliste des Mockups `staffel-abschnitt` (F157, `web/buehne/mockups/staffel-reiter-liste.ts`) an den echten, eingefrorenen
 * Fällen der Bühne: Pokémon Horizonte (4 deutsche Staffel-Titel), Pokémon-Hauptserie (12 Einträge für die Staffeln 1 bis 25),
 * ein Film der Reihe (keine Reiter).
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { FranchiseMember, Release, Title } from '../shared/types.ts'
import { lageVon } from '../web/buehne/mockups/staffel-lage.ts'
import { reiterVon } from '../web/buehne/mockups/staffel-reiter-liste.ts'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { KastenMitReitern } from '../web/buehne/mockups/staffel-abschnitt.tsx'
import { pfeilLageVon, sprungVon } from '../web/buehne/mockups/staffel-pfeile.ts'
import { ReiterPfeil, rolleUm } from '../web/buehne/mockups/staffel-pfeile.tsx'
import { ReiterZeile } from '../web/buehne/mockups/staffel-reiter.tsx'
import { mockupMit } from '../web/buehne/register.ts'

const datei = fileURLToPath(new URL('../web/buehne/faelle.json', import.meta.url))
const faelle = JSON.parse(readFileSync(datei, 'utf8')).faelle as Record<string, Record<string, unknown>>
const fall = faelle['pokemon-horizonte']!
const titel = fall['titles.json'] as Title[]
const teile = (fall['franchises.json'] as Record<string, FranchiseMember[]>)['483']!
const offen = (id: number) => titel.find((t) => t.id === id)!
const reiter = (id: number) => reiterVon(offen(id), teile, 'Pokémon', titel)

// Horizonte: vier Staffeln in der Reihenfolge der Nummern, gleich von jeder Staffel aus.
for (const id of [26469, 26470, 26471, 14839]) {
  assert.deepEqual(reiter(id).map((r) => [r.id, r.label]), [[26469, '1'], [26470, '2'], [26471, '3'], [14839, '4']], `Horizonte von ${id}`)
}

// Hauptserie: 12 Einträge, Beschriftung ohne „Staffel“, nach Staffelnummer; „16“ gibt es zweimal (zwei Einträge der Daten).
assert.deepEqual(
  reiter(483).map((r) => r.label),
  ['1–5', '6–9', '10–13', '14–15', '15–16', '16', '16', '17–18', '19', '20–22', '23–25', '25'],
)
assert.deepEqual(
  reiter(10852).map((r) => r.id),
  [483, 1349, 1350, 4745, 5979, 6415, 6563, 6802, 7798, 8283, 10852, 14838],
)
assert.equal(reiter(10852).length, 12)
// Der Name am Reiter ist der Titel der Daten (Horizonte und Hauptserie).
assert.equal(reiter(14839)[0]!.name, 'Pokémon Horizonte: Die Serie')
assert.equal(reiter(14839)[3]!.name, 'Pokémon Horizonte: Staffel 4 – Wunder in Sicht')
assert.equal(reiter(483)[1]!.name, 'Pokémon Advanced Generation')

// Genau zwei Staffeln sind schon Reiter (Grenze), mit Reihenfolge nach Nummer auch bei umgekehrter Eingabe.
assert.deepEqual(reiterVon(offen(14839), teile, 'Pokémon', [offen(14839), offen(26470)]).map((r) => r.id), [26470, 14839])

// Attack on Titan: „Junior High“ zählt in den Daten zur Staffel 2, hat aber keine Beschriftung und bekommt keinen Reiter;
// die Final Season (eigener Name, keine Beschriftung) öffnet ohne Reiter.
const aot = faelle['attack-on-titan']!
const aotTitel = aot['titles.json'] as Title[]
const aotTeile = Object.values(aot['franchises.json'] as Record<string, FranchiseMember[]>)[0]!
const aotReiter = (id: number) => reiterVon(aotTitel.find((t) => t.id === id)!, aotTeile, 'Attack on Titan', aotTitel)
assert.deepEqual(aotReiter(6282).map((r) => [r.id, r.label]), [[6282, '1'], [7496, '2'], [8669, '3 - Teil 1'], [10088, '3 - Teil 2']])
assert.equal(aotReiter(10659).length, 0, 'Final Season ohne Beschriftung')

// Kein Reiter: Film der Reihe, Special, und ein Titel, der in der Liste fehlt.
assert.equal(reiter(5726).length, 0, 'Film')
assert.equal(reiter(1315).length, 0, 'Special')
assert.equal(reiterVon(offen(10852), teile.slice(0, 0), 'Pokémon', titel).length, 0, 'ohne Reihe')
// Eine einzelne Horizonte-Staffel ohne Geschwister zeigt keine Reiter.
assert.equal(reiterVon(offen(14839), teile, 'Pokémon', [offen(14839)]).length, 0, 'ein Reiter allein')

// Zustandsmarke je Reiter am Stichtag des Mockups (`zeiten` in staffel-abschnitt.tsx, 2026-11-24): Horizonte 4 läuft (RTL+ seit
// 20.11., Ende offen), 1 bis 3 nicht (die Fernsehreihe hat Folge 136 schon am 21.11. gesendet); Hauptserie: 23–25 läuft, 1–5 kommt
// (Box), 25 ohne Marke.
// Der Stichtag kommt aus der angemeldeten Mockup-Definition: fehlt `zeiten`, gilt die Uhr der Bühne (11.10.) und der Test wird rot.
const erstesZeit = Object.values(mockupMit('staffel-abschnitt')?.zeiten ?? {})[0]
assert.equal(erstesZeit?.slice(0, 10), '2026-11-24', 'Mockup staffel-abschnitt braucht zeiten auf den 24.11.2026')
const stichtag = erstesZeit!.slice(0, 10)
const releases = fall['releases.json'] as Release[]
// Zur Uhr der Bühne (faelle.heute, 11.10.) wäre Staffel 4 noch angekündigt: darum trägt das Mockup seinen Stichtag selbst.
assert.equal(lageVon(offen(14839), releases.filter((r) => r.titleId === 14839), '2026-10-11'), 'kommt', 'Staffel 4 vor dem Start')
const lage = (id: number) => lageVon(offen(id), releases.filter((r) => r.titleId === id), stichtag)
assert.deepEqual([26469, 26470, 26471, 14839].map(lage), ['sonst', 'sonst', 'sonst', 'laeuft'], 'Horizonte: nur Staffel 4 läuft')
assert.deepEqual([483, 1349, 10852, 14838].map(lage), ['kommt', 'sonst', 'laeuft', 'sonst'], 'Hauptserie')
// Eine Reihe, die Staffel 1 noch nicht erreicht hat (Sichtung bis Folge 20 von 45), läuft dort: der Ausschluss gilt nur für Gesichtetes ab dem Ende.
const mitten = releases.filter((r) => r.titleId === 26469).map((r) => ({ ...r, schedule: { ...r.schedule, observed: { 19: '2026-11-20', 20: '2026-11-21' } } }))
assert.equal(lageVon(offen(26469), mitten, stichtag), 'laeuft', 'Staffel 1 mitten in der Sendung')
assert.equal(lageVon(offen(26470), mitten, stichtag), 'laeuft', 'Staffel 2 noch nicht erreicht')
// Ohne Sammeltitel (Hauptserie) filtert keine Sichtung, auch wenn ein Verweis ein kurzes Ende nennt.
const haupt = { ...offen(10852), streams: [{ platform: 'netflix', url: 'https://x.invalid', dub: true, teilBereich: { von: 1, bis: 2 } }] } as Title
assert.equal(lageVon(haupt, releases.filter((r) => r.titleId === 10852), stichtag), 'laeuft', 'Hauptserie ohne Sammeltitel')
// Titel mit bekannter Folgenzahl und abgelaufenem Plan bleibt „sonst“ (Ende offen gilt nur ohne Folgenzahl).
assert.equal(lageVon({ ...offen(14839), episodes: 12 }, releases.filter((r) => r.titleId === 14839), stichtag), 'sonst', 'Staffel 4 mit Folgenzahl')

// Pfeile (24.11.2026, Daniel): Lage aus Scrollposition, Gesamtbreite und sichtbarer Breite. Feste Zahlen: Leiste 300 px sichtbar, 722 px breit (Pokémon-Hauptserie auf dem Handy).
assert.deepEqual(pfeilLageVon(0, 722, 300), { links: false, rechts: true }, 'ganz links')
assert.deepEqual(pfeilLageVon(211, 722, 300), { links: true, rechts: true }, 'Mitte')
assert.deepEqual(pfeilLageVon(422, 722, 300), { links: true, rechts: false }, 'ganz rechts');
assert.deepEqual(pfeilLageVon(0, 300, 300), { links: false, rechts: false }, 'passt ganz hinein');
// Bruchteile von Pixeln (Zoom) öffnen keinen Pfeil; ab 2 px Rest schon.
assert.deepEqual(pfeilLageVon(1, 722, 300), { links: false, rechts: true }, '1 px links ist noch ganz links');
assert.deepEqual(pfeilLageVon(2, 722, 300), { links: true, rechts: true }, '2 px links sind schon Reiter links');
assert.deepEqual(pfeilLageVon(421, 722, 300), { links: true, rechts: false }, '1 px Rest rechts ist noch ganz rechts');
assert.deepEqual(pfeilLageVon(420, 722, 300), { links: true, rechts: true }, '2 px Rest rechts sind schon Reiter rechts');
// Ein Klick rollt um genau die sichtbare Breite, links negativ.
assert.equal(sprungVon('rechts', 300), 300, 'Sprung rechts');
assert.equal(sprungVon('links', 437), -437, 'Sprung links');
// Gerenderter Pfeil: Beschriftung; ohne weitere Reiter in seiner Richtung gar nicht da.
const pfeil = (richtung: 'links' | 'rechts', weitere: boolean) => renderToStaticMarkup(createElement(ReiterPfeil, { richtung, weitere, beiKlick: () => {} }))
assert.match(pfeil('links', true), /aria-label="Vorherige Staffeln"/)
assert.match(pfeil('rechts', true), /aria-label="Weitere Staffeln"/)
assert.doesNotMatch(pfeil('rechts', true), /aria-disabled|pointer-events-none/, 'kein gedimmter Pfeil mehr')
assert.equal(pfeil('links', false), '', 'links ohne Reiter links nicht da')
assert.equal(pfeil('rechts', false), '', 'rechts ohne Reiter rechts nicht da')
assert.match(pfeil('links', true), /data-pfeil="links"/)
// rolleUm: Attrappe mit clientWidth 300 und aufgezeichnetem scrollBy; links −300, rechts +300, bei „weniger Bewegung“ ohne Animation.
const aufruf = (richtung: 'links' | 'rechts', clientWidth: number, ruhig: boolean) => {
  const gerufen: ScrollToOptions[] = []
  const welt = globalThis as { matchMedia?: unknown }
  welt.matchMedia = (q: string) => ({ matches: ruhig && q === '(prefers-reduced-motion: reduce)' })
  rolleUm({ clientWidth, scrollBy: (o: ScrollToOptions) => gerufen.push(o) } as unknown as HTMLElement, richtung)
  return gerufen
}
assert.deepEqual(aufruf('rechts', 300, false), [{ left: 300, behavior: 'smooth' }], 'rechts +300 weich')
assert.deepEqual(aufruf('links', 300, false), [{ left: -300, behavior: 'smooth' }], 'links -300 weich')
assert.deepEqual(aufruf('rechts', 437, false), [{ left: 437, behavior: 'smooth' }], 'Sprung folgt der Leistenbreite')
assert.deepEqual(aufruf('links', 300, true), [{ left: -300, behavior: 'auto' }], 'weniger Bewegung: ohne Animation')
rolleUm(null, 'links') // ohne Leiste: kein Fehler
// Die Reiterzeile zeigt vor der Messung keinen Pfeil; die Lage selbst misst erst der Browser, siehe Bilder im PR.
const zeile = renderToStaticMarkup(createElement(ReiterZeile, { reiter: reiter(10852), aktiv: 10852, lagen: new Map(), farbe: '' }))
assert.equal((zeile.match(/data-pfeil=/g) ?? []).length, 0, 'vor der Messung kein Pfeil')
assert.equal((zeile.match(/<button/g) ?? []).length, 12, '12 Reiter')
// Das Mockup hat genau eine Nachher-Fassung (A); Variante B (Pfeile immer, gedimmt) ist entfernt (Daniel, 24.11.2026).
const varianten = mockupMit('staffel-abschnitt')!.varianten
assert.deepEqual(Object.keys(varianten), ['A'])
assert.equal(varianten.A!.ersatz.AntwortKasten, KastenMitReitern, 'A: Kasten mit Reitern')

console.log('buehne-staffel-reiter: ok (Horizonte 4, Pokémon 12, Attack on Titan 4 ohne Junior High, Film/Special/leer/allein 0, Pfeile)')
