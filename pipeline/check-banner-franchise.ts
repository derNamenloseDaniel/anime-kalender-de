/**
 * Banner aus der Reihe (`bau/banner-franchise.ts`): gleiches Format vor Erscheinungsjahr, nur eigene Banner als Spender, keine Ketten,
 * keine Übernahme ohne Reihe. Aufruf: `npx tsx pipeline/check-banner-franchise.ts` (`check:logic`).
 */
import { uebernehmeFranchiseBanner, waehleBannerSpender } from './bau/banner-franchise.ts'
import type { Title } from '../shared/types.ts'

let fehler = 0
function pruefe(name: string, bedingung: boolean, gefunden?: unknown): void {
  if (bedingung) return console.log(`  ✓ ${name}`)
  fehler++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — ${JSON.stringify(gefunden)}`}`)
}

const titel = (id: number, o: Partial<Title> = {}): Title => ({ id, format: 'TV', jpYear: 2010, franchiseId: 1, ...o }) as Title
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

if (fehler) {
  console.error(`${fehler} Prüfung(en) fehlgeschlagen`)
  process.exit(1)
}
console.log('Banner aus der Reihe stimmen.')
