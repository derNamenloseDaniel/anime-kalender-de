import { useSyncExternalStore } from 'react'
import { LAUFENDE_NR } from './staffel-abschnitt-daten.ts'

/**
 * Die gewählte Staffel, geteilt zwischen Kopf (Cover), Kasten (Reiter, Inhalt) und Handlung: Das Panel hat dafür keinen
 * gemeinsamen Zustand, das Mockup bringt ihn mit. Beim Öffnen gilt die laufende Staffel.
 */
let gewaehlt = LAUFENDE_NR
const hoerer = new Set<() => void>()

export function waehleStaffel(nr: number): void {
  if (nr === gewaehlt) return
  gewaehlt = nr
  hoerer.forEach((h) => h())
}

const abonniere = (h: () => void) => {
  hoerer.add(h)
  return () => hoerer.delete(h)
}

export const useGewaehlteStaffel = (): number => useSyncExternalStore(abonniere, () => gewaehlt, () => LAUFENDE_NR)
