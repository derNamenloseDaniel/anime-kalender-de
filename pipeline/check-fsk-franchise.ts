/** Zusicherungen zu `fskAusFranchise` (`bau/11-2-1-fsk-franchise.ts`): gleiches Format, nur Freigaben, Widerspruch ergibt nichts. Aufruf: `npm run check:logic`. */
import { readFileSync } from 'node:fs'
import { baueEmpfehlung } from '../shared/empfehlung-pool.ts'
import type { Release, Title } from '../shared/types.ts'
import { fskQuelleFehler } from './bau/11-2-1-fsk-justwatch.ts'
import { fskAusFranchise, franchiseFskFehler, uebernehmeFskAusFranchise } from './bau/11-2-1-fsk-franchise.ts'
import { schliesseWegeAb } from './bau/11-wege-abschluss.ts'
import { PROFILE } from './lib/empfehlung-simulation.ts'
import { suchadressenInTemp } from './lib/suchadressen-temp.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean): void {
  if (!ok) verletzt++
  console.log(`  ${ok ? '✓' : '✖'} ${name}`)
}
const t = (id: number, format: string, fsk?: number, fskQuelle?: 'justwatch' | 'franchise', franchiseId = 1): Title =>
  ({ id, format, fsk, fskQuelle, franchiseId }) as unknown as Title

const alle = [t(90001, 'TV', 12), t(90002, 'TV', 12), t(90003, 'TV'), t(90004, 'MOVIE', 16), t(90005, 'MOVIE'), t(90006, 'TV', 16, 'justwatch'), t(90007, 'TV', 18, undefined, 9), t(90008, 'TV', undefined, undefined, 9)]
pruefe('Franchise-FSK: TV übernimmt von TV', fskAusFranchise(alle[2]!, alle) === 12)
pruefe('Franchise-FSK: Film übernimmt von Film, nie von einer Serie', fskAusFranchise(alle[4]!, alle) === 16 && fskAusFranchise(t(900010, 'OVA'), alle) === undefined)
pruefe('Franchise-FSK: Film bekommt nichts, wenn nur Serien-Teile Freigaben haben', fskAusFranchise(t(9000915, 'MOVIE', undefined, undefined, 9), alle) === undefined)
pruefe('Franchise-FSK: Anbieter-Angabe der Geschwister zählt nicht (kein Widerspruch durch 16 bei Titel 6)', fskAusFranchise(alle[2]!, alle) === 12)
pruefe('Franchise-FSK: andere Reihe ist kein Beleg für Titel 3, aber für Titel 8', fskAusFranchise(alle[7]!, alle) === 18)
pruefe('Franchise-FSK: Widerspruch der Teile ergibt nichts', fskAusFranchise(t(900011, 'TV'), [...alle, t(900012, 'TV', 16)]) === undefined)
pruefe('Franchise-FSK: belegte FSK hat Vorrang', fskAusFranchise(t(900013, 'TV', 6), alle) === undefined)
pruefe('Franchise-FSK: ohne Format nichts', fskAusFranchise(t(900014, ''), alle) === undefined)

