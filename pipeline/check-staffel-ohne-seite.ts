/**
 * Die Regel „angekündigte Staffel ohne eigene Seite“ (`staffelnOhneSeite`) an festen Fällen; der Bestand steht in
 * `check-staffel-ohne-seite-bestand.ts`. Anlass: The Mighty Nein Staffel 2 (24.11.2026).
 * Aufruf: npx tsx pipeline/check-staffel-ohne-seite.ts
 */
import { abweichungVonBekannt, bestandUrteil, staffelnOhneSeite, zusammengelegteStaffeln, type StaffelGrenzeKurz } from './lib/staffel-ohne-seite.ts'

let fehler = 0
function pruefe(name: string, ist: unknown, soll: unknown): void {
  const gut = JSON.stringify(ist) === JSON.stringify(soll)
  if (!gut) fehler++
  console.log(`${gut ? '✓' : '✖'} ${name}${gut ? '' : ` — ist ${JSON.stringify(ist)}, soll ${JSON.stringify(soll)}`}`)
}

const titel = [
  { id: -900001, titleEn: 'Alpha', episodes: 8 },
  { id: -900002, titleEn: 'Beta', episodes: 8 },
  { id: -900003, titleEn: 'Gamma', episodes: 12 },
  { id: -900004, titleEn: 'Delta', episodes: undefined },
]
const rel = (slug: string, titleId: number, ab: number | undefined, am: string, extra: object = {}) => ({ slug, titleId, schedule: { firstEpisodeDate: am, firstEpisodeNumber: ab }, ...extra }) as never
const heute = '2026-11-24'

const s2 = rel('alpha-s2', -900001, 9, '2027-03-24')
pruefe('Staffel 2 ab Folge 9 hinter 8 Folgen, künftig: Fund', staffelnOhneSeite(titel, [rel('x', -900002, 5, '2027-01-01'), s2, rel('y', -900003, 12, '2027-01-01')], heute).map((f) => f.slug), ['alpha-s2'])
pruefe('Titel mit belegten Staffelgrenzen (F157: Staffel als Abschnitt): kein Fund; ein anderer Titel daneben schon', staffelnOhneSeite(titel, [s2, rel('y', -900002, 9, '2027-01-01')], heute, new Set([-900001])).map((f) => f.slug), ['y'])
pruefe('Erste Folge = Folgenzahl + 1 zählt, = Folgenzahl nicht', staffelnOhneSeite(titel, [rel('a', -900002, 9, '2027-01-01'), rel('b', -900002, 8, '2027-01-01')], heute).map((f) => f.slug), ['a'])
pruefe('vergangener Termin: kein Fund', staffelnOhneSeite(titel, [rel('alt', -900001, 9, '2026-11-23')], heute), [])
pruefe('Termin heute zählt noch', staffelnOhneSeite(titel, [rel('heute', -900001, 9, heute)], heute).length, 1)
pruefe('ohne Folgennummer oder erste Folge 1: kein Fund', staffelnOhneSeite(titel, [rel('n', -900001, undefined, '2027-03-24'), rel('eins', -900001, 1, '2027-03-24')], heute), [])
pruefe('Titel ohne Folgenzahl: nichts zu vergleichen', staffelnOhneSeite(titel, [rel('d', -900004, 50, '2027-03-24')], heute), [])
pruefe('widerlegtes Release: kein Fund', staffelnOhneSeite(titel, [rel('w', -900001, 9, '2027-03-24', { widerlegt: { am: '2026-11-20', grund: 'x', gemeldet: true } })], heute), [])
pruefe('Release eines unbekannten Titels: kein Fund', staffelnOhneSeite(titel, [rel('u', -999999, 9, '2027-03-24')], heute), [])
pruefe('Fund nennt Titel, Folge und Tag', staffelnOhneSeite(titel, [s2], heute), [{ slug: 'alpha-s2', titleId: -900001, titel: 'Alpha', ab: 9, am: '2027-03-24' }])

