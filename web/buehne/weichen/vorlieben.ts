import {
  vorliebenAus,
  vorliebenLesen as vorliebenLesenEcht,
  vorliebenNachfuehren as vorliebenNachfuehrenNeu,
  type Ansicht,
  type Vorlieben,
} from '../../src/lib/vorlieben.ts'
import type { FilterState } from '../../src/lib/filters.ts'
import { vorliebenAltSchreiben } from '../mockups/filter-konzept-alt.ts'
import { istVorherZelle, zellenFall } from './filter-konzept-zelle.ts'

/** Alles andere aus `vorlieben.ts` bleibt, wie es ist; Vorher schreibt den alten gemeinsamen Schlüssel statt je Ansicht einen. */
export * from '../../src/lib/vorlieben.ts'

let gesaet = false
/** Fall „sakamoto-days" (Kalender-Auge): Der Besucher hat im Kalender das Auge „Disc" gesetzt, bevor er die Datenbank öffnet (erst beim ersten Lesen: dann steht der flüchtige Speicher der Zelle). */
function kalenderAugeSaeen(): void {
  if (gesaet) return
  gesaet = true
  if (zellenFall() === 'sakamoto-days') localStorage.setItem(istVorherZelle() ? 'vorlieben' : 'vorlieben.kalender', JSON.stringify({ discAus: true }))
}

export function vorliebenLesen(ansicht: Ansicht): Vorlieben {
  kalenderAugeSaeen()
  return vorliebenLesenEcht(ansicht)
}

export function vorliebenNachfuehren(ansicht: Ansicht, vorher: FilterState, nachher: FilterState): void {
  if (istVorherZelle()) vorliebenAltSchreiben(vorliebenAus(nachher))
  else vorliebenNachfuehrenNeu(ansicht, vorher, nachher)
}
