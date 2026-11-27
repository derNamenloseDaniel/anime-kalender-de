/** Zusicherungen zu `data/fsk-von-hand.yaml`: Formfehler der Zeilen, Übernahme nur ohne Freigabe, Handbeleg vor Ableitung im Abschluss. Aufruf: `npm run check:logic`. */
import type { Release, Title } from '../shared/types.ts'
import { schliesseWegeAb } from './bau/11-wege-abschluss.ts'
import { fskVonHandFehler, ladeFskVonHand, uebernehmeFskVonHand, type FskVonHand } from './lib/fsk-von-hand.ts'
import { suchadressenInTemp } from './lib/suchadressen-temp.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean): void {
  if (!ok) verletzt++
  console.log(`  ${ok ? '✓' : '✖'} ${name}`)
}
const zeile = (id: number, aus: Partial<FskVonHand> = {}): FskVonHand =>
  ({ anilistId: id, titel: `T${id}`, fsk: 12, art: 'fsk-datenbank', sources: ['https://www.fsk.de/x'], beleg: 'FSK-Datenbank: ab 12', ...aus }) as FskVonHand
const t = (id: number, format: string, fsk?: number, franchiseId = 1): Title => ({ id, format, fsk, franchiseId }) as unknown as Title

pruefe('FSK von Hand: gültige Zeilen (Datenbank und Disc, alle Stufen) ergeben keinen Fehler', fskVonHandFehler([0, 6, 12, 16, 18].map((f, i) => zeile(i + 1, { fsk: f as FskVonHand['fsk'], art: i % 2 ? 'disc' : 'fsk-datenbank' }))).length === 0)
pruefe('FSK von Hand: doppelte Kennung', fskVonHandFehler([zeile(5), zeile(5)]).length === 1)
pruefe('FSK von Hand: fehlende Kennung', fskVonHandFehler([zeile(5, { anilistId: undefined as never })]).length === 1)
pruefe('FSK von Hand: ungültige Stufe (7)', fskVonHandFehler([zeile(5, { fsk: 7 as never })]).length === 1)
pruefe('FSK von Hand: Art "streaming" ist keine Art', fskVonHandFehler([zeile(5, { art: 'streaming' as never })]).length === 1)
pruefe('FSK von Hand: http-Quelle', fskVonHandFehler([zeile(5, { sources: ['http://www.fsk.de/x'] })]).length === 1)
pruefe('FSK von Hand: fehlende Quelle', fskVonHandFehler([zeile(5, { sources: [] })]).length === 1 && fskVonHandFehler([zeile(5, { sources: undefined as never })]).length === 1)
pruefe('FSK von Hand: leerer Beleg', fskVonHandFehler([zeile(5, { beleg: '  ' })]).length === 1)

const karte = new Map([t(10, 'TV'), t(11, 'TV', 6), t(12, 'TV')].map((x) => [x.id, x]))
uebernehmeFskVonHand(karte, [zeile(10, { fsk: 16 }), zeile(11, { fsk: 18 }), zeile(99)])
pruefe('FSK von Hand: setzt die Freigabe an einem Titel ohne FSK', karte.get(10)!.fsk === 16)
pruefe('FSK von Hand: eine vorhandene abweichende Freigabe bleibt', karte.get(11)!.fsk === 6)
pruefe('FSK von Hand: unbekannte Kennung und nicht genannte Titel bleiben unberührt', !karte.has(99) && karte.get(12)!.fsk === undefined)

suchadressenInTemp() // der Abschluss schreibt Listen; nie in getrackte Dateien
const abschluss = (titles: Map<number, Title>) => schliesseWegeAb({
  titles, anisearch: {}, releases: [] as Release[], zugangJeAdresse: new Map(), tmdbMehrdeutig: new Set(), toteAdressen: new Set(),
  linkBefunde: {}, verweiseEntfernt: [], crAdresseZu: () => undefined, beantworteteSuchen: new Set(), suchOffen: [], alleChecks: [],
  lautPruefungTot: () => false, checksJePlattform: new Map(), belegFuer: () => undefined,
})
// Verdrahtung: ein Franchise-Geschwister mit anderer Stufe würde den Titel ableiten; die echte Handzeile gilt davor und gewinnt
const hand = ladeFskVonHand()[0]!
const anders = hand.fsk === 12 ? 16 : 12
const bau = new Map([t(20, 'TV', anders, 7), t(hand.anilistId, 'TV', undefined, 7)].map((x) => [x.id, { ...x, streams: [] } as unknown as Title]))
abschluss(bau)
pruefe('FSK von Hand: im Abschluss gilt der Handbeleg vor der Franchise-Ableitung', bau.get(hand.anilistId)!.fsk === hand.fsk && (bau.get(hand.anilistId) as Title & { fskQuelle?: string }).fskQuelle === undefined)
if (verletzt) process.exit(1)
