import { anzeigeName, hauptstaffeln, staffelBeschriftungen, staffelStaende } from '@shared/titles.ts'
import type { FranchiseMember, Title } from '@shared/types.ts'

/** Ein Reiter: der Titel, den er öffnet, und seine Kurzbeschriftung („4“, „1–5“). */
export interface Reiter {
  id: number
  label: string
  name: string
}

/** Staffeln einer deutschen Staffelteilung (Pokémon Horizonte): Geschwister mit demselben Sammeltitel, nach Staffelnummer. */
function ausSammeltitel(sammel: number, titel: Title[]): Reiter[] {
  return titel
    .filter((t) => t.staffelTitel?.sammel === sammel)
    .sort((a, b) => a.staffelTitel!.nr - b.staffelTitel!.nr)
    .map((t) => ({ id: t.id, label: String(t.staffelTitel!.nr), name: anzeigeName(t) }))
}

/** Hauptstaffeln der Reihe mit der Beschriftung der Reihenliste („Staffel 1–5“ wird „1–5“); sortiert nach Staffelnummer. */
function ausHauptstaffeln(teile: FranchiseMember[], reihenName: string): Reiter[] {
  const haupt = hauptstaffeln(teile)
  const stand = staffelStaende(haupt, reihenName)
  const text = staffelBeschriftungen(haupt, reihenName)
  return haupt
    .filter((m) => text.has(m.id))
    .sort((a, b) => stand.get(a.id)!.staffel - stand.get(b.id)!.staffel || a.id - b.id)
    .map((m) => ({ id: m.id, label: text.get(m.id)!.replace(/^Staffel\s+/, ''), name: m.name }))
}

/**
 * Die Reiter für den geöffneten Titel: eine Liste nur, wenn er selbst eine Staffel der Reihe ist und es mindestens zwei gibt
 * (ein Film oder Special hat keine Reiter). Alles kommt aus den Daten der Seite, nichts ist ergänzt.
 */
export function reiterVon(title: Title, teile: FranchiseMember[], reihenName: string, titel: Title[]): Reiter[] {
  const liste = title.staffelTitel ? ausSammeltitel(title.staffelTitel.sammel, titel) : ausHauptstaffeln(teile, reihenName)
  return liste.length >= 2 && liste.some((r) => r.id === title.id) ? liste : []
}
