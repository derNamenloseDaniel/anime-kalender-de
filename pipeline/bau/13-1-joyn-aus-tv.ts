import { JOYN_SENDER } from '../lib/joyn-sender-luecke.ts'
import type { Release } from '../../shared/types.ts'

/*
  **Joyn zeigt die Folgen nach der Ausstrahlung des TV-Senders — bestätigt, kein „≈“** (Daniel, 26.11.2026, Yaiba:
  Joyn hatte Folge 1–14, das Panel sagte „≈ Fg. 1–10“, „Takt unklar“, „Finale ≈“).

  Hat ein Joyn-Wochentermin einen TV-Partner (gleicher Titel, Sender der ProSieben-Gruppe) mit belegtem Sendeplan
  (`sendeplanBelegt`), übernimmt er dessen Sendetage, Pausen und die Belegung; die Uhrzeit bleibt die des Joyn-Termins
  (Abruf ab Sendeende). Läuft in Phase 10 vor dem Auffalten der Ereignisse und vor `pruefeErgebnis` (dessen Wächter
  `joynHinterTv` sonst vor der Ableitung rot sähe, PR-Datenbau 26.11.2026).
*/
export function leiteJoynAusTv(releases: Release[]): string[] {
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
    abgeleitet.push(joyn.slug)
  }
  return abgeleitet
}