const mitStaffeln = [{ id: -900009, titleEn: 'Theta', episodes: 16, staffeln: [{ nr: 1, folgen: 8 }, { nr: 2, folgen: 8, start: '2027-03-24' }] }, { id: -900010, titleEn: 'Iota', episodes: 8, staffeln: [{ nr: 1, folgen: 8 }] }, { id: -900011, titleEn: 'Kappa', episodes: 16, staffeln: [{ nr: 1, folgen: 16 }] }]
pruefe('Folgenzahl 16 aus Staffeln 8+8: Release ab Folge 9 ist ein Fund (Blindheit 25.11.2026)', staffelnOhneSeite(mitStaffeln, [rel('t2', -900009, 9, '2027-03-24')], heute).map((f) => f.slug), ['t2'])
pruefe('alter Stand (eine Staffel, 8 Folgen): Release ab Folge 9 ist ebenfalls ein Fund', staffelnOhneSeite(mitStaffeln, [rel('i2', -900010, 9, '2027-03-24')], heute).map((f) => f.slug), ['i2'])
pruefe('Staffel 1 mit 16 Folgen: Release ab Folge 9 ist kein Fund, ab Folge 17 schon', staffelnOhneSeite(mitStaffeln, [rel('k1', -900011, 9, '2027-03-24'), rel('k2', -900011, 17, '2027-03-24')], heute).map((f) => f.slug), ['k2'])

/* Zusammengelegte Staffeln (Ein-Titel-Form, ohne `basis`): jede spätere Staffel mit eigener Ankündigung ist ein Fund (F157, 26.11.2026). */
const hz: StaffelGrenzeKurz = { anilistId: -900020, titel: 'Omega', staffeln: [{ nr: 1, von: 1 }, { nr: 2, von: 46 }, { nr: 3, von: 90 }, { nr: 4, von: 137, offen: true }] }
const omega = [{ id: -900020, titleEn: 'Omega EN', titleDe: 'Omega DE' }]
const slugs = (g: StaffelGrenzeKurz[], r: never[]) => zusammengelegteStaffeln(g, omega, r, heute).map((f) => f.slug)
pruefe('zusammengelegt: laufende offene Staffel 4 (Termin vergangen) ist ein Fund', slugs([hz], [rel('s4', -900020, 137, '2026-11-20')]), ['s4'])
pruefe('zusammengelegt: künftiger Termin in abgeschlossener Staffel 2 ist ein Fund', slugs([hz], [rel('s2', -900020, 46, '2027-01-01')]), ['s2'])
pruefe('zusammengelegt: vergangener Termin in abgeschlossener Staffel: kein Fund', slugs([hz], [rel('alt', -900020, 50, '2026-01-01')]), [])
pruefe('zusammengelegt: Termin der ersten Staffel (auch ab Folge 45): kein Fund', slugs([hz], [rel('e', -900020, 45, '2027-01-01'), rel('e1', -900020, 1, '2027-01-01')]), [])
pruefe('zusammengelegt: Folge 136 gehört zu Staffel 3, 137 zu Staffel 4', slugs([hz], [rel('a', -900020, 136, '2027-01-01'), rel('b', -900020, 137, '2027-01-01')]), ['a', 'b'])
pruefe('zusammengelegt: mit `basis` ist jede Staffel ein eigener Titel, kein Fund', slugs([{ ...hz, basis: 4 }], [rel('s4', -900020, 137, '2026-11-20')]), [])
pruefe('zusammengelegt: eine einzige Staffel: kein Fund', slugs([{ ...hz, staffeln: [{ nr: 1, von: 1 }] }], [rel('x', -900020, 50, '2027-01-01')]), [])
pruefe('zusammengelegt: widerlegt oder ohne Folgennummer: kein Fund', slugs([hz], [rel('w', -900020, 137, '2027-01-01', { widerlegt: { am: '2026-11-20', grund: 'x', gemeldet: true } }), rel('n', -900020, undefined, '2027-01-01')]), [])
pruefe('zusammengelegt: Release eines anderen Titels: kein Fund', slugs([hz], [rel('f', -900021, 137, '2027-01-01')]), [])
pruefe('zusammengelegt: Titel unbekannt, Name aus der Yaml', zusammengelegteStaffeln([hz], [], [rel('s4', -900020, 137, '2027-01-01')], heute)[0]!.titel, 'Omega')
pruefe('zusammengelegt: Name: englischer vor deutschem vor Yaml; ein Titel mit anderer Kennung zählt nicht', [zusammengelegteStaffeln([hz], omega, [rel('s4', -900020, 137, '2027-01-01')], heute)[0]!.titel, zusammengelegteStaffeln([hz], [{ id: -900020, titleEn: undefined, titleDe: 'Omega DE' }], [rel('s4', -900020, 137, '2027-01-01')], heute)[0]!.titel, zusammengelegteStaffeln([hz], [{ id: -900099, titleEn: 'Fremd', titleDe: undefined }], [rel('s4', -900020, 137, '2027-01-01')], heute)[0]!.titel], ['Omega EN', 'Omega DE', 'Omega'])
pruefe('zusammengelegt: der Fund trägt Release, Titel, Folge und Tag', zusammengelegteStaffeln([hz], omega, [rel('s4', -900020, 137, '2027-01-01')], heute), [{ slug: 's4', titleId: -900020, titel: 'Omega EN', ab: 137, am: '2027-01-01' }])
pruefe('zusammengelegt: Termin heute in abgeschlossener Staffel zählt noch', slugs([hz], [rel('h', -900020, 50, heute)]), ['h'])
pruefe('zusammengelegt: ohne Titel und ohne Yaml-Namen die Kennung als Name', zusammengelegteStaffeln([{ ...hz, titel: undefined }], [], [rel('s4', -900020, 137, '2027-01-01')], heute)[0]!.titel, '-900020')
pruefe('zusammengelegt: Folgennummer ohne Tag oder Tag ohne Folgennummer: kein Fund', slugs([hz], [{ slug: 'k', titleId: -900020, schedule: { firstEpisodeNumber: 137 } } as never, { slug: 'l', titleId: -900020, schedule: { firstEpisodeDate: '2027-01-01' } } as never]), [])
pruefe('zusammengelegt: Folge vor der ersten Staffel: kein Fund, kein Absturz', slugs([hz], [rel('null', -900020, 0, '2027-01-01')]), [])
pruefe('zusammengelegt: zwei Staffeln genügen, eine allein ergibt nie einen Fund', [slugs([{ ...hz, staffeln: [{ nr: 1, von: 1 }, { nr: 2, von: 10 }] }], [rel('z', -900020, 10, '2027-01-01')]), slugs([{ ...hz, staffeln: [{ nr: 1, von: 1, offen: true }] }], [rel('e', -900020, 5, '2026-01-01')])], [['z'], []])

