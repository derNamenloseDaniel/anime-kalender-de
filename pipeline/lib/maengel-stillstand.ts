import type { Register } from './maengel-register.ts'

/** Präfix der Warnzeile; `bestand-bauen.yml` („Datenqualität messen“) macht daraus die DATEN_WARNUNG. */
export const MAENGEL_STILLSTAND_ZEILE = 'MAENGEL_STILLSTAND '
/** So viele Tage darf eine auto-Art stehen, bevor es auffällt (21.11.2026: fünf Tage Stillstand bemerkte niemand). */
export const STILLSTAND_TAGE = 3

export interface Tagesstand {
  gemessenAm: string
  titel: number
  maengel?: Record<string, number>
}

export interface Stillstand {
  /** Kurz für die DATEN_WARNUNG (die Wache zeigt nur ihren Anfang): Zahl der Arten und Bezugstag. */
  zeile: string
  /** Je Art Zahl vorher → heute und Quelle, fürs Log. */
  einzeln: string
}

const tagDavor = (heute: string, tage: number): string => new Date(Date.parse(heute) - tage * 86_400_000).toISOString().slice(0, 10)

/**
 * Auto-Arten (`wer: auto:…`) mit offenen Mängeln, deren Zahl seit {@link STILLSTAND_TAGE} Tagen nicht gesunken ist: ihr Sammler läuft nicht,
 * nimmt die Titel nicht auf oder das Feld kommt im Bau nicht an. Bezug ist der jüngste Verlaufseintrag mit Mängelzahlen, der mindestens so alt ist;
 * fehlt er (Verlauf zu kurz) oder kennt er die Art nicht (neu im Register), gibt es für sie keine Meldung.
 */
export function stillstand(verlauf: Tagesstand[], heute: Tagesstand, register: Register | null): Stillstand | undefined {
  if (!register || !heute.maengel) return undefined
  const grenze = tagDavor(heute.gemessenAm, STILLSTAND_TAGE)
  const eintrag = verlauf.filter((v) => v.gemessenAm <= grenze && v.maengel).at(-1)
  const bezug = eintrag?.maengel
  if (!eintrag || !bezug) return undefined
  const stehen = Object.entries(register.zaehler).filter(
    ([art, z]) => z.wer.startsWith('auto:') && (heute.maengel![art] ?? 0) > 0 && heute.maengel![art]! >= (bezug[art] ?? Infinity),
  )
  if (!stehen.length) return undefined
  return {
    zeile: `${MAENGEL_STILLSTAND_ZEILE}${stehen.length} auto-Arten sinken nicht seit ${eintrag.gemessenAm}`,
    einzeln: stehen.map(([art, z]) => `${art} ${bezug[art]}→${heute.maengel![art]} (${z.wer})`).join('; '),
  }
}
