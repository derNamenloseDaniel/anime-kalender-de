/**
 * **Künftige Disc-Termine werden schneller neu gelesen als der Rest** (24.11.2026).
 *
 * Der Termin steht auf der aniSearch-Titelseite, die sonst nur alle 30 Tage neu kommt (`TITEL_MAX_AGE_DAYS`). Anlass (Pokémon-Reisen),
 * Messung und Last: `docs/wissen/quellen.md`, Abschnitt „Künftige Disc-Termine" (24.11.2026).
 */

export interface DiscAusgabeKurz {
  edition: string
  datum: string
}

/** Titel mit Termin neu holen, wenn die Seite älter ist (Tage). 142 Titel (Stand 24.11.2026, 30 Tage Rückblick) sind rund 20 Seiten am Tag. */
export const DISC_FRIST_TAGE = 7
/** Eine Ausgabe zählt noch, wenn ihr Datum höchstens so viele Tage zurückliegt: Verschiebungen kurz nach dem Termin und Lieferverzug. */
export const DISC_RUECKBLICK_TAGE = 30
/** Der Wächter warnt ab dem Doppelten der Frist (Warteschlange mit Rückstand, ein ausgefallener Lauf). */
export const DISC_WARN_TAGE = 2 * DISC_FRIST_TAGE
/** Rot wird er erst, wenn selbst die allgemeine Frist von 30 Tagen doppelt verfehlt ist (Auffrischung ausgefallen); darunter warnt er nur. Der Bestand zählt am 24.11.2026 bis 44 Tage. */
export const DISC_FEHLER_TAGE = 60

const TAG = 86_400_000
const tagesbeginn = (iso: string): number => Date.parse(`${iso.slice(0, 10)}T00:00:00Z`)

/** Alter der Lesung in vollen Tagen; ohne gültigen Zeitstempel `null` (= nie belegt gelesen). */
export function alterInTagen(gelesen: string | undefined, heute: string): number | null {
  const t = gelesen ? Date.parse(gelesen) : NaN
  if (Number.isNaN(t)) return null
  return Math.floor((tagesbeginn(heute) - t) / TAG)
}

/** Kaputte Daten („2026-10-00") ergeben NaN, und jeder Vergleich damit ist falsch: sie zählen nicht. */
const zaehltNoch = (datum: string, heute: string): boolean => Date.parse(`${datum}T00:00:00Z`) >= tagesbeginn(heute) - DISC_RUECKBLICK_TAGE * TAG

/** Titel (Schlüssel von `disc-ausgaben.json`) mit mindestens einer Ausgabe von heute minus Rückblick an. */
export function discTitelMitTermin(ausgaben: Record<string, DiscAusgabeKurz[]>, heute: string): Set<number> {
  const ids = new Set<number>()
  for (const [id, liste] of Object.entries(ausgaben)) {
    if (liste.some((a) => zaehltNoch(a.datum, heute))) ids.add(Number(id))
  }
  return ids
}

/** Fälligkeit für die Warteschlange: Titel mit Termin, dessen Seite älter als die kurze Frist ist (ohne Zeitstempel: fällig). */
export function discFaellig(titel: Set<number>, heute: string): (id: number, eintrag: { fetchedAt?: string }) => boolean {
  return (id, eintrag) => {
    if (!titel.has(id)) return false
    const alter = alterInTagen(eintrag.fetchedAt, heute)
    return alter === null || alter > DISC_FRIST_TAGE
  }
}

export interface UnbestaetigterTermin {
  titelId: number
  edition: string
  datum: string
  /** Tage seit der letzten Lesung der Titelseite; `null` ohne Zeitstempel. */
  alter: number | null
}

/** Ausgaben mit künftigem oder jüngstem Datum, deren Titelseite länger als `maxTage` nicht gelesen wurde. */
export function unbestaetigteTermine(
  ausgaben: Record<string, DiscAusgabeKurz[]>,
  cache: Record<string, { fetchedAt?: string }>,
  heute: string,
  maxTage: number,
): UnbestaetigterTermin[] {
  const aus: UnbestaetigterTermin[] = []
  for (const [id, liste] of Object.entries(ausgaben)) {
    const alter = alterInTagen(cache[id]?.fetchedAt, heute)
    if (alter !== null && alter <= maxTage) continue
    for (const a of liste) {
      if (zaehltNoch(a.datum, heute)) aus.push({ titelId: Number(id), edition: a.edition, datum: a.datum, alter })
    }
  }
  return aus
}
