/**
 * Die Beobachtungen einer Meldung: eine je Folge ihrer Spanne. Eine Meldung zu einem Staffel-Titel (`shared/staffel-titel.ts`) gilt dem
 * Sammeltitel mit durchlaufender Folge, denn der Bau liest die Urteile vor dem Schnitt (`pipeline/bau/staffel-titel.ts`).
 */
import { type StaffelVon, staffelVonTiteln, zurueckAufSammeltitel } from '../../shared/staffel-titel.ts'
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

/**
 * Wie `staffelVonTiteln`, aber je Meldung: Eine Meldung zur Basis-Staffel zählt nur dann in deren Staffelzählung, wenn ihre Adresse an der
 * Basis hängt. Hängt sie nur an anderen Staffeln (Netflix: Staffel 1) oder ist unbekannt, zählt sie durchlaufend wie vor der Aktivierung.
 * Eine Adresse, die an mehreren Staffeln hängt (RTL+), entscheiden Tag und Nummer.
 */
export function staffelVonJeMeldung(titel: Parameters<typeof staffelVonTiteln>[0]): (titelDerAdresse: number[] | undefined) => StaffelVon {
  const staffelVon = staffelVonTiteln(titel)
  const basisIds = new Set(titel.filter((t) => t.staffelTitel?.sammel === t.id).map((t) => t.id))
  return (titelDerAdresse) => (id, tag, folge) => (basisIds.has(id) && !titelDerAdresse?.includes(id) ? undefined : staffelVon(id, tag, folge))
}
