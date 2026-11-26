import { expandEvents, fruehesterTermin, releaseStatus, titleStatus, type LageMitGrund, type StaffelLage } from '@shared/logic.ts'
import { anzeigeName, hauptstaffeln, staffelBeschriftungen, staffelStaende } from '@shared/titles.ts'
import type { FranchiseMember, Release, Title } from '@shared/types.ts'
import { ohneDeutscheSynchro } from './reihen-teil.ts'
import type { Gruppe } from './reihen-uebersicht-regeln.ts'

/**
 * Ein Reihen-Reiter (F157): der Titel, den er öffnet, seine Kurzbeschriftung („4“, „1–5“, beim Film die laufende Nummer) und der
 * volle Titel für Tooltip und Hilfsmittel; `staffel` sagt, ob die Beschriftung eine Staffelnummer ist, `ohneSynchro`, ob der Teil
 * ohne deutsche Synchro erschienen ist (gestrichelter Rand; ein geplanter Teil zählt nicht).
 */
export interface ReihenReiter {
  id: number
  label: string
  name: string
  staffel: boolean
  ohneSynchro: boolean
}

/** Staffeln einer deutschen Staffelteilung (Pokémon Horizonte): Geschwister mit demselben Sammeltitel, nach Staffelnummer. */
function ausSammeltitel(sammel: number, titel: Title[], today: string): ReihenReiter[] {
  return titel
    .filter((t) => t.staffelTitel?.sammel === sammel)
    .sort((a, b) => a.staffelTitel!.nr - b.staffelTitel!.nr)
    .map((t) => ({ id: t.id, label: String(t.staffelTitel!.nr), name: anzeigeName(t), staffel: true, ohneSynchro: ohneDeutscheSynchro(t, today) }))
}

/**
 * Die übrigen Teile derselben Gruppe der Reihenliste (Filme, Specials, eigene Serien), in deren Reihenfolge, beschriftet mit der
 * laufenden Nummer; auch Teile ohne Synchro bekommen einen Reiter.
 */
function ausGruppe(title: Title, gruppen: Gruppe[], today: string): ReihenReiter[] {
  const gruppe = gruppen.find((g) => g.teile.some((m) => m.id === title.id))
  return (gruppe?.teile ?? []).map((m, i) => ({ id: m.id, label: String(i + 1), name: m.name, staffel: false, ohneSynchro: ohneDeutscheSynchro(m, today) }))
}

/** „Staffel 3 - Teil 2“ wird am Reiter „3.2“, „Staffel 1–5“ „1–5“; Reihenliste und Tooltip behalten den langen Namen. */
export function reiterKurzform(beschriftung: string): string {
  return beschriftung.replace(/^Staffel\s+/, '').replace(/\s*-\s*Teil\s+(\d+)$/, '.$1')
}

/**
 * Hauptstaffeln der Reihe mit der Beschriftung der Reihenliste („Staffel 1–5“ wird „1–5“); sortiert nach Staffelnummer. Eine einzige
 * Staffel in Teilen („Teil 1“, „Teil 2“) hat Beschriftungen, aber keinen Staffelstand: dann zählt nur die Kennung.
 */
function ausHauptstaffeln(teile: FranchiseMember[], reihenName: string, today: string): ReihenReiter[] {
  const haupt = hauptstaffeln(teile)
  const stand = staffelStaende(haupt, reihenName)
  const text = staffelBeschriftungen(haupt, reihenName)
  const nummer = (id: number) => stand.get(id)?.staffel ?? 0
  return haupt
    .filter((m) => text.has(m.id))
    .sort((a, b) => nummer(a.id) - nummer(b.id) || a.id - b.id)
    .map((m) => ({ id: m.id, label: reiterKurzform(text.get(m.id)!), name: m.name, staffel: true, ohneSynchro: ohneDeutscheSynchro(m, today) }))
}

/** Gleiche Kurzbeschriftungen verschiedener Titel (zwei „16“, zwei „1“) bekommen in Listenreihenfolge a, b, …; einmalige bleiben. */
export function eindeutigeBeschriftung(liste: ReihenReiter[]): ReihenReiter[] {
  const zahl = new Map<string, number>()
  for (const r of liste) zahl.set(r.label, (zahl.get(r.label) ?? 0) + 1)
  const lauf = new Map<string, number>()
  return liste.map((r) => {
    if (zahl.get(r.label) === 1) return r
    const i = lauf.get(r.label) ?? 0
    lauf.set(r.label, i + 1)
    return { ...r, label: r.label + String.fromCharCode(97 + i) }
  })
}

/**
 * Die Reiter für den geöffneten Titel aus seiner Kategorie der Reihe: Sammeltitel-Staffeln, sonst Hauptstaffeln, sonst seine Gruppe
 * der Reihenliste (`gruppen`, wie `reihenOrdnung` sie bildet). Eine Liste nur ab zwei Reitern, die den Titel enthalten. Alles kommt
 * aus den Daten der Seite, nichts ist ergänzt. `today` (ISO-Tag) entscheidet, ob ein Teil ohne Synchro schon erschienen ist.
 */
export function reihenReiterVon(title: Title, teile: FranchiseMember[], reihenName: string, titel: Title[], gruppen: Gruppe[], today: string): ReihenReiter[] {
  const istHaupt = hauptstaffeln(teile).some((m) => m.id === title.id)
  const liste = title.staffelTitel ? ausSammeltitel(title.staffelTitel.sammel, titel, today) : istHaupt ? ausHauptstaffeln(teile, reihenName, today) : ausGruppe(title, gruppen, today)
  return liste.length >= 2 && liste.some((r) => r.id === title.id) ? eindeutigeBeschriftung(liste) : []
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
  return reihenLageMitGrund(titel, releases, today).lage
}

/**
 * Wie `reihenLageVon`, dazu der früheste künftige Termin der Releases, die die Marke auslösen: nur die mit dem Status des Titels
 * (läuft → laufende, kommt → angekündigte). Eine kommende Disc nennt „läuft“ also nicht (Detektiv Conan zeigte die Box statt der TV-Reihe).
 */
export function reihenLageMitGrund(titel: Title, releases: Release[], today: string): LageMitGrund {
  const ende = titel.staffelTitel ? staffelEnde(titel) : 0
  const offen = ende > 0 ? releases.filter((r) => gesichtetBis(r) < ende) : releases
  const status = titleStatus(offen, today, titel)
  const lage: StaffelLage = status === 'airing' ? 'laeuft' : status === 'tba' ? 'kommt' : status === 'abgeschlossen' && titel.episodes === undefined ? 'laeuft' : 'ruht'
  if (lage === 'ruht') return { lage }
  const ausloeser = offen.filter((r) => releaseStatus(r, today) === status)
  return { lage, grund: fruehesterTermin(ausloeser.flatMap((r) => expandEvents(r).map((e) => ({ r, e }))), today) }
}
