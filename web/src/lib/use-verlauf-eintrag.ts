import { useEffect, useRef } from 'react'

/** Browser-Teile, die der Verlaufseintrag braucht (für Tests ersetzbar). */
export interface VerlaufUmgebung {
  history: Pick<History, 'state' | 'pushState' | 'replaceState' | 'back'>
  location: Pick<Location, 'href'>
  addEventListener: (art: 'popstate', f: () => void) => void
  removeEventListener: (art: 'popstate', f: () => void) => void
}

let zaehler = 0

/**
 * Legt den Verlaufseintrag eines offenen Fensters an und gibt die Rücknahme zurück.
 * Ein Zurück zählt nur, wenn es beim Eintrag vor dem Fenster ankommt (er trägt dafür eine Marke): Die Datenbank schreibt bei
 * jeder Filteränderung `location.hash` und legt damit selbst Einträge an — auch einen mit der Adresse vom Öffnen,
 * wenn ein Filter zurückgesetzt wird; der darf das Fenster nicht schließen.
 */
export function oeffneVerlaufEintrag(schliessen: () => void, umg: VerlaufUmgebung = window): () => void {
  const marke = ++zaehler
  umg.history.replaceState({ ...umg.history.state, vorFenster: marke }, '')
  umg.history.pushState({ filter: 1 }, '')
  const zurueck = () => {
    if (umg.history.state?.vorFenster === marke) schliessen()
  }
  umg.addEventListener('popstate', zurueck)
  return () => {
    umg.removeEventListener('popstate', zurueck)
    if (umg.history.state?.filter) umg.history.back()
  }
}

/** Solange ein Fenster offen ist, steht dafür ein Verlaufseintrag: „Zurück" schließt es, statt die Seite zu verlassen. */
export function useVerlaufEintrag(offen: boolean, schliessen: () => void): void {
  const zu = useRef(schliessen)
  zu.current = schliessen
  useEffect(() => {
    if (!offen) return
    return oeffneVerlaufEintrag(() => zu.current())
  }, [offen])
}
