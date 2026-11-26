import type { FranchiseMember } from '@shared/types.ts'
import type { StaffelNummer } from '@shared/titles.ts'
import { staffelKurz, zeilenZusatz } from './reihen-regeln.ts'
import { teilNamen } from './reihen-teil.ts'

/** Namensabschnitte, die Besuchern nichts sagen („Episode N", „Die Serie"): AniList-Platzhalter statt eines Untertitels. */
export function istPlatzhalter(abschnitt: string): boolean {
  return /^(?:(?:Episode|Folge|Part|Teil)\s*(?:\d+|N)|Die Serie|The Series)$/i.test(abschnitt)
}

/** Der letzte Namensabschnitt nach „ - " oder „: ", der einer Karte etwas sagt; eine bloße Staffelangabe oder ein Platzhalter („Episode N") sagt nichts. */
export function letzterAbschnitt(voll: string): string {
  const stueck = voll.split(/\s[-–—]\s|:\s/).at(-1)!.trim()
  return /(?:^|\s)Staffel\s+\d+(?:\s*-\s*Teil\s+\d+)?$/i.test(stueck) || istPlatzhalter(stueck) ? '' : stueck
}

type Eintrag = { id: number; rest: string; voll: string; folgen?: FranchiseMember['staffelFolgen'] }
/** Text für den Folgenbereich einer geteilten Staffel; `mitStaffel`, wenn die Beschriftung mehrere Staffeln nennt („Staffel 15–16"). */
export type FolgenText = (staffel: number, von: number, bis: number, mitStaffel: boolean) => string

/** Pro Karte ihr Folgenbereich in `staffel`, nur wenn jede Karte der Gruppe einen belegten hat. */
function ausFolgen(karten: Eintrag[], staffel: number, nummern: Map<number, StaffelNummer>, text: FolgenText): string[] | undefined {
  const bereiche = karten.map((e) => e.folgen?.find(([s]) => s === staffel))
  if (!bereiche.every(Boolean)) return undefined
  return bereiche.map((b, i) => text(staffel, b![1], b![2], nummern.get(karten[i]!.id)!.bis !== undefined))
}

/** Pro Karte ihr Namensabschnitt, nur wenn jede Karte einen eigenen hat. */
function ausNamen(karten: Eintrag[]): string[] | undefined {
  const abschnitte = karten.map((e) => letzterAbschnitt(e.voll))
  return abschnitte.every(Boolean) && new Set(abschnitte).size === abschnitte.length ? abschnitte : undefined
}

/**
 * Was Karten einer Staffel unterscheidet: ihr Folgenbereich der geteilten Staffel (belegt in `staffelFolgen`), sonst ihr Namensabschnitt.
 * Der Folgenbereich geht vor, weil er für jede Karte stimmt; ein Name ist oft nur ein Platzhalter. Nichts davon: nichts erfinden.
 */
function unterscheidung(karten: Eintrag[], staffel: number, nummern: Map<number, StaffelNummer>, text: FolgenText): string[] | undefined {
  return ausFolgen(karten, staffel, nummern, text) ?? ausNamen(karten)
}

/**
 * Tragen zwei Karten derselben Reihe dieselbe Beschriftung („Staffel 16" für drei japanische Teile einer deutschen Staffel), nennt jede, was sie unterscheidet
 * (`unterscheidung`). Nur wenn alle Karten der Gruppe etwas Eigenes haben; sonst bleibt es bei der Beschriftung.
 */
export function doppelteZusaetze(teile: Eintrag[], nummern: Map<number, StaffelNummer>, text: FolgenText): Map<number, string> {
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
    const unterschiede = unterscheidung(gruppe, nummern.get(gruppe[0]!.id)!.staffel, nummern, text)
    if (unterschiede) gruppe.forEach((e, i) => zusaetze.set(e.id, unterschiede[i]!))
  }
  return zusaetze
}

/**
 * Überschneiden sich die Bereiche zweier Karten („Staffel 14–15", „Staffel 15–16"), steht dieselbe Staffelzahl auf beiden. Tragen mindestens zwei davon keinen eigenen Zusatz,
 * nennt jede, was sie unterscheidet (`unterscheidung`: Folgen der geteilten Staffel, sonst Namensabschnitt); sonst bleiben sie, wie sie sind.
 * Karten mit „Teil N" unterscheiden sich schon, `schon` sind die Zusätze der gleichen Beschriftungen (`doppelteZusaetze`).
 */
export function ueberlappendeZusaetze(teile: Eintrag[], nummern: Map<number, StaffelNummer>, schon: Map<number, string>, text: FolgenText): Map<number, string> {
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
    const unterschiede = unterscheidung(offen, staffel, nummern, text)
    if (unterschiede) offen.forEach((e, i) => zusaetze.set(e.id, unterschiede[i]!))
  }
  return zusaetze
}

/** Die Zusätze der Hauptstaffeln einer Reihe, mit denselben Namen wie die Karten (`teilNamen`). */
export function doppelteZusaetzeDerReihe(
  haupt: FranchiseMember[],
  reihenName: string,
  staffelLabel: Map<number, string>,
  nummern: Map<number, StaffelNummer>,
  text: FolgenText,
): Map<number, string> {
  const namen = (m: FranchiseMember) => teilNamen(m, reihenName, true, staffelLabel.get(m.id))
  const teile = haupt.map((m) => ({ id: m.id, ...namen(m), folgen: m.staffelFolgen }))
  return ueberlappendeZusaetze(teile, nummern, doppelteZusaetze(teile, nummern, text), text)
}
