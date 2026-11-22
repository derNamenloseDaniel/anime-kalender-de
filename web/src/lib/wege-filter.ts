import type { Release, ReleaseType, Title } from '@shared/types.ts'
import { titleStatus } from '@shared/logic.ts'
import type { FilterState, ModusFeld } from './filters.ts'

/** Die Und/Oder-Prüfung je Kategorie, wie `passtTitel` sie hält (`modusVon`). */
export type PasstModus = <T>(gewaehlt: readonly T[], feld: ModusFeld, hat: (v: T) => boolean) => boolean

/**
 * **Die Weg-Filter eines Titels** — Plattform, Anbieter, Art, Jahr, Status (Einschluss und Ausschluss).
 * Einziger Ort dieser Logik; `passtTitel` ruft sie nur auf.
 */
export function passtWege(t: Title, releases: Release[], f: FilterState, today: string, passt: PasstModus): boolean {
  const x = f.excluded
  const platformsOf = new Set([...releases.map((r) => r.platform), ...t.streams.map((s) => s.platform)])
  const yearsOf = releases.length ? releases.map((r) => r.year) : t.jpYear ? [t.jpYear] : []

  // Bezugsquellen zählen wie Plattformen: Wer nach „maxdome" filtert, will
  // die Titel sehen, die es dort gibt — ob als Abo oder zum Kauf.
  const providersOf = new Set((t.watchLinks ?? []).map((w) => w.name))

  if (x.platforms.some((p) => platformsOf.has(p))) return false
  if (x.providers.some((p) => providersOf.has(p))) return false
  /*
    **„Film ausschließen" heißt das Werk, nicht nur den Termin.**

    Ein Titel mit `format: 'MOVIE'` ist ein Film, ob wir einen Termin dazu kennen oder nicht
    (Daniel, 03.09.2026). Die übrigen Arten haben keine solche Entsprechung im Werk.
  */
  const istFilmwerk = t.format === 'MOVIE'
  const hatArt = (rt: ReleaseType) =>
    releases.some((r) => r.releaseType === rt) || (rt === 'movie' && istFilmwerk)

  if (x.releaseTypes.some(hatArt)) return false
  if (x.years.some((y) => yearsOf.includes(y))) return false
  if (x.statuses.includes(titleStatus(releases, today, t))) return false

  if (!passt(f.platforms, 'platforms', (p) => platformsOf.has(p))) return false
  if (!passt(f.providers, 'providers', (p) => providersOf.has(p))) return false
  if (!passt(f.releaseTypes, 'releaseTypes', hatArt)) return false
  if (!passt(f.years, 'years', (y) => yearsOf.includes(y))) return false
  /* Der Status ist einwertig — ohne Modus, aus demselben Grund wie FSK. */
  if (f.statuses.length && !f.statuses.includes(titleStatus(releases, today, t))) return false
  return true
}
