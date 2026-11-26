import { useLayoutEffect, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { sichtbareBreite } from '../lib/sichtbare-breite.ts'

/**
 * Position der Blase im Fenster aus den gemessenen Rechtecken von Anker `a` und Blase `b`:
 * waagrecht mittig über dem Anker, aber nie über den Fensterrand hinaus; senkrecht bevorzugt auf
 * der gewünschten Seite — und **immer im Bild** (Daniel, 29.09.2026:
 * „wird außerhalb des sichtbaren bereichs weiter unten angezeigt … das ist ein bug").
 */
export function berechneBlasenPosition(a: DOMRect, b: DOMRect, seite: 'oben' | 'unten') {
  const rand = 8
  const luft = 6
  const left = Math.min(
    Math.max(a.left + a.width / 2 - b.width / 2, rand),
    Math.max(rand, sichtbareBreite() - b.width - rand),
  )
  const oben = a.top - b.height - luft
  const unten = a.bottom + luft
  const platzUnten = window.innerHeight - rand - unten >= b.height
  const platzOben = oben >= rand
  const gewuenscht = seite === 'oben' ? (platzOben ? oben : unten) : platzUnten ? unten : oben
  const top = Math.min(Math.max(gewuenscht, rand), Math.max(rand, window.innerHeight - b.height - rand))
  return { left, top }
}

/**
 * Position im Fenster, einmal je Öffnen gemessen.
 *
 * `undefined` heißt „noch nicht gemessen" — dann steht die Blase außerhalb
 * des Bildes und wird nur ausgemessen. Ohne diesen Zwischenschritt kennt
 * niemand ihre Breite, und ohne Breite lässt sie sich weder zentrieren noch
 * am Rand festhalten.
 *
 * `useLayoutEffect`, damit die Position vor dem ersten Bild sitzt — mit
 * `useEffect` blitzte die Blase eine Bildwiederholung lang an der falschen
 * Stelle auf.
 */
export function useBlasenPosition(
  offen: boolean,
  seite: 'oben' | 'unten',
  anker: RefObject<HTMLElement | null>,
  blase: RefObject<HTMLSpanElement | null>,
) {
  const [pos, setPos] = useState<{ left: number; top: number }>()
  useLayoutEffect(() => {
    if (!offen) {
      setPos(undefined)
      return
    }
    const a = anker.current?.getBoundingClientRect()
    const b = blase.current?.getBoundingClientRect()
    if (!a || !b) return
    setPos(berechneBlasenPosition(a, b, seite))
  }, [offen, seite, anker, blase])
  return pos
}

interface TooltipBlaseProps {
  blase: RefObject<HTMLSpanElement | null>
  blasenId: string
  pos: { left: number; top: number } | undefined
  mitSpitze?: boolean
  text: ReactNode
}

/** Die Blase selbst, im `body` verankert (`position: fixed`). */
export function TooltipBlase({ blase, blasenId, pos, mitSpitze, text }: TooltipBlaseProps) {
  return createPortal(
    <span
      ref={blase}
      id={blasenId}
      role="tooltip"
      style={
        pos
          ? { left: pos.left, top: pos.top }
          : // Ungemessen: außerhalb des Bildes, damit niemand sie aufblitzen
            // sieht. `position: fixed` erzeugt dabei keinen Überlauf.
            { left: -9999, top: 0 }
      }
      className={[
        'pointer-events-none fixed z-[200] w-max max-w-[min(20rem,80vw)]',
        /* `whitespace-pre-line`: Mehrzeilige Hinweise (Anbieter-Pille) brauchen es, einzeilige
           ändert es nicht — React würde `\n` sonst als Leerzeichen rendern (23.09.2026). */
        'whitespace-pre-line rounded-lg px-2.5 py-1.5 text-left text-[11px] leading-snug',
        'bg-slate-900 text-slate-100 shadow-xl ring-1 ring-white/15',
        'dark:bg-slate-800 dark:ring-white/10',
        /* Nase nach oben — **ohne `relative`**: das überschreibt `fixed` (29.09.2026). */
        mitSpitze ? 'before:absolute before:-top-1 before:left-1/2 before:-translate-x-1/2 before:border-x-4 before:border-b-4 before:border-x-transparent before:border-b-slate-900 dark:before:border-b-slate-800' : '',
        pos ? 'animate-[hinweisEin_.15s_ease-out]' : '',
      ].join(' ')}
    >
      {text}
    </span>,
    document.body,
  )
}