const klein = [{ id: -900006, titleEn: undefined, titleDe: undefined, episodes: 1 }, { id: -900007, titleEn: undefined, titleDe: 'Zeta', episodes: 0 }, { id: -900008, titleEn: 'Eta', titleDe: 'Zeta', episodes: 1 }]
pruefe('erste Folge 2 hinter 1 Folge: Fund; Name fällt auf Kennung zurück', staffelnOhneSeite(klein, [rel('k', -900006, 2, '2027-01-01')], heute).map((f) => f.titel), ['-900006'])
pruefe('erste Folge 1 hinter 0 Folgen: kein Fund (erste Staffel)', staffelnOhneSeite(klein, [rel('n', -900007, 1, '2027-01-01')], heute), [])
pruefe('Name: englischer vor deutschem, deutscher vor Kennung', [staffelnOhneSeite(klein, [rel('d', -900008, 2, '2027-01-01')], heute)[0]!.titel, staffelnOhneSeite(klein, [rel('d', -900007, 2, '2027-01-01')], heute)[0]!.titel], ['Eta', 'Zeta'])

const f1 = staffelnOhneSeite(titel, [s2, rel('y', -900003, 12, '2027-01-01'), rel('b2', -900002, 9, '2027-02-01')], heute)
const bek = new Map([['alpha-s2', 'Grund'], ['alt-eintrag', 'Grund']])
pruefe('Ratsche: neuer Fall und erledigter Eintrag werden getrennt genannt', abweichungVonBekannt(f1, bek), { neu: ['b2'], erledigt: ['alt-eintrag'] })
pruefe('Ratsche: alles bekannt, nichts erledigt', abweichungVonBekannt(f1.slice(0, 1), new Map([['alpha-s2', 'Grund']])), { neu: [], erledigt: [] })
pruefe('Ratsche: zwei Termine desselben Release zählen einmal', abweichungVonBekannt([...f1.slice(0, 1), ...f1.slice(0, 1)], new Map()).neu, ['alpha-s2'])

/* Exit-Zweig des Bestandsprüfers: je Meldeart ein Fall (neu / erledigt) und der grüne Gegenfall. */
const nurNeu = bestandUrteil(f1.slice(0, 1), new Map())
pruefe('Bestand: nur ein neuer Fall ist rot', [nurNeu.rot, nurNeu.meldungen.length], [true, 1])
const nurErledigt = bestandUrteil([], new Map([['erfundener-eintrag', 'Grund']]))
pruefe('Bestand: nur ein erledigter Eintrag ist rot', [nurErledigt.rot, nurErledigt.meldungen], [true, ['FEHLER: erfundener-eintrag steht in BEKANNT, ist aber kein Fall mehr — Eintrag streichen']])
pruefe('Bestand: alles bekannt ist grün', bestandUrteil(f1.slice(0, 1), new Map([['alpha-s2', 'Grund']])), { rot: false, meldungen: [] })

console.log(`${fehler ? '✖' : '✓'} Staffel ohne Seite: ${fehler} Fehler`)
process.exit(fehler ? 1 : 0)
