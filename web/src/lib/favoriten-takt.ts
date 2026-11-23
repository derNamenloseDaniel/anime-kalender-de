export const MIN_ABSTAND_MS = 60_000

/** Was der Takt von außen braucht — im Browser echt, im Test eine Attrappe. */
export interface TaktUmwelt {
  token: () => string | undefined
  sichtbar: () => boolean
  jetzt: () => number
  abgleichen: (token: string) => Promise<void>
  /** Hört auf `visibilitychange` (Rückkehr in den Tab). */
  bei: (f: () => void) => void
  ab: (f: () => void) => void
}

/** Gleicht jetzt und bei jeder Rückkehr in den Tab ab, höchstens einmal je Minute und nie im versteckten Tab; gibt die Aufräumfunktion zurück. */
export function starteTakt(u: TaktUmwelt): () => void {
  let letzter = Number.NEGATIVE_INFINITY
  const los = () => {
    const token = u.token()
    if (!token || !u.sichtbar() || u.jetzt() - letzter < MIN_ABSTAND_MS) return
    letzter = u.jetzt()
    u.abgleichen(token).catch(() => undefined)
  }
  los()
  u.bei(los)
  return () => u.ab(los)
}
