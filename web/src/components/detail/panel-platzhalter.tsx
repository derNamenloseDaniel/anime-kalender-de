import { useRef } from 'react'
import type { FranchiseMember } from '@shared/types.ts'
import { coverBild } from '../../lib/cover.ts'
import type { Translate } from '../../lib/i18n.tsx'
import { useReihenmitglied } from './panel-laden.ts'
import { ReihenReiterZeile } from './reihen-reiter.tsx'
import type { ReihenReiter } from './reihen-reiter-liste.ts'

const BLOCK = 'animate-pulse motion-reduce:animate-none rounded-xl bg-ak-flaeche-2'

/** Merkt die Reiter des gezeigten Titels (`merke`); wechselt der Klick auf einen noch ungeladenen Teil, bleiben sie im Platzhalter stehen. */
export function usePanelPlatzhalter(titleId: number, t: Translate, wechsleZu: (id: number) => void) {
  const letzteReiter = useRef<ReihenReiter[]>([])
  const mitglied = useReihenmitglied(titleId)
  const merke = (reiter: ReihenReiter[]) => (letzteReiter.current = reiter)
  const element = <PanelPlatzhalter titleId={titleId} reiter={letzteReiter.current} mitglied={mitglied} t={t} wechsleZu={wechsleZu} />
  return { merke, element }
}

/**
 * Das Panel, solange der Titelbestand für den gewählten Teil noch lädt: Reiter (aktiver markiert), Cover und Name aus der
 * Reihe, dazu Platzhalter in Endgröße für Antwortkasten, Handlung und Termine — damit der Klick sofort umschaltet, ohne Sprung.
 */
export function PanelPlatzhalter({ titleId, reiter, mitglied, t, wechsleZu }: {
  titleId: number
  /** Die Reiter des zuletzt gezeigten Titels; gelten nur, wenn der gewählte Teil unter ihnen ist. */
  reiter: ReihenReiter[]
  mitglied: FranchiseMember | undefined
  t: Translate
  wechsleZu: (id: number) => void
}) {
  const eigener = reiter.find((r) => r.id === titleId)
  const name = eigener?.name ?? mitglied?.name
  const bild = coverBild(mitglied?.cover, 120, '120px')
  return (
    <div role="status" aria-label={t('detail.seasonLoading')} data-panel-platzhalter>
      <div className="flex gap-3 pb-4">
        {bild.src ? (
          <img {...bild} width={120} height={180} alt="" decoding="async" className="h-[180px] w-[120px] shrink-0 rounded-xl object-cover" />
        ) : (
          <div aria-hidden="true" className={`${BLOCK} h-[180px] w-[120px] shrink-0`} />
        )}
        {name ? <h2 className="text-t2 font-semibold text-ak-text">{name}</h2> : <div aria-hidden="true" className={`${BLOCK} h-6 w-2/3`} />}
      </div>
      {eigener && (
        <div>
          <ReihenReiterZeile reiter={reiter} aktiv={titleId} lagen={new Map()} farbe="border-ak-rand bg-ak-flaeche-2" kennung={`reihe-${titleId}`} beiWahl={wechsleZu} />
        </div>
      )}
      <div aria-hidden="true" className="flex flex-col gap-3 pt-4">
        <div className={`${BLOCK} h-36`} />
        <div className={`${BLOCK} h-24`} />
        <div className={`${BLOCK} h-40`} />
      </div>
    </div>
  )
}
