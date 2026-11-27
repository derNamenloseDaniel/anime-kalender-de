/**
 * **Nachlese für Disc-Termine ohne Cache-Eintrag** (24.11.2026, Nebenbefund zu PR 4854).
 *
 * `baueWarteschlange` läuft über Titel der ID-Brücke mit Eintrag in `anisearch.json`; Katalogtitel (`10.000.000 + aniSearch-Kennung`)
 * haben keinen, ihre Titelseite wurde einmal archiviert und nie wieder gelesen, obwohl ihr Disc-Termin in der Zukunft liegt.
 * Ohne Eintrag fehlt auch das Alter der Lesung: Diese Titel kommen bei jedem Lauf dran (wenige Seiten, Stand 24.11.2026: 3).
 */
import { ANISEARCH_AB, type Auftrag } from './anisearch-archiv-vorrang.ts'

export interface Nachlese {
  /** Seiten, die der Lauf zusätzlich liest (kein Cache-Eintrag, nur Archiv). */
  auftraege: Auftrag[]
  /** Titel mit Disc-Termin, die weder Eintrag noch lesbare Kennung haben: der Termin wird nie neu gelesen. */
  ohneQuelle: number[]
}

export function discNachlese(
  discTitel: Set<number>,
  cache: Record<string, unknown>,
  bruecke: Record<number, number>,
): Nachlese {
  const auftraege: Auftrag[] = []
  const ohneQuelle: number[] = []
  for (const id of [...discTitel].sort((a, b) => a - b)) {
    if (cache[id]) continue
    const asId = id >= ANISEARCH_AB ? id - ANISEARCH_AB : bruecke[id]
    if (asId) auftraege.push({ asId, titelIds: [] })
    else ohneQuelle.push(id)
  }
  return { auftraege, ohneQuelle }
}
