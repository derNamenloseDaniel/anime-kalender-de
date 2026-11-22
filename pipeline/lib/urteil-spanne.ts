/**
 * Die Beobachtungen einer Meldung: eine je Folge ihrer Spanne. Eine Meldung zu einem Staffel-Titel (`shared/staffel-titel.ts`) gilt dem
 * Sammeltitel mit durchlaufender Folge, denn der Bau liest die Urteile vor dem Schnitt (`pipeline/bau/staffel-titel.ts`).
 */
import { type StaffelVon, zurueckAufSammeltitel } from '../../shared/staffel-titel.ts'
import type { UrteilBeobachtung } from './urteil-je-folge.ts'

export function beobachtungenDerSpanne(
  titel: number,
  { von, bis }: { von: number; bis: number },
  gemeinsam: Omit<UrteilBeobachtung, 'titel' | 'folge'>,
  staffelVon: StaffelVon,
): UrteilBeobachtung[] {
  const aus: UrteilBeobachtung[] = []
  for (let n = von; n <= bis; n++) {
    const ziel = zurueckAufSammeltitel(titel, n, staffelVon, gemeinsam.tag)
    aus.push({ ...gemeinsam, titel: ziel.titel, folge: ziel.folge })
  }
  return aus
}
