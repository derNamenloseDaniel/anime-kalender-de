import { EIGENE_ID_BASIS } from '../../shared/eigene-titel.ts'
import type { Title } from '../../shared/types.ts'
import type { Kontext } from './maengel-regeln.ts'

/** Zu Recht ohne Wertung (23.11.2026): AniList gibt Ankündigungen (`NOT_YET_RELEASED`) keinen `averageScore`/`meanScore`, auch nicht bei Stimmen (Fool Night 213457, 2.5-jigen no Ririsa 2nd Season 185515). Gilt, solange kein Nicht-Disc-Termin begonnen hat, und endet mit dem Start von selbst. */
export const wertungNochOhneStart = (t: Title, k: Kontext): string | undefined => {
  if (t.id >= EIGENE_ID_BASIS) return 'keine-quelle-mit-stimmen'
  const jungOderOhneJahr = !t.jpYear || t.jpYear >= Number(k.heute.slice(0, 4))
  const begonnen = (k.releases.get(t.id) ?? []).some((r) => r.platform !== 'disc' && r.schedule.firstEpisodeDate <= k.heute)
  return jungOderOhneJahr && !begonnen && (!t.jpEnd || t.jpEnd >= k.heute) ? 'noch-ohne-start' : undefined
}
