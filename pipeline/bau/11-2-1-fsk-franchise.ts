import { log, readJson } from '../lib/util.ts'
import { mitHandvorrang } from '../lib/tmdb-von-hand.ts'
import type { Fsk, Release, Title } from '../../shared/types.ts'
import { fskQuelleFehler } from './11-2-1-fsk-justwatch.ts'

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

/** Zusicherung: ein abgeleiteter Wert steht nie neben einer Freigabe am Termin, die etwas anderes sagt (dort gilt die Freigabe). */
export function franchiseFskFehler(titles: Map<number, Title>, releases: Release[]): string[] {
  return releases
    .filter((r) => r.fsk !== undefined && titles.get(r.titleId)?.fskQuelle === 'franchise' && titles.get(r.titleId)?.fsk !== r.fsk)
    .map((r) => `Anime ${r.titleId}: fskQuelle franchise, aber der Termin trägt Freigabe ${r.fsk}`)
}

/** Läuft nach JustWatch: ein Wert aus Freigabe oder Anbieter bleibt; gelesen werden nur Freigaben der Geschwister. */
export function uebernehmeFskAusFranchise(titles: Map<number, Title>, releases: Release[] = []): void {
  const tmdb = mitHandvorrang(readJson<Record<string, { fsk?: Fsk }>>('data/tmdb-titles.json', {}))
  const tmdbFsk = (id: number) => tmdb[String(id)]?.fsk
  const amTermin = new Set(releases.filter((r) => r.fsk !== undefined).map((r) => r.titleId))
  const neu = new Map<number, Fsk>()
  for (const t of titles.values()) {
    // Liefert TMDB oder ein Termin eine Freigabe, bleibt der Titel offen (Handzeile bzw. Termin-Freigabe), nichts wird daneben geraten.
    if (tmdbFsk(t.id) !== undefined || amTermin.has(t.id)) continue
    const stufe = fskAusFranchise(t, titles.values())
    if (stufe !== undefined) neu.set(t.id, stufe)
  }
  // Erst nach dem Lesen setzen: ein abgeleiteter Wert dient nie als Beleg für den nächsten (und `fskQuelle` sperrt ihn ohnehin).
  for (const [id, stufe] of neu) {
    const t = titles.get(id)!
    t.fsk = stufe
    t.fskQuelle = 'franchise'
  }
  const fehler = [...fskQuelleFehler(titles.values(), tmdbFsk), ...franchiseFskFehler(titles, releases)]
  if (fehler.length) throw new Error(`FSK aus dem Franchise widerspricht der Zusicherung:\n${fehler.slice(0, 10).join('\n')}`)
  log(`FSK aus dem Franchise: ${neu.size} Titel ohne Freigabe ergänzt (gleiches Format, alle anderen Teile gleicher Wert, gekennzeichnet)`)
}
