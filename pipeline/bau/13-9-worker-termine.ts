import type { NewsEintrag, ReleaseEvent } from '../../shared/types.ts'
import { WORKER_TERMINE_DATEI, schneideWorkerTermine } from '../../shared/worker-termine.ts'
import { todayIso } from '../../shared/time.ts'
import { log, readJson, writeJson } from '../lib/util.ts'
import { OUT } from './grundlagen.ts'

/** **`worker-termine.json`**: der Ausschnitt von `events.json` und `news.json`, den der Cron-Handler des Workers liest (`shared/worker-termine.ts`). */
export function schreibeWorkerTermine(): void {
  const events = readJson<ReleaseEvent[]>(`${OUT}/events.json`, [])
  const news = readJson<NewsEintrag[]>(`${OUT}/news.json`, [])
  const datei = schneideWorkerTermine(events, news, todayIso())
  writeJson(`${OUT}/${WORKER_TERMINE_DATEI}`, datei)
  log(`${WORKER_TERMINE_DATEI} ${datei.von}–${datei.bis}: ${datei.termine.length} Termine, ${datei.weitere.length} „Jetzt auch bei“-Zeilen`)
}
