import { expandEvents } from '@shared/logic.ts'
import type { Release } from '@shared/types.ts'
import { FolgenBereich } from './folgen-bereich.tsx'
import { erschieneneFuerFolgenliste } from './antwort-regeln.ts'
import { nachlegerJeAnbieter, nachlegerText } from './nachleger.ts'
import type { berechneAntwort } from './antwort-berechnen.ts'

/** Nur diese Zustände sagen etwas über den Stand der Folgen; Film, Kino und Disc haben keine Nachleger. */
const MIT_NACHLEGERN = ['fertig', 'laeuft', 'teilweise']

/**
 * Die Nachleger-Zeilen für den roten Kasten (Daniel, 27.11.2026: „keine folgen ankündigung info im folgen kasten, das gehört in roten kasten“).
 * Sie standen über der Folgenliste und sagten dort, was der Kasten schon sagt.
 */
export function nachlegerZeilen(antwort: ReturnType<typeof berechneAntwort>, releases: Release[], today: string): string[] {
  if (!antwort || !MIT_NACHLEGERN.includes(antwort.art)) return []
  return nachlegerJeAnbieter(releases.flatMap((r) => expandEvents(r)), today).map(nachlegerText)
}

/** Die Folgenliste im `folgen`-Platz des Kastens; Nachleger-Zeilen stehen im Kasten (`nachlegerZeilen`). */
export function FolgenMitNachlegern({ titleId, wege, antwort, releases, today, laufzeitImKopf, serieBelegt }: {
  titleId: number
  serieBelegt?: boolean
  wege: { from: number; to: number }[]
  laufzeitImKopf?: boolean
  antwort: ReturnType<typeof berechneAntwort>
  releases: Release[]
  today: string
}) {
  return <FolgenBereich titleId={titleId} wege={wege} erschienen={erschieneneFuerFolgenliste(antwort)} laufzeitImKopf={laufzeitImKopf} serieBelegt={serieBelegt} releases={releases} today={today} />
}
