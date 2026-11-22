/**
 * **Die Folgenliste eines Sammeltitels je Staffel** (zu `staffel-titel.ts`): Zeilen und deutsche Bereiche im Fenster der Staffel, auf 1..n
 * umgezählt; die Staffelreiter (`s`) entfallen, weil jeder Titel eine Staffel ist. Die Zählung je Titel (`folgen/zaehlung.json`) sagt die
 * Folgenzahl der Staffel; die offene Staffel bleibt offen (dritte Stelle 1).
 */
import { zaehleFolgen } from './pokemon-staffeln.ts'
import type { StaffelPlan, StaffelPlanZeile } from './staffel-titel.ts'

export type FolgenZeile = [number, string, ...unknown[]]
export type FolgenDatei = { f: FolgenZeile[]; de: [number, number][]; min?: number; s?: unknown; h?: [number, string][] }
export type Zaehlung = [number, number] | [number, number, 1]

const imFenster = (n: number, s: StaffelPlanZeile): boolean => n >= s.von && (s.bis === undefined || n <= s.bis)

/** Die Datei einer Staffel; ohne eine Zeile im Fenster keine (die Seite zeigt dann keine Liste, wie bei jedem Titel unter zwei Folgen). */
export function folgenDerStaffel(d: FolgenDatei, s: StaffelPlanZeile): FolgenDatei | undefined {
  const versatz = s.von - 1
  const f = d.f.filter(([n]) => imFenster(n, s)).map(([n, ...rest]): FolgenZeile => [n - versatz, ...rest] as FolgenZeile)
  if (!f.length) return undefined
  const de = d.de.flatMap(([von, bis]): [number, number][] => {
    const a = Math.max(von, s.von)
    const b = Math.min(bis, s.bis ?? Infinity)
    return a <= b ? [[a - versatz, b - versatz]] : []
  })
  const h = d.h?.filter(([n]) => imFenster(n, s)).map(([n, text]): [number, string] => [n - versatz, text])
  return { f, de, ...(d.min !== undefined ? { min: d.min } : {}), ...(h?.length ? { h } : {}) }
}

/** Zählung einer Staffel: abgeschlossen bis zu ihrem Ende, offen bis zur höchsten deutschen Folge (mindestens Folge 1). */
export function zaehlungDerStaffel(datei: FolgenDatei, s: StaffelPlanZeile): Zaehlung {
  const ende = s.bis !== undefined ? s.bis - s.von + 1 : 1
  const z = zaehleFolgen(datei.f.map(([n]) => n), datei.de, ende)
  return s.bis === undefined ? [...z, 1] : z
}

/**
 * Alle Staffeldateien eines Sammeltitels. `verloren` zählt Zeilen, die in keiner Staffel liegen (Riegel: muss 0 sein).
 * Liegen Zeilen der offenen Staffel nicht vor (aniSearch endet früher), bekommt sie trotzdem eine Zählung, aber keine Datei.
 */
export function teileFolgenDatei(d: FolgenDatei, plan: StaffelPlan): { dateien: Map<number, FolgenDatei>; zaehlung: Map<number, Zaehlung>; verloren: number } {
  const dateien = new Map<number, FolgenDatei>()
  const zaehlung = new Map<number, Zaehlung>()
  let zeilen = 0
  for (const s of plan.staffeln) {
    const eigene = folgenDerStaffel(d, s)
    zeilen += eigene?.f.length ?? 0
    if (eigene && eigene.f.length >= 2) dateien.set(s.kennung, eigene)
    zaehlung.set(s.kennung, zaehlungDerStaffel(eigene ?? { f: [], de: folgenDerStaffel({ ...d, f: [[s.von, '']] }, s)!.de }, s))
  }
  return { dateien, zaehlung, verloren: d.f.length - zeilen }
}
