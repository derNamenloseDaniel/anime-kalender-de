/**
 * Das wichtigste Release eines Tages — für das Vorschaubild der Startseite (`pipeline/lib/og-tag.ts`).
 *
 * Rang (höher gewinnt): 5 Erstausgabe · 4 Komplettstart (alle Folgen am selben Tag) oder Kinostart ·
 * 3 Katalogtitel „im Angebot ab" · 2 Start einer wöchentlichen Serie (Folge 1) · 1 Einzelfolge.
 * Gleicher Rang: höhere `dubConfidence`, dann der Slug (stabil, kein Zufall). Der Datensatz hat kein
 * Beliebtheitsfeld; wer eines einführt, ersetzt den Slug-Vergleich (Stand 26.11.2026).
 *
 * Nur belegte Termine: Termin mit `sources`, nicht fortgeschrieben (`estimated`), keine TV-Sichtung, keine
 * ausgebliebene Folge, kein Fernsehen (`tvPremiere` rechnet erst der Bau, hier fehlt es: Wiederholung nicht ausschließbar), keine Sprachangabe am Release (`omu`/`offen`: Synchro nicht
 * belegt) und kein Titel mit schwacher Synchro-Stufe (`low`). Discs (Typ oder Plattform) zählen nicht.
 * `movie` ist Kino- oder Streamstart: „im Kino" nur bei Plattform `kino`, sonst „Film auf <Anbieter>".
 */
import { anbieterName, type DubConfidence, type Release, type ReleaseEvent, type Title } from './types.ts'
import { expandEvents } from './logic.ts'
import { folgenblockBis } from './folgenblock.ts'
import { istAusgeblieben } from './termin-zustand.ts'

export interface Tageshighlight {
  release: Release
  titleId: number
  rang: number
  /** Neben der Datumsmarke im Bild („Alle 12 Folgen", „Folge 5"). */
  folge: string
  /** Wo es erscheint („auf Netflix"). */
  ort: string
}

const DUB_RANG: Record<DubConfidence, number> = { low: 0, normal: 1, high: 2, 'very-high': 3 }

function zaehlbar(e: ReleaseEvent): boolean {
  return !e.estimated && !e.sichtung && !istAusgeblieben(e)
}

function rangVon(release: Release, e: ReleaseEvent): number {
  if (release.erstausgabe) return 5
  if (release.releaseType === 'movie') return 4
  if (release.releaseType === 'batch') return release.dateMeaning === 'available-from' ? 3 : 4
  return e.episode === 1 ? 2 : 1
}

/** Folgenzahl nur aus der Angabe dieses Releases, nie fortgeschrieben, nie `titel.episodes` (kann mehrere Staffeln zählen). */
export function folgenzahl(release: Release): number | undefined {
  if (release.schedule.episodeCountAssumed) return undefined
  return release.schedule.episodeCount ?? undefined
}

function folgeText(release: Release, events: ReleaseEvent[], e: ReleaseEvent): string {
  if (release.releaseType === 'movie') return release.platform === 'kino' ? 'Kinostart' : 'Film'
  if (release.releaseType === 'batch') {
    if (release.dateMeaning === 'available-from') return 'Neu im Angebot'
    const n = folgenzahl(release)
    return n && n >= 2 ? `Alle ${n} Folgen` : 'Neu'
  }
  if (e.episode == null) return 'Neue Folge'
  const bis = folgenblockBis(events, e)
  return bis ? `Folgen ${e.episode}–${bis}` : `Folge ${e.episode}`
}

/** Das Highlight des Tages `heute` oder `undefined`, wenn nichts Belegtes erscheint. */
export function waehleTageshighlight(releases: Release[], titelVon: Map<number, Title>, heute: string): Tageshighlight | undefined {
  let bester: (Tageshighlight & { dub: number }) | undefined
  for (const release of releases) {
    const titel = titelVon.get(release.titleId)
    if (!titel || !release.sources?.length || release.sprache || release.releaseType === 'disc' || release.platform === 'disc' || release.platform === 'unbekannt' || release.platform === 'tv' || titel.dubConfidence === 'low') continue
    const events = expandEvents(release)
    const e = events.find((x) => x.date === heute && zaehlbar(x))
    if (!e) continue
    const kandidat = { release, titleId: titel.id, rang: rangVon(release, e), dub: DUB_RANG[titel.dubConfidence], folge: folgeText(release, events, e), ort: release.platform === 'kino' ? 'im Kino' : `auf ${anbieterName(release.platform, release.sender)}` }
    if (!bester || vorn(kandidat, bester)) bester = kandidat
  }
  if (!bester) return undefined
  const { dub: _dub, ...ergebnis } = bester
  return ergebnis
}

function vorn(a: Tageshighlight & { dub: number }, b: Tageshighlight & { dub: number }): boolean {
  if (a.rang !== b.rang) return a.rang > b.rang
  if (a.dub !== b.dub) return a.dub > b.dub
  return a.release.slug < b.release.slug
}
