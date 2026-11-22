import { log } from '../lib/util.ts'
import type { Fsk, Title } from '../../shared/types.ts'

/**
 * FSK eines Titels ohne Freigabe aus den anderen Teilen seiner Reihe: nur von Teilen **mit gleichem Format**
 * (TV zu TV, Film zu Film), nur von Freigaben (nicht `fskQuelle`) und nur, wenn alle diese Teile denselben Wert tragen
 * — ein Widerspruch ist kein Beleg. Gemessen 22.11.2026 (Leave-one-out): siehe PR „FSK aus dem Franchise“.
 */
export function fskAusFranchise(titel: Title, alle: Iterable<Title>): Fsk | undefined {
  if (titel.fsk !== undefined || !titel.format) return undefined
  const reihe = titel.franchiseId ?? titel.id
  const werte = new Set<Fsk>()
  for (const x of alle) {
    if (x.id === titel.id || (x.franchiseId ?? x.id) !== reihe) continue
    if (x.format !== titel.format || x.fsk === undefined || x.fskQuelle !== undefined) continue
    werte.add(x.fsk)
  }
  return werte.size === 1 ? [...werte][0] : undefined
}

/** Läuft nach JustWatch: ein Wert aus Freigabe oder Anbieter bleibt; gelesen werden nur Freigaben der Geschwister. */
export function uebernehmeFskAusFranchise(titles: Map<number, Title>): void {
  const neu = new Map<number, Fsk>()
  for (const t of titles.values()) {
    const stufe = fskAusFranchise(t, titles.values())
    if (stufe !== undefined) neu.set(t.id, stufe)
  }
  // Erst nach dem Lesen setzen: ein abgeleiteter Wert dient nie als Beleg für den nächsten (und `fskQuelle` sperrt ihn ohnehin).
  for (const [id, stufe] of neu) {
    const t = titles.get(id)!
    t.fsk = stufe
    t.fskQuelle = 'franchise'
  }
  log(`FSK aus dem Franchise: ${neu.size} Titel ohne Freigabe ergänzt (gleiches Format, alle anderen Teile gleicher Wert, gekennzeichnet)`)
}
