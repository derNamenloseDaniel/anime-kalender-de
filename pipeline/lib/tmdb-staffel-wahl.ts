import { japanischOhneBeleg } from './tmdb-ablauf.ts'
import { plakatEintrag, type PlakatBestand, type PlakatEintrag } from './tmdb-plakat-suche.ts'
import type { TmdbBild } from './tmdb-plakat.ts'

export type StaffelAnwaerter = {
  /** Titel, die der Monitor des letzten Baus „ohne TMDB-Zuordnung“ führt (`data/cover-klein.json`). */
  gesucht: ReadonlySet<number>
  ohne: ReadonlySet<number>
  /** Reihenmitglied → TMDB-Serie der Reihe. */
  serieVon: ReadonlyMap<number, number>
  /** Titel mit eigener TMDB-Kennung: ihr Plakat ist das der Serie selbst, nicht das einer Staffel. */
  eigeneKennung: (id: number) => boolean
  bestand: PlakatBestand
}

/**
 * Welche Reihenmitglieder die Staffelsuche prüft: Titel ohne Eintrag (laut Monitor) und Titel ohne eigene Kennung, deren Plakat noch aus der alten
 * Folge japanisch ist (`japanischOhneBeleg`) — sonst bliebe es bis zum Löschen des Eintrags, obwohl die Staffel ein lesbares Plakat trägt.
 */
export function staffelAnwaerter<T extends { id: number }>(mitglieder: T[], a: StaffelAnwaerter): T[] {
  return mitglieder.filter((t) => {
    if (a.ohne.has(t.id) || !a.serieVon.has(t.id)) return false
    const eintrag = a.bestand[String(t.id)]
    return eintrag === undefined ? a.gesucht.has(t.id) : japanischOhneBeleg(eintrag) && !a.eigeneKennung(t.id)
  })
}

/**
 * Der Bestandseintrag nach der Staffelwahl. Ohne Staffelplakat bekommt ein neuer Titel `null` („TMDB hat keins“), ein vorhandener behält sein Plakat:
 * ein Eintrag, der nur neu geprüft wurde, darf nicht schlechter werden.
 */
export function staffelEintrag(vorher: PlakatEintrag | undefined, wahl: TmdbBild | undefined): PlakatEintrag {
  if (wahl) return plakatEintrag(wahl)
  return vorher === undefined ? null : vorher
}
