/**
 * **Versatz alter Staffel-Kennungen** (F157, 24.11.2026): Vom 20. bis 24.11.2026 war jede Staffel von Pokémon Horizonte ein eigener Titel
 * mit Folgen ab 1 (`alteKennung` in `data/curated/horizonte-staffeln.yaml`). Zieht so eine Kennung auf den Titel der Serie um (`zuAk`),
 * zählt „gesehen bis Folge k“ dort durchlaufend weiter: Folge `von − 1 + k`. `ak-umleitung.json` trägt dafür ein drittes Element
 * `[alt, neu, versatz]`; heutige Leser bilden `new Map(paare)` und lassen es aus (`pipeline/check-ak-umleitung-versatz.ts`).
 */
import { existsSync, readFileSync } from 'node:fs'
import yaml from 'js-yaml'
import type { KennungsZeile } from './ausgabe-kennung.ts'
import type { StaffelGrenzen } from './pokemon-staffeln.ts'

/**
 * Die Grenzen aus einer Yaml-Datei, ohne `pokemon-staffeln.ts`: Das zieht `util.ts` nach und legt `ROOT` beim Laden fest, und
 * `ausgabe-kennung.ts` laden Prüfungen vor dem Setzen von `AK_ROOT` (`check-empfehlung.ts`). Fehlt die Datei, keine Grenzen.
 */
export function ladeGrenzenDatei(pfad: string): StaffelGrenzen[] {
  return existsSync(pfad) ? ((yaml.load(readFileSync(pfad, 'utf8')) as { titel?: StaffelGrenzen[] } | null)?.titel ?? []) : []
}

export type UmleitungsPaar = [alt: number, neu: number] | [alt: number, neu: number, versatz: number]

/** ak der alten Staffel-Kennung → ak der Serie und Versatz (`von` − 1); Staffeln ab Folge 1 brauchen keinen. */
export function staffelVersatz(zeilen: KennungsZeile[], grenzen: StaffelGrenzen[]): Map<number, { neu: number; versatz: number }> {
  const akVon = new Map(zeilen.map((z) => [z[1], z[0]]))
  const aus = new Map<number, { neu: number; versatz: number }>()
  for (const g of grenzen) {
    for (const s of g.staffeln) {
      if (s.alteKennung === undefined || s.von <= 1) continue
      const alt = akVon.get(s.alteKennung)
      const neu = akVon.get(g.anilistId)
      if (alt === undefined || neu === undefined) throw new Error(`Staffel-Versatz: Kennung ${alt === undefined ? s.alteKennung : g.anilistId} fehlt in data/kennungen.json`)
      aus.set(alt, { neu, versatz: s.von - 1 })
    }
  }
  return aus
}

/** Die Umleitungspaare, ein Paar mit Versatz als Dreier; nur wenn es wirklich auf die Serie zeigt. */
export function mitVersatz(paare: [number, number][], versatz: Map<number, { neu: number; versatz: number }>): UmleitungsPaar[] {
  return paare.map(([alt, neu]): UmleitungsPaar => {
    const v = versatz.get(alt)
    return v && v.neu === neu ? [alt, neu, v.versatz] : [alt, neu]
  })
}
