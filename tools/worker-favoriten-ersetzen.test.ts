/**
 * **POST /favorites ersetzt nur mit `ersetzen`** (Lehre 242, 23.11.2026): Seitenfassungen vor dem Fix laden ohne
 * Abholen hoch; ihr Stand darf nichts löschen, was ein anderes Gerät gemerkt hat. Der Abgleich holt vorher ab und
 * sendet `ersetzen: true`, nur dann wirkt ein Entfernen.
 *
 * Aufruf: `npx tsx tools/worker-favoriten-ersetzen.test.ts`
 */
import worker from '../worker/src/index.ts'
import { abonnenten, fetchAttrappe, neueDatenbank, testEnv } from './worker-unteraufrufe-attrappe.ts'

let fehler = 0
const pruefe = (bedingung: boolean, text: string, gefunden?: unknown) => {
  console.log(`  ${bedingung ? 'ok  ' : 'FEHL'} ${text}${bedingung ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
  if (!bedingung) fehler++
}
console.error = () => {}

const db = neueDatenbank()
abonnenten(db, 1)
fetchAttrappe('2026-11-23')
const env = testEnv(db, 7)
const ctx = { waitUntil: () => undefined, passThroughOnException: () => undefined } as unknown as ExecutionContext
const gespeichert = () => (db.prepare("SELECT favorites FROM subscribers WHERE pref_token = 'pid0'").get() as { favorites: string }).favorites
const setze = (wert: string) => db.prepare("UPDATE subscribers SET favorites = ?1 WHERE pref_token = 'pid0'").run(wert)
const sende = async (rumpf: Record<string, unknown>) =>
  (
    await worker.fetch(
      new Request('https://w.example.invalid/favorites', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'https://anime-kalender.de' },
        body: JSON.stringify({ token: 'pid0', ak: 1, ...rumpf }),
      }),
      env,
      ctx,
    )
  ).status

console.log('POST /favorites:')
setze('ak:1,2,3')
let status = await sende({ favorites: [9] })
pruefe(status === 200 && gespeichert() === 'ak:1,2,3,9', 'ohne ersetzen (alte Seitenfassung): vereinigt, nichts geht verloren', { status, db: gespeichert() })
status = await sende({ favorites: [] })
pruefe(status === 200 && gespeichert() === 'ak:1,2,3,9', 'ohne ersetzen und leer: Serverstand bleibt', { status, db: gespeichert() })
status = await sende({ favorites: [9], ersetzen: true })
pruefe(status === 200 && gespeichert() === 'ak:9', 'mit ersetzen (Abgleich nach Abholen): ersetzt, Entfernen wirkt', { status, db: gespeichert() })
setze('1,2')
status = await sende({ favorites: [3] })
pruefe(gespeichert() === 'ak:1,2,3', 'alte Liste ohne Vorsatz wird mitgelesen', gespeichert())

if (fehler) process.exit(1)
