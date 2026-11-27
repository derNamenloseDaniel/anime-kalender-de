import { useState } from 'react'
import type { FranchiseMember } from '@shared/types.ts'

/**
 * **Lange Reihen brauchen Suche und einen Aufklapper** (die Reiter wichen am 20.10.2026 den Zeilen je Gruppe) (Daniel, 17.09.2026, Pokémon
 * mit 112 Teilen: „sehr schwer dort für nutzer gesuchte titel der reihe zu finden").
 * Der Zustand gilt je Reihe und fällt beim Wechsel der Reihe zurück.
 */
export function useReiheZustand(reihenTeile: FranchiseMember[]) {
  const reihenSchluessel = reihenTeile[0]?.id ?? 0
  const [reiheSuche, setReiheSuche] = useState<{ reihe: number; text: string }>({ reihe: 0, text: '' })
  return { reihenSchluessel, reiheSuche, setReiheSuche }
}
