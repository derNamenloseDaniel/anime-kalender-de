/**
 * Crunchyroll zählt Folgen über alle Staffeln durch, der Datensatz je Staffel (Black Clover Staffel 2,
 * 26.11.2026: Kalender-Folge 174 war Folge 4 der Staffel und blähte Folgenzahl, Pille und Finale auf).
 */
import type { CrunchyrollEntry } from './crunchyroll.ts'
import type { Release, Title } from '../../shared/types.ts'

/** Der Slot mit Staffelnummern: Folge `n` wird zu `n - ab + 1`; Folgen vor `ab` gehören zu einer Vorgängerstaffel und entfallen. `ab` = Crunchyroll-Nummer der Staffel-Folge 1. */
export function slotAufStaffelzaehlung(slot: CrunchyrollEntry, ab: number | undefined): CrunchyrollEntry {
  if (!ab || ab <= 1) return slot
  const um = (n: number | undefined) => (n === undefined ? undefined : n - ab + 1)
  const beobachtungen = (slot.observations ?? []).flatMap((o) => (o.episode && o.episode < ab ? [] : [{ ...o, episode: um(o.episode) }]))
  return { ...slot, observations: beobachtungen, earliest: slot.earliest && { ...slot.earliest, episode: um(slot.earliest.episode) } } as CrunchyrollEntry
}

const TAGE = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5)

/**
 * Prüfung auf eine absolute Crunchyroll-Zählung im Datensatz: eine beobachtete Nummer über der Folgenzahl des Titels
 * oder ein Nummernsprung, den die Wochen dazwischen nicht tragen (3 → 174 in einer Woche). Nur Crunchyroll-Releases.
 */
export function crAbsoluteZaehlungFehler(releases: Release[], titles: Map<number, Title>): string[] {
  const fehler: string[] = []
  for (const r of releases) {
    const beob = r.platform === 'crunchyroll' ? r.schedule.observed : undefined
    if (!beob) continue
    const nr = Object.keys(beob).map(Number).sort((a, b) => a - b)
    const erste = r.schedule.firstEpisodeNumber ?? 1
    const titelFolgen = titles.get(r.titleId)?.episodes
    if (titelFolgen && nr[nr.length - 1] > erste - 1 + titelFolgen) {
      fehler.push(`"${r.slug}": Folge ${nr[nr.length - 1]} beobachtet, der Titel hat ${titelFolgen} Folgen (ab Folge ${erste}) — Crunchyroll-Zählung nicht auf die Staffel umgerechnet?`)
      continue
    }
    for (let i = 1; i < nr.length; i++) {
      const wochen = Math.max(1, TAGE(beob[nr[i - 1]], beob[nr[i]]) / 7)
      if (nr[i] - nr[i - 1] > 2 * wochen + 2) {
        fehler.push(`"${r.slug}": Folge ${nr[i - 1]} → ${nr[i]} in ${wochen} Woche(n) beobachtet — Crunchyroll-Zählung nicht auf die Staffel umgerechnet?`)
        break
      }
    }
  }
  return fehler
}
