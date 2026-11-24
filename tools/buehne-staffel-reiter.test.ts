/**
 * Test der Staffel-Reiter (F157, `web/src/components/detail/staffel-reiter-liste.ts`, `staffel-reiter.tsx`, `staffel-pfeile.ts(x)`) und
 * der Lage je Staffel (`staffelLage` in `shared/logic.ts`) an den echten, eingefrorenen Fällen der Bühne: Pokémon-Hauptserie (Detaildatei
 * mit fünf Staffeln), Pokémon Reisen (drei), Staffel 25 (eine Zeile, keine Reiter).
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { staffelLage } from '../shared/logic.ts'
import type { Release } from '../shared/types.ts'
import type { StaffelZeile } from '../shared/staffel-folge.ts'
import { staffelAbschnitte } from '../web/src/components/detail/folgen-staffeln.ts'
import { abschnittZeile, kurzeStaffelNamen, reiterVon, startReiter } from '../web/src/components/detail/staffel-reiter-liste.ts'
import { pfeilLageVon, sprungVon } from '../web/src/components/detail/staffel-pfeile.ts'
import { ReiterPfeil, rolleUm } from '../web/src/components/detail/staffel-pfeile.tsx'
import { naechsterReiter, ReiterZeile } from '../web/src/components/detail/staffel-reiter.tsx'
import { StaffelAbschnitt } from '../web/src/components/detail/staffel-abschnitt.tsx'
import { mockupMit } from '../web/buehne/register.ts'
import '../web/buehne/mockups/staffel-abschnitt.tsx'

const datei = fileURLToPath(new URL('../web/buehne/faelle.json', import.meta.url))
const faelle = JSON.parse(readFileSync(datei, 'utf8')).faelle as Record<string, Record<string, unknown>>
const folgen = faelle['pokemon-horizonte']!['folgen'] as Record<string, { f: [number, string][]; de: [number, number][]; s?: StaffelZeile[]; sn?: Record<string, string> }>
const HEUTE = '2026-11-24'
const abschnitte = (id: number, istDeutsch?: (nr: number) => boolean) => {
  const l = folgen[String(id)]!
  return staffelAbschnitte(l.s, l.f, l.de, istDeutsch ?? ((nr) => l.de.some(([a, b]) => nr >= a && nr <= b)))
}

// Reiter: je Staffel der Detaildatei, nur die Nummer; Hauptserie 1–5, Reisen 23–25, Staffel 25 allein (eine Zeile) keiner.
assert.deepEqual(reiterVon(abschnitte(483), [], HEUTE).map((r) => r.label), ['1', '2', '3', '4', '5'], 'Hauptserie')
assert.deepEqual(reiterVon(abschnitte(10852), [], HEUTE).map((r) => r.nr), [23, 24, 25], 'Reisen')
assert.equal(reiterVon(abschnitte(14838), [], HEUTE).length, 0, 'eine Staffel: keine Reiter')
assert.equal(reiterVon([], [], HEUTE).length, 0, 'ohne s: keine Reiter')
// Zwei Staffeln sind schon Reiter (Grenze).
assert.equal(reiterVon(abschnitte(4745), [], HEUTE).length, 2, 'zwei Staffeln')

// Lage je Staffel: geschlossen, ganz deutsch, ohne Termin ruht; offen mit deutscher Folge läuft; Termin ab heute mit Folgennummer darin läuft bzw. kommt.
const termin = (von: number, datum: string, extra: Partial<Release['schedule']> = {}): Release =>
  ({ slug: 'x', titleId: 900001, platform: 'netflix', releaseType: 'batch', schedule: { firstEpisodeDate: datum, firstEpisodeNumber: von, episodeCount: 1, ...extra } }) as unknown as Release
assert.equal(staffelLage(1, 82, true, [], HEUTE), 'ruht', 'geschlossen ohne Termin')
assert.equal(staffelLage(137, undefined, true, [], HEUTE), 'laeuft', 'offen mit deutscher Folge')
assert.equal(staffelLage(137, undefined, false, [], HEUTE), 'ruht', 'offen ohne deutsche Folge und ohne Termin')
assert.equal(staffelLage(1, 82, true, [termin(40, '2026-11-30')], HEUTE), 'laeuft', 'Termin in der Staffel')
assert.equal(staffelLage(1, 82, true, [termin(40, HEUTE)], HEUTE), 'laeuft', 'Termin heute zählt')
assert.equal(staffelLage(1, 82, true, [termin(40, '2026-11-23')], HEUTE), 'ruht', 'Termin gestern zählt nicht')
assert.equal(staffelLage(1, 82, true, [termin(83, '2026-11-30')], HEUTE), 'ruht', 'Termin hinter der Staffel')
assert.equal(staffelLage(83, 118, true, [termin(82, '2026-11-30')], HEUTE), 'ruht', 'Termin vor der Staffel')
assert.equal(staffelLage(83, 118, false, [termin(118, '2026-11-30')], HEUTE), 'kommt', 'letzte Folge der Staffel, noch keine deutsch')
assert.equal(staffelLage(83, 118, false, [termin(83, '2026-11-30')], HEUTE), 'kommt', 'erste Folge der Staffel, noch keine deutsch')
assert.equal(staffelLage(83, undefined, false, [termin(500, '2026-11-30')], HEUTE), 'kommt', 'offene Staffel ohne Ende')
assert.equal(staffelLage(1, 82, false, [termin(40, '2026-11-30', { firstEpisodeNumber: undefined })], HEUTE), 'ruht', 'Termin ohne Folgennummer')
const gezaehlt = { ...termin(40, '2026-11-30'), platform: 'tv', tvLetzteSichtung: '2026-11-20' } as unknown as Release
assert.equal(staffelLage(1, 82, false, [gezaehlt], HEUTE), 'ruht', 'TV-Sichtung ohne Folgenliste: Nummer nur gezählt')
assert.equal(staffelLage(1, 82, false, [{ ...gezaehlt, folgenBelegt: true } as Release], HEUTE), 'kommt', 'TV mit Folgenliste zählt')

// Startreiter: die laufende Staffel, sonst die letzte mit deutscher Folge, sonst die erste.
const hs = abschnitte(483)
const hsReiter = reiterVon(hs, [], HEUTE)
assert.equal(startReiter(hsReiter, hs), 4, 'Hauptserie: Staffel 5 (letzte deutsche)')
assert.equal(startReiter(reiterVon(hs, [termin(100, '2026-11-30')], HEUTE), hs), 1, 'Hauptserie mit Termin in Staffel 2: Staffel 2')
assert.equal(startReiter(reiterVon(hs, [termin(10, '2026-11-30')], HEUTE), hs), 0, 'Hauptserie mit Termin in Staffel 1: Staffel 1')
const halb = abschnitte(483, (nr) => nr <= 150)
assert.equal(startReiter(reiterVon(halb, [], HEUTE), halb), 2, 'deutsch bis 150: Staffel 3')
const keine = abschnitte(483, () => false)
assert.equal(startReiter(reiterVon(keine, [], HEUTE), keine), 0, 'ohne deutsche Folge: Staffel 1')
// Zwei laufende Staffeln (Nachholtermin in einer alten, neue offen): die erste gewinnt, wie in startReiter festgelegt.
const zweiLaufend = [{ ...hsReiter[0]! }, { ...hsReiter[1]!, lage: 'laeuft' as const }, { ...hsReiter[2]!, lage: 'laeuft' as const }]
assert.equal(startReiter(zweiLaufend, hs.slice(0, 3)), 1, 'zwei laufende: die erste')

// Kopfzeile des Abschnitts: Bereich, Folgenzahl, Lage, Synchro in Staffelzählung.
assert.equal(abschnittZeile(hs[1]!, 'ruht', () => true), 'Folge 83–118 · 36 Folgen · alle auf Deutsch')
assert.equal(abschnittZeile(hs[1]!, 'laeuft', (nr) => nr <= 100), 'Folge 83–118 · 36 Folgen · läuft · Deutsch: Fg. 1–18')
assert.equal(abschnittZeile(hs[1]!, 'kommt', () => false), 'Folge 83–118 · 36 Folgen · kommt')
assert.equal(abschnittZeile(hs[0]!, 'ruht', (nr) => nr === 3 || nr === 5 || nr === 6), 'Folge 1–82 · 82 Folgen · Deutsch: Fg. 3, 5–6')
const offen = staffelAbschnitte([[1, 1, 45], [4, 137]], [], [[1, 137]], (nr) => nr <= 137)
assert.equal(abschnittZeile(offen[1]!, 'laeuft', (nr) => nr <= 137), 'ab Folge 137 · läuft · Deutsch: Fg. 1')
// Einzahl: eine Staffel mit einer Folge sagt „1 Folge“, zwei Folgen „2 Folgen“.
const kurz = staffelAbschnitte([[1, 1, 1], [2, 2, 3]], [], [], () => false)
assert.equal(abschnittZeile(kurz[0]!, 'ruht', () => false), 'Folge 1–1 · 1 Folge', 'n = 1')
assert.equal(abschnittZeile(kurz[1]!, 'ruht', () => false), 'Folge 2–3 · 2 Folgen', 'n = 2')

// Tastatur: Pfeiltasten wählen den Nachbarn (rundum), Pos1/Ende den ersten/letzten; andere Tasten nichts.
assert.equal(naechsterReiter('ArrowRight', 0, 5), 1)
assert.equal(naechsterReiter('ArrowRight', 4, 5), 0)
assert.equal(naechsterReiter('ArrowLeft', 0, 5), 4)
assert.equal(naechsterReiter('ArrowLeft', 3, 5), 2)
assert.equal(naechsterReiter('Home', 3, 5), 0)
assert.equal(naechsterReiter('End', 1, 5), 4)
assert.equal(naechsterReiter('Enter', 1, 5), undefined)

// Gerenderte Reiterzeile: Rolle tab, aria-selected und tabindex nur am gewählten, Marke je Lage, Beschriftung mit Lage.
const lagen = [...hsReiter.slice(0, 3), { ...hsReiter[3]!, lage: 'laeuft' as const }, { ...hsReiter[4]!, lage: 'kommt' as const }]
const zeile = renderToStaticMarkup(createElement(ReiterZeile, { reiter: lagen, aktiv: 3, kennung: 'f-1', beiWahl: () => {} }))
assert.equal((zeile.match(/role="tab"/g) ?? []).length, 5, '5 Reiter')
assert.match(zeile, /role="tablist"/)
assert.equal((zeile.match(/aria-selected="true"/g) ?? []).length, 1, 'genau ein gewählter Reiter')
assert.match(zeile, /id="f-1-reiter-4"[^>]*aria-selected="true"[^>]*tabindex="0"/, 'Staffel 4 gewählt und per Tab erreichbar')
assert.equal((zeile.match(/tabindex="-1"/g) ?? []).length, 4, 'die übrigen nur per Pfeiltaste')
assert.equal((zeile.match(/aria-controls="f-1-abschnitt"/g) ?? []).length, 5)
assert.match(zeile, /aria-label="Staffel 4, läuft"/)
assert.match(zeile, /aria-label="Staffel 5, kommt"/)
assert.match(zeile, /aria-label="Staffel 1"/)
assert.equal((zeile.match(/data-lage="laeuft"/g) ?? []).length, 1)
assert.equal((zeile.match(/data-lage="kommt"/g) ?? []).length, 1)
assert.equal((zeile.match(/data-pfeil=/g) ?? []).length, 0, 'vor der Messung kein Pfeil')
assert.match(zeile, /\[scrollbar-width:none\]/, 'kein Scrollbalken')
assert.match(zeile, /\[&amp;::-webkit-scrollbar\]:hidden/, 'kein Scrollbalken (WebKit)')

// ARIA-Muster „Tabs“ an der ganzen Box: je Reiter Id, aria-controls auf die Box, Roving-tabIndex; die Box ist tabpanel und nennt den gewählten Reiter.
const attr = (tag: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1]
const box = renderToStaticMarkup(createElement(StaffelAbschnitt, { reiter: lagen, aktiv: 3, kennung: 'f-1', beiWahl: () => {}, zeile: 'x', kinder: null }))
const tabs = box.match(/<button[^>]*role="tab"[^>]*>/g) ?? []
const panel = /<div[^>]*role="tabpanel"[^>]*>/.exec(box)?.[0] ?? ''
assert.equal(tabs.length, 5, 'Box: 5 Reiter')
assert.equal(attr(panel, 'id'), 'f-1-abschnitt', 'tabpanel mit Id')
assert.equal(attr(panel, 'aria-labelledby'), 'f-1-reiter-4', 'tabpanel benannt vom gewählten Reiter')
assert.deepEqual(tabs.map((t) => attr(t, 'id')), lagen.map((r) => `f-1-reiter-${r.nr}`), 'Id je Reiter')
assert.deepEqual(tabs.map((t) => attr(t, 'aria-controls')), Array(5).fill('f-1-abschnitt'), 'jeder Reiter steuert die Box')
assert.deepEqual(tabs.map((t) => attr(t, 'tabindex')), ['-1', '-1', '-1', '0', '-1'], 'Roving-tabIndex: nur der gewählte per Tab')

// Tippfläche mindestens 44 × 44 px (design-regeln.md Abschnitt 13) aus den Tailwind-Klassen: Stufe × 4 px bzw. [n rem] × 16 px.
const pxVon = (klassen: string, vorsatz: string) => {
  const m = new RegExp(`(?:^| )${vorsatz}-(?:(\\d+)|\\[([\\d.]+)rem\\])(?= |$)`).exec(klassen)
  return m ? (m[1] ? Number(m[1]) * 4 : Number(m[2]) * 16) : 0
}
for (const t of tabs) {
  const klassen = attr(t, 'class') ?? ''
  assert.ok(pxVon(klassen, 'min-h') >= 44 && pxVon(klassen, 'min-w') >= 44, `Reiter-Tippfläche ≥ 44 px: ${klassen}`)
}

// Pfeile (24.11.2026, Daniel): Lage aus Scrollposition, Gesamtbreite und sichtbarer Breite. Feste Zahlen: Leiste 300 px sichtbar, 722 px breit.
assert.deepEqual(pfeilLageVon(0, 722, 300), { links: false, rechts: true }, 'ganz links')
assert.deepEqual(pfeilLageVon(211, 722, 300), { links: true, rechts: true }, 'Mitte')
assert.deepEqual(pfeilLageVon(422, 722, 300), { links: true, rechts: false }, 'ganz rechts')
assert.deepEqual(pfeilLageVon(0, 300, 300), { links: false, rechts: false }, 'passt ganz hinein')
assert.deepEqual(pfeilLageVon(1, 722, 300), { links: false, rechts: true }, '1 px links ist noch ganz links')
assert.deepEqual(pfeilLageVon(2, 722, 300), { links: true, rechts: true }, '2 px links sind schon Reiter links')
assert.deepEqual(pfeilLageVon(421, 722, 300), { links: true, rechts: false }, '1 px Rest rechts ist noch ganz rechts')
assert.deepEqual(pfeilLageVon(420, 722, 300), { links: true, rechts: true }, '2 px Rest rechts sind schon Reiter rechts')
assert.equal(sprungVon('rechts', 300), 300, 'Sprung rechts')
assert.equal(sprungVon('links', 437), -437, 'Sprung links')
const pfeil = (richtung: 'links' | 'rechts', weitere: boolean) => renderToStaticMarkup(createElement(ReiterPfeil, { richtung, weitere, beiKlick: () => {} }))
assert.match(pfeil('links', true), /aria-label="Vorherige Staffeln"/)
assert.match(pfeil('rechts', true), /aria-label="Weitere Staffeln"/)
assert.equal(pfeil('links', false), '', 'links ohne Reiter links nicht da')
assert.equal(pfeil('rechts', false), '', 'rechts ohne Reiter rechts nicht da')
assert.match(pfeil('links', true), /data-pfeil="links"/)
for (const r of ['links', 'rechts'] as const) {
  const klassen = attr(pfeil(r, true), 'class') ?? ''
  assert.ok(pxVon(klassen, 'after:h') >= 44 && pxVon(klassen, 'after:w') >= 44, `Pfeil-Trefferfläche ≥ 44 px: ${klassen}`)
}
const aufruf = (richtung: 'links' | 'rechts', clientWidth: number, ruhig: boolean) => {
  const gerufen: ScrollToOptions[] = []
  const welt = globalThis as { matchMedia?: unknown }
  welt.matchMedia = (q: string) => ({ matches: ruhig && q === '(prefers-reduced-motion: reduce)' })
  rolleUm({ clientWidth, scrollBy: (o: ScrollToOptions) => gerufen.push(o) } as unknown as HTMLElement, richtung)
  return gerufen
}
assert.deepEqual(aufruf('rechts', 300, false), [{ left: 300, behavior: 'smooth' }], 'rechts +300 weich')
assert.deepEqual(aufruf('links', 300, false), [{ left: -300, behavior: 'smooth' }], 'links -300 weich')
assert.deepEqual(aufruf('links', 300, true), [{ left: -300, behavior: 'auto' }], 'weniger Bewegung: ohne Animation')
rolleUm(null, 'links')

// Staffelnamen (`sn`, wörtlich aus horizonte-staffeln.yaml): ohne den Serienteil, den alle Namen teilen, und ohne „Staffel N – “ der eigenen Nummer.
const hz = folgen['14839']!
const hzReiter = reiterVon(abschnitte(14839), [], HEUTE, hz.sn)
assert.deepEqual(hzReiter.map((r) => r.name), ['Die Serie', 'Die Suche nach Laqua', 'Gute Aussichten', 'Wunder in Sicht'], 'Horizonte: Namen')
assert.deepEqual(hzReiter.map((r) => r.label), ['1', '2', '3', '4'], 'Reiter bleibt die Ziffer')
assert.ok(hzReiter.every((r) => hz.sn![String(r.nr)]!.endsWith(r.name!)), 'jeder Name ist ein wörtliches Stück des Yaml-Namens')
assert.deepEqual(reiterVon(abschnitte(14839), [], HEUTE).map((r) => r.name), [undefined, undefined, undefined, undefined], 'ohne sn: kein Name')
assert.deepEqual(reiterVon(hs, [], HEUTE, { 2: 'Orange-Liga' }).map((r) => r.name), [undefined, 'Orange-Liga', undefined, undefined, undefined], 'nur Staffeln mit Eintrag')
// Grenzen der Kürzung: ein einzelner Name, verschiedene Serienteile, Name ohne Rest, fremde Staffelnummer bleiben ganz.
assert.equal(kurzeStaffelNamen({ 1: 'Serie: Eins' }).get(1), 'Serie: Eins', 'ein Name: nichts gemeinsam')
assert.deepEqual([...kurzeStaffelNamen({ 1: 'A: Eins', 2: 'B: Zwei' }).values()], ['A: Eins', 'B: Zwei'], 'verschiedene Serienteile')
assert.deepEqual([...kurzeStaffelNamen({ 1: 'A: Eins', 2: 'A: ' }).values()], ['A: Eins', 'A: '], 'Name ohne Rest kürzt keinen')
assert.deepEqual([...kurzeStaffelNamen({ 1: 'Eins', 2: 'Zwei' }).values()], ['Eins', 'Zwei'], 'ohne „: “ nichts gemeinsam')
assert.deepEqual([...kurzeStaffelNamen({ 1: 'A: Eins', 2: 'A: Staffel 3 – Drei' }).values()], ['Eins', 'Staffel 3 – Drei'], 'fremde Nummer bleibt')
assert.deepEqual([...kurzeStaffelNamen({ 1: 'Staffel 1 – ', 2: 'Staffel 2 – Zwei' }).values()], ['Staffel 1 – ', 'Zwei'], 'Vorsatz ohne Rest bleibt')
assert.equal(kurzeStaffelNamen(undefined).size, 0, 'ohne sn leer')
// Gerendert: Name in der Box über der Kopfzeile, Reiter-Beschriftung „Staffel N: Name“; ohne Name keine Namenszeile.
const hzBox = renderToStaticMarkup(createElement(StaffelAbschnitt, { reiter: hzReiter, aktiv: 1, kennung: 'h', beiWahl: () => {}, zeile: 'Kopf', kinder: null }))
assert.match(hzBox, /<p data-staffel-name="true"[^>]*>Die Suche nach Laqua<\/p><p[^>]*>Kopf<\/p>/, 'Name über der Kopfzeile')
assert.equal((hzBox.match(/Die Suche nach Laqua/g) ?? []).length, 2, 'Name einmal sichtbar, einmal im aria-label')
assert.match(hzBox, /aria-label="Staffel 2: Die Suche nach Laqua"/)
assert.match(hzBox, /aria-label="Staffel 4: Wunder in Sicht"/)
assert.match(renderToStaticMarkup(createElement(ReiterZeile, { reiter: [{ ...hzReiter[3]!, lage: 'laeuft' }], aktiv: 0, kennung: 'h', beiWahl: () => {} })), /aria-label="Staffel 4: Wunder in Sicht, läuft"/, 'Name vor der Lage')
const ohneName = renderToStaticMarkup(createElement(StaffelAbschnitt, { reiter: hsReiter, aktiv: 1, kennung: 'h', beiWahl: () => {}, zeile: 'Kopf', kinder: null }))
assert.doesNotMatch(ohneName, /data-staffel-name/, 'ohne sn keine Namenszeile')
assert.match(ohneName, /aria-label="Staffel 2"/, 'ohne sn: Beschriftung wie bisher')

// Das Mockup zeigt die echte Komponente (kein Ersatz) am Fall Pokémon-Hauptserie, mit Stichtag 24.11.2026.
const def = mockupMit('staffel-abschnitt')!
assert.deepEqual(Object.keys(def.varianten), ['A'])
assert.deepEqual(def.varianten.A!.ersatz, {}, 'A ohne Ersatz')
assert.ok(def.faelle.includes('pokemon-sammeltitel'), 'Fall pokemon-sammeltitel bleibt')

console.log('buehne-staffel-reiter: ok (Reiter 5/3/2/0, Lage 14 Fälle, Startreiter 5, Kopfzeile 7, Namen 17, Tastatur 7, Reiterzeile, ARIA-Box, Tippfläche, Pfeile, Mockup)')
