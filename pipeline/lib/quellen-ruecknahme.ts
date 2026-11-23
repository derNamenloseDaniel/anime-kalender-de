import type { Quelle } from '../../shared/types.ts'
import { istEntfernt, type BelegEntfernt } from './belege-entfernt.ts'

/**
 * Nimmt widerlegte Quellen aus der Quellenhistorie zurück (Aufgabe 16, 23.11.2026).
 *
 * „Widerlegt“ heißt: Die Adresse steht für **diesen** Titel in `data/belege-entfernt.yaml`, dem Register der als falsch
 * erkannten Seiten (gehört einem anderen Titel, Fremdzuordnung). Eine Quelle, die nur nicht mehr am Termin hängt, bleibt
 * als überholt stehen (Wikipedia:Link rot, `quellenPflegen`): gestrichen wird nur, was belegt falsch ist. Fall:
 * Apothekerin S3 trug die aniSearch-Seite 20083 (Spin-off 2025) als „vermutlich überholt“ weiter, bis sie am 01.10.2026
 * von Hand aus der Datei genommen wurde (1222ce90c).
 */
export function ohneWiderlegte(historie: readonly Quelle[], titleId: number, entfernt: readonly BelegEntfernt[]): Quelle[] {
  return historie.filter((q) => !istEntfernt(entfernt, titleId, q.url))
}
