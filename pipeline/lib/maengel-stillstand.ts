import type { Register } from './maengel-register.ts'

/** Präfix der Warnzeile; `bestand-bauen.yml` („Datenqualität messen“) macht daraus die DATEN_WARNUNG. */
export const MAENGEL_STILLSTAND_ZEILE = 'MAENGEL_STILLSTAND '
/** So viele Tage darf eine auto-Art bei wachsendem Bestand stehen, bevor es auffällt (21.11.2026: fünf Tage Stillstand bemerkte niemand). */
export const STILLSTAND_TAGE = 3

export interface Tagesstand {
  gemessenAm: string
  titel: number
  maengel?: Record<string, number>
}

const tagDavor = (heute: string, tage: number): string => new Date(Date.parse(heute) - tage * 86_400_000).toISOString().slice(0, 10)

/**
 * Auto-Arten (`wer: auto:…`), deren offene Zahl seit {@link STILLSTAND_TAGE} Tagen nicht gesunken ist, obwohl der Bestand gewachsen ist:
 * ihr Sammler läuft nicht, nimmt neue Titel nicht auf oder das Feld kommt im Bau nicht an. Bezug ist der jüngste Verlaufseintrag, der
 * mindestens so alt ist; fehlt er (Verlauf zu kurz), gibt es keine Zeile.
 */
export function stillstandZeile(verlauf: Tagesstand[], heute: Tagesstand, register: Register | null): string | undefined {
  if (!register || !heute.maengel) return undefined
  const grenze = tagDavor(heute.gemessenAm, STILLSTAND_TAGE)
  const bezug = verlauf.filter((v) => v.gemessenAm <= grenze && v.maengel).at(-1)
  if (!bezug || heute.titel <= bezug.titel) return undefined
  const stehen = Object.entries(register.zaehler)
    .filter(([art, z]) => z.wer.startsWith('auto:') && (heute.maengel![art] ?? 0) > 0 && bezug.maengel![art] !== undefined && heute.maengel![art]! >= bezug.maengel![art]!)
    .map(([art, z]) => `${art} ${bezug.maengel![art]}→${heute.maengel![art]} (${z.wer})`)
  return stehen.length ? `${MAENGEL_STILLSTAND_ZEILE}seit ${bezug.gemessenAm}, Bestand +${heute.titel - bezug.titel}: ${stehen.join('; ')}` : undefined
}
