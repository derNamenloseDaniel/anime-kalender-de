/** Eine Staffelseite bei TOGGO: Beschriftung (`nummer`: „3“ oder „15–16“), die Staffeln dahinter und die Adresse aus `tg` der Folgenliste. */
export interface StaffelZiel {
  nummer: string
  staffeln: number[]
  url: string
}

/**
 * Die Absprünge einer gebündelten Pille: je **verschiedener** Adresse einer (Staffeln mit derselben Adresse teilen sich eine Beschriftung).
 * Führen alle Staffeln auf dieselbe Adresse, oder gibt es keine zwei, bleibt es bei einer Pille (`undefined`).
 */
export function staffelZiele(tg: [number, string][] | undefined): StaffelZiel[] | undefined {
  const jeAdresse = new Map<string, number[]>()
  for (const [nr, url] of tg ?? []) jeAdresse.set(url, [...(jeAdresse.get(url) ?? []), nr])
  if (jeAdresse.size < 2) return undefined
  return [...jeAdresse]
    .map(([url, nummern]) => {
      const staffeln = [...nummern].sort((a, b) => a - b)
      return { nummer: staffeln.length > 1 ? `${staffeln[0]}–${staffeln.at(-1)}` : String(staffeln[0]), staffeln, url }
    })
    .sort((a, b) => a.staffeln[0]! - b.staffeln[0]!)
}

/** Erste und letzte Staffel, die der Anbieter führt: `{ von: 1, bis: 5 }`. */
export function staffelSpanne(ziele: StaffelZiel[]): { von: number; bis: number } {
  const alle = ziele.flatMap((z) => z.staffeln)
  return { von: Math.min(...alle), bis: Math.max(...alle) }
}
