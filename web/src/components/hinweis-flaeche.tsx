import { useCallback, useEffect, useId, useRef, useState, type MouseEvent, type TouchEvent } from 'react'
import { TooltipBlase, useBlasenPosition } from './tooltip-blase.tsx'
import { useEinzigeBlase } from './tooltip-einzeln.ts'

/**
 * Hinweise für lange Listen: **ein** Zustand und **eine** Blase für die ganze Fläche statt eines `Tooltip` je Zeile
 * (Patchnotes: über 500 Einträge mit je einem Symbol). Die Zeile trägt nur `data-hinweis="Text"`; die Blase
 * entsteht erst beim Zeigen oder Antippen und ist dieselbe wie beim `Tooltip` (`tooltip-blase.tsx`).
 * Nur für Anker, die weder Knopf noch Link sind und deren Aussage im Text schon steht (z. B. `sr-only`).
 */
export function useFlaechenHinweis() {
  const [stand, setStand] = useState<{ text: string; el: HTMLElement }>()
  const anker = useRef<HTMLSpanElement | null>(null)
  const blase = useRef<HTMLSpanElement>(null)
  const perTouch = useRef(false)
  const zuTimer = useRef<number>(undefined)
  const blasenId = useId()
  const zu = useCallback(() => setStand(undefined), [])
  useEinzigeBlase(Boolean(stand), zu)
  const pos = useBlasenPosition(Boolean(stand), 'unten', anker, blase)

  useEffect(() => {
    if (!stand) return
    const draussen = (e: Event) => !stand.el.contains(e.target as Node) && zu()
    document.addEventListener('pointerdown', draussen, true)
    return () => document.removeEventListener('pointerdown', draussen, true)
  }, [stand, zu])

  const zeige = (e: MouseEvent | TouchEvent) => {
    const el = (e.target as Element).closest<HTMLElement>('[data-hinweis]')
    if (!el || !e.currentTarget.contains(el)) return false
    anker.current = el
    setStand({ text: el.dataset.hinweis ?? '', el })
    return true
  }
  const handler = {
    onMouseOver: (e: MouseEvent) => !perTouch.current && zeige(e),
    onMouseOut: (e: MouseEvent) => {
      if (perTouch.current || !stand || stand.el.contains(e.relatedTarget as Node | null)) return
      zu()
    },
    /* Auf dem Handy gibt es kein Überfahren: Antippen zeigt die Blase drei Sekunden, wie beim `Tooltip`. */
    onTouchStart: (e: TouchEvent) => {
      perTouch.current = true
      window.setTimeout(() => (perTouch.current = false), 1000)
      if (!zeige(e)) return
      window.clearTimeout(zuTimer.current)
      zuTimer.current = window.setTimeout(zu, 3000)
    },
  }
  const blaseKnoten = stand?.text ? <TooltipBlase blase={blase} blasenId={blasenId} pos={pos} text={stand.text} /> : null
  return { handler, blase: blaseKnoten }
}
