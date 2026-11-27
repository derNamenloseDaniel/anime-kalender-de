import { useMemo, useRef, useState } from 'react'
import type { AppRoute } from './router.ts'
import { EMPTY_FILTERS, LIST_KEYS, emptyLists, type FilterState } from './filters.ts'
import { filterAusVorlieben } from './vorlieben.ts'

/**
 * **Die Filter von Woche und Monat gehören dem Kalender allein** (Daniel, 09.10.2026: geteilter Zustand mit der
 * Datenbank führte am Handy zu Fehlern). Sie stehen weder in der Adresse noch in der Route, sondern im Speicher
 * von `App.tsx`; die Datenbank hat ihre eigenen in der Adresse. Auch die Schnellfilter (Vorlieben des Geräts,
 * `vorlieben.ts`) sind je Ansicht getrennt (22.11.2026).
 */

/** Was von einem Filterzustand in der Route bleibt, solange der Kalender offen ist: nur Schnellfilter samt „Disc ausblenden". */
export function kalenderBasis(f: FilterState): FilterState {
  return {
    ...EMPTY_FILTERS,
    confirmedOnly: f.confirmedOnly,
    favoritesOnly: f.favoritesOnly,
    availableOnly: f.availableOnly,
    kostenlosOnly: f.kostenlosOnly,
    favoritesExcluded: f.favoritesExcluded,
    kostenlosExcluded: f.kostenlosExcluded,
    confirmedExcluded: f.confirmedExcluded,
    availableExcluded: f.availableExcluded,
    zweitanbieterExcluded: f.zweitanbieterExcluded,
    excluded: { ...emptyLists(), releaseTypes: f.excluded.releaseTypes.filter((a) => a === 'disc') },
  }
}

/** Die wirksamen Kalenderfilter: Schnellfilter aus der Route, alles andere aus dem eigenen Speicher; nie eine Suche. */
export function kalenderFilter(basis: FilterState, eigen: FilterState): FilterState {
  const disc = basis.excluded.releaseTypes.includes('disc')
  const ohneDisc = eigen.excluded.releaseTypes.filter((a) => a !== 'disc')
  const listen = Object.fromEntries(LIST_KEYS.map((k) => [k, eigen[k]]))
  return {
    ...basis,
    ...listen,
    excluded: { ...eigen.excluded, releaseTypes: disc ? [...ohneDisc, 'disc'] : ohneDisc },
    minConfidence: eigen.minConfidence,
    minScore: eigen.minScore,
    ohneWertungAus: eigen.ohneWertungAus,
    modus: eigen.modus,
    search: '',
  }
}

/** Die Schnellfilter des Kalenders: im Kalender die der Route, sonst die zuletzt dort gesehenen (`letzte`), beim Start die Vorlieben im Browser. */
export function kalenderGrundlage(route: Pick<AppRoute, 'view' | 'filters'>, letzte: FilterState | undefined): FilterState {
  if (route.view === 'woche' || route.view === 'monat') return route.filters
  return letzte ?? filterAusVorlieben('kalender')
}

/** Der Speicher dazu für `App.tsx`: die wirksamen Filter und ein `navigate`, das Filteränderungen des Kalenders hier ablegt. */
export function useKalenderFilter(route: AppRoute, navigate: (next: Partial<AppRoute>) => void) {
  const [eigen, setEigen] = useState<FilterState>(EMPTY_FILTERS)
  /*
    Die Schnellfilter des Kalenders kommen nur aus seinem eigenen Speicher: im Kalender aus der Route, sonst die zuletzt dort
    gesehenen (Start: Vorlieben im Browser). Die Route der Datenbank trägt deren Filter — ein Chip dort darf das Push-Abo nicht umstellen.
  */
  const letzte = useRef<FilterState | undefined>(undefined)
  const basis = kalenderGrundlage(route, letzte.current)
  letzte.current = basis
  const filters = useMemo(() => kalenderFilter(basis, eigen), [basis, eigen])
  const kalenderNavigate = (next: Partial<AppRoute>) => {
    if (next.filters) setEigen(next.filters)
    navigate(next)
  }
  return { filters, kalenderNavigate }
}
