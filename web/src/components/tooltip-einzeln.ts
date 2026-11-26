import { useLayoutEffect, useRef } from 'react'
import { escapeVorKurzem, useEscape } from '../lib/escape'

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
    window.addEventListener('blur', zu)
    document.addEventListener('visibilitychange', beiVisibility)
    return () => {
      if (offener === zu) offener = undefined
      window.removeEventListener('blur', zu)
      document.removeEventListener('visibilitychange', beiVisibility)
    }
  }, [offen])
  /* Escape schließt die Blase (WCAG 1.4.13), ohne dass der Fokus wandert; als oberste Ebene zuerst, ein Dialog darunter bleibt offen. */
  useEscape(offen, () => aktuell.current())
}

/** Fokus öffnet nur bei Tastatur (`:focus-visible`): Der Klickfokus auf einen Link, die Rückgabe des Fokus bei der Rückkehr in den Tab und die nach einem Escape, das ein Fenster schließt, sind kein Anlass. */
export function fokusZeigtBlase(el: EventTarget): boolean {
  return el instanceof Element && el.matches(':focus-visible') && !escapeVorKurzem()
}

/** Ein Zeiger, der nach einem Escape unter dem Auslöser liegt, ist kein Überfahren: Schließt das Escape ein Fenster, steht der Zeiger plötzlich wieder darüber, und die Blase fräße das nächste Escape. */
export function mausZeigtBlase(): boolean {
  return !escapeVorKurzem()
}
