import { useLayoutEffect, useRef } from 'react'

/** Die Schließfunktion des gerade offenen Tooltips; neue Blase schließt die alte (Daniel, 11.10.2026: „Bei ani…“ und „Bei MyAnimeList…“ standen beide da). */
let offener: (() => void) | undefined

/**
 * Gemeinsamer Zustand aller `Tooltip`s: Es steht höchstens eine Blase, und sie schließt, wenn das Fenster den Fokus
 * verliert oder der Tab verschwindet. Ohne das blieb sie nach dem Sprung in einen neuen Tab stehen (11.10.2026):
 * Die Rückkehr gab dem Link den Fokus zurück, und `onFocus` öffnete die Blase wieder, obwohl niemand darauf zeigte.
 */
export function useEinzigeBlase(offen: boolean, schliessen: () => void) {
  const aktuell = useRef(schliessen)
  useLayoutEffect(() => {
    aktuell.current = schliessen
  })
  useLayoutEffect(() => {
    if (!offen) return
    const zu = () => aktuell.current()
    if (offener && offener !== zu) offener()
    offener = zu
    const beiVisibility = () => document.visibilityState === 'hidden' && zu()
    /* Escape schließt die Blase (WCAG 1.4.13), ohne dass der Fokus wandert. */
    const beiTaste = (e: KeyboardEvent) => e.key === 'Escape' && zu()
    window.addEventListener('blur', zu)
    document.addEventListener('visibilitychange', beiVisibility)
    document.addEventListener('keydown', beiTaste)
    return () => {
      if (offener === zu) offener = undefined
      document.removeEventListener('keydown', beiTaste)
      window.removeEventListener('blur', zu)
      document.removeEventListener('visibilitychange', beiVisibility)
    }
  }, [offen])
}

/** Fokus öffnet nur bei Tastatur (`:focus-visible`): Der Klickfokus auf einen Link und die Rückgabe des Fokus bei der Rückkehr in den Tab sind kein Anlass. */
export function fokusZeigtBlase(el: EventTarget): boolean {
  return el instanceof Element && el.matches(':focus-visible')
}
