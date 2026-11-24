/**
 * Drei-Wege-Vereinigung: `basis` ist der Stand des letzten erfolgreichen Abgleichs.
 * Dazugekommenes beider Seiten bleibt; entfernt wird, was eine Seite seit der Basis
 * entfernt hat. Ohne Basis (erster Abgleich) wird nur vereinigt, nie gelöscht.
 */
export function vereinigeFavoriten(basis: Set<number> | null, lokal: Set<number>, server: Set<number>): Set<number> {
  const ergebnis = new Set([...lokal, ...server])
  if (!basis) return ergebnis
  for (const id of basis) if (!lokal.has(id) || !server.has(id)) ergebnis.delete(id)
  return ergebnis
}

/** Alles, was ein Abgleich von außen braucht — im Browser echt, im Test eine Attrappe. */
export interface AbgleichAnschluss {
  hole: () => Promise<number[]>
  sende: (ids: number[]) => Promise<unknown>
  lokal: () => Set<number>
  setzeLokal: (ids: Set<number>) => void
  basis: () => string | null
  merkeBasis: (text: string) => void
}

export const standText = (ids: Iterable<number>): string => [...ids].sort((a, b) => a - b).join(',')
const stand = standText

/** Ohne Basis (erster Abgleich) kommen die Titel der Datums-Ablage dazu, danach nichts mehr. */
export function ergaenzungBeimErstabgleich(basis: string | null, mitDatum: number[]): number[] {
  return basis === null ? mitDatum : []
}

/**
 * Holt den Serverstand, führt ihn mit dem lokalen zusammen und schickt ihn zurück, wenn er abweicht.
 *
 * Die Basis wird erst nach gelungenem Senden gemerkt. Änderte der Nutzer während des Sendens
 * einen Stern, wird nichts geschrieben und keine Basis gemerkt: das Lokale gewinnt, der nächste
 * Abgleich vereinigt erneut.
 */
export async function gleicheAb(a: AbgleichAnschluss): Promise<void> {
  const server = new Set(await a.hole())
  const lokal = a.lokal()
  const roh = a.basis()
  const basis = roh === null ? null : new Set(roh.split(',').filter(Boolean).map(Number))
  const vereint = vereinigeFavoriten(basis, lokal, server)
  const text = stand(vereint)
  if (text !== stand(server)) await a.sende([...vereint].sort((x, y) => x - y))
  if (stand(a.lokal()) !== stand(lokal)) return
  // Vor dem lokalen Schreiben, damit der Hook die Änderung nicht noch einmal abgleicht.
  a.merkeBasis(text)
  if (text !== stand(lokal)) a.setzeLokal(vereint)
}
