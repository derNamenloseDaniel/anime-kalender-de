/**
 * **Folgen vor dem ersten Termin ohne Beleg** (The Mighty Nein, 26.11.2026): Beginnt der früheste Termin eines Titels hinter Folge 1 und liegt
 * er innerhalb der Folgenzahl des Titels, müssen die Folgen davor belegt sein (Handbeleg `dubRanges`, `antwort-davor.ts`). Sonst weiß der
 * Kasten nicht, ob sie erschienen sind, und zählt 0.
 */
import type { Release, Title } from '../../shared/types.ts'
import { folgenDavor } from '../../web/src/components/detail/antwort-davor.ts'
import { belegendeStreams, vereinteFolgen } from '../../web/src/components/detail/antwort-berechnen.ts'

export type DavorOhneBeleg = { titleId: number; titel: string; fehlen: number[] }

export function davorOhneBeleg(titel: Title[], releases: Release[], heute: string): DavorOhneBeleg[] {
  const jeTitel = new Map<number, Release[]>()
  for (const r of releases) jeTitel.set(r.titleId, [...(jeTitel.get(r.titleId) ?? []), r])
  return titel.flatMap((t): DavorOhneBeleg[] => {
    const rs = (jeTitel.get(t.id) ?? []).filter((r) => !r.widerlegt)
    const davor = folgenDavor(rs, t.episodes)
    if (!davor.length) return []
    const belegt = vereinteFolgen(t, belegendeStreams(t, heute).belegen, t.episodes)
    const fehlen = davor.filter((nr) => !belegt.has(nr))
    return fehlen.length ? [{ titleId: t.id, titel: t.titleEn ?? t.titleDe ?? String(t.id), fehlen }] : []
  })
}
