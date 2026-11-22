/**
 * **Staffel-Titel**: Einträge, die der Bau aus einem AniList-Sammeltitel je deutscher Staffel ableitet (`data/curated/horizonte-staffeln.yaml`,
 * Feld `kennung`; Phase `pipeline/bau/staffel-titel.ts`). Ihre Kennung liegt im Raum 7 bis unter 8 Mio.: über den eigenen Titeln
 * (5 bis unter 6 Mio., `eigene-titel.ts`), unter den Testkennungen (9.000.0xx) und der aniSearch-Basis (10 Mio.); 6 Mio. bleibt frei,
 * weil Prüfungen `6_000_000` als gewöhnliche AniList-Kennung führen.
 */
export const STAFFEL_ID_BASIS = 7_000_000
export const STAFFEL_ID_ENDE = 8_000_000

/** Abgeleiteter Staffel-Titel: keine eigene AniList-Seite, die Quelle ist der Sammeltitel (`staffelVon`). */
export const istStaffelTitel = (id: number): boolean => id >= STAFFEL_ID_BASIS && id < STAFFEL_ID_ENDE

/**
 * Kennung → Sammeltitel und erste Folge, nur für abgeleitete Staffeln: Die Basis-Staffel trägt die Kennung des Sammeltitels, und alte
 * Meldungen mit dieser Kennung zählen durchlaufend — sie bleiben unverändert.
 */
export function staffelVonTiteln(titel: { id: number; staffelTitel?: { sammel: number; ab: number } }[]): (id: number) => { sammel: number; ab: number } | undefined {
  const je = new Map(titel.flatMap((t) => (t.staffelTitel && t.staffelTitel.sammel !== t.id ? [[t.id, t.staffelTitel] as const] : [])))
  return (id) => je.get(id)
}

/**
 * Eine Beobachtung zu einem Staffel-Titel (Kennung, Folge in der Staffel) auf den Sammeltitel und seine durchlaufende Folge zurück: Meldungen
 * und Urteile werden vor der Teilung gelesen, dort gibt es nur den Sammeltitel. Ohne Staffel-Angabe bleibt alles, wie es ist.
 */
export function zurueckAufSammeltitel(
  titel: number,
  folge: number,
  staffelVon: (id: number) => { sammel: number; ab: number } | undefined,
): { titel: number; folge: number } {
  const s = staffelVon(titel)
  if (!s) return { titel, folge }
  /* Folge 0 meint die ganze Seite (`wegUrteileBereinigen`), keine Nummer. */
  return { titel: s.sammel, folge: folge > 0 ? folge + s.ab - 1 : folge }
}

/**
 * Unter dieser Kennung liegen die Quelldaten eines Titels (aniSearch, TMDB, Sprecher, Trailer, AniList-Start): bei einer abgeleiteten Staffel
 * die des Sammeltitels, sonst die eigene. Die Quellen kennen nur AniList-Kennungen, die Phase Staffel-Titel schneidet aber vor der Auslieferung.
 */
export const lesekennung = (t: { id: number; staffelTitel?: { sammel: number } }): number => t.staffelTitel?.sammel ?? t.id
