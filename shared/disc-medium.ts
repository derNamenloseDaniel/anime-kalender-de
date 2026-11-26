/**
 * **Das Medium aus der Editionsangabe** — „Limited Steelbook Edition, Blu-ray"
 * trägt es am Ende, andere Ausgaben mittendrin. Gesucht wird deshalb im ganzen
 * Text, und die genauere Angabe gewinnt: „DVD & Blu-ray" ist beides.
 */
export function mediumAus(edition?: string): string | undefined {
  if (!edition) return undefined
  const bd = /blu-?ray/i.test(edition)
  const dvd = /\bdvd\b/i.test(edition)
  if (bd && dvd) return 'DVD + BD'
  if (bd) return 'Blu-ray'
  if (dvd) return 'DVD'
  return undefined
}
