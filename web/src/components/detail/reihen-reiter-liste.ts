import { titleStatus, type StaffelLage } from '@shared/logic.ts'
import { anzeigeName, hauptstaffeln, staffelBeschriftungen, staffelStaende } from '@shared/titles.ts'
import type { FranchiseMember, Release, Title } from '@shared/types.ts'

/** Ein Reihen-Reiter (F157): der Titel, den er öffnet, seine Kurzbeschriftung („4“, „1–5“) und sein Name für Hilfsmittel. */
export interface ReihenReiter {
  id: number
  label: string
  name: string
}

/** Staffeln einer deutschen Staffelteilung (Pokémon Horizonte): Geschwister mit demselben Sammeltitel, nach Staffelnummer. */
function ausSammeltitel(sammel: number, titel: Title[]): ReihenReiter[] {
  return titel
    .filter((t) => t.staffelTitel?.sammel === sammel)
    .sort((a, b) => a.staffelTitel!.nr - b.staffelTitel!.nr)
    .map((t) => ({ id: t.id, label: String(t.staffelTitel!.nr), name: anzeigeName(t) }))
}

/**
 * Hauptstaffeln der Reihe mit der Beschriftung der Reihenliste („Staffel 1–5“ wird „1–5“); sortiert nach Staffelnummer. Eine einzige
 * Staffel in Teilen („Teil 1“, „Teil 2“) hat Beschriftungen, aber keinen Staffelstand: dann zählt nur die Kennung.
 */
function ausHauptstaffeln(teile: FranchiseMember[], reihenName: string): ReihenReiter[] {
  const haupt = hauptstaffeln(teile)
  const stand = staffelStaende(haupt, reihenName)
  const text = staffelBeschriftungen(haupt, reihenName)
  const nummer = (id: number) => stand.get(id)?.staffel ?? 0
  return haupt
    .filter((m) => text.has(m.id))
    .sort((a, b) => nummer(a.id) - nummer(b.id) || a.id - b.id)
    .map((m) => ({ id: m.id, label: text.get(m.id)!.replace(/^Staffel\s+/, ''), name: m.name }))
}

/**
 * Die Reiter für den geöffneten Titel: eine Liste nur, wenn er selbst eine Staffel der Reihe ist und es mindestens zwei gibt
 * (ein Film oder Special hat keine Reiter). Alles kommt aus den Daten der Seite, nichts ist ergänzt.
 */
export function reihenReiterVon(title: Title, teile: FranchiseMember[], reihenName: string, titel: Title[]): ReihenReiter[] {
  const liste = title.staffelTitel ? ausSammeltitel(title.staffelTitel.sammel, titel) : ausHauptstaffeln(teile, reihenName)
  return liste.length >= 2 && liste.some((r) => r.id === title.id) ? liste : []
}

/** Letzte Folge der Staffel nach den Verweisen der Anbieter (`teilBereich.bis`); ohne Angabe 0. */
function staffelEnde(titel: Title): number {
  return Math.max(0, ...(titel.streams ?? []).map((s) => s.teilBereich?.bis ?? 0))
}

/** Höchste gesichtete Folgennummer eines Releases; ohne Sichtung 0. */
function gesichtetBis(release: Release): number {
  return Math.max(0, ...Object.keys(release.schedule?.observed ?? {}).map(Number))
}

/**
 * Läuft der Reihenteil, kommt er noch, oder ruht er. Beim Sammeltitel hängt dieselbe Fernsehreihe an jedem Staffel-Titel:
 * sie zählt für eine Staffel nur, solange ihre Sichtungen deren letzte Folge noch nicht erreicht haben. Eine Staffel ohne
 * bekannte Folgenzahl, deren erste Folge erschien, läuft noch (der Status des Titels kennt kein offenes Ende).
 */
export function reihenLageVon(titel: Title, releases: Release[], today: string): StaffelLage {
  const ende = titel.staffelTitel ? staffelEnde(titel) : 0
  const offen = ende > 0 ? releases.filter((r) => gesichtetBis(r) < ende) : releases
  const status = titleStatus(offen, today, titel)
  if (status === 'airing') return 'laeuft'
  if (status === 'tba') return 'kommt'
  return status === 'abgeschlossen' && titel.episodes === undefined ? 'laeuft' : 'ruht'
}
