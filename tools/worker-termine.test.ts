/**
 * **Cron-CPU des Workers** (26.11.2026, Wache „Datenbankverbrauch“: Cron-CPU p99 72,8 ms über 8 ms): Der Cron parste alle 5 Minuten die 1,3 MB `events.json`
 * (stündlich dazu `news.json`, der Monitor las sie noch einmal ganz). Jetzt: kleine Bau-Datei `worker-termine.json`, Ausschnitt aus den vollen Dateien;
 * der Monitor liest nur den Anfang jeder Seite. Geprüft: Ausschnitt gleich den vollen Dateien (roh und in eigenen Kennungen), Worker liest die kleine Datei,
 * fällt bei veralteter, fehlender oder fremd geformter Datei auf die vollen Dateien zurück, `leseAnfang` bricht das Lesen ab.
 *
 * Aufruf: `npx tsx tools/worker-termine.test.ts`
 */
import { readFileSync } from 'node:fs'
import type { NewsEintrag, ReleaseEvent } from '../shared/types.ts'
import { weitereAusNews } from '../shared/news-weitere.ts'
import { WORKER_TERMINE_DATEI, deckt, schneideWorkerTermine, type WorkerTermine } from '../shared/worker-termine.ts'
import { termineQuelle } from '../worker/src/termine-quelle.ts'
import { leseAnfang } from '../worker/src/monitor.ts'
import { ladeAkVon, uebersetzeDatei } from '../pipeline/lib/ausgabe-kennung.ts'
import type { Env } from '../worker/src/env.ts'

let fehler = 0
const pruefe = (bedingung: boolean, text: string) => {
  console.log(`  ${bedingung ? 'ok  ' : 'FEHL'} ${text}`)
  if (!bedingung) fehler++
}
const lies = <T>(name: string): T => JSON.parse(readFileSync(`public/data/${name}`, 'utf8')) as T

/** Der Ausschnitt steht Eintrag für Eintrag in den vollen Dateien, roh und nach der Übersetzung in eigene Kennungen. */
function bestand() {
  console.log('Bestand: worker-termine.json gegen events.json und news.json')
  const [datei, events, news] = [lies<WorkerTermine>(WORKER_TERMINE_DATEI), lies<ReleaseEvent[]>('events.json'), lies<NewsEintrag[]>('news.json')]
  const erwartet = events.filter((e) => e.date >= datei.von && e.date <= datei.bis)
  pruefe(JSON.stringify(datei.termine) === JSON.stringify(erwartet), `${datei.termine.length} Termine ${datei.von}–${datei.bis} gleich events.json`)
  pruefe(datei.termine.length > 0, 'die Datei hat Termine')
  pruefe(JSON.stringify(datei.weitere) === JSON.stringify(weitereAusNews(news)), `${datei.weitere.length} „Jetzt auch bei“-Zeilen gleich news.json`)
  const { akVon } = ladeAkVon('data/kennungen.json')
  const ak = (name: string, d: unknown) => uebersetzeDatei(name, d, akVon)
  const datAk = ak(WORKER_TERMINE_DATEI, datei) as WorkerTermine
  const eventsAk = ak('events.json', events) as ReleaseEvent[]
  const newsAk = ak('news.json', news) as NewsEintrag[]
  pruefe(JSON.stringify(datAk.termine) === JSON.stringify(eventsAk.filter((e) => e.date >= datei.von && e.date <= datei.bis)), 'nach der Übersetzung: Termine gleich events.json')
  pruefe(JSON.stringify(datAk.weitere) === JSON.stringify(weitereAusNews(newsAk)), 'nach der Übersetzung: „Jetzt auch bei“ gleich news.json')
  pruefe(datei.termine.some((e) => e.titleId !== (datAk.termine.find((x) => x.id === e.id)?.titleId ?? e.titleId)) || datei.termine.length === 0, 'die Übersetzung ändert Kennungen (Kontrolle, dass sie greift)')
}

function schnitt() {
  console.log('Schnitt und Deckung:')
  const e = (date: string) => ({ id: date, date, titleId: 1 }) as unknown as ReleaseEvent
  const d = schneideWorkerTermine([e('2026-11-01'), e('2026-11-22'), e('2026-11-23'), e('2026-12-04'), e('2026-12-05')], [], '2026-11-26')
  pruefe(d.von === '2026-11-23' && d.bis === '2026-12-04', `Fenster ${d.von}–${d.bis}`)
  pruefe(d.termine.map((x) => x.date).join() === '2026-11-23,2026-12-04', 'nur Termine im Fenster')
  pruefe(deckt(d, '2026-11-24', '2026-11-28'), 'deckt jetzt ± 2 Tage')
  pruefe(!deckt(d, '2026-11-22', '2026-11-28'), 'zu alt: deckt nicht')
  pruefe(!deckt(d, '2026-12-02', '2026-12-06'), 'zu weit vorn: deckt nicht')
  pruefe(!deckt([], '2026-11-24', '2026-11-28') && !deckt(null, 'a', 'b'), 'fremde Form: deckt nicht')
}

