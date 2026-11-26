/**
 * **Lesart alter Meldungen aus der Zeit der Staffel-Titel** (F157, 24.11.2026). Vom 20. bis 24.11.2026 war jede Staffel von Pokémon Horizonte
 * ein eigener Titel (7000001–7000003, Folgen ab 1), und im Fenster `staffelzaehlung` zählten Meldungen zu 158871 in Staffel 4. Meldungen werden
 * nie umgeschrieben (`docs/wissen/news-plan.md`); gelesen werden sie über diese feste Tabelle aus der Yaml (`alteKennung`), nicht aus gebauten Titeln.
 */
import type { StaffelGrenzen } from './pokemon-staffeln.ts'

type AltTitel = { id: number; staffelTitel: { sammel: number; ab: number; aktiv?: string; bis?: string; laengste?: number } }

/** Die Eingabe für `staffelVonTiteln`: je alter Kennung ihre erste Folge, dazu die Serie selbst mit dem Fenster ihrer Staffelzählung. */
export function altStaffelTitel(grenzen: StaffelGrenzen[]): AltTitel[] {
  return grenzen.flatMap((g) => {
    const alte = g.staffeln.filter((s) => s.alteKennung !== undefined)
    if (!alte.length) return []
    const aus: AltTitel[] = alte.map((s) => ({ id: s.alteKennung!, staffelTitel: { sammel: g.anilistId, ab: s.von } }))
    const basis = g.staffeln.find((s) => s.alteKennung === undefined)
    if (basis && g.staffelzaehlung) {
      const laengste = Math.max(...alte.map((s) => (s.bis ?? s.von) - s.von + 1))
      const { von: aktiv, bis } = g.staffelzaehlung
      aus.push({ id: g.anilistId, staffelTitel: { sammel: g.anilistId, ab: basis.von, aktiv, bis, laengste } })
    }
    return aus
  })
}
