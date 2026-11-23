import { useEffect, useRef, type KeyboardEvent } from 'react'
import { reiterBeschriftung, STAFFELN, type Staffel } from './staffel-abschnitt-daten.ts'
import { useGewaehlteStaffel, waehleStaffel } from './staffel-abschnitt-zustand.ts'

/** Farbe und Rand eines Reiters: laufend = Akzent gefüllt, gewählt = kräftiger Rand (nie Orange, das gehört der laufenden), angekündigt = gestrichelt, sonst ruhig. */
function reiterKlassen(s: Staffel, gewaehlt: boolean): string {
  const basis = 'relative grid min-h-11 min-w-11 shrink-0 snap-center cursor-pointer place-items-center rounded-xl border px-2 text-t3 font-semibold tabular-nums'
  if (s.status === 'laeuft') {
    return `${basis} border-ak-akzent bg-ak-akzent font-bold text-ak-auf-akzent ${gewaehlt ? 'ring-2 ring-ak-text ring-offset-2 ring-offset-ak-grund' : ''}`
  }
  const ruhe = s.status === 'angekuendigt' ? 'border-dashed border-ak-rand text-ak-leise' : 'border-ak-rand bg-ak-flaeche text-ak-text'
  return `${basis} ${gewaehlt ? 'border-2 border-ak-text bg-ak-flaeche-2 font-bold text-ak-text' : ruhe}`
}

/** Den gewählten Reiter in die Mitte der Leiste rollen (beim Öffnen: die laufende Staffel). */
function zeigeGewaehlten(leiste: HTMLElement | null, nr: number): void {
  const reiter = leiste?.querySelector<HTMLElement>(`[data-staffel="${nr}"]`)
  if (!leiste || !reiter) return
  leiste.scrollLeft = reiter.offsetLeft - (leiste.clientWidth - reiter.offsetWidth) / 2
}

/** Pfeiltasten springen zum Nachbarn, wie bei Reitern üblich. */
function beiTaste(e: KeyboardEvent, nr: number): void {
  const schritt = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
  const ziel = nr + schritt
  if (!schritt || ziel < 1 || ziel > STAFFELN.length) return
  e.preventDefault()
  waehleStaffel(ziel)
  document.querySelector<HTMLElement>(`[data-staffel="${ziel}"]`)?.focus()
}

/**
 * Die Reiterleiste über der Staffelbox: links „Staffeln“, daneben je Staffel ein Reiter mit nur der Nummer.
 * Wischt nativ (overflow-x, scroll-snap); die Ränder laufen weich aus und zeigen, dass es weitergeht.
 */
export function StaffelReiter() {
  const gewaehlt = useGewaehlteStaffel()
  const leiste = useRef<HTMLDivElement>(null)
  useEffect(() => zeigeGewaehlten(leiste.current, gewaehlt), [gewaehlt])
  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 text-t3 font-bold text-ak-text">Staffeln</span>
      <div
        ref={leiste}
        role="tablist"
        aria-label="Staffeln"
        className="flex min-w-0 flex-1 snap-x snap-proximity gap-1.5 overflow-x-auto px-7 py-2 [mask-image:linear-gradient(to_right,transparent,#000_28px,#000_calc(100%-28px),transparent)] [scrollbar-width:none] pointer-fine:[scrollbar-width:thin] [&::-webkit-scrollbar]:hidden"
      >
        {STAFFELN.map((s) => (
          <button
            key={s.nr}
            type="button"
            role="tab"
            data-staffel={s.nr}
            aria-selected={s.nr === gewaehlt}
            aria-label={reiterBeschriftung(s)}
            tabIndex={s.nr === gewaehlt ? 0 : -1}
            onClick={() => waehleStaffel(s.nr)}
            onKeyDown={(e) => beiTaste(e, s.nr)}
            className={reiterKlassen(s, s.nr === gewaehlt)}
          >
            {s.nr}
            {s.status === 'laeuft' && <span aria-hidden="true" className="absolute top-1 right-1 size-1.5 rounded-full bg-ak-auf-akzent" />}
          </button>
        ))}
      </div>
    </div>
  )
}
