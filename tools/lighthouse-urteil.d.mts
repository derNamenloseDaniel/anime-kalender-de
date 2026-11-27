/** Nur die Funktion, die `pipeline/lib/tbt-drift.ts` braucht (Runner-Band einer Grenze). */
export function grenzeFuer<T>(kennzahl: string, grenze: Record<string, T>, benchmark: number): T
