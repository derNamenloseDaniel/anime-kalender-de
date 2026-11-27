/**
 * Zusicherungen zu `lib/tmdb-staffel-wahl.ts` und zur Nachwahl japanischer Plakate in `lib/tmdb-ablauf.ts` (Mängelart `bild-fremdsprachig`):
 * ein Plakat aus der alten Folge (japanisch, ohne `nurJa`) wird neu gewählt, ein belegtes nie, und eine Neuprüfung macht keinen Eintrag schlechter.
 * Aufruf: `npm run check:logic`.
 */
import { bilderAbzufragen, bilderFaellig, japanischOhneBeleg } from './lib/tmdb-ablauf.ts'
import { staffelAnwaerter, staffelEintrag } from './lib/tmdb-staffel-wahl.ts'
import type { PlakatBestand } from './lib/tmdb-plakat-suche.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const jetzt = new Date('2026-11-24T12:00:00Z')
const frisch = '2026-11-20'
const plakat = (l: string | null, extra: object = {}) => ({ p: '/x.jpg', w: 1000, h: 1500, l, inhaltAm: frisch, ...extra })

console.log('\nNachwahl: welcher Eintrag zählt als „japanisch ohne Beleg“')
pruefe('ja ohne nurJa: ohne Beleg (zwei Einträge)', japanischOhneBeleg(plakat('ja')) && japanischOhneBeleg(plakat('ja', { inhaltAm: '2026-10-27' })))
pruefe('ja mit nurJa: belegt', !japanischOhneBeleg(plakat('ja', { nurJa: true })))
pruefe('de, en, ohne Sprache: kein Fall', !japanischOhneBeleg(plakat('de')) && !japanischOhneBeleg(plakat('en')) && !japanischOhneBeleg(plakat(null)))
pruefe('null („TMDB hat keins“) und fehlender Eintrag: kein Fall', !japanischOhneBeleg(null) && !japanischOhneBeleg(undefined))
pruefe('ein Hintergrundbild (ohne Sprachfeld) ist nie ein Fall', !japanischOhneBeleg({ inhaltAm: frisch }))

console.log('\nNachwahl: Abruf mit Zuordnung')
const bestand = { altJa: plakat('ja'), altJa2: plakat('ja', { inhaltAm: '2026-10-11' }), belegt: plakat('ja', { nurJa: true }), deutsch: plakat('de'), keins: null, ohneKennung: plakat('ja') }
const faellig = bilderFaellig(bestand, (id) => id !== 'ohneKennung', jetzt)
pruefe('beide jungen japanischen Plakate ohne Beleg werden erneuert, ältestes zuerst', faellig.erneuern.join() === 'altJa2,altJa', faellig.erneuern)
pruefe('belegtes, deutsches und null bleiben', !faellig.erneuern.some((id) => ['belegt', 'deutsch', 'keins'].includes(id)), faellig.erneuern)
pruefe('ohne Zuordnung wird ein junger Eintrag nicht entfernt', faellig.entfernen.length === 0, faellig.entfernen)
const abfrage = bilderAbzufragen({ altJa: { tmdbId: 1, kind: 'tv' }, altJa2: { tmdbId: 2, kind: 'movie' } }, bestand, false, 10, jetzt)
pruefe('der Plakat-Lauf fragt beide ab', abfrage.offen.map(([id]) => id).join() === 'altJa2,altJa', abfrage.offen)
const abgelaufen = bilderFaellig({ a: plakat('ja', { inhaltAm: '2026-01-01' }), b: plakat('en', { inhaltAm: '2026-01-02' }) }, () => false, jetzt)
pruefe('ein abgelaufener Eintrag ohne Zuordnung wird weiter entfernt (beide)', abgelaufen.entfernen.join() === 'a,b', abgelaufen.entfernen)

console.log('\nNachwahl: Staffelsuche')
const reihe = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }, { id: 6 }, { id: 7 }, { id: 8 }]
const a = {
  gesucht: new Set([1, 2, 7]),
  ohne: new Set([8]),
  serieVon: new Map([[1, 9], [2, 9], [3, 9], [4, 9], [5, 9], [6, 9], [8, 9]]),
  eigeneKennung: (id: number) => id === 6,
  bestand: { 2: plakat('ja'), 3: plakat('ja'), 4: plakat('ja', { nurJa: true }), 5: plakat('en'), 6: plakat('ja'), 8: plakat('ja') } as unknown as PlakatBestand,
}
const ids = staffelAnwaerter(reihe, a).map((t) => t.id)
pruefe('ohne Eintrag und gesucht (1), japanisch ohne Beleg ohne eigene Kennung (2, 3)', ids.join() === '1,2,3', ids)
pruefe('nicht: belegtes ja (4), lesbares (5), eigene Kennung (6), ohne Reihenserie (7), gesperrt (8)', ![4, 5, 6, 7, 8].some((i) => ids.includes(i)), ids)
pruefe('ohne Eintrag und nicht gesucht bleibt draußen', !staffelAnwaerter([{ id: 9 }, { id: 10 }], { ...a, serieVon: new Map([[9, 9], [10, 9]]) }).length)

console.log('\nNachwahl: Eintrag nach der Staffelwahl')
const wahl = { file_path: '/neu.jpg', width: 1000, height: 1500, iso_639_1: 'en' }
const neuJa = { ...wahl, iso_639_1: 'ja' }
pruefe('eine Wahl ersetzt das alte Plakat (en, null)', staffelEintrag(plakat('ja'), wahl)?.p === '/neu.jpg' && staffelEintrag(plakat('ja'), { ...wahl, iso_639_1: null })?.l === null)
pruefe('ohne Staffelplakat behält ein Eintrag sein Plakat (zwei Fälle)', staffelEintrag(plakat('ja'), undefined)?.p === '/x.jpg' && staffelEintrag(plakat('de'), undefined)?.l === 'de')
pruefe('ohne Staffelplakat bekommt ein neuer Titel null', staffelEintrag(undefined, undefined) === null)
pruefe('ist auch das Staffelplakat japanisch, trägt es den Beleg nurJa', staffelEintrag(plakat('ja'), neuJa)?.nurJa === true)

if (verletzt > 0) {
  console.error(`\n${verletzt} Zusicherung(en) verletzt.`)
  process.exit(1)
}
console.log('\nAlle Zusicherungen erfüllt.')
