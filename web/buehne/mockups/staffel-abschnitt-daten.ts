/**
 * Staffeln von Pokémon Horizonte für das Mockup „Staffel als Abschnitt“ (F157).
 * Alles aus `data/curated/horizonte-staffeln.yaml` (Namen, Folgenzahlen, Grenzen; PR 4738) und den dort genannten Belegen,
 * Stand 23.11.2026. Nicht belegt, darum nicht gezeigt: Folgenzahl von Staffel 4, Folgentitel ab Folge 138.
 */
export type StaffelStatus = 'erschienen' | 'laeuft' | 'angekuendigt'

export interface StaffelZeile {
  nr: number
  name: string
  /** Folgen der Staffel; fehlt bei der offenen Staffel 4 (kein belegtes Ende). */
  folgen?: number
  /** Gesamtfolgen von … bis (durchlaufend, wie in den Daten); `bis` fehlt bei Staffel 4. */
  von: number
  bis?: number
  status: StaffelStatus
  /** Anbieter, je mit belegtem Start; `ab` nur bei einem Start, der nach Staffelbeginn liegt. */
  wo: { name: string; ab?: string }[]
  /** Bekannte Folgen (nur die offene Staffel): Nummer in der Staffel, durchlaufende Nummer, deutscher Titel. */
  bekannteFolgen?: { inStaffel: number; gesamt: number; titel: string }[]
}

export const HORIZONTE_STAFFELN: StaffelZeile[] = [
  { nr: 1, name: 'Die Serie', folgen: 45, von: 1, bis: 45, status: 'erschienen', wo: [{ name: 'Netflix' }, { name: 'RTL+' }] },
  { nr: 2, name: 'Die Suche nach Laqua', folgen: 44, von: 46, bis: 89, status: 'erschienen', wo: [{ name: 'Netflix' }, { name: 'RTL+' }] },
  { nr: 3, name: 'Gute Aussichten', folgen: 47, von: 90, bis: 136, status: 'erschienen', wo: [{ name: 'RTL+' }, { name: 'TOGGO' }] },
  {
    nr: 4,
    name: 'Wunder in Sicht',
    von: 137,
    status: 'laeuft',
    wo: [{ name: 'RTL+', ab: '20.11.' }, { name: 'TOGGO', ab: '27.11.' }],
    bekannteFolgen: [{ inStaffel: 1, gesamt: 137, titel: 'Eine Welt voller Abenteuer' }],
  },
]

export const STATUS_TEXT: Record<StaffelStatus, string> = { erschienen: 'erschienen', laeuft: 'läuft', angekuendigt: 'angekündigt' }

/** „45 Folgen“ bzw. bei offener Staffel „ab Folge 137“. */
export function folgenText(s: StaffelZeile): string {
  if (s.folgen) return `${s.folgen} Folgen`
  return `ab Folge ${s.von}`
}

/** Eine Zeile über dem Merken-Knopf-Bereich: gilt für die Serie, nicht für eine Staffel. */
export const MERKEN_HINWEIS = 'Merken gilt für alle Staffeln, auch für künftige.'
