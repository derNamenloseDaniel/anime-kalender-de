import type { Release, Title } from '@shared/types.ts'
import { titleStatus } from '@shared/logic.ts'
import { modusVon, type FilterState } from '../../src/lib/filters.ts'
import type { Vorlieben } from '../../src/lib/vorlieben.ts'

/**
 * Nachbau des Standes von `main` vor dem Filterkonzept (22.11.2026) — nur für „Vorher" im Mockup `filter-konzept`.
 * Wird mit dem Bau-PR gelöscht, sobald das Mockup nicht mehr gebraucht wird (Skill `mockups`, „Nach dem Bau").
 */

/** Die Weg-Filter von `main`: `releases.some` entschied über den ganzen Titel. */
export function passtWegeAlt(t: Title, releases: Release[], f: FilterState, heute: string): boolean {
  const x = f.excluded
  const platformsOf = new Set([...releases.map((r) => r.platform), ...t.streams.map((s) => s.platform)])
  const yearsOf = releases.length ? releases.map((r) => r.year) : t.jpYear ? [t.jpYear] : []
  const providersOf = new Set((t.watchLinks ?? []).map((w) => w.name))
  if (x.platforms.some((p) => platformsOf.has(p))) return false
  if (x.providers.some((p) => providersOf.has(p))) return false
  const hatArt = (rt: string) => releases.some((r) => r.releaseType === rt) || (rt === 'movie' && t.format === 'MOVIE')
  if (x.releaseTypes.some(hatArt)) return false
  if (x.years.some((y) => yearsOf.includes(y))) return false
  if (x.statuses.includes(titleStatus(releases, heute, t))) return false
  const passt = <T>(gewaehlt: readonly T[], feld: Parameters<typeof modusVon>[1], hat: (v: T) => boolean) =>
    !gewaehlt.length || (modusVon(f, feld) === 'und' ? gewaehlt.every(hat) : gewaehlt.some(hat))
  if (!passt(f.platforms, 'platforms', (p) => platformsOf.has(p))) return false
  if (!passt(f.providers, 'providers', (p) => providersOf.has(p))) return false
  if (!passt(f.releaseTypes, 'releaseTypes', hatArt)) return false
  if (!passt(f.years, 'years', (y) => yearsOf.includes(y))) return false
  return !f.statuses.length || f.statuses.includes(titleStatus(releases, heute, t))
}

/** Der alte gemeinsame Schlüssel: Kalender und Datenbank lasen und schrieben ihn beide. */
export function vorliebenAltSchreiben(neu: Vorlieben): void {
  try {
    const alt = JSON.parse(localStorage.getItem('vorlieben') ?? '{}') as Partial<Vorlieben>
    localStorage.setItem('vorlieben', JSON.stringify({ ...alt, ...neu }))
  } catch {
    /* Gesperrter Speicher: wie im echten Code ohne Folge. */
  }
}
