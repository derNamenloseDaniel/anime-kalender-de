/**
 * Wächter: Bei belegtem Muster „TV-Sender → Joyn nach der Ausstrahlung“ steht Joyn nie hinter dem Fernsehen
 * (Yaiba, 26.11.2026: Joyn hatte Folge 1–14, das Panel zeigte „≈ Fg. 1–10“, „Takt unklar“, „Finale ≈“).
 *
 * Gilt, wenn der TV-Termin `sendeplanBelegt` trägt; dann gibt es am Joyn-Termin desselben Titels weder geschätzte
 * Folgen (`leiteJoynAusTv`) noch weniger ausgestrahlte Folgen als am TV-Termin. Zusätzlich: Kein Belegdatum im Hinweis,
 * es gehört zu den Quellen.
 */
import { JOYN_SENDER } from './joyn-sender-luecke.ts'
import type { Release, ReleaseEvent } from '../../shared/types.ts'

const BELEGVERMERK = /\(\s*seit\s+\d{1,2}\.\d{1,2}\.\d{4}\s+belegt\s*\)/i

function tvPartner(joyn: Release, releases: Release[]): Release | undefined {
  return releases.find(
    (r) =>
      r.platform === 'tv' &&
      r.titleId === joyn.titleId &&
      r.schedule.sendeplanBelegt &&
      JOYN_SENDER.includes((r.sender ?? '').toLowerCase()),
  )
}

/** Fehlerzeilen: Joyn-Folgen hinter den ausgestrahlten TV-Folgen oder geschätzt, obwohl der TV-Plan belegt ist. */
export function joynHinterTv(releases: Release[], events: ReleaseEvent[], heute: string): string[] {
  const fehler: string[] = []
  const bisHeute = (slug: string) => events.filter((e) => e.releaseSlug === slug && e.date <= heute)
  for (const joyn of releases) {
    if (joyn.platform !== 'joyn' || joyn.releaseType !== 'weekly') continue
    const tv = tvPartner(joyn, releases)
    if (!tv) continue
    const joynEvents = events.filter((e) => e.releaseSlug === joyn.slug)
    const geschaetzt = joynEvents.filter((e) => e.estimated).length
    if (geschaetzt) fehler.push(`"${joyn.slug}": ${geschaetzt} Joyn-Folge(n) geschätzt, obwohl der TV-Sendeplan ("${tv.slug}") belegt ist`)
    const tvErschienen = bisHeute(tv.slug).filter((e) => !e.estimated).length
    const joynErschienen = bisHeute(joyn.slug).filter((e) => !e.estimated).length
    if (joynErschienen < tvErschienen) fehler.push(`"${joyn.slug}": Joyn zählt ${joynErschienen} erschienene Folgen, das Fernsehen ("${tv.slug}") ${tvErschienen}`)
  }
  return fehler
}

/** Fehlerzeilen: ein Belegdatum „(seit TT.MM.JJJJ belegt)“ im Hinweis — es gehört zu den Quellen, nicht in den Hauptkasten. */
export function belegvermerkImHinweis(releases: Release[]): string[] {
  return releases.filter((r) => r.hinweis && BELEGVERMERK.test(r.hinweis)).map((r) => `"${r.slug}": Belegdatum im Hinweis ("${r.hinweis}") — gehört zu den Quellen`)
}
