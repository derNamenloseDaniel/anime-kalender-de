import { useContext } from 'react'
import { EMPTY_FILTERS, type FilterState } from '../../lib/filters.ts'
import { useLang } from '../../lib/i18n.tsx'
import { SucheLeerenContext } from '../../lib/suche-leeren-kontext.ts'
import { useEintraege } from '../kalender/AktiveFilter.tsx'
import { KreuzZeichen } from '../kalender/Zeichen.tsx'
import { PILLE_JA, PILLE_NEIN } from './pille-zustand.ts'

/**
 * Die gesetzten Filter der Datenbank als entfernbare Chips unter der Leiste (Filterkonzept S5, 23.11.2026): am Handy eine Zeile zum
 * seitlich Scrollen, am Rechner umbrechend im Listenkopf. Wer einen Filter dauerhaft gemerkt hat, sieht ihn hier, auch bei geschlossenem Fenster.
 * Der Knopf ist 44 px hoch, die sichtbare Pille darin 32 px (die Bühne misst die Elementbox).
 */
export function AktiveChips({ filters, onChange }: { filters: FilterState; onChange: (next: FilterState) => void }) {
  const { t } = useLang()
  const eintraege = useEintraege(filters, onChange, undefined, undefined, useContext(SucheLeerenContext))
  if (!eintraege.length) return null
  return (
    <ul role="list" aria-label={t('filter.aktiv')} className="-mx-4 flex list-none items-center gap-x-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
      {eintraege.map((e) => {
        const name = e.label.replace(/^⊘ /, '')
        return (
          <li key={e.label} className="shrink-0">
            <button
              type="button"
              onClick={e.weg}
              aria-label={e.aus ? t('filter.entfernenAus', { name }) : t('filter.entfernen', { name })}
              className="inline-flex h-11 cursor-pointer items-center text-[13px] whitespace-nowrap"
            >
              <span className={`inline-flex h-8 items-center gap-1.5 rounded-full border pr-2.5 pl-3 ${e.aus ? PILLE_NEIN : PILLE_JA}`}>
                {e.label}
                <KreuzZeichen groesse={14} />
              </span>
            </button>
          </li>
        )
      })}
      <li className="shrink-0">
        <button
          type="button"
          onClick={() => onChange({ ...EMPTY_FILTERS })}
          className="h-11 cursor-pointer text-[13px] font-semibold whitespace-nowrap text-ak-leise underline"
        >
          {t('filter.alleZuruecksetzen')}
        </button>
      </li>
    </ul>
  )
}
