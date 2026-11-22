/** Zusicherungen zu `fskAusFranchise` (`bau/11-2-1-fsk-franchise.ts`): gleiches Format, nur Freigaben, Widerspruch ergibt nichts. Aufruf: `npm run check:logic`. */
import type { Title } from '../shared/types.ts'
import { fskAusFranchise, uebernehmeFskAusFranchise } from './bau/11-2-1-fsk-franchise.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean): void {
  if (!ok) verletzt++
  console.log(`  ${ok ? '✓' : '✖'} ${name}`)
}
const t = (id: number, format: string, fsk?: number, fskQuelle?: 'justwatch' | 'franchise', franchiseId = 1): Title =>
  ({ id, format, fsk, fskQuelle, franchiseId }) as unknown as Title

const alle = [t(1, 'TV', 12), t(2, 'TV', 12), t(3, 'TV'), t(4, 'MOVIE', 16), t(5, 'MOVIE'), t(6, 'TV', 16, 'justwatch'), t(7, 'TV', 18, undefined, 9), t(8, 'TV', undefined, undefined, 9)]
pruefe('Franchise-FSK: TV übernimmt von TV', fskAusFranchise(alle[2]!, alle) === 12)
pruefe('Franchise-FSK: Film übernimmt von Film, nie von einer Serie', fskAusFranchise(alle[4]!, alle) === 16 && fskAusFranchise(t(10, 'OVA'), alle) === undefined)
pruefe('Franchise-FSK: Anbieter-Angabe der Geschwister zählt nicht (kein Widerspruch durch 16 bei Titel 6)', fskAusFranchise(alle[2]!, alle) === 12)
pruefe('Franchise-FSK: andere Reihe ist kein Beleg für Titel 3, aber für Titel 8', fskAusFranchise(alle[7]!, alle) === 18)
pruefe('Franchise-FSK: Widerspruch der Teile ergibt nichts', fskAusFranchise(t(11, 'TV'), [...alle, t(12, 'TV', 16)]) === undefined)
pruefe('Franchise-FSK: belegte FSK hat Vorrang', fskAusFranchise(t(13, 'TV', 6), alle) === undefined)
pruefe('Franchise-FSK: ohne Format nichts', fskAusFranchise(t(14, ''), alle) === undefined)

const karte = new Map(alle.map((x) => [x.id, x]))
uebernehmeFskAusFranchise(karte)
pruefe('Franchise-FSK: gesetzt wird mit Kennzeichnung', karte.get(3)!.fsk === 12 && karte.get(3)!.fskQuelle === 'franchise')
pruefe('Franchise-FSK: abgeleiteter Wert speist den nächsten nicht', karte.get(5)!.fsk === 16 && karte.get(5)!.fskQuelle === 'franchise' && karte.get(8)!.fsk === 18)
pruefe('Franchise-FSK: Freigabe bleibt unberührt', karte.get(1)!.fskQuelle === undefined && karte.get(6)!.fskQuelle === 'justwatch')
if (verletzt) process.exit(1)
