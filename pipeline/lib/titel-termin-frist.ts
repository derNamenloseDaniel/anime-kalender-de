import { addDays, diffDays } from '../../shared/time.ts'
import { FRISCH_TAGE } from './tmdb-folgen-auswahl.ts'

/**
 * Termin binnen der Grundfrist eines Titel-Sammlers: eine Lesung, die älter als `FRISCH_TAGE` ist, kommt dann wieder dran (24.11.2026).
 * Ohne das käme sie bei 60 oder 180 Tagen Grundfrist erst nach dem Termin. Dieselbe Frist wie bei den Folgen (`terminFaellig`), aus
 * demselben Grund (Wochenlauf). Ein Termin jenseits der Grundfrist ändert nichts: bis dahin kommt die Lesung ohnehin noch einmal.
 */
export function terminNahFaellig(gelesen: string | undefined, termine: readonly string[] | undefined, heute: string, grundTage: number): boolean {
  const tag = gelesen?.slice(0, 10) ?? ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tag) || diffDays(tag, heute) < FRISCH_TAGE) return false
  const bis = addDays(heute, grundTage)
  /* „2026-12-00“ (Tag unbekannt) ist kein Termin, den wir einem Tag zuordnen können. */
  return (termine ?? []).some((t) => !Number.isNaN(Date.parse(`${t}T00:00:00Z`)) && t >= heute && t <= bis)
}
