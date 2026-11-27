import type { ReactNode } from 'react'
import { useLang } from '../../lib/i18n.tsx'

/** Fuß des Fensters: Zurücksetzen und Fertig; `treffer` ist ein optionaler Satz davor. */
export function FilterFuss({ treffer, zuruecksetzen, fertig }: { treffer?: ReactNode; zuruecksetzen: () => void; fertig: () => void }) {
  const { t } = useLang()
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-3 border-t border-ak-linie bg-ak-flaeche px-4 py-3">
      {treffer && <span className="text-sm text-ak-leise">{treffer}</span>}
      <button type="button" onClick={zuruecksetzen} className="ml-auto h-11 cursor-pointer rounded-full border border-ak-rand px-4 text-sm font-bold text-ak-text hover:bg-ak-flaeche-2">
        {t('filter.alleZuruecksetzen')}
      </button>
      <button type="button" onClick={fertig} className="h-11 cursor-pointer rounded-full bg-ak-akzent px-5 text-sm font-extrabold text-ak-auf-akzent hover:bg-ak-akzent-hover">
        {t('filter.fertig')}
      </button>
    </div>
  )
}
