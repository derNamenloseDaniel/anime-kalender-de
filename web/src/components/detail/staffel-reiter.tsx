import { useEffect, useRef, type KeyboardEvent } from 'react'
import type { StaffelLage } from '@shared/logic.ts'
import type { Reiter } from './staffel-reiter-liste.ts'
import { ReiterPfeil, rolleUm, usePfeilLage } from './staffel-pfeile.tsx'

/** Farbe der Abschnittsbox; der gewählte Reiter trägt sie auch und geht so ohne Kante in die Box über. */
export const ABSCHNITT_FARBE = 'border-ak-rand bg-ak-flaeche'

function reiterKlassen(gewaehlt: boolean): string {
  const basis = 'relative grid shrink-0 cursor-pointer snap-center place-items-center rounded-t-xl border border-b-0 px-3 text-t3 tabular-nums'
  if (gewaehlt) return `${basis} z-10 -mb-px min-h-[3.25rem] min-w-12 pb-px font-bold text-ak-text ${ABSCHNITT_FARBE}`
  return `${basis} min-h-11 min-w-11 border-ak-rand bg-ak-flaeche-2 font-semibold text-ak-leise`
}

/** Marke oben rechts, unabhängig von der Wahl: gefüllter Punkt = läuft, Ring = kommt noch. */
function LageMarke({ lage }: { lage: StaffelLage }) {
  if (lage === 'ruht') return null
  return <span aria-hidden="true" data-lage={lage} className={`absolute top-1.5 right-1.5 size-2 rounded-full ${lage === 'laeuft' ? 'bg-ak-akzent-text' : 'border-[1.5px] border-ak-akzent-text'}`} />
}

/** Den gewählten Reiter in die Mitte der Zeile rollen; beide kommen als Ref, ohne DOM-Abfrage im Effekt. */
function zeigeGewaehlten(zeile: HTMLElement | null, reiter: HTMLElement | null): void {
  if (!zeile || !reiter) return
  zeile.scrollLeft = reiter.offsetLeft - (zeile.clientWidth - reiter.offsetWidth) / 2
}

const LAGE_WORT: Record<StaffelLage, string> = { laeuft: ', läuft', kommt: ', kommt', ruht: '' }

/** Pfeiltasten, Pos1 und Ende wählen den Nachbarn bzw. ersten/letzten Reiter (Muster „Tabs“ mit sofortiger Wahl). */
export function naechsterReiter(taste: string, aktiv: number, anzahl: number): number | undefined {
  if (taste === 'ArrowRight') return (aktiv + 1) % anzahl
  if (taste === 'ArrowLeft') return (aktiv - 1 + anzahl) % anzahl
  if (taste === 'Home') return 0
  if (taste === 'End') return anzahl - 1
  return undefined
}

/**
 * Je Staffel ein Reiter mit nur der Nummer, oben an der Abschnittsbox; wischt nativ ohne Scrollbalken, Pfeile nur in Richtung weiterer
 * Reiter. Ein Reiter wählt nur den Abschnitt, er wechselt nie den Titel. `kennung` macht die Ids je Titel eindeutig.
 */
export function ReiterZeile({ reiter, aktiv, kennung, beiWahl }: { reiter: Reiter[]; aktiv: number; kennung: string; beiWahl: (i: number) => void }) {
  const zeile = useRef<HTMLDivElement>(null)
  const gewaehlterReiter = useRef<HTMLButtonElement>(null)
  useEffect(() => zeigeGewaehlten(zeile.current, gewaehlterReiter.current), [aktiv])
  const lage = usePfeilLage(zeile, reiter.length)
  const taste = (e: KeyboardEvent<HTMLDivElement>) => {
    const ziel = naechsterReiter(e.key, aktiv, reiter.length)
    if (ziel === undefined) return
    e.preventDefault()
    beiWahl(ziel)
    zeile.current?.querySelectorAll<HTMLElement>('[role="tab"]')[ziel]?.focus()
  }
  return (
    <div className="relative z-10 -mb-px px-4">
      <div ref={zeile} role="tablist" aria-label="Staffeln" data-staffel-reiter onKeyDown={taste} className="flex snap-x snap-proximity items-end gap-1 overflow-x-auto pb-px [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {reiter.map((r, i) => {
          const gewaehlt = i === aktiv
          return (
            <button
              key={r.nr}
              ref={gewaehlt ? gewaehlterReiter : undefined}
              type="button"
              role="tab"
              id={`${kennung}-reiter-${r.nr}`}
              aria-selected={gewaehlt}
              aria-controls={`${kennung}-abschnitt`}
              tabIndex={gewaehlt ? 0 : -1}
              aria-label={`Staffel ${r.label}${r.name ? `: ${r.name}` : ''}${LAGE_WORT[r.lage]}`}
              onClick={() => beiWahl(i)}
              className={reiterKlassen(gewaehlt)}
            >
              {gewaehlt && <span aria-hidden="true" className="absolute inset-x-3 top-0 h-[3px] rounded-b-full bg-ak-akzent" />}
              {r.label}
              <LageMarke lage={r.lage} />
            </button>
          )
        })}
      </div>
      <ReiterPfeil richtung="links" weitere={lage.links} beiKlick={() => rolleUm(zeile.current, 'links')} />
      <ReiterPfeil richtung="rechts" weitere={lage.rechts} beiKlick={() => rolleUm(zeile.current, 'rechts')} />
    </div>
  )
}
