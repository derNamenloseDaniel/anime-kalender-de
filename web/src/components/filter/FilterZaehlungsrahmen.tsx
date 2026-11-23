import type { ReactNode } from 'react'
import type { Release, Title } from '@shared/types.ts'
import { todayIso } from '@shared/time.ts'
import { zaehleFilterGen, type FilterZaehlung } from '../../lib/filter-zaehlung.ts'
import { FilterZaehlungContext } from '../../lib/filter-zaehlung-kontext.ts'
import { useZeitscheibe } from '../../lib/use-zeitscheibe.ts'

export interface ZaehlKern {
  titel: Title[]
  releasesByTitle: Map<number, Release[]>
}

/**
 * Stellt dem Filterfenster die Zahlen an den Chips bereit. Das Fenster hängt erst beim Öffnen ein, so rechnet auch die Zählung erst dann —
 * in Zeitscheiben, damit das Öffnen den Hauptfaden nicht blockiert, und ohne Kosten für Besucher, die nie filtern.
 */
export function FilterZaehlungsrahmen({ kern, children }: { kern?: ZaehlKern; children: ReactNode }) {
  const { wert } = useZeitscheibe<FilterZaehlung | null>(
    () => (kern ? zaehleFilterGen(kern.titel, kern.releasesByTitle, todayIso()) : nichts()),
    [kern?.titel, kern?.releasesByTitle],
    null,
  )
  return <FilterZaehlungContext.Provider value={wert ?? undefined}>{children}</FilterZaehlungContext.Provider>
}

function* nichts(): Generator<void, null> {
  return null
}
