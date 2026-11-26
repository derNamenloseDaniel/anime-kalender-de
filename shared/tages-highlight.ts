/**
 * Das wichtigste Release eines Tages — für das Vorschaubild der Startseite (`pipeline/lib/og-tag.ts`).
 *
 * Rang (höher gewinnt): 5 Erstausgabe · 4 Komplettstart (alle Folgen am selben Tag) oder Kinostart ·
 * 3 Katalogtitel „im Angebot ab" · 2 Start einer wöchentlichen Serie (Folge 1) · 1 Einzelfolge.
 * Gleicher Rang: höhere `dubConfidence`, dann der Slug (stabil, kein Zufall). Der Datensatz hat kein
 * Beliebtheitsfeld; wer eines einführt, ersetzt den Slug-Vergleich (Stand 26.11.2026).
 *
 * Nur belegte Termine: Termin mit `sources`, nicht fortgeschrieben (`estimated`), keine TV-Sichtung, keine
 * ausgebliebene Folge, keine TV-Wiederholung, nicht OmU und kein Titel mit schwacher Synchro-Stufe (`low`).
 * Discs zählen nicht: sie „erscheinen" nicht als Ereignis des Tages.
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
  return !e.estimated && !e.sichtung && !istAusgeblieben(e) && e.tvPremiere !== false
}

function rangVon(release: Release, e: ReleaseEvent): number {
  if (release.erstausgabe) return 5
  if (release.releaseType === 'movie') return 4
  if (release.releaseType === 'batch') return release.dateMeaning === 'available-from' ? 3 : 4
  return e.episode === 1 ? 2 : 1
}

/** Folgenzahl nur, wenn belegt (Termin oder Titel), nie die fortgeschriebene. */
function folgenzahl(release: Release, titel: Title): number | undefined {
  if (release.schedule.episodeCountAssumed) return undefined
  return release.schedule.episodeCount ?? titel.episodes ?? undefined
}

function folgeText(release: Release, titel: Title, events: ReleaseEvent[], e: ReleaseEvent): string {
  if (release.releaseType === 'movie') return 'Kinostart'
  if (release.releaseType === 'batch') {
    if (release.dateMeaning === 'available-from') return 'Neu im Angebot'
    const n = folgenzahl(release, titel)
    return n ? `Alle ${n} Folgen` : 'Alle Folgen'
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
    if (!titel || !release.sources?.length || release.sprache === 'omu' || release.releaseType === 'disc' || titel.dubConfidence === 'low') continue
    const events = expandEvents(release)
    const e = events.find((x) => x.date === heute && zaehlbar(x))
    if (!e) continue
    const kandidat = { release, titleId: titel.id, rang: rangVon(release, e), dub: DUB_RANG[titel.dubConfidence], folge: folgeText(release, titel, events, e), ort: release.releaseType === 'movie' ? 'im Kino' : `auf ${anbieterName(release.platform, release.sender)}` }
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
