import { titleStatus } from '@shared/logic.ts'
import type { Release, Title } from '@shared/types.ts'

export type Lage = 'laeuft' | 'kommt' | 'sonst'

/** Letzte Folge der Staffel nach den Verweisen der Anbieter (`teilBereich.bis`); ohne Angabe 0. */
function staffelEnde(titel: Title): number {
  return Math.max(0, ...(titel.streams ?? []).map((s) => s.teilBereich?.bis ?? 0))
}

/** Höchste gesichtete Folgennummer eines Releases; ohne Sichtung 0. */
function gesichtetBis(release: Release): number {
  return Math.max(0, ...Object.keys(release.schedule?.observed ?? {}).map(Number))
}

/**
 * Läuft die Staffel, kommt sie noch, oder ist sie vorbei. Beim Sammeltitel hängt dieselbe Fernsehreihe an jedem Staffel-Titel:
 * sie zählt für eine Staffel nur, solange ihre Sichtungen deren letzte Folge noch nicht erreicht haben. Eine Staffel ohne
 * bekannte Folgenzahl, deren erste Folge erschien, läuft noch (der Status des Titels kennt kein offenes Ende).
 */
export function lageVon(titel: Title, releases: Release[], today: string): Lage {
  const ende = titel.staffelTitel ? staffelEnde(titel) : 0
  const offen = ende > 0 ? releases.filter((r) => gesichtetBis(r) < ende) : releases
  const status = titleStatus(offen, today, titel)
  if (status === 'airing') return 'laeuft'
  if (status === 'tba') return 'kommt'
  return status === 'abgeschlossen' && titel.episodes === undefined ? 'laeuft' : 'sonst'
}
