import { expandEvents } from '../../shared/logic.ts'
import { JOYN_SENDER } from '../lib/joyn-sender-luecke.ts'
import type { Release, ReleaseEvent } from '../../shared/types.ts'

/*
  **Joyn zeigt die Folgen nach der Ausstrahlung des TV-Senders — bestätigt, kein „≈“** (Daniel, 26.11.2026, Yaiba:
  Joyn hatte Folge 1–14, das Panel sagte „≈ Fg. 1–10“, „Takt unklar“, „Finale ≈“).

  Hat ein Joyn-Wochentermin einen TV-Partner (gleicher Titel, Sender der ProSieben-Gruppe) mit belegtem Sendeplan
  (`sendeplanBelegt`), übernimmt er dessen Sendetage, Pausen und die Belegung; die Uhrzeit bleibt die des Joyn-Termins
  (Abruf ab Sendeende). Die Ereignisse stehen schon aus Phase 10; nur `estimated` der gleichen `id` wird nachgezogen.
*/
export function leiteJoynAusTv(releases: Release[], events: ReleaseEvent[]): string[] {
  const ereignisNachId = new Map(events.map((e) => [e.id, e]))
  const abgeleitet: string[] = []
  for (const joyn of releases) {
    if (joyn.platform !== 'joyn' || joyn.releaseType !== 'weekly') continue
    const tv = releases.find(
      (r) =>
        r.platform === 'tv' &&
        r.titleId === joyn.titleId &&
        r.releaseType === 'weekly' &&
        r.schedule.sendeplanBelegt &&
        r.schedule.wochentage?.length &&
        JOYN_SENDER.includes((r.sender ?? '').toLowerCase()),
    )
    if (!tv) continue
    joyn.schedule.sendeplanBelegt = true
    joyn.schedule.wochentage = tv.schedule.wochentage
    joyn.schedule.skipDates = tv.schedule.skipDates
    for (const neu of expandEvents(joyn)) {
      const alt = ereignisNachId.get(neu.id)
      if (alt && neu.estimated === undefined) delete alt.estimated
    }
    abgeleitet.push(joyn.slug)
  }
  return abgeleitet
}
