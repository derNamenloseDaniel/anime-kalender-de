import type { FranchiseMember } from '@shared/types.ts'
import type { StaffelNummer } from '@shared/titles.ts'
import { staffelKurz, zeilenZusatz } from './reihen-regeln.ts'
import { teilNamen } from './reihen-teil.ts'

/** Der letzte Namensabschnitt nach „ - " oder „: " — bei „… Staffel 2 - Episode N" also „Episode N"; eine bloße Staffelangabe sagt nichts. */
export function letzterAbschnitt(voll: string): string {
  const stueck = voll.split(/\s[-–—]\s|:\s/).at(-1)!.trim()
  return /(?:^|\s)Staffel\s+\d+(?:\s*-\s*Teil\s+\d+)?$/i.test(stueck) ? '' : stueck
}

type Eintrag = { id: number; rest: string; voll: string; folgen?: FranchiseMember['staffelFolgen'] }

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

/**
 * Überschneiden sich die Bereiche zweier Karten („Staffel 14–15", „Staffel 15–16"), steht dieselbe Staffelzahl auf beiden. Tragen mindestens zwei davon keinen eigenen Zusatz,
 * nennt jede ihren Namensabschnitt, sonst — wo `staffelFolgen` es belegt — ihre Folgen der geteilten Staffel („S15: Folge 49–84"); sonst bleiben sie, wie sie sind.
 * Karten mit „Teil N" unterscheiden sich schon, `schon` sind die Zusätze der gleichen Beschriftungen (`doppelteZusaetze`).
 */
export function ueberlappendeZusaetze(teile: Eintrag[], nummern: Map<number, StaffelNummer>, schon: Map<number, string>): Map<number, string> {
  const jeStaffel = new Map<number, Eintrag[]>()
  for (const e of teile) {
    const nr = nummern.get(e.id)
    if (!nr || nr.teil) continue
    for (let s = nr.staffel; s <= (nr.bis ?? nr.staffel); s++) jeStaffel.set(s, [...(jeStaffel.get(s) ?? []), e])
  }
  const zusaetze = new Map(schon)
  const ohneZusatz = (e: Eintrag) => !zeilenZusatz(nummern.get(e.id)!, e.rest, e.voll, zusaetze.get(e.id))
  for (const [staffel, karten] of [...jeStaffel].sort(([a], [b]) => a - b)) {
    const offen = karten.filter(ohneZusatz)
    if (offen.length < 2) continue
    const abschnitte = offen.map((e) => letzterAbschnitt(e.voll))
    const bereiche = offen.map((e) => e.folgen?.find(([s]) => s === staffel))
    if (abschnitte.every(Boolean) && new Set(abschnitte).size === offen.length) offen.forEach((e, i) => zusaetze.set(e.id, abschnitte[i]!))
    else if (bereiche.every(Boolean)) offen.forEach((e, i) => zusaetze.set(e.id, `S${staffel}: Folge ${bereiche[i]![1]}–${bereiche[i]![2]}`))
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
  const teile = haupt.map((m) => ({ id: m.id, ...namen(m), folgen: m.staffelFolgen }))
  return ueberlappendeZusaetze(teile, nummern, doppelteZusaetze(teile, nummern))
}
