import type { Dispatch, SetStateAction } from 'react'
import type { Translate } from '../../lib/i18n.tsx'
import type { plotVon } from './plot.ts'
import { type Synopsis } from '../../lib/data.ts'
import { LIZENZ_SEITEN } from '@shared/lizenzen.ts'

const linkKlasse = '-my-3 inline-flex min-h-11 items-center underline decoration-slate-400/50 underline-offset-2 hover:text-ak-text'

/** Quellenzeile eines eigenen Textes: alle Quellen, die Lizenz des Textes — Wikipedia verlangt beides (CC BY-SA). */
export function EigeneQuellenZeile({ eigen, t }: { eigen: NonNullable<Synopsis['eigen']>; t: Translate }) {
  const lizenzSeite = LIZENZ_SEITEN[eigen.lizenz]
  return (
    <span className="flex flex-wrap justify-end gap-x-1 gap-y-3 text-right text-t4 text-slate-600 dark:text-slate-400">
      {t('detail.plotEigen')}{' '}
      {eigen.quellen.map((q, i) => (
        <span key={q.url}>
          {i > 0 && ' · '}
          <a href={q.url} target="_blank" rel="noopener noreferrer" className={linkKlasse}>
            {q.name} ↗
          </a>
        </span>
      ))}
      {' · '}
      {lizenzSeite ? (
        <a href={lizenzSeite} target="_blank" rel="noopener noreferrer" className={linkKlasse}>
          {eigen.lizenz} ↗
        </a>
      ) : (
        eigen.lizenz
      )}
    </span>
  )
}

/** Anbietername wie auf der Quelle selbst: aus der Adresse („anisearch.de") wird „aniSearch". */
const quelleLabel = (name: string): string => (name === 'anisearch.de' ? 'aniSearch' : name === 'anilist.co' ? 'AniList' : name === 'themoviedb.org' ? 'TMDB' : name)

/** Fuß der Karte „Handlung“: links der Aufklapper, rechts die Quelle (sie steht immer sichtbar, auch eingeklappt). */
export function HandlungFuss({ plot, aufklappbar, t, plotOffen, setPlotOffen }: {
  plot: NonNullable<ReturnType<typeof plotVon>['plot']>
  aufklappbar: boolean
  t: Translate
  plotOffen: boolean
  setPlotOffen: Dispatch<SetStateAction<boolean>>
}) {
  return (
    <div className="mt-2 flex items-center justify-between gap-2">
      {aufklappbar ? (
        <button
          type="button"
          onClick={() => setPlotOffen((v) => !v)}
          aria-expanded={plotOffen}
          className="min-h-11 cursor-pointer rounded-full border border-ak-rand bg-ak-flaeche-2 px-4 text-t3 font-semibold text-ak-text transition hover:border-ak-leise"
        >
          {t(plotOffen ? 'detail.plotLess' : 'detail.plotMore')}
        </button>
      ) : (
        <span />
      )}
      {plot.eigen ? (
        <EigeneQuellenZeile eigen={plot.eigen} t={t} />
      ) : plot.quelle ? (
        <span className="text-t4 text-slate-600 dark:text-slate-400">
          {t('detail.plotQuelle')}{' '}
          <a href={plot.quelle.url} target="_blank" rel="noopener noreferrer" className={linkKlasse}>
            {quelleLabel(plot.quelle.name)} ↗
          </a>
        </span>
      ) : null}
    </div>
  )
}

/** Hinweis über dem Text, wenn er nur die Reihe beschreibt — sonst läse man ihn als Handlung dieser Staffel. */
export function ReiheHinweis({ t }: { t: Translate }) {
  return <p className="mb-1 text-t4 text-ak-warnung-text">{t('detail.plotReihe')}</p>
}
