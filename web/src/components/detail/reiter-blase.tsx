import { useId, useRef, useState, type FocusEvent, type MouseEvent, type RefObject } from 'react'
import { TooltipBlase, useBlasenPosition } from '../tooltip-blase.tsx'
import { fokusZeigtBlase, mausZeigtBlase, useEinzigeBlase } from '../tooltip-einzeln.ts'

/** So lange steht die Blase nach einem Fingertipp, wie beim `Tooltip` (19.09.2026). */
const TIPP_DAUER = 3000

/** Die Blase des offenen Reiters; `key` je Reiter misst sie bei jedem Wechsel neu. */
function ReiterBlasenInhalt({ anker, id, text }: { anker: RefObject<HTMLElement | null>; id: string; text: string }) {
  const blase = useRef<HTMLSpanElement>(null)
  const pos = useBlasenPosition(true, 'oben', anker, blase)
  return <TooltipBlase blase={blase} blasenId={id} pos={pos} mitSpitze={false} text={text} />
}

/**
 * Eine Blase je Reiterleiste statt eines `title` je Reiter (Daniel, 26.11.2026): Der Text entsteht erst für den offenen Reiter
 * (`text(schluessel)`), kein Reiter trägt vorab etwas. Zeigen und Tastaturfokus öffnen; ein Fingertipp öffnet erst nach dem Klick,
 * damit iOS den Tipp nicht für das Aufklappen verbraucht (Heute-Knopf, 09.10.2026), und schließt nach `TIPP_DAUER`.
 */
export function useReiterBlase(text: (schluessel: number) => string) {
  const [offen, setOffen] = useState<number>()
  const anker = useRef<HTMLElement | null>(null)
  const perTouch = useRef(false)
  const zuTimer = useRef<number>(undefined)
  const blasenId = useId()
  const zu = () => {
    window.clearTimeout(zuTimer.current)
    setOffen(undefined)
  }
  useEinzigeBlase(offen !== undefined, zu)
  const auf = (schluessel: number, el: HTMLElement) => {
    anker.current = el
    setOffen(schluessel)
  }
  const inhalt = offen === undefined ? '' : text(offen)
  const an = (schluessel: number) => ({
    'aria-describedby': offen === schluessel ? blasenId : undefined,
    onMouseEnter: (e: MouseEvent<HTMLElement>) => !perTouch.current && mausZeigtBlase() && auf(schluessel, e.currentTarget),
    /* Nach einem Fingertipp schickt der Browser ein nachgemachtes `mouseout`, sobald das Panel neu steht: das schließt nicht, die Frist tut es. */
    onMouseLeave: () => !perTouch.current && zu(),
    onFocus: (e: FocusEvent<HTMLElement>) => fokusZeigtBlase(e.currentTarget) && auf(schluessel, e.currentTarget),
    onBlur: zu,
    onTouchStart: () => void (perTouch.current = true),
    /* Erst im Klick, nicht beim Berühren: nur ein Fingertipp öffnet hier, die Maus hat beim Zeigen geöffnet. */
    onClickCapture: (e: MouseEvent<HTMLElement>) => {
      if (!perTouch.current) return
      auf(schluessel, e.currentTarget)
      window.clearTimeout(zuTimer.current)
      zuTimer.current = window.setTimeout(() => setOffen(undefined), TIPP_DAUER)
    },
  })
  const blase = inhalt ? <ReiterBlasenInhalt key={offen} anker={anker} id={blasenId} text={inhalt} /> : null
  return { an, blase }
}