const env = { SITE_URL: 'https://anime-kalender.de/' } as Env

/** `fetch` mit Zähler je Datei; `kleine` ist die Antwort auf `worker-termine.json`. */
function mitFetch(kleine: () => Response) {
  const abrufe: string[] = []
  globalThis.fetch = (async (eingabe: RequestInfo | URL) => {
    const url = String(eingabe instanceof Request ? eingabe.url : eingabe)
    abrufe.push(url.split('/data/')[1] ?? url)
    return url.includes(WORKER_TERMINE_DATEI) ? kleine() : new Response('[]')
  }) as typeof fetch
  return abrufe
}

async function worker() {
  console.log('Worker liest die kleine Datei, sonst die vollen:')
  const jetzt = new Date('2026-11-26T20:00:00Z')
  const frisch = schneideWorkerTermine([{ id: 'a', date: '2026-11-26', titleId: 5 } as unknown as ReleaseEvent], [], '2026-11-26')
  let vollEvents = 0
  let vollNews = 0
  const quelle = (jetztZeit = jetzt) => termineQuelle(env, jetztZeit, async () => (vollEvents++, [{ id: 'voll' } as unknown as ReleaseEvent]), async () => (vollNews++, []))

  let abrufe = mitFetch(() => new Response(JSON.stringify(frisch)))
  const q = quelle()
  const t = await q.termine()
  await q.weitere()
  pruefe(t[0]?.id === 'a' && vollEvents === 0 && vollNews === 0, 'frische Datei: keine vollen Dateien')
  pruefe(abrufe.length === 1 && abrufe[0] === WORKER_TERMINE_DATEI, `ein Abruf (${abrufe.join(',')})`)

  vollEvents = 0
  abrufe = mitFetch(() => new Response(JSON.stringify(frisch)))
  const alt = quelle(new Date('2026-12-04T10:00:00Z'))
  pruefe((await alt.termine())[0]?.id === 'voll' && vollEvents === 1, 'veraltete Datei (jetzt + 2 Tage hinter dem Fenster): volle events.json')
  void abrufe

  for (const [name, antwort] of [
    ['404', () => new Response('weg', { status: 404 })],
    ['kein JSON', () => new Response('<html>')],
    ['Array statt Objekt', () => new Response('[]')],
  ] as const) {
    vollEvents = vollNews = 0
    mitFetch(antwort)
    const f = quelle()
    const w = await f.weitere()
    pruefe((await f.termine())[0]?.id === 'voll' && vollEvents === 1 && vollNews === 1 && Array.isArray(w), `${name}: volle Dateien`)
  }
  vollEvents = vollNews = 0
  globalThis.fetch = (async () => { throw new Error('Netz') }) as typeof fetch
  pruefe((await quelle().termine())[0]?.id === 'voll' && vollEvents === 1, 'Netzfehler: volle events.json')

  vollEvents = vollNews = 0
  mitFetch(() => new Response(JSON.stringify(frisch)))
  await quelle().termine()
  pruefe(vollNews === 0, 'ohne Bedarf an den Meldungen werden sie nicht geladen')
}

/** Eine Antwort in Stücken zu 16 KB wie aus dem Netz; zeigt, ob der Leser das Lesen abgebrochen hat. */
function stuecke(gesamt: number) {
  const zustand = { gelesen: 0, abgebrochen: false }
  let rest = gesamt
  const body = new ReadableStream<Uint8Array>({
    pull(c) {
      const n = Math.min(16_384, rest)
      if (n === 0) return c.close()
      rest -= n
      zustand.gelesen += n
      c.enqueue(new TextEncoder().encode('x'.repeat(n)))
    },
    cancel() {
      zustand.abgebrochen = true
    },
  })
  return { res: new Response(body), zustand }
}

async function anfang() {
  console.log('Monitor liest nur den Anfang:')
  const gross = stuecke(1_300_000)
  const text = await leseAnfang(gross.res)
  pruefe(text.length >= 64 * 1024 && text.length < 128 * 1024, `${text.length} Zeichen von 1,3 MB`)
  pruefe(gross.zustand.abgebrochen && gross.zustand.gelesen < 200_000, `Lesen abgebrochen nach ${gross.zustand.gelesen} Byte`)
  const klein = await leseAnfang(new Response('abc "date" def'))
  pruefe(klein === 'abc "date" def', 'kleine Antwort ganz')
  pruefe((await leseAnfang(new Response(null, { status: 204 }))) === '', 'leere Antwort: leerer Text')
}

console.error = () => {}
bestand()
schnitt()
await worker()
await anfang()
console.log(fehler ? `\n${fehler} Prüfung(en) rot` : '\nalle Prüfungen grün')
process.exit(fehler ? 1 : 0)