const karte = new Map(alle.map((x) => [x.id, x]))
uebernehmeFskAusFranchise(karte)
pruefe('Franchise-FSK: gesetzt wird mit Kennzeichnung', karte.get(90003)!.fsk === 12 && karte.get(90003)!.fskQuelle === 'franchise')
pruefe('Franchise-FSK: abgeleiteter Wert speist den nächsten nicht', karte.get(90005)!.fsk === 16 && karte.get(90005)!.fskQuelle === 'franchise' && karte.get(90008)!.fsk === 18)
pruefe('Franchise-FSK: Freigabe bleibt unberührt', karte.get(90001)!.fskQuelle === undefined && karte.get(90006)!.fskQuelle === 'justwatch')
suchadressenInTemp() // der Abschluss schreibt Listen; nie in getrackte Dateien
// Verdrahtung: der echte Abschluss der Wege setzt den Wert (rot, sobald der Aufruf dort fehlt)
const abschluss = (titles: Map<number, Title>, releases: Release[] = []) => schliesseWegeAb({
  titles, anisearch: {}, releases, zugangJeAdresse: new Map(), tmdbMehrdeutig: new Set(), toteAdressen: new Set(), linkBefunde: {},
  verweiseEntfernt: [], crAdresseZu: () => undefined, beantworteteSuchen: new Set(), suchOffen: [], alleChecks: [], lautPruefungTot: () => false,
  checksJePlattform: new Map(), belegFuer: () => undefined,
})
const mitStreams = (...x: Title[]) => new Map(x.map((y) => [y.id, { ...y, streams: [] } as unknown as Title]))
const bau = mitStreams(t(900040, 'TV', 12), t(900041, 'TV'))
abschluss(bau)
const wirft = (f: () => void) => { try { f(); return false } catch { return true } }
pruefe('Franchise-FSK: der Abschluss bricht ab, wenn der Termin eine andere Freigabe trägt', wirft(() => abschluss(mitStreams(t(900042, 'TV', 12), t(900043, 'TV')), [{ titleId: 900043, fsk: 16 }] as unknown as Release[])))
// TMDB-Freigabe (hier verworfen, z. B. geteilte Kennung) lässt den Titel offen für die Handzeile
const tmdbId = Number(Object.entries(JSON.parse(readFileSync('data/tmdb-titles.json', 'utf8')) as Record<string, { fsk?: number }>).find(([, v]) => v.fsk !== undefined)![0])
const mitTmdb = new Map([t(900044, 'TV', 12), t(tmdbId, 'TV')].map((x) => [x.id, x]))
uebernehmeFskAusFranchise(mitTmdb)
pruefe('Franchise-FSK: Titel mit TMDB-Freigabe bekommt keinen abgeleiteten Wert', mitTmdb.get(tmdbId)!.fskQuelle === undefined)
pruefe('Franchise-FSK: Abbruch bei Widerspruch zur Zusicherung (Termin mit anderer Freigabe)', wirft(() => uebernehmeFskAusFranchise(new Map([t(900045, 'TV', 12), t(900046, 'TV')].map((x) => [x.id, x])), [{ titleId: 900046, fsk: 18 }] as unknown as Release[])))
pruefe('Franchise-FSK: schliesseWegeAb setzt den Wert samt Kennzeichnung', bau.get(900041)!.fsk === 12 && bau.get(900041)!.fskQuelle === 'franchise' && bau.get(900040)!.fskQuelle === undefined)
const mitTermin = new Map([t(900050, 'TV', 12), t(900051, 'TV', 12, 'franchise')].map((x) => [x.id, x]))
pruefe('Franchise-FSK: Zusicherung meldet abweichende Freigabe am Termin', franchiseFskFehler(mitTermin, [{ titleId: 900051, fsk: 16 }, { titleId: 900051, fsk: 12 }, { titleId: 900050, fsk: 16 }] as unknown as Release[]).length === 1)
pruefe('Franchise-FSK: Zusicherung meldet ungültige Stufe und TMDB-Freigabe', fskQuelleFehler([t(900020, 'TV', 14, 'franchise')], () => undefined).length === 1 && fskQuelleFehler([t(900021, 'TV', 12, 'franchise')], () => 16).length === 1)
const pool = (x: Title): Title => ({ ...x, titleDe: 'T', genres: [], keywords: [], coverImage: 'c.jpg', streams: [{ platform: 'netflix', url: 'u', dub: true, zugang: 'abo' }] }) as unknown as Title
const einstiege = baueEmpfehlung([pool(t(900030, 'TV', 12, 'franchise', 900030)), pool(t(900031, 'TV', 16, undefined, 900031)), pool(t(900032, 'TV', 6, 'justwatch', 900032))], {}).einstiege
pruefe('Franchise-FSK: die Empfehlung führt abgeleitete FSK nie, Freigabe und Anbieter wie bisher', einstiege.find((k) => k.id === 900030)?.fsk === undefined && einstiege.find((k) => k.id === 900031)?.fsk === 16 && einstiege.find((k) => k.id === 900032)?.fsk === 6)
const film = (fsk: number | undefined) => ({ f: 'MOVIE', fsk }) as never
pruefe('Franchise-FSK: Profil Familienfilm trifft nur Kandidaten mit belegter FSK (abgeleitet kommt als leer an)', PROFILE.Familienfilm!(() => true, film(12)) === true && PROFILE.Familienfilm!(() => true, film(undefined)) === false)
if (verletzt) process.exit(1)
