import type { ReleaseEvent } from '../../shared/types.ts'
import { staffelUndFolge, type StaffelZeile } from '../../shared/staffel-folge.ts'

/**
 * Schreibt `staffelFolge` an jeden Termin mit Folgennummer, dessen Titel deutsche Staffelgrenzen hat: die Kalenderkarte sagt dann
 * „Staffel 4 · Folge 1“ statt „Folge 137“. Fernsehtermine nicht, weil tv.de eigene Nummern führt, die niemand gegen die Grenzen geprüft hat.
 */
export function schreibeStaffelFolgen(events: ReleaseEvent[], staffeln: Map<number, StaffelZeile[]>): number {
  let n = 0
  for (const ev of events) {
    if (ev.platform === 'tv' || !ev.episode) continue
    const sf = staffelUndFolge(staffeln.get(ev.titleId), ev.episode)
    if (!sf) continue
    ev.staffelFolge = sf
    n++
  }
  return n
}
