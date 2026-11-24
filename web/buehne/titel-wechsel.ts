import { createContext } from 'react'

/** Öffnet einen anderen Titel im Panel des Ausschnitts `detailpanel` (derselbe Weg wie ein Klick in der Reihenliste). */
export const TitelWechselKontext = createContext<(id: number) => void>(() => {})
