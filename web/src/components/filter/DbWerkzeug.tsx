import { useCallback, useRef, useState } from 'react'
import type { DataMeta } from '@shared/types.ts'
import { activeFilterCount, EMPTY_FILTERS, type FilterState } from '../../lib/filters.ts'
import type { DbSort } from '../../lib/router.ts'
import { DbSortWahl, DbZaehlzeile } from '../db-bedienung.tsx'
import { DbKopfzeile, DbSchalter } from '../db-kopfzeile.tsx'
import { SuchHinweis, useHinweisInhalt, type HinweisLoesen } from '../SuchHinweis.tsx'
import type { Suchhinweis } from '../../lib/suchhinweis.ts'
import { FilterDetailsFeld } from '../FilterDetails.tsx'
import { AktiveChips } from './AktiveChips.tsx'
import { useMobil } from '../../lib/use-mobil.ts'
import { useLang } from '../../lib/i18n.tsx'
import { FilterFuss } from './filter-abschnitte.tsx'
import { FilterZaehlungsrahmen, type ZaehlKern } from './FilterZaehlungsrahmen.tsx'
import { FilterPopover } from './FilterPopover.tsx'
import { FilterRund, Werkzeugleiste } from './Werkzeugleiste.tsx'

export interface DbKopfProps {
  meta: DataMeta
  filters: FilterState
  onFiltersChange: (next: FilterState) => void
  favoriteCount: number
  ergebnisse: number
  mitSynchro: number
  suche: string
  sort: DbSort
  onSortChange: (next: DbSort) => void
  ohneSynchro: boolean
  onOhneSynchroChange: (next: boolean) => void
  laedt: boolean
  grouped: boolean
  onGroupedChange: (next: boolean) => void
  /** Der Hinweis auf Treffer ohne deutsche Synchro (`lib/use-suchhinweis.ts`) und was sein Knopf auslöst. */
  hinweis?: Suchhinweis
  onHinweisLoesen: HinweisLoesen
  /** Der Kernbestand vor dem Filter und seine Releases — daraus die Zahlen an den Chips des Filterfensters. */
  kern?: ZaehlKern
}

/** Über dem Raster: am Rechner Schalter und Zählzeile mit Hinweis, am Handy die Werkzeugleiste mit Filterfenster und der Hinweis darunter. */
export function DbKopfbereich(p: DbKopfProps) {
  const mobil = useMobil()
  const hinweis = { hinweis: p.hinweis, filters: p.filters, ohneSynchro: p.ohneSynchro, onLoesen: p.onHinweisLoesen }
  const hinweisDa = useHinweisInhalt(hinweis) !== null
  /* Die Schalter und die gesetzten Filter stehen am Handy wie am Rechner über der Liste, nicht mehr im Filterfenster (S5, 23.11.2026). */
  const schalter = <DbSchalter ohneSynchro={p.ohneSynchro} onOhneSynchroChange={p.onOhneSynchroChange} laedt={p.laedt} grouped={p.grouped} onGroupedChange={p.onGroupedChange} />
  const chips = <AktiveChips filters={p.filters} onChange={p.onFiltersChange} />
  if (mobil) {
    return (
      <>
        <DbWerkzeug {...p} />
        {schalter}
        {chips}
        <SuchHinweis form="darunter" {...hinweis} />
      </>
    )
  }
  return (
    <>
      {schalter}
      <DbZaehlzeile ergebnisse={p.ergebnisse} mitSynchro={p.mitSynchro} suche={p.suche} sort={p.sort} onSortChange={p.onSortChange} hinweis={hinweisDa ? <SuchHinweis form="zeile" {...hinweis} /> : undefined} />
      {chips}
    </>
  )
}

function DbWerkzeug(p: DbKopfProps) {
  const { t } = useLang()
  const [offen, setOffen] = useState(false)
  const pille = useRef<HTMLButtonElement>(null)
  const zu = useCallback(() => setOffen(false), [])
  const anzahl = activeFilterCount(p.filters)
  return (
    <>
      <Werkzeugleiste>
        <FilterRund ref={pille} offen={offen} anzahl={anzahl} onClick={() => setOffen(!offen)} />
        <output aria-live="polite" className="min-w-0 flex-1 tabular-nums">
          <DbKopfzeile ergebnisse={p.ergebnisse} mitSynchro={p.mitSynchro} suche={p.suche} zweizeilig />
        </output>
        <DbSortWahl sort={p.sort} onChange={p.onSortChange} suche={!!p.suche.trim()} kompakt />
      </Werkzeugleiste>
      <FilterPopover offen={offen} schliessen={zu} ausloeser={pille} label={t('filter.button')}>
        <FilterZaehlungsrahmen kern={p.kern}>
          <FilterDetailsFeld meta={p.meta} filters={p.filters} onChange={p.onFiltersChange} showConfidence favoriteCount={p.favoriteCount} />
        </FilterZaehlungsrahmen>
        <FilterFuss zuruecksetzen={() => p.onFiltersChange({ ...EMPTY_FILTERS, search: p.filters.search })} fertig={zu} />
      </FilterPopover>
    </>
  )
}
