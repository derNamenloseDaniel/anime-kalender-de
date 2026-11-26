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

/** Wohin eine Meldung zu einer Kennung zurückgerechnet wird (`ab`: erste durchlaufende Folge der Staffel). */
export type StaffelVon = (id: number, tag?: string, folge?: number) => { sammel: number; ab: number } | undefined

/**
 * Kennung → Sammeltitel und erste Folge. Die Basis-Staffel trägt die Kennung des Sammeltitels: Meldungen mit dieser Kennung zählen bis zur
 * Aktivierung (`aktiv`, verglichen mit dem Tag der Meldung) durchlaufend und bleiben unverändert; ab `aktiv` zählen sie in der Staffel der
 * Basis (Folge 1 = `ab`), außer die Nummer übersteigt die längste Staffel (`laengste`): Dann kann sie nur durchlaufend gezählt sein (eine
 * Erweiterung mit altem Auftrag meldet auch nach `aktiv` so). Ohne `aktiv` bleibt die Basis unverändert; ab `bis` (Rückbau, F157) wieder durchlaufend.
 */
export function staffelVonTiteln(titel: { id: number; staffelTitel?: { sammel: number; ab: number; aktiv?: string; bis?: string; laengste?: number } }[]): StaffelVon {
  const je = new Map(titel.flatMap((t) => (t.staffelTitel ? [[t.id, t.staffelTitel] as const] : [])))
  return (id, tag, folge) => {
    const s = je.get(id)
    if (!s) return undefined
    if (s.sammel !== id) return s
    if (!s.aktiv || tag === undefined || tag < s.aktiv || (s.bis !== undefined && tag >= s.bis)) return undefined
    return folge !== undefined && s.laengste !== undefined && folge > s.laengste ? undefined : s
  }
}

/**
 * Eine Beobachtung zu einem Staffel-Titel (Kennung, Folge in der Staffel) auf den Sammeltitel und seine durchlaufende Folge zurück: Meldungen
 * und Urteile werden vor der Teilung gelesen, dort gibt es nur den Sammeltitel. Ohne Staffel-Angabe bleibt alles, wie es ist. `tag`: Tag der Meldung.
 */
export function zurueckAufSammeltitel(titel: number, folge: number, staffelVon: StaffelVon, tag?: string): { titel: number; folge: number } {
  const s = staffelVon(titel, tag, folge)
  if (!s) return { titel, folge }
  /* Folge 0 meint die ganze Seite (`wegUrteileBereinigen`), keine Nummer. */
  return { titel: s.sammel, folge: folge > 0 ? folge + s.ab - 1 : folge }
}

/**
 * Unter dieser Kennung liegen die Quelldaten eines Titels (aniSearch, TMDB, Sprecher, Trailer, AniList-Start): bei einer abgeleiteten Staffel
 * die des Sammeltitels, sonst die eigene. Die Quellen kennen nur AniList-Kennungen, die Phase Staffel-Titel schneidet aber vor der Auslieferung.
 */
export const lesekennung = (t: { id: number; staffelTitel?: { sammel: number } }): number => t.staffelTitel?.sammel ?? t.id
