import type { KennungsZeile } from '../lib/ausgabe-kennung.ts'
import type { StaffelGrenzen } from '../lib/pokemon-staffeln.ts'

/**
 * **Befristete Ausnahme im Verlust-Riegel** (F157, 24.11.2026, PR 4897): Die Staffel-Titel von Pokémon Horizonte fallen weg, weil die
 * Serie wieder ein Titel ist. Erlaubt ist genau der Wegfall der Kennungen, die die Yaml als `alteKennung` führt, und nur, wenn jede
 * noch ihre Zeile in `data/kennungen.json` hat (ihre `ak` bleibt vergeben, der Folge-PR setzt dort `zuAk` und damit das Paar in
 * `ak-umleitung.json`). Entfällt mit diesem Folge-PR: Danach steht keine dieser Kennungen mehr in `public/data/titles.json`.
 */
export function erlaubterStaffelWegfall(grenzen: StaffelGrenzen[], zeilen: KennungsZeile[]): Set<number> {
  const mitZeile = new Set(zeilen.map((z) => z[1]))
  const alte = grenzen.flatMap((g) => g.staffeln.flatMap((s) => (s.alteKennung === undefined ? [] : [s.alteKennung])))
  return new Set(alte.filter((id) => mitZeile.has(id)))
}
