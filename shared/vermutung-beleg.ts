/**
 * **Vermutung durch Beleg ablösen** (27.11.2026, Daniel): Sobald etwas erschienen und belegt ist, verschwindet die Vermutung von selbst.
 * Eine Stelle entscheidet je Marker und Belegen: `bleibt` Vermutung, `belegt` oder `widerlegt`. Bau (`schreibeKatalogRelease`,
 * `loeseFolgenzahlAnnahmen`) und Wächter (`vermutungenMitBeleg`) fragen dieselben Funktionen; Inventur der Marker: `docs/wissen/projektregeln-im-detail.md`.
 */
import type { Release, ReleaseEvent, Schedule } from './types.ts'

export type Beleglage = 'bleibt' | 'belegt' | 'widerlegt'

/** Ein Abruf oder Handbeleg: am Tag `am` (Europe/Berlin) war Folge `folge` (die höchste zu sehende) beim Anbieter da. */
export interface Beobachtung {
  am: string
  folge: number
}

/** Kennung eines Releases → seine Beobachtungen. */
export type Beobachtungen = ReadonlyMap<string, readonly Beobachtung[]>

/**
 * Katalog-Release (`katalog: 'abgeleitet'`): belegt, wenn am Starttag oder davor die letzte Folge zu sehen war; wer später
 * gemessen hat, sagt nichts über den Starttag (Crunchyrolls Katalog stempelt später auch Wochenfolgen auf ein Datum), es bleibt „≈“.
 */
export function urteilKatalog(starttag: string, folgenzahl: number | undefined, beobachtungen: readonly Beobachtung[] = []): Beleglage {
  if (!folgenzahl) return 'bleibt'
  return beobachtungen.some((b) => b.am <= starttag && b.folge >= folgenzahl) ? 'belegt' : 'bleibt'
}

/**
 * Angenommene Folgenzahl (`episodeCountAssumed`): `belegt`, wenn die letzte Folge beobachtet ist und das belegte Ende
 * (`lastEpisodeDate`) auf ihren Tag fällt; `widerlegt`, wenn eine beobachtete Folge über der Zahl liegt; sonst `bleibt`.
 */
export function urteilFolgenzahl(s: Pick<Schedule, 'episodeCount' | 'lastEpisodeDate' | 'observed'>): Beleglage {
  const zahl = s.episodeCount
  if (!zahl) return 'bleibt'
  const folgen = Object.keys(s.observed ?? {}).map(Number)
  if (folgen.some((n) => n > zahl)) return 'widerlegt'
  const letzte = s.observed?.[zahl]
  return letzte && s.lastEpisodeDate === letzte ? 'belegt' : 'bleibt'
}

/** Nimmt `episodeCountAssumed` (und die Herkunft der Vermutung) weg, wo die letzte Folge belegt ist; liefert die Kennungen. */
export function loeseFolgenzahlAnnahmen(releases: Release[]): string[] {
  const geloest: string[] = []
  for (const r of releases) {
    if (!r.schedule.episodeCountAssumed || urteilFolgenzahl(r.schedule) !== 'belegt') continue
    delete r.schedule.episodeCountAssumed
    delete r.schedule.episodeCountSource
    geloest.push(r.slug)
  }
  return geloest
}

/** Marker je Art im erzeugten Datensatz, davon aufgelöst (Beleg liegt vor, Marker steht trotzdem) und die Zeilen dazu. */
export interface VermutungsBilanz {
  katalog: { marker: number; aufloesbar: number }
  folgenzahl: { marker: number; aufloesbar: number }
  zeilen: string[]
}

/** Wächter: jeder Marker im Datensatz, dessen Auflösebeleg vorliegt, ist eine Zeile. Gleiche Funktionen wie der Bau. */
export function vermutungenMitBeleg(releases: readonly Release[], events: readonly ReleaseEvent[], beobachtungen: Beobachtungen): VermutungsBilanz {
  const bilanz: VermutungsBilanz = { katalog: { marker: 0, aufloesbar: 0 }, folgenzahl: { marker: 0, aufloesbar: 0 }, zeilen: [] }
  const gemeldet = new Set<string>()
  for (const e of events) {
    if (e.katalog !== 'abgeleitet') continue
    bilanz.katalog.marker++
    if (urteilKatalog(e.date, e.episodeCount, beobachtungen.get(e.releaseSlug)) !== 'belegt') continue
    bilanz.katalog.aufloesbar++
    const zeile = `Katalog-Release ≈ trotz Beobachtung: ${e.releaseSlug} am ${e.date}`
    if (!gemeldet.has(zeile)) bilanz.zeilen.push(zeile)
    gemeldet.add(zeile)
  }
  for (const r of releases) {
    if (!r.schedule.episodeCountAssumed) continue
    bilanz.folgenzahl.marker++
    if (urteilFolgenzahl(r.schedule) !== 'belegt') continue
    bilanz.folgenzahl.aufloesbar++
    bilanz.zeilen.push(`Folgenzahl angenommen trotz beobachteter letzter Folge: ${r.slug}`)
  }
  return bilanz
}
