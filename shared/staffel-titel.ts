/**
 * **Staffel-Titel** (20. bis 24.11.2026): Der Bau schnitt Pokémon Horizonte in einen Titel je deutscher Staffel (Kennungen 7000001–7000003,
 * `alteKennung` in `data/curated/horizonte-staffeln.yaml`). Seit F157 ist die Serie wieder ein Titel; hier bleibt, was alte Meldungen und
 * Bau-Vergleiche lesen. Der Raum 7 bis unter 8 Mio. liegt über den eigenen Titeln (5 bis unter 6 Mio.) und unter den Testkennungen und
 * der aniSearch-Basis (10 Mio.); er wird nicht wieder vergeben.
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
 * Eine alte Beobachtung zu einem Staffel-Titel (Kennung, Folge in der Staffel) auf die Serie und ihre durchlaufende Folge zurück (Tabelle:
 * `altStaffelTitel`, `pipeline/lib/staffel-altmeldungen.ts`). Ohne Staffel-Angabe bleibt alles, wie es ist. `tag`: Tag der Meldung.
 */
export function zurueckAufSammeltitel(titel: number, folge: number, staffelVon: StaffelVon, tag?: string): { titel: number; folge: number } {
  const s = staffelVon(titel, tag, folge)
  if (!s) return { titel, folge }
  /* Folge 0 meint die ganze Seite (`wegUrteileBereinigen`), keine Nummer. */
  return { titel: s.sammel, folge: folge > 0 ? folge + s.ab - 1 : folge }
}
