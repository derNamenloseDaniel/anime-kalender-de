import { addDays } from '@shared/time.ts'
import { type Dataset } from './data.ts'
import { ohneAusgeblendete } from './ecchi.ts'

/*
  **Wie lange ein Film zurück noch mitläuft.** Ohne belegten letzten Spieltag
  (`cinemaUntil`, aus dem Kinoprogramm) wissen wir nicht, ob er noch läuft. Vier
  Wochen nach dem Start deckt die übliche Auswertung ab; die Karte nennt dann den
  Start, nicht „läuft noch".
*/
const KINO_RUECKBLICK_TAGE = 28

export interface KinoFilm {
  titelId: number
  start: string
  bis?: string
}

/** Laufende Kinofilme (jüngster Start zuerst), dann kommende nach Starttermin. */
export function kinoFilme(data: Dataset, heute: string): KinoFilm[] {
  const ab = addDays(heute, -KINO_RUECKBLICK_TAGE)
  const jeTitel = new Map<number, KinoFilm>()
  for (const r of data.releases) {
    if (r.platform !== 'kino') continue
    const start = r.schedule?.firstEpisodeDate
    if (!start) continue
    if (r.cinemaUntil ? r.cinemaUntil < heute : start < ab) continue
    const bisher = jeTitel.get(r.titleId)
    /* Mehrere Kinotermine eines Titels: ein laufender vor einem kommenden, sonst der nähere. */
    if (bisher) {
      const lief = bisher.start < heute
      const laeuft = start < heute
      const besser = laeuft !== lief ? laeuft : laeuft ? start > bisher.start : start < bisher.start
      if (!besser) continue
    }
    jeTitel.set(r.titleId, { titelId: r.titleId, start, bis: r.cinemaUntil })
  }
  const laufend = [...jeTitel.values()].filter((f) => f.start < heute).sort((a, b) => b.start.localeCompare(a.start))
  const kommend = [...jeTitel.values()].filter((f) => f.start >= heute).sort((a, b) => a.start.localeCompare(b.start))
  return ohneAusgeblendete([...laufend, ...kommend].filter((f) => data.titleById.has(f.titelId)), data.titleById)
}
