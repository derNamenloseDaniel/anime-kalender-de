import { useEffect, useRef } from 'react'

/** Browser-Teile, die der Verlaufseintrag braucht (für Tests ersetzbar). */
export interface VerlaufUmgebung {
  history: Pick<History, 'state' | 'pushState' | 'back'>
  location: Pick<Location, 'href'>
  addEventListener: (art: 'popstate', f: () => void) => void
  removeEventListener: (art: 'popstate', f: () => void) => void
}

/**
 * Legt den Verlaufseintrag eines offenen Fensters an und gibt die Rücknahme zurück.
 * Ein Zurück zählt nur, wenn der Eintrag weg ist **und** die Adresse dieselbe blieb — die Datenbank schreibt bei jeder
 * Filteränderung `location.hash` und legt damit selbst Einträge an, die das Fenster nicht schließen dürfen.
 */
export function oeffneVerlaufEintrag(schliessen: () => void, umg: VerlaufUmgebung = window): () => void {
  const href = umg.location.href
  umg.history.pushState({ filter: 1 }, '')
  const zurueck = () => {
    if (!umg.history.state?.filter && umg.location.href === href) schliessen()
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
