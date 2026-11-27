/**
 * **Eine gemeldete Prime-Seite aus einer Suche stößt den Bestandsbau an** (Daniel, 26.11.2026): `workflow_dispatch` von `bestand-bauen.yml` über die GitHub-API,
 * entprellt über wartende Läufe. Nur mit `suchUrl` und nur bei Prime; ohne Token tut der Worker nichts. Fester Tag, GitHub und D1 als Attrappe.
 *
 * Aufruf: `npx tsx tools/worker-bau-anstoss.test.ts`
 */
import { handlePruefung } from '../worker/src/pruefung.ts'
import { neueDatenbank, post, umgebung } from './worker-titelzeile-hilfe.ts'
import { festeUhr } from './feste-uhr.ts'

let fehler = 0
const pruefe = (bedingung: boolean, text: string, gefunden?: unknown) => {
  console.log(`  ${bedingung ? 'ok  ' : 'FEHL'} ${text}${bedingung || gefunden === undefined ? '' : ` — ${JSON.stringify(gefunden)}`}`)
  if (!bedingung) fehler++
}
festeUhr('2026-11-26T20:00:00Z')
console.error = () => {}
const log = console.log

const starts: string[] = []
let bisherige: { status: string; created_at: string }[] = []
globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
  const u = String(url)
  if (u.includes('/runs?')) return new Response(JSON.stringify({ workflow_runs: bisherige }), { status: 200 })
  if (u.includes('/dispatches') && init?.method === 'POST') {
    starts.push(u)
    return new Response(null, { status: 204 })
  }
  return new Response('{}', { status: 200 })
}) as typeof fetch

const meldung = (extra: Record<string, unknown> = {}) => ({
  plattform: 'primevideo',
  url: 'https://www.amazon.de/dp/B0FBGJLZ4Y',
  titel: 'Prime-Serie',
  vorhanden: 'ja',
  ton_de: 'ja',
  art: 'gemessen',
  version: '4.32.187',
  ...extra,
})

/** Ruft die Route mit einem `ctx`, das alle `waitUntil`-Aufgaben sammelt und am Ende abwartet. */
async function melde(body: unknown, token = true): Promise<Response> {
  const aufgaben: Promise<unknown>[] = []
  const env = { ...(umgebung(neueDatenbank(), { geschrieben: 0 }, false) as object), ...(token ? { GITHUB_WECKER_TOKEN: 'g' } : {}) } as never
  const r = await handlePruefung(post(body), env, { waitUntil: (p: Promise<unknown>) => void aufgaben.push(p) } as never)
  await Promise.all(aufgaben)
  return r
}
const dispatches = () => starts.filter((u) => u.includes('bestand-bauen.yml/dispatches')).length
const zurueck = () => {
  starts.length = 0
  bisherige = []
}

log('Meldung aus einer Suche')
zurueck()
let r = await melde(meldung({ suchUrl: 'https://www.amazon.de/s?k=Last%20Boss&i=instant-video' }))
pruefe(r.status === 200 && dispatches() === 1, 'angenommen, ein Start von bestand-bauen.yml', { status: r.status, starts })

log('Entprellen')
zurueck()
bisherige = [{ status: 'queued', created_at: '2026-11-26T19:58:00Z' }]
pruefe((await melde(meldung({ suchUrl: 'https://www.amazon.de/s?k=A' }))).status === 200, 'Meldung angenommen')
pruefe(dispatches() === 0, 'wartet schon ein Bau, startet keiner (der wartende nimmt die Meldung mit)')
zurueck()
bisherige = [{ status: 'in_progress', created_at: '2026-11-26T19:50:00Z' }]
pruefe((await melde(meldung({ suchUrl: 'https://www.amazon.de/s?k=A' }))).status === 200, 'Meldung angenommen')
pruefe(dispatches() === 1, 'ein laufender Bau zählt nicht: ein zweiter wird eingereiht')

log('Was nicht anstößt')
zurueck()
await melde(meldung())
pruefe(dispatches() === 0, 'Prime-Meldung ohne suchUrl: kein Start')
await melde(meldung({ plattform: 'netflix', url: 'https://www.netflix.com/title/1', suchUrl: 'https://www.amazon.de/s?k=A' }))
pruefe(dispatches() === 0, 'anderer Anbieter: kein Start')
r = await melde(meldung({ suchUrl: 'https://www.amazon.de/s?k=A' }), false)
pruefe(r.status === 200 && dispatches() === 0, 'ohne Token: angenommen, aber kein Start', { status: r.status })

log('Stapel')
zurueck()
await melde({ stapel: [meldung({ folge_nr: 1 }), meldung({ folge_nr: 2, suchUrl: 'https://www.amazon.de/s?k=A' })] })
pruefe(dispatches() === 1, 'ein Stapel mit einer Such-Meldung stößt genau einmal an', starts)

// Abgelehnte Such-Meldung (ohne `url`) neben einer angenommenen ohne `suchUrl`: nichts Neues im Bau, kein Start.
zurueck()
r = await melde({ stapel: [meldung(), { ...meldung({ suchUrl: 'https://www.amazon.de/s?k=A' }), url: undefined }] })
const abgelehnt = ((await r.json()) as { ergebnisse: { ok: boolean }[] }).ergebnisse
pruefe(r.status === 200 && abgelehnt[0]!.ok && !abgelehnt[1]!.ok, 'Kulisse: die Such-Meldung wird abgelehnt, die andere angenommen', abgelehnt)
pruefe(dispatches() === 0, 'abgelehnte Such-Meldung im Stapel: kein Start', starts)
// Nur abgelehnte Such-Meldungen im Stapel: kein Start.
zurueck()
await melde({ stapel: [{ ...meldung({ suchUrl: 'https://www.amazon.de/s?k=A' }), url: undefined }, { ...meldung({ suchUrl: 'https://www.amazon.de/s?k=B' }), url: undefined }] })
pruefe(dispatches() === 0, 'alle Such-Meldungen abgelehnt: kein Start', starts)

if (fehler) {
  console.error(`${fehler} Zusicherung(en) verletzt`)
  process.exit(1)
}
log('alle Zusicherungen erfüllt')
