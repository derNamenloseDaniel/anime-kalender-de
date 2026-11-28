import { useId, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { Translate } from '../../lib/i18n.tsx'
import type { plotVon } from './plot.ts'
import { LIZENZ_SEITEN } from '@shared/lizenzen.ts'

const linkKlasse = '-my-3 inline-flex min-h-11 items-center underline decoration-slate-400/50 underline-offset-2 hover:text-ak-text'
const knopfKlasse = '-my-3 inline-flex min-h-11 cursor-pointer items-center underline decoration-slate-400/50 underline-offset-2 hover:text-ak-text'

type Plot = NonNullable<ReturnType<typeof plotVon>['plot']>

/** Anbietername wie auf der Quelle selbst: aus der Adresse („anisearch.de") wird „aniSearch". */
const quelleLabel = (name: string): string => (name === 'anisearch.de' ? 'aniSearch' : name === 'anilist.co' ? 'AniList' : name === 'themoviedb.org' ? 'TMDB' : name)

/** Stammt der angezeigte Text von uns? Der Satz (solange er steht) und jeder eigene Text ja, ein übernommener Volltext nein. */
export const textIstUnser = (plot: Pick<Plot, 'eigen' | 'satz'>, satzSichtbar: boolean): boolean => Boolean(plot.eigen) || (Boolean(plot.satz?.trim()) && satzSichtbar)

/** Quellen und Lizenz hinter „anime-kalender.de“: Wikipedia verlangt Namensnennung und Lizenz (CC BY-SA); nichts davon steht auf dem ersten Blick. */
function QuellenListe({ plot, t }: { plot: Plot; t: Translate }) {
  const quellen = plot.eigen?.quellen ?? (plot.quelle ? [{ name: quelleLabel(plot.quelle.name), url: plot.quelle.url }] : [])
  const lizenz = plot.eigen?.lizenz
  const lizenzSeite = lizenz ? LIZENZ_SEITEN[lizenz] : undefined
  if (quellen.length === 0) return null
  return (
    <p className="mt-1 flex flex-wrap gap-x-1 gap-y-3">
      {t('detail.plotBasis')}
      {quellen.map((q, i) => (
        <span key={q.url}>
          {i > 0 && ' · '}
          <a href={q.url} target="_blank" rel="noopener noreferrer" className={linkKlasse}>
            {q.name} ↗
          </a>
        </span>
      ))}
      {lizenz && ' · '}
      {lizenzSeite ? (
        <a href={lizenzSeite} target="_blank" rel="noopener noreferrer" className={linkKlasse}>
          {lizenz} ↗
        </a>
      ) : (
        lizenz
      )}
    </p>
  )
}

/**
 * Fuß der Karte „Handlung“: links der Aufklapper, rechts **genau eine** Quelle (sie steht immer sichtbar, auch eingeklappt).
 * Bei unserem Text heißt sie „anime-kalender.de“; ein Tipp öffnet darunter die Erklärung samt Quellen und Lizenz (Tooltips gehen am Handy nach drei Sekunden zu).
 */
export function HandlungFuss({ plot, aufklappbar, unser, t, plotOffen, setPlotOffen }: {
  plot: Plot
  aufklappbar: boolean
  unser: boolean
  t: Translate
  plotOffen: boolean
  setPlotOffen: Dispatch<SetStateAction<boolean>>
}) {
  const [hinweisOffen, setHinweisOffen] = useState(false)
  const hinweisId = useId()
  return (
    <>
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
        {unser ? (
          <span className="text-t4 text-slate-600 dark:text-slate-400">
            {t('detail.plotQuelle')}{' '}
            <button type="button" onClick={() => setHinweisOffen((v) => !v)} aria-expanded={hinweisOffen} aria-controls={hinweisId} className={knopfKlasse}>
              anime-kalender.de ⓘ
            </button>
          </span>
        ) : plot.quelle ? (
          <span className="text-t4 text-slate-600 dark:text-slate-400">
            {t('detail.plotQuelle')}{' '}
            <a href={plot.quelle.url} target="_blank" rel="noopener noreferrer" className={linkKlasse}>
              {quelleLabel(plot.quelle.name)} ↗
            </a>
          </span>
        ) : null}
      </div>
      {unser && hinweisOffen && (
        <div id={hinweisId} className="mt-2 rounded-xl border border-ak-rand bg-ak-flaeche-2 p-3 text-t4 text-ak-text/85">
          <p>{t('detail.plotUnserHinweis')}</p>
          <QuellenListe plot={plot} t={t} />
        </div>
      )}
    </>
  )
}

/** Hinweis über dem Text, wenn er nur die Reihe beschreibt — sonst läse man ihn als Handlung dieser Staffel. */
export function ReiheHinweis({ t }: { t: Translate }) {
  return <p className="mb-1 text-t4 text-ak-warnung-text">{t('detail.plotReihe')}</p>
}
