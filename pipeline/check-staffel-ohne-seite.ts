/**
 * Die Regel „angekündigte Staffel ohne eigene Seite“ (`staffelnOhneSeite`) an festen Fällen; der Bestand steht in
 * `check-staffel-ohne-seite-bestand.ts`. Anlass: The Mighty Nein Staffel 2 (24.11.2026).
 * Aufruf: npx tsx pipeline/check-staffel-ohne-seite.ts
 */
import { abweichungVonBekannt, bestandUrteil, staffelnOhneSeite } from './lib/staffel-ohne-seite.ts'

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
