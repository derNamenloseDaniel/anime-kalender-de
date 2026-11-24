import type { FranchiseMember } from '@shared/types.ts'
import type { StaffelNummer } from '@shared/titles.ts'
import { staffelKurz, zeilenZusatz } from './reihen-regeln.ts'
import { teilNamen } from './reihen-teil.ts'

/** Der letzte Namensabschnitt nach „ - " oder „: " — bei „… Staffel 2 - Episode N" also „Episode N"; eine bloße Staffelangabe sagt nichts. */
export function letzterAbschnitt(voll: string): string {
  const stueck = voll.split(/\s[-–—]\s|:\s/).at(-1)!.trim()
  return /(?:^|\s)Staffel\s+\d+(?:\s*-\s*Teil\s+\d+)?$/i.test(stueck) ? '' : stueck
}

type Eintrag = { id: number; rest: string; voll: string }

/**
 * Tragen zwei Karten derselben Reihe dieselbe Beschriftung („Staffel 16" für drei japanische Teile einer deutschen Staffel), nennt jede den Abschnitt ihres Namens,
 * der sie unterscheidet. Nur wenn alle Karten der Gruppe einen eigenen Abschnitt haben; sonst bleibt es bei der Beschriftung, nichts wird erfunden.
 */
export function doppelteZusaetze(teile: Eintrag[], nummern: Map<number, StaffelNummer>): Map<number, string> {
  const gruppen = new Map<string, Eintrag[]>()
  for (const e of teile) {
    const nr = nummern.get(e.id)
    if (!nr) continue
    const beschriftung = `${staffelKurz(nr)}·${zeilenZusatz(nr, e.rest, e.voll)}`
    gruppen.set(beschriftung, [...(gruppen.get(beschriftung) ?? []), e])
  }
  const zusaetze = new Map<number, string>()
  for (const gruppe of gruppen.values()) {
    if (gruppe.length < 2) continue
    const abschnitte = gruppe.map((e) => letzterAbschnitt(e.voll))
    if (abschnitte.some((a) => !a) || new Set(abschnitte).size !== abschnitte.length) continue
    gruppe.forEach((e, i) => zusaetze.set(e.id, abschnitte[i]!))
  }
  return zusaetze
}

/** Die Zusätze der Hauptstaffeln einer Reihe, mit denselben Namen wie die Karten (`teilNamen`). */
export function doppelteZusaetzeDerReihe(
  haupt: FranchiseMember[],
  reihenName: string,
  staffelLabel: Map<number, string>,
  nummern: Map<number, StaffelNummer>,
): Map<number, string> {
  const namen = (m: FranchiseMember) => teilNamen(m, reihenName, true, staffelLabel.get(m.id))
  return doppelteZusaetze(haupt.map((m) => ({ id: m.id, ...namen(m) })), nummern)
}
