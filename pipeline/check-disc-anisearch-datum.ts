/**
 * Zusicherungen zum Disc-Termin: **das neuere belegte Datum gewinnt** (`lib/disc-anisearch-datum.ts`, 29.10.2026).
 * Anlass: Virgin Road Vol. 1 zeigte den 30.10. (Anime2You vom 02.10.), aniSearch nannte seit dem 12.10. den 06.11.
 * Läuft in `check:logic`.
 */
import type { Release } from '../shared/types.ts'
import type { DiscIndex } from './lib/disc-ean.ts'
import { aniSearchDatumAnwenden, aniSearchGewinnt, aniSearchTermin, discTerminFehler, veroeffentlichungstage } from './lib/disc-anisearch-datum.ts'
import { verschiebungenAnwenden } from './lib/disc-verschiebungen.ts'
import { pruefeErgebnis } from './lib/pruefung.ts'

let fehler = 0
function pruefe(name: string, bedingung: boolean, gefunden?: unknown): void {
  if (bedingung) return void console.log(`  ✓ ${name}`)
  fehler++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const HEUTE = '2026-10-29'
const A2Y = 'https://www.anime2you.de/news/1056385/22-verschiebungen-animoon-crunchyroll-peppermint/'
const ARTIKEL = 'https://www.anisearch.de/article/198024,virgin-road-die-henkerin-und-ihre-art-zu-leben-vol-1-3-limited-edition-blu-ray-sammelschuber'
const EAN = '4260497796626'

/* Wörtlich aus `data/disc-ausgaben.json` (Schlüssel 129193) und `data/anisearch-artikel.json` (198024). */
function index(daten: { datum: string; gelesen?: string; edition?: string }[] = [{ datum: '2026-11-06', gelesen: '2026-10-12T05:53:59.292Z' }]): DiscIndex {
  return {
    ausgaben: {
      '129193': daten.map((d, i) => ({
        datum: d.datum,
        url: i === 0 ? ARTIKEL : `https://www.anisearch.de/article/19802${4 + i},vol-1-${i}`,
        format: 'Blu-ray',
        kurz: 'Vol. 1/3: Limited Edition + Sammelschuber',
        ...(d.edition ? { edition: d.edition } : {}),
      })),
    },
    artikel: Object.fromEntries(daten.map((d, i) => [i === 0 ? '198024' : `19802${4 + i}`, { ean: EAN, publisher: 'AniMoon Publishing GmbH', umfang: 'Einzelnes Vol.', fetchedAt: d.gelesen }])),
  }
}

function virgin(datum = '2026-10-30', quellen = [A2Y]): Release {
  return {
    slug: 'virgin-road-vol1',
    titleId: 129193,
    name: 'Virgin Road – Vol. 1',
    platform: 'disc',
    releaseType: 'disc',
    buyUrl: 'https://www.amazon.de/s?k=Virgin%20Road%20%E2%80%93%20Vol.%201%20Anime%20Blu-ray',
    schedule: { firstEpisodeDate: datum },
    year: Number(datum.slice(0, 4)),
    sources: quellen,
  } as unknown as Release
}
const tage = (pub: string) => veroeffentlichungstage([{ articleUrl: A2Y, publishedAt: pub }])
const datumNach = (r: Release, i: DiscIndex, pub = '2026-10-02'): string => {
  const liste = [r]
  aniSearchDatumAnwenden(liste, i, tage(pub), HEUTE)
  return liste[0]!.schedule.firstEpisodeDate!
}

/* Der echte Fall. */
const rs = [virgin()]
const geaendert = aniSearchDatumAnwenden(rs, index(), tage('2026-10-02'), HEUTE)
pruefe('Virgin Road Vol. 1: 30.10. wird 06.11.', rs[0]!.schedule.firstEpisodeDate === '2026-11-06' && rs[0]!.year === 2026, rs[0]!.schedule)
pruefe('gemeldet wird die Änderung mit altem und neuem Tag', geaendert.length === 1 && geaendert[0]!.von === '2026-10-30' && geaendert[0]!.nach === '2026-11-06', geaendert)
pruefe('Amazon-Link: aus der Namens- wird die EAN-Suche', rs[0]!.buyUrl === `https://www.amazon.de/s?k=${EAN}`, rs[0]!.buyUrl)
const q = rs[0]!.quellen ?? []
pruefe('Belege: Anime2You überholt, aniSearch aktuell mit neuem Tag', q.find((x) => x.url === A2Y)?.stand === 'ueberholt' && q.find((x) => x.url === ARTIKEL)?.stand === 'aktuell' && q.find((x) => x.url === ARTIKEL)?.sagt === '2026-11-06', q)
pruefe('aniSearch-Artikel steht bei den Quellen', rs[0]!.sources.includes(ARTIKEL), rs[0]!.sources)
pruefe('zweiter Lauf ändert nichts mehr', aniSearchDatumAnwenden(rs, index(), tage('2026-10-02'), HEUTE).length === 0)

/* Grenzen der Regel. */
const T = (gelesen: string): ReturnType<typeof aniSearchTermin> => aniSearchTermin(virgin(), index([{ datum: '2026-11-06', gelesen }]))
pruefe('aniSearch am selben Tag gelesen wie die Meldung erschien: Meldung bleibt', datumNach(virgin(), index([{ datum: '2026-11-06', gelesen: '2026-10-02T05:00:00Z' }])) === '2026-10-30')
pruefe('aniSearch einen Tag später gelesen: aniSearch gewinnt', datumNach(virgin(), index([{ datum: '2026-11-06', gelesen: '2026-10-03T05:00:00Z' }])) === '2026-11-06')
pruefe('aniSearch vor der Meldung gelesen: Meldung bleibt', datumNach(virgin(), index([{ datum: '2026-11-06', gelesen: '2026-10-01T05:00:00Z' }])) === '2026-10-30')
pruefe('Meldung später als die aniSearch-Lesung (Kreislauf, Meldung 20.10.): Meldung bleibt', datumNach(virgin('2026-11-13'), index(), '2026-10-20') === '2026-11-13')
pruefe('Quelle ohne bekanntes Veröffentlichungsdatum: bleibt', datumNach(virgin('2026-10-30', ['https://x.example/a']), index()) === '2026-10-30')
pruefe('Platzhalter 31.12.: bleibt', datumNach(virgin(), index([{ datum: '2026-12-31', gelesen: '2026-10-12T05:00:00Z' }])) === '2026-10-30')
pruefe('aniSearch-Tag schon vorbei, unser Tag steht bevor: bleibt', datumNach(virgin(), index([{ datum: '2026-10-23', gelesen: '2026-10-12T05:00:00Z' }])) === '2026-10-30')
pruefe('aniSearch-Tag heute, unserer morgen: bleibt', datumNach(virgin(), index([{ datum: HEUTE, gelesen: '2026-10-12T05:00:00Z' }])) === '2026-10-30')
pruefe('zwei verschiedene Tage für dieselbe Nummer (DVD/Blu-ray): bleibt', datumNach(virgin(), index([{ datum: '2026-11-06', gelesen: '2026-10-12T05:00:00Z' }, { datum: '2026-11-20', gelesen: '2026-10-12T05:00:00Z' }])) === '2026-10-30')
pruefe('zwei Ausgaben mit demselben Tag: gilt', datumNach(virgin(), index([{ datum: '2026-11-06', gelesen: '2026-10-12T05:00:00Z' }, { datum: '2026-11-06', gelesen: '2026-10-13T05:00:00Z' }])) === '2026-11-06')
pruefe('Lesetag fehlt: bleibt', datumNach(virgin(), index([{ datum: '2026-11-06' }])) === '2026-10-30')
pruefe('älteste Lesung zählt, wenn mehrere Ausgaben denselben Tag nennen', aniSearchTermin(virgin(), index([{ datum: '2026-11-06', gelesen: '2026-10-12T05:00:00Z' }, { datum: '2026-11-06', gelesen: '2026-10-13T05:00:00Z' }]))?.gelesen === '2026-10-12')
pruefe('Lesetag wird als Datum gekürzt', T('2026-10-12T05:53:59.292Z')?.gelesen === '2026-10-12', T('2026-10-12T05:53:59.292Z'))
const vol2 = { ...virgin(), name: 'Virgin Road – Vol. 2' } as Release
pruefe('andere Nummer: keine Ausgabe, bleibt', aniSearchTermin(vol2, index()) === undefined)
const kino = { ...virgin(), releaseType: 'weekly' } as Release
pruefe('Release, das keine Disc ist: bleibt', datumNach(kino, index()) === '2026-10-30')
pruefe('ohne Nummer im Namen: keine Zuordnung', aniSearchTermin({ ...virgin(), name: 'Virgin Road' }, index()) === undefined)
pruefe('Release ohne Tag: keine Regel', !aniSearchGewinnt({ ...virgin(), schedule: {} } as Release, aniSearchTermin(virgin(), index())!, tage('2026-10-02'), HEUTE))

const ZWEITE = 'https://www.anime2you.de/news/1033082/disc-neuheiten-august-2026/'
const zweiQuellen = veroeffentlichungstage([{ articleUrl: A2Y, publishedAt: '2026-10-20' }, { articleUrl: ZWEITE, publishedAt: '2026-07-25' }])
const mehrere = [virgin('2026-10-30', [ZWEITE, A2Y])]
aniSearchDatumAnwenden(mehrere, index(), zweiQuellen, HEUTE)
pruefe('mehrere Quellen: die jüngste Meldung (20.10.) zählt, nicht die erste in der Liste (25.07.)', mehrere[0]!.schedule.firstEpisodeDate === '2026-10-30', mehrere[0]!.schedule)
const jahr = [virgin('2026-12-30')]
aniSearchDatumAnwenden(jahr, index([{ datum: '2027-01-15', gelesen: '2026-10-12T05:00:00Z' }]), tage('2026-10-02'), HEUTE)
pruefe('Jahreswechsel: das Jahr des Releases folgt dem neuen Tag', jahr[0]!.schedule.firstEpisodeDate === '2027-01-15' && jahr[0]!.year === 2027, jahr[0])
const box = { ...virgin(), name: 'Virgin Road – Box 1' } as Release
pruefe('Box 1 ist nicht Vol. 1', aniSearchTermin(box, index()) === undefined)

/* Mehrere Staffeln unter einer Kennung (Index 20, 351, 527, 969): Vol. 1 der Staffel 2 ist nicht Vol. 1 der Staffel 1; `kurz` lässt die Staffel weg, `edition` nennt sie. */
const mitStaffel = (name: string, edition: string | undefined, gelesen = '2026-10-12T05:00:00Z'): ReturnType<typeof aniSearchTermin> =>
  aniSearchTermin({ ...virgin(), name }, index([{ datum: '2026-11-06', gelesen, ...(edition ? { edition } : {}) }]))
const S1 = 'Virgin Road - Staffel 1 - Vol. 1/3: Limited Edition [Blu-ray]'
const S2 = 'Virgin Road - Staffel 2 - Vol. 1/3: Limited Edition [Blu-ray]'
pruefe('Staffel 2 Vol. 1 gegen Ausgabe Staffel 1 Vol. 1: kein Treffer', mitStaffel('Virgin Road (Staffel 2) – Vol. 1', S1) === undefined)
pruefe('Staffel 2 Vol. 1 gegen Ausgabe Staffel 2 Vol. 1: Treffer', mitStaffel('Virgin Road (Staffel 2) – Vol. 1', S2)?.datum === '2026-11-06')
pruefe('ohne Staffelangabe gegen Ausgabe „Staffel 1": Treffer (aniSearch schreibt Staffel 1 aus)', mitStaffel('Virgin Road – Vol. 1', S1)?.datum === '2026-11-06')
pruefe('ohne Staffelangabe gegen Ausgabe Staffel 2: kein Treffer', mitStaffel('Virgin Road – Vol. 1', S2) === undefined)
pruefe('Staffel 2 gegen Ausgabe ohne Staffel im Namen: kein Treffer', mitStaffel('Virgin Road (Staffel 2) – Vol. 1', 'Virgin Road - Vol. 1/3: Limited Edition') === undefined)
pruefe('Teil 2 gegen Ausgabe Teil 1: kein Treffer', mitStaffel('Sakamoto Days: Teil 2 – Vol. 1', 'Sakamoto Days: Teil 1 - Vol. 1/3') === undefined)
pruefe('Season 2 zählt wie Staffel 2', mitStaffel('Virgin Road (Season 2) – Vol. 1', S2)?.datum === '2026-11-06')
/* Wörtlich aus `data/disc-ausgaben.json`, Kennung 969: „Tsubasa Chronicle: Staffel 2 - Vol. 1/3". */
pruefe('Tsubasa Chronicle Vol. 1 (Staffel 1) gegen die Ausgabe der Staffel 2: kein Treffer', mitStaffel('Tsubasa Chronicle – Vol. 1', 'Tsubasa Chronicle: Staffel 2 - Vol. 1/3') === undefined)
pruefe('Tsubasa Chronicle (Staffel 2) Vol. 1 gegen dieselbe Ausgabe: Treffer', mitStaffel('Tsubasa Chronicle (Staffel 2) – Vol. 1', 'Tsubasa Chronicle: Staffel 2 - Vol. 1/3')?.datum === '2026-11-06')
const andereStaffel = index([{ datum: '2026-11-06', gelesen: '2026-10-12T05:00:00Z', edition: S1 }])
pruefe('Wächter: eine andere Staffel erzeugt keinen Fehler', discTerminFehler([{ ...virgin(), name: 'Virgin Road (Staffel 2) – Vol. 1' }], HEUTE, { index: andereStaffel, veroeffentlicht: tage('2026-10-02') }).length === 0)
const staffelListe = [{ ...virgin(), name: 'Virgin Road (Staffel 2) – Vol. 1' }]
pruefe('Bau: eine andere Staffel ändert den Tag nicht', aniSearchDatumAnwenden(staffelListe, andereStaffel, tage('2026-10-02'), HEUTE).length === 0 && staffelListe[0]!.schedule.firstEpisodeDate === '2026-10-30')

/* Kreislauf: Meldung → Bau → aniSearch → neuere Meldung → Bau. */
const spaeter = [{ articleUrl: A2Y, publishedAt: '2026-10-02', verschiebungen: [] as { titel: string; alt: string; neu: string }[] }, {
  articleUrl: 'https://www.anime2you.de/news/1070000/neue-verschiebung/',
  publishedAt: '2026-10-20',
  verschiebungen: [{ titel: 'Virgin Road – Vol. 1 (Limited Edition mit Sammelschuber)', alt: '2026-11-06', neu: '2026-11-13' }],
}]
const kreis = [virgin()]
aniSearchDatumAnwenden(kreis, index(), veroeffentlichungstage(spaeter), HEUTE)
pruefe('Kreislauf, Stufe 1: aniSearch setzt den 06.11.', kreis[0]!.schedule.firstEpisodeDate === '2026-11-06')
verschiebungenAnwenden(kreis, spaeter, HEUTE, new Map())
pruefe('Kreislauf, Stufe 2: die neuere Meldung (20.10.) setzt den 13.11.', kreis[0]!.schedule.firstEpisodeDate === '2026-11-13', kreis[0]!.schedule)
aniSearchDatumAnwenden(kreis, index(), veroeffentlichungstage(spaeter), HEUTE)
pruefe('Kreislauf, Stufe 3: die ältere aniSearch-Lesung überstimmt sie nicht', kreis[0]!.schedule.firstEpisodeDate === '2026-11-13', kreis[0]!.schedule)

/* Wächter am kaputten Stand (so lief es live) und am reparierten. */
const kaputt = discTerminFehler([virgin()], HEUTE, { index: index(), veroeffentlicht: tage('2026-10-02') })
pruefe('Wächter: der kaputte Stand (30.10. gegen aniSearch 06.11.) ist rot', kaputt.length === 1 && kaputt[0]!.includes('Virgin Road – Vol. 1') && kaputt[0]!.includes('2026-11-06'), kaputt)
pruefe('Wächter: der reparierte Stand ist grün', discTerminFehler(rs, HEUTE, { index: index(), veroeffentlicht: tage('2026-10-02') }).length === 0)
pruefe('Wächter: kein Disc-Release, keine Prüfung (und kein Lesen von Dateien)', discTerminFehler([kino], HEUTE).length === 0)
/* Kennung 900001 kennt nur die übergebene Kulisse, nicht die echten Dateien: Ohne weitergereichte Quellen bliebe der Fehler aus. */
const fremd = { ...index(), ausgaben: { '900001': index().ausgaben['129193']! } }
const ergebnis = pruefeErgebnis([{ ...virgin(), titleId: 900001 }], [], new Map(), HEUTE, { index: fremd, veroeffentlicht: tage('2026-10-02') })
pruefe('Verdrahtung: `pruefeErgebnis` meldet den kaputten Stand als Fehler', ergebnis.fehler.some((f) => f.includes('aniSearch nennt 2026-11-06')), ergebnis.fehler)
const gut = pruefeErgebnis(rs, [], new Map(), HEUTE, { index: index(), veroeffentlicht: tage('2026-10-02') })
pruefe('Verdrahtung: `pruefeErgebnis` ist am reparierten Stand ohne Disc-Fehler', !gut.fehler.some((f) => f.includes('aniSearch nennt')), gut.fehler)

/* Nr. 46: Meldung nicht (mehr) im Vorschlagsbestand — dann zählt der Lesetag unserer Nicht-aniSearch-Quelle (`quellen[].gesehenAm`). */
const OHNE = new Map<string, string>()
const mitLesung = (datum: string, gesehenAm: string | undefined, name = 'Virgin Road – Vol. 1'): Release => ({
  ...virgin(datum),
  name,
  quellen: [{ url: A2Y, name: 'anime2you.de', ...(gesehenAm ? { gesehenAm } : {}), sagt: datum, stand: 'aktuell' }],
} as unknown as Release)
const nachOhne = (r: Release, i: DiscIndex): string => {
  const liste = [r]
  aniSearchDatumAnwenden(liste, i, OHNE, HEUTE)
  return liste[0]!.schedule.firstEpisodeDate!
}
const gelesen = (g: string, datum = '2026-11-06'): DiscIndex => index([{ datum, gelesen: g }])
pruefe('ohne bekannte Meldung: aniSearch später gelesen als unsere Quelle, Tag verschoben: gilt', nachOhne(mitLesung('2026-10-30', '2026-10-01'), gelesen('2026-10-12T05:00:00Z')) === '2026-11-06')
pruefe('ohne bekannte Meldung: zweite Verschiebung (Staffel-Name egal), anderer Tag: gilt', nachOhne(mitLesung('2026-12-04', '2026-10-05'), gelesen('2026-10-06T05:00:00Z', '2026-12-18')) === '2026-12-18')
pruefe('ohne bekannte Meldung: aniSearch früher gelesen als unsere Quelle: bleibt', nachOhne(mitLesung('2026-10-30', '2026-10-01'), gelesen('2026-09-30T05:00:00Z')) === '2026-10-30')
pruefe('ohne bekannte Meldung: am selben Tag gelesen: bleibt', nachOhne(mitLesung('2026-10-30', '2026-10-12'), gelesen('2026-10-12T05:00:00Z')) === '2026-10-30')
pruefe('ohne bekannte Meldung: aniSearch nennt denselben Tag: unverändert', nachOhne(mitLesung('2026-11-06', '2026-10-01'), gelesen('2026-10-12T05:00:00Z')) === '2026-11-06')
pruefe('ohne bekannte Meldung und ohne Quellen-Beleg: bleibt (nie raten)', nachOhne(virgin(), gelesen('2026-10-12T05:00:00Z')) === '2026-10-30')
pruefe('ohne bekannte Meldung, Lesetag der Quelle fehlt: bleibt', nachOhne(mitLesung('2026-10-30', undefined), gelesen('2026-10-12T05:00:00Z')) === '2026-10-30')
pruefe('ohne bekannte Meldung: aniSearch-Tag schon vorbei, unserer steht bevor: bleibt', nachOhne(mitLesung('2026-11-20', '2026-10-01'), gelesen('2026-10-12T05:00:00Z', '2026-10-23')) === '2026-11-20')
const zweiLesungen = { ...mitLesung('2026-10-30', '2026-10-01'), quellen: [
  { url: A2Y, name: 'anime2you.de', gesehenAm: '2026-10-01', sagt: '2026-10-30', stand: 'aktuell' as const },
  { url: 'https://x.example/b', name: 'x.example', gesehenAm: '2026-10-20', sagt: '2026-10-30', stand: 'aktuell' as const },
] } as Release
pruefe('ohne bekannte Meldung: die jüngste Lesung unserer Quellen zählt', nachOhne(zweiLesungen, gelesen('2026-10-12T05:00:00Z')) === '2026-10-30')
const quelleB = (extra: Record<string, unknown>) => ({ url: 'https://x.example/b', name: 'x.example', sagt: '2026-10-30', stand: 'aktuell' as const, ...extra })
const q1 = { url: A2Y, name: 'anime2you.de', gesehenAm: '2026-10-01', sagt: '2026-10-30', stand: 'aktuell' as const }
const mitQuellen = (...quellen: unknown[]): Release => ({ ...virgin(), quellen } as unknown as Release)
pruefe('ohne bekannte Meldung: eine Quelle ohne Lesetag nimmt dem Beleg die Aussage', nachOhne(mitQuellen(q1, quelleB({})), gelesen('2026-10-12T05:00:00Z')) === '2026-10-30')
pruefe('ohne bekannte Meldung: eine überholte Quelle mit späterem Lesetag zählt nicht', nachOhne(mitQuellen(q1, quelleB({ gesehenAm: '2026-10-20', stand: 'ueberholt' })), gelesen('2026-10-12T05:00:00Z')) === '2026-11-06')
pruefe('ohne bekannte Meldung: eine aniSearch-Quelle mit späterem Lesetag zählt nicht', nachOhne(mitQuellen(q1, quelleB({ url: ARTIKEL, gesehenAm: '2026-10-20' })), gelesen('2026-10-12T05:00:00Z')) === '2026-11-06')
pruefe('ohne bekannte Meldung: nur eine überholte Quelle gibt keine Aussage', nachOhne(mitQuellen({ ...q1, stand: 'ueberholt' }), gelesen('2026-10-12T05:00:00Z')) === '2026-10-30')
pruefe('mit jüngerer bekannter Meldung: Lesetag der Quelle ändert nichts, Meldung bleibt', datumNach(mitLesung('2026-10-30', '2026-09-01'), gelesen('2026-10-12T05:00:00Z'), '2026-10-20') === '2026-10-30')
pruefe('mit älterer bekannter Meldung: aniSearch gewinnt, auch bei späterem Lesetag der Quelle', datumNach(mitLesung('2026-10-30', '2026-10-25'), gelesen('2026-10-12T05:00:00Z'), '2026-10-02') === '2026-11-06')
const ohneFehler = discTerminFehler([mitLesung('2026-10-30', '2026-10-01')], HEUTE, { index: gelesen('2026-10-12T05:00:00Z'), veroeffentlicht: OHNE })
pruefe('Wächter: ohne bekannte Meldung ist der alte Tag rot', ohneFehler.length === 1 && ohneFehler[0]!.includes('2026-11-06'), ohneFehler)
pruefe('Wächter: ohne bekannte Meldung und ohne Beleg schweigt er', discTerminFehler([virgin()], HEUTE, { index: gelesen('2026-10-12T05:00:00Z'), veroeffentlicht: OHNE }).length === 0)

if (fehler) {
  console.error(`\n${fehler} Zusicherung(en) verletzt`)
  process.exit(1)
}
console.log('\nDisc-Termin, neueres Datum gewinnt: alle Zusicherungen erfüllt')
