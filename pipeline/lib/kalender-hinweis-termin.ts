/**
 * Kalender-Plausibilität, Regel 7: Der Hinweis eines Wochenreleases nennt einen Wochentag oder eine Uhrzeit, die kein Termin daneben trägt
 * (Tokyo Revengers S3: Hinweis „… Anime2You nennt samstags“, alle Termine freitags). Die Kachel entscheidet dann leise für eine Seite.
 * Rein; Wochentag nur über `weekdayIndex` (shared/time.ts, Termine stehen in Europe/Berlin).
 */
import type { Release, ReleaseEvent, Title } from '../../shared/types.ts'
import { weekdayIndex } from '../../shared/time.ts'

/** Weniger Termine sind kein Takt (Einzeltermine, „Folgen ab 2 kommen samstags“ im Schwester-Release). */
const MIN_TERMINE = 3

const TAGE = ['montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag', 'sonntag']

/** Wochentage (0 = Montag) und Uhrzeiten, die der Hinweistext nennt. */
export function hinweisAngaben(hinweis: string): { tage: Set<number>; zeiten: Set<string> } {
  const klein = hinweis.toLowerCase()
  const tage = new Set<number>()
  TAGE.forEach((t, i) => {
    if (new RegExp(`\\b${t}s?\\b`).test(klein)) tage.add(i)
  })
  const zeiten = new Set([...hinweis.matchAll(/\b(\d{1,2}):(\d{2})\b/g)].map((m) => `${m[1]!.padStart(2, '0')}:${m[2]}`))
  return { tage, zeiten }
}

/** Ein Satz je Widerspruch (leer = Hinweis und Termine stimmen überein). */
export function hinweisWiderspruch(hinweis: string, termine: Pick<ReleaseEvent, 'date' | 'time'>[]): string[] {
  if (termine.length < MIN_TERMINE) return []
  const { tage, zeiten } = hinweisAngaben(hinweis)
  const terminTage = new Set(termine.map((e) => weekdayIndex(e.date)))
  const terminZeiten = new Set(termine.map((e) => e.time).filter((z): z is string => !!z))
  const aus: string[] = []
  for (const t of tage) if (!terminTage.has(t)) aus.push(`Hinweis nennt ${TAGE[t]}s, kein Termin liegt darauf`)
  if (terminZeiten.size) for (const z of zeiten) if (!terminZeiten.has(z)) aus.push(`Hinweis nennt ${z} Uhr, kein Termin hat sie`)
  return aus
}

export function hinweisGegenTermin(b: { titles: Title[]; releases: Release[]; events: ReleaseEvent[] }): { titleId: number; schluessel: string; text: string }[] {
  const titel = new Map(b.titles.map((t) => [t.id, t]))
  const termine = new Map<string, ReleaseEvent[]>()
  for (const e of b.events) termine.set(e.releaseSlug, [...(termine.get(e.releaseSlug) ?? []), e])
  return b.releases.flatMap((r) => {
    if (!r.hinweis) return []
    const t = titel.get(r.titleId)
    const name = t?.titleDe ?? t?.titleEn ?? t?.titleRomaji ?? String(r.titleId)
    return hinweisWiderspruch(r.hinweis, termine.get(r.slug) ?? []).map((w) => ({ titleId: r.titleId, schluessel: `${r.slug}|${w}`, text: `${name} (${r.slug}): ${w}` }))
  })
}
