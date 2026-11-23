/**
 * Die Rohfolgen-Zeile des Workers und die kleinen Helfer, die der Zuordner (`fetch-rohfolgen.ts`,
 * `rohfolgen-titelwahl.ts`, `rohfolgen-ordnen.ts`) gemeinsam braucht. Aus `fetch-rohfolgen.ts` ausgelagert, Inhalt unverändert.
 */
import type { TmdbFolge } from '../../shared/folgen-zuordnung.ts'
import type { Title } from '../../shared/types.ts'

/** Die Seite einer Gruppe — nur wenn alle Folgen dieselbe nennen. */
export function seiteDer(liste: { seiten_kennung?: string | null }[]): string | null {
  const s = new Set(liste.map((f) => f.seiten_kennung ?? ''))
  return s.size === 1 ? [...s][0] || null : null
}

/** Eine Zeile aus `prime_folge`, so wie der Worker sie ausliefert. */
export interface Rohfolge {
  id: number
  url: string
  asin: string | null
  gti: string | null
  nummer: number | null
  titel: string | null
  erschienen: string | null
  dauer_sek: number | null
  sprachen: string | null
  untertitel: string | null
  staffel_text: string | null
  staffel_nr: number | null
  gemeldet_am: string
  titel_id: number | null
  /*
    **Wer die Folge gemeldet hat** — seit dem 01.09.2026 nicht mehr nur Prime.
    Netflix und Disney+ melden auf denselben Weg; der Zuordner behandelt sie
    gleich, denn seine Anker (Folgentitel, Erstausstrahlung) sind bei allen
    dieselben. Die Spalte entscheidet nur, welcher Verweis im Bestand gemeint
    ist, wenn ein Titel bei mehreren Anbietern laeuft.
  */
  plattform?: string | null
  /** Die Seite, auf der gelesen wurde (Migration 030) — `url` ist die Prüflisten-Adresse. */
  seiten_kennung?: string | null
  /*
    Der Serienname aus der Meldung derselben Adresse — der Worker liefert ihn
    als Unterabfrage mit. Er ist der letzte Anker, wenn unser Bestand die
    Adresse nicht kennt (Prime legt je Staffel eine eigene an).
  */
  serientitel?: string | null
}

/** Ein Name auf seinen Kern — dieselbe Formel wie in `fetch-pruefungen.ts`. */
export function titelSchluessel(name: string): string {
  return String(name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

/**
 * Ist dieser Titel der Kopf seiner Reihe — also das, was ein Anbieter
 * „Staffel 1" nennen würde?
 *
 * Gemessen an der japanischen Ausstrahlung: der älteste Eintrag derselben
 * `franchiseId`. Ein Titel ohne Reihe ist für sich genommen der Kopf.
 */
export function istReihenkopf(titel: Title, alle: Title[]): boolean {
  if (!titel.franchiseId) return true
  const reihe = alle.filter((t) => t.franchiseId === titel.franchiseId && t.jpYear)
  if (reihe.length < 2) return true
  const aeltester = reihe.reduce((a, b) => ((a.jpYear ?? 9999) <= (b.jpYear ?? 9999) ? a : b))
  return aeltester.id === titel.id
}

export interface TmdbEintrag {
  tmdbId: number
  folgen: TmdbFolge[]
}
