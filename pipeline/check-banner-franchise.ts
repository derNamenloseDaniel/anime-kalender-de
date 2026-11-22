/**
 * Banner aus der Reihe (`bau/banner-franchise.ts`): gleiches Format vor Erscheinungsjahr, nur eigene Banner als Spender, keine Ketten,
 * keine Übernahme ohne Reihe. Aufruf: `npx tsx pipeline/check-banner-franchise.ts` (`check:logic`).
 */
import { uebernehmeFranchiseBanner, waehleBannerSpender } from './bau/banner-franchise.ts'
import { schliesseWegeAb } from './bau/11-wege-abschluss.ts'
import { uebersetzeDatei } from './lib/ausgabe-kennung.ts'
import { suchadressenInTemp } from './lib/suchadressen-temp.ts'
import type { Title } from '../shared/types.ts'

let fehler = 0
function pruefe(name: string, bedingung: boolean, gefunden?: unknown): void {
  if (bedingung) return console.log(`  ✓ ${name}`)
  fehler++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — ${JSON.stringify(gefunden)}`}`)
}

const titel = (id: number, o: Partial<Title> = {}): Title => ({ id, format: 'TV', jpYear: 2010, franchiseId: 1, streams: [], watchLinks: [], keywords: [], genres: [], ...o }) as unknown as Title
const karte = (...t: Title[]): Map<number, Title> => new Map(t.map((x) => [x.id, x]))

const tv = titel(1, { bannerImage: 'tv.jpg', jpYear: 2000 })
const film = titel(2, { format: 'MOVIE', bannerImage: 'film.jpg', jpYear: 2012 })
pruefe('gleiches Format schlägt das nähere Jahr', waehleBannerSpender(titel(3, { jpYear: 2011 }), [tv, film])?.id === 1)
pruefe('Film nimmt den Film', waehleBannerSpender(titel(3, { format: 'MOVIE' }), [tv, film])?.id === 2)
pruefe('ohne gleiches Format der nächste nach Jahr', waehleBannerSpender(titel(3, { format: 'OVA', jpYear: 2011 }), [tv, film])?.id === 2)
pruefe('Gleichstand: kleinere Kennung', waehleBannerSpender(titel(9, { jpYear: 2005 }), [titel(8, { jpYear: 2006 }), titel(7, { jpYear: 2004 })])?.id === 7)
pruefe('kein Spender: undefined', waehleBannerSpender(titel(3), []) === undefined)

const m = karte(tv, titel(3), titel(4, { franchiseId: 1 }), titel(5, { franchiseId: 5 }), titel(6, { franchiseId: 6, bannerImage: 'a.jpg' }))
const ids = uebernehmeFranchiseBanner(m)
pruefe('Empfänger übernimmt Bild und trägt den Spender', m.get(3)?.bannerImage === 'tv.jpg' && m.get(3)?.bannerVon === 1, m.get(3))
pruefe('keine Kette: Empfänger wird nie Spender', m.get(4)?.bannerVon === 1)
pruefe('allein in der Reihe: nichts übernommen', m.get(5)?.bannerImage === undefined && m.get(5)?.bannerVon === undefined)
pruefe('eigenes Banner bleibt ohne Kennzeichnung', m.get(1)?.bannerVon === undefined && m.get(6)?.bannerVon === undefined)
pruefe('Rückgabe: genau die Empfänger', ids.join() === '3,4', ids)
pruefe('andere Reihe spendet nicht', m.get(5)?.bannerImage === undefined)

// Reihenkopf ohne `franchiseId` gruppiert über die eigene Kennung und bekommt das Banner eines Mitglieds.
const kopf = titel(10, { franchiseId: undefined })
const mitglied = titel(11, { franchiseId: 10, bannerImage: 'm.jpg' })
uebernehmeFranchiseBanner(karte(kopf, mitglied))
pruefe('Reihenkopf ohne franchiseId übernimmt das Banner eines Mitglieds', kopf.bannerImage === 'm.jpg' && kopf.bannerVon === 11, kopf)

// Ausgabegrenze: `bannerVon` läuft wie `franchiseId` auf die eigene Kennung (`ak`).
const aus = uebersetzeDatei('titles.json', [{ id: 5, franchiseId: 3, bannerVon: 3, slug: 'x-5' }], (n: number) => n + 1000) as Record<string, unknown>[]
pruefe('bannerVon wird an der Ausgabegrenze auf ak übersetzt', aus[0]!.bannerVon === 1003 && aus[0]!.franchiseId === 1003, aus[0])

// Verdrahtung: der Wege-Abschluss ruft die Übernahme auf (Vorbild `check-geteilte-adressen.ts`).
{
  suchadressenInTemp()
  const spender = titel(9000060, { franchiseId: 9000060, bannerImage: 'https://s4.anilist.co/x.jpg' })
  const empfaenger = titel(9000061, { franchiseId: 9000060 })
  schliesseWegeAb({
    titles: new Map([[spender.id, spender], [empfaenger.id, empfaenger]]),
    anisearch: {},
    releases: [],
    zugangJeAdresse: new Map(),
    tmdbMehrdeutig: new Set(),
    toteAdressen: new Set(),
    linkBefunde: {},
    verweiseEntfernt: [],
    crAdresseZu: () => undefined,
    beantworteteSuchen: new Set(),
    suchOffen: [],
    alleChecks: [],
    lautPruefungTot: () => false,
    checksJePlattform: new Map(),
    belegFuer: () => undefined,
  })
  pruefe('Wege-Abschluss: Empfänger trägt das Banner des Spenders samt bannerVon', empfaenger.bannerImage === spender.bannerImage && empfaenger.bannerVon === spender.id, empfaenger)
}

if (fehler) {
  console.error(`${fehler} Prüfung(en) fehlgeschlagen`)
  process.exit(1)
}
console.log('Banner aus der Reihe stimmen.')
