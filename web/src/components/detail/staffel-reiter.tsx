import { useEffect, useRef, type KeyboardEvent } from 'react'
import type { StaffelLage } from '@shared/logic.ts'
import type { Reiter } from './staffel-reiter-liste.ts'
import { ReiterPfeil, rolleUm, usePfeilLage } from './staffel-pfeile.tsx'

/** Farbe der Abschnittsbox; der gewählte Reiter trägt sie auch und geht so ohne Kante in die Box über. */
export const ABSCHNITT_FARBE = 'border-ak-rand bg-ak-flaeche'

/** Hülle und Leiste der Reiterzeile; die Reihen-Reiter am Antwortkasten (`reihen-reiter.tsx`) teilen sie. */
export const LEISTE_HUELLE = 'relative z-10 -mb-px px-4'
export const LEISTE = 'flex snap-x snap-proximity items-end gap-1 overflow-x-auto pb-px [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'

/** Klassen eines Reiters; der gewählte trägt die Farbe seiner Box (`farbe`). */
export function reiterKlassen(gewaehlt: boolean, farbe = ABSCHNITT_FARBE): string {
  const basis = 'relative grid shrink-0 cursor-pointer snap-center place-items-center rounded-t-xl border border-b-0 px-3 text-t3 tabular-nums'
  if (gewaehlt) return `${basis} z-10 -mb-px min-h-[3.25rem] min-w-12 pb-px font-bold text-ak-text ${farbe}`
  return `${basis} min-h-11 min-w-11 border-ak-rand bg-ak-flaeche-2 font-semibold text-ak-leise`
}

/** Strich oben am gewählten Reiter. */
export function Akzentstrich() {
  return <span aria-hidden="true" className="absolute inset-x-3 top-0 h-[3px] rounded-b-full bg-ak-akzent" />
}

/** Marke oben rechts, unabhängig von der Wahl: gefüllter Punkt = läuft, Ring = kommt noch. */
export function LageMarke({ lage }: { lage: StaffelLage }) {
  if (lage === 'ruht') return null
  return <span aria-hidden="true" data-lage={lage} className={`absolute top-1.5 right-1.5 size-2 rounded-full ${lage === 'laeuft' ? 'bg-ak-akzent-text' : 'border-[1.5px] border-ak-akzent-text'}`} />
}

/** Den gewählten Reiter in die Mitte der Zeile rollen; beide kommen als Ref, ohne DOM-Abfrage im Effekt. */
export function zeigeGewaehlten(zeile: HTMLElement | null, reiter: HTMLElement | null): void {
  if (!zeile || !reiter) return
  zeile.scrollLeft = reiter.offsetLeft - (zeile.clientWidth - reiter.offsetWidth) / 2
}

export const LAGE_WORT: Record<StaffelLage, string> = { laeuft: ', läuft', kommt: ', kommt', ruht: '' }

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
    <div className={LEISTE_HUELLE}>
      <div ref={zeile} role="tablist" aria-label="Staffeln" data-staffel-reiter onKeyDown={taste} className={LEISTE}>
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
              aria-label={`Staffel ${r.label}${LAGE_WORT[r.lage]}`}
              onClick={() => beiWahl(i)}
              className={reiterKlassen(gewaehlt)}
            >
              {gewaehlt && <Akzentstrich />}
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
