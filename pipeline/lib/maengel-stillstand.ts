import type { Register } from './maengel-register.ts'

/** Präfix der Kurzzeile; `bestand-bauen.yml` („Datenqualität messen“) hängt sie als letzte Warnung an die Lauf-Meldung. */
export const MAENGEL_STILLSTAND_ZEILE = 'MAENGEL_STILLSTAND '
/** Präfix der Zeile mit allen Arten; steht nur im Log des Schritts, damit die Lauf-Meldung kurz bleibt. */
export const MAENGEL_STILLSTAND_ARTEN = 'MAENGEL_STILLSTAND_ARTEN '
/** Abstand zum Bezugstag. Mit 3 trifft der Verlauf am 19.11.2026 (erster Tag mit Bezug, `maengel` gibt es seit 16.11.). */
export const STILLSTAND_TAGE = 3
/** Unter diesem Abbau (Anteil am Bezug, mindestens ein Mangel) steht eine Art: fsk 1232→1230 in drei Tagen sind rund 600 Tage Restlaufzeit. */
export const MINDESTABBAU_ANTEIL = 0.01

export interface Tagesstand {
  gemessenAm: string
  titel: number
  maengel?: Record<string, number>
}

export interface Stillstand {
  seit: string
  stehen: string[]
  steigen: string[]
}

const tagDavor = (heute: string, tage: number): string => new Date(Date.parse(heute) - tage * 86_400_000).toISOString().slice(0, 10)

/**
 * Auto-Arten (`wer: auto:…`), die seit {@link STILLSTAND_TAGE} Tagen kaum abgebaut wurden (`stehen`) oder gestiegen sind (`steigen`):
 * ihr Sammler läuft nicht, nimmt neue Titel nicht auf oder das Feld kommt im Bau nicht an. Bezug ist der jüngste Verlaufseintrag mit
 * `maengel`, der mindestens so alt ist; Arten ohne Wert am Bezugstag oder ohne offene Mängel heute zählen nicht.
 */
export function stillstandMessen(verlauf: Tagesstand[], heute: Tagesstand, register: Register | null): Stillstand | undefined {
  if (!register || !heute.maengel) return undefined
  const grenze = tagDavor(heute.gemessenAm, STILLSTAND_TAGE)
  const bezugstag = verlauf.filter((v) => v.gemessenAm <= grenze && v.maengel).at(-1)
  const bezug = bezugstag?.maengel
  if (!bezug) return undefined
  const stehen: string[] = []
  const steigen: string[] = []
  for (const [art, z] of Object.entries(register.zaehler)) {
    const vorher = bezug[art]
    const jetzt = heute.maengel[art]
    if (!z.wer.startsWith('auto:') || vorher === undefined || jetzt === undefined || jetzt === 0) continue
    const text = `${art} ${vorher}→${jetzt} (${z.wer})`
    const abgebaut = vorher - jetzt >= Math.max(1, vorher * MINDESTABBAU_ANTEIL)
    if (jetzt > vorher) steigen.push(text)
    else if (!abgebaut) stehen.push(text)
  }
  return stehen.length || steigen.length ? { seit: bezugstag!.gemessenAm, stehen, steigen } : undefined
}

/** Kurzzeile (Zahl der Arten, Verweis auf die Artenzeile) und Artenzeile; leer, wenn nichts steht oder steigt. */
export function stillstandZeilen(verlauf: Tagesstand[], heute: Tagesstand, register: Register | null): string[] {
  const s = stillstandMessen(verlauf, heute, register)
  if (!s) return []
  const zahl = [s.stehen.length && `${s.stehen.length} auto-Arten ohne Abbau`, s.steigen.length && `${s.steigen.length} gestiegen`].filter(Boolean).join(', ')
  const arten = [s.stehen.length && `ohne Abbau: ${s.stehen.join('; ')}`, s.steigen.length && `gestiegen: ${s.steigen.join('; ')}`].filter(Boolean).join(' | ')
  return [`${MAENGEL_STILLSTAND_ZEILE}seit ${s.seit}: ${zahl} (Arten: Logzeile ${MAENGEL_STILLSTAND_ARTEN.trim()})`, `${MAENGEL_STILLSTAND_ARTEN}${arten}`]
}
