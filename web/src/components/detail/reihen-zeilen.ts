import type { Gruppe } from './reihen-uebersicht-regeln.ts'

/**
 * Die Zeilen der Reihenliste (Daniel, 26.11.2026): Gruppen mit genau einem Teil stehen paarweise in einer Zeile (je 50 %),
 * jede andere Gruppe und eine übrig bleibende Einzel-Gruppe bekommt die volle Breite. Die Reihenfolge der Gruppen bleibt.
 */
export function gruppenZeilen(gruppen: Gruppe[]): Gruppe[][] {
  const zeilen: Gruppe[][] = []
  for (const g of gruppen) {
    const letzte = zeilen[zeilen.length - 1]
    if (g.teile.length === 1 && letzte?.length === 1 && letzte[0]!.teile.length === 1) letzte.push(g)
    else zeilen.push([g])
  }
  return zeilen
}
