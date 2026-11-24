/** Eine Staffelseite bei TOGGO: Kurzbeschriftung („S3“, „S15–16“) und die Adresse aus `tg` der Folgenliste. */
export interface StaffelZiel {
  label: string
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
  return [...jeAdresse].map(([url, nummern]) => {
    const staffeln = [...nummern].sort((a, b) => a - b)
    const label = staffeln.length > 1 ? `S${staffeln[0]}–${staffeln[staffeln.length - 1]}` : `S${staffeln[0]}`
    return { label, staffeln, url }
  }).sort((a, b) => a.staffeln[0]! - b.staffeln[0]!)
}
