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
pruefe('FSK von Hand: Art "streaming" ist keine Art', fskVonHandFehler([zeile(5, { art: 'streaming' as never })]).length === 1 && fskVonHandFehler([zeile(5, { art: 'streaming' as never })])[0]!.includes('fsk-datenbank oder disc'))
pruefe('FSK von Hand: http-Quelle', fskVonHandFehler([zeile(5, { sources: ['http://www.fsk.de/x'] })]).length === 1)
pruefe('FSK von Hand: fehlende Quelle', fskVonHandFehler([zeile(5, { sources: [] })]).length === 1 && fskVonHandFehler([zeile(5, { sources: undefined as never })]).length === 1)
pruefe('FSK von Hand: leerer Beleg', fskVonHandFehler([zeile(5, { beleg: '  ' })]).length === 1)

const karte = new Map([t(10, 'TV'), t(11, 'TV', 6), t(12, 'TV'), t(13, 'TV')].map((x) => [x.id, x]))
const meldungen: string[] = []
const [altLog, altWarn] = [console.log, console.warn]
console.log = (...a: unknown[]) => void meldungen.push(`log ${a.join(' ')}`)
console.warn = (...a: unknown[]) => void meldungen.push(`warn ${a.join(' ')}`)
uebernehmeFskVonHand(karte, [zeile(10, { fsk: 16 }), zeile(11, { fsk: 18 }), zeile(12, { fsk: 6 }), zeile(99), zeile(98)])
;[console.log, console.warn] = [altLog, altWarn]
pruefe('FSK von Hand: Log nennt Zahl der gesetzten Zeilen und die Kennung ohne Titel', meldungen.some((m) => m.startsWith('log') && m.includes('2 von 5 Zeilen gesetzt') && m.includes('ohne Titel im Bestand: 99, 98')))
pruefe('FSK von Hand: Widerspruch zur vorhandenen Freigabe wird gewarnt, Übereinstimmung nicht', meldungen.filter((m) => m.startsWith('warn')).length === 1 && meldungen.some((m) => m.startsWith('warn') && m.includes('11 trägt schon FSK 6') && m.includes('sagt 18')))
pruefe('FSK von Hand: ohne unbekannte Kennung steht kein „ohne Titel“ im Log', (() => {
  const m2: string[] = []
  console.log = (...a: unknown[]) => void m2.push(a.join(' '))
  uebernehmeFskVonHand(new Map([t(30, 'TV')].map((x) => [x.id, x])), [zeile(30)])
  console.log = altLog
  return m2.length === 1 && m2[0]!.includes('1 von 1 Zeilen gesetzt') && !m2[0]!.includes('ohne Titel')
})())
pruefe('FSK von Hand: setzt die Freigabe an einem Titel ohne FSK', karte.get(10)!.fsk === 16)
pruefe('FSK von Hand: eine vorhandene abweichende Freigabe bleibt', karte.get(11)!.fsk === 6)
pruefe('FSK von Hand: unbekannte Kennung und nicht genannte Titel bleiben unberührt', !karte.has(99) && karte.get(13)!.fsk === undefined)

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
