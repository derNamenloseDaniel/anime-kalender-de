import type { Release, Title } from '@shared/types.ts'
import { passtWege as passtWegeNeu, type ModusVon } from '../../src/lib/wege-filter.ts'
import type { FilterState } from '../../src/lib/filters.ts'
import { passtWegeAlt } from '../mockups/filter-konzept-alt.ts'
import { istVorherZelle } from './filter-konzept-zelle.ts'

/** Alles andere aus `wege-filter.ts` bleibt, wie es ist; die Weg-Prüfung zeigt in der Vorher-Zelle von `filter-konzept` den alten Stand. */
export * from '../../src/lib/wege-filter.ts'

export function passtWege(t: Title, releases: Release[], f: FilterState, heute: string, modus: ModusVon): boolean {
  return istVorherZelle() ? passtWegeAlt(t, releases, f, heute) : passtWegeNeu(t, releases, f, heute, modus)
}
