import type { SprecherZeile } from './wikipedia-sprecher.ts'

/**
 * Wächter über die gelesenen Stimmen (27.11.2026, Kaiju No. 8): Eine Stimme, die der Rollenname selbst ist
 * (Spalte verrutscht) oder ein Platzhalter („N. N.“ = Nomen nominandum, „unbekannt“, „?“), ist keine Sprecherangabe.
 * Sie wird verworfen und gezählt; Zeilen ohne Stimme entfallen. Sammler und Bau rufen ihn beide, damit auch ein
 * alter Stand der Datei nie eine solche Stimme in die Sprecherliste trägt.
 */
const PLATZHALTER = new Set(['nn', 'unbekannt', 'unbekannte', 'tba', 'tbd', 'offen', 'n/a'])

const roh = (s: string): string => s.toLowerCase().replace(/[\s.]+/g, '')

export function istPlatzhalter(sprecher: string): boolean {
  const r = roh(sprecher)
  return PLATZHALTER.has(r) || /^[?!]+$/.test(r)
}

export function verwirfFalscheStimmen(zeilen: SprecherZeile[]): { zeilen: SprecherZeile[]; verworfen: string[] } {
  const verworfen: string[] = []
  const aus: SprecherZeile[] = []
  for (const z of zeilen) {
    const deutsch = z.deutsch.filter((d) => {
      const grund = istPlatzhalter(d.sprecher) ? 'Platzhalter' : roh(d.sprecher) === roh(z.rolle) ? 'Sprecher gleich Rolle' : null
      if (grund) verworfen.push(`${z.rolle} → „${d.sprecher}“ (${grund})`)
      return !grund
    })
    if (deutsch.length) aus.push({ ...z, deutsch })
  }
  return { zeilen: aus, verworfen }
}
