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
