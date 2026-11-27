import type { NewsEintrag, ReleaseEvent } from '../../shared/types.ts'
import { BRAUCHT_TAGE, WORKER_TERMINE_DATEI, deckt, type Weitere } from '../../shared/worker-termine.ts'
import { weitereAusNews } from '../../shared/news-weitere.ts'
import { einmal } from './ausbleiben-messer.ts'
import type { Env } from './env.ts'
import { berlinParts, fehlerLog } from './werte.ts'

/**
 * Termine und „Jetzt auch bei“-Zeilen für einen Cron-Aufruf: die kleine Bau-Datei `worker-termine.json` (27.11.2026: 43 KB im Repo,
 * 96 KB im PR-Bau, statt rund 2,3 MB für `events.json` und `releases.json`; siehe `shared/worker-termine.ts`), einmal je Aufruf geladen. Fehlt sie, ist sie veraltet oder hat sie eine andere Form, lesen `termine` und
 * `weitere` wie früher die vollen Dateien (jeweils nur die, die der Aufruf braucht).
 */
export function termineQuelle(env: Env, jetzt: Date, ladeVoll: () => Promise<ReleaseEvent[]>, ladeNews: () => Promise<NewsEintrag[]>) {
  const tag = (tage: number) => berlinParts(new Date(jetzt.getTime() + tage * 86_400_000)).iso
  const klein = einmal(async () => {
    try {
      const res = await fetch(new URL(`data/${WORKER_TERMINE_DATEI}`, env.SITE_URL).toString(), { cf: { cacheTtl: 900 } } as RequestInit)
      const datei: unknown = res.ok ? await res.json() : null
      return deckt(datei, tag(-BRAUCHT_TAGE), tag(BRAUCHT_TAGE)) ? datei : null
    } catch (e) {
      fehlerLog('[termine-quelle] worker-termine.json nicht lesbar, volle Dateien', e) // Netzfehler oder kein JSON
      return null
    }
  })
  return {
    termine: async (): Promise<ReleaseEvent[]> => (await klein())?.termine ?? ladeVoll(),
    weitere: async (): Promise<Weitere[]> => (await klein())?.weitere ?? weitereAusNews(await ladeNews()),
  }
}
