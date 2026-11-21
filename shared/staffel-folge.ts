/**
 * Deutsche Staffelgrenzen innerhalb eines Sammeltitels (Pokémon, Pokémon Horizonte) ohne Node und DOM: Pipeline, Web und Worker
 * rechnen damit. Die Grenzen selbst lädt `pipeline/lib/pokemon-staffeln.ts` aus `data/curated/*-staffeln.yaml`.
 */
import type { Release } from './types.ts'

/** Eine Zeile der Detaildatei `folgen/<id>.json`: `[Staffel, von, bis]`, die offene letzte Staffel nur `[Staffel, von]`. */
export type StaffelZeile = [number, number] | [number, number, number]

/**
 * Deutsche Bereiche plus die Folgen erschienener Stapel-Termine mit Folgennummer (Horizonte: Staffel 4 Folge 137 seit 20.11.2026 bei RTL+,
 * der Weg trägt nur 1–136). Termine mit `sprache` (nur OmU/offen) und geschätzter Folgenzahl zählen nicht.
 */
export function mitStapelFolgen(de: [number, number][], termine: Release[], heute: string): [number, number][] {
  const nummern = new Set<number>()
  for (const [von, bis] of de) for (let n = von; n <= bis; n++) nummern.add(n)
  for (const r of termine) {
    const { firstEpisodeNumber: von, episodeCount: anzahl, episodeCountAssumed, firstEpisodeDate } = r.schedule
    if (r.releaseType !== 'batch' || r.sprache || !von || !anzahl || episodeCountAssumed || !firstEpisodeDate || firstEpisodeDate > heute) continue
    for (let n = von; n < von + anzahl; n++) nummern.add(n)
  }
  const bereiche: [number, number][] = []
  for (const n of [...nummern].sort((a, b) => a - b)) {
    const letzter = bereiche[bereiche.length - 1]
    if (letzter && letzter[1] === n - 1) letzter[1] = n
    else bereiche.push([n, n])
  }
  return bereiche
}
