/**
 * Deutsche Staffelgrenzen innerhalb eines Sammeltitels (Pokémon, Pokémon Horizonte) ohne Node und DOM: Pipeline, Web und Worker
 * rechnen damit. Die Grenzen selbst lädt `pipeline/lib/pokemon-staffeln.ts` aus `data/curated/*-staffeln.yaml`.
 */
import type { Release } from './types.ts'

/** Eine Zeile der Detaildatei `folgen/<id>.json`: `[Staffel, von, bis]`, die offene letzte Staffel nur `[Staffel, von]`. */
export type StaffelZeile = [number, number] | [number, number, number]

/** Staffel und Folge in der Staffel zu einer durchlaufenden Folgennummer; außerhalb aller Staffeln nichts. */
export function staffelUndFolge(s: StaffelZeile[] | undefined, nr: number): [staffel: number, folge: number] | undefined {
  const z = s?.find(([, von, bis]) => nr >= von && (bis === undefined || nr <= bis))
  return z ? [z[0], nr - z[1] + 1] : undefined
}

/** Volle Staffeln in Folge („Staffel 1–3“) oder eine angebrochene mit ihren Folgen in Staffelzählung („Staffel 4 Fg. 1“). */
export type StaffelTeil = { staffeln: [number, number] } | { staffel: number; folgen: [number, number][] }

/**
 * Deutsche Folgen (getrennte, sortierte Bereiche in durchlaufender Zählung) je Staffel. Die offene letzte Staffel ist nie voll, weil ihr
 * Ende nicht belegt ist. Liegt eine Folge außerhalb aller Staffeln, nichts: dann zählt die Zeile weiter durchgehend.
 */
export function staffelTeile(s: StaffelZeile[] | undefined, de: [number, number][]): StaffelTeil[] | undefined {
  if (!s?.length || !de.length) return undefined
  const teile: StaffelTeil[] = []
  let zugeordnet = 0
  for (const [nr, von, bis] of s) {
    const ende = bis ?? Infinity
    const folgen = de.filter(([a, b]) => b >= von && a <= ende).map(([a, b]): [number, number] => [Math.max(a, von) - von + 1, Math.min(b, ende) - von + 1])
    if (!folgen.length) continue
    zugeordnet += folgen.reduce((n, [a, b]) => n + b - a + 1, 0)
    const voll = bis !== undefined && folgen.length === 1 && folgen[0]![0] === 1 && folgen[0]![1] === bis - von + 1
    const vorige = teile[teile.length - 1]
    if (voll && vorige && 'staffeln' in vorige && vorige.staffeln[1] === nr - 1) vorige.staffeln[1] = nr
    else teile.push(voll ? { staffeln: [nr, nr] } : { staffel: nr, folgen })
  }
  return zugeordnet === de.reduce((n, [a, b]) => n + b - a + 1, 0) ? teile : undefined
}

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
