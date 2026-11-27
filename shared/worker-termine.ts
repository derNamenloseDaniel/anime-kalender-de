import type { NewsEintrag, ReleaseEvent } from './types.ts'
import { addDays } from './time.ts'
import { weitereAusNews } from './news-weitere.ts'

/**
 * **`worker-termine.json` — was der Cron-Handler des Workers von Termindatei und Meldungen braucht** (26.11.2026).
 * Der Worker parste alle 5 Minuten die 1,3 MB `events.json` (Free-Plan: 10 ms CPU je Aufruf); er braucht nur ein paar Tage rund um jetzt
 * und die „Jetzt auch bei“-Zeilen aus `news.json`. Beides schneidet der Bau vor.
 */
export const WORKER_TERMINE_DATEI = 'worker-termine.json'
/** Tage vor und nach dem Bautag, die die Datei trägt; der Worker verlangt davon ±`BRAUCHT_TAGE` um jetzt, sonst liest er die volle Datei. */
export const ZURUECK_TAGE = 3
export const VOR_TAGE = 8
export const BRAUCHT_TAGE = 2

export type Weitere = ReturnType<typeof weitereAusNews>[number]
export interface WorkerTermine {
  von: string
  bis: string
  termine: ReleaseEvent[]
  weitere: Weitere[]
}

export function schneideWorkerTermine(events: ReleaseEvent[], news: NewsEintrag[], heute: string): WorkerTermine {
  const von = addDays(heute, -ZURUECK_TAGE)
  const bis = addDays(heute, VOR_TAGE)
  return { von, bis, termine: events.filter((e) => e.date >= von && e.date <= bis), weitere: weitereAusNews(news) }
}

/** Ist es eine Datei dieser Form, und trägt sie alle Tage von `brauchtVon` bis `brauchtBis`? */
export function deckt(datei: unknown, brauchtVon: string, brauchtBis: string): datei is WorkerTermine {
  const d = datei as Partial<WorkerTermine> | null
  return Boolean(d && Array.isArray(d.termine) && Array.isArray(d.weitere) && typeof d.von === 'string' && typeof d.bis === 'string' && d.von <= brauchtVon && d.bis >= brauchtBis)
}
