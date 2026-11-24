/**
 * **Der Worker liest `ak-umleitung.json` mit Dreiern** (F157, 24.11.2026): Paare mit Versatz `[alt, neu, versatz]` (Horizonte-Staffeln)
 * lädt `ladeKennungen` wie bisher als alt → neu; eine gemerkte Liste mit alter Staffel und Serie wird ein Eintrag. Der Versatz betrifft
 * nur „gesehen bis“ im Browser, der Worker braucht ihn nicht (der live Worker liest die Datei unverändert weiter).
 *
 * Aufruf: `npx tsx tools/worker-ak-umleitung-versatz.test.ts`
 */
import { ladeKennungen, leseFavoriten, vereinigeGespeichert, zaehleFavoriten } from '../worker/src/favoriten-kennung.ts'

let fehler = 0
const pruefe = (bedingung: boolean, text: string) => {
  console.log(`  ${bedingung ? 'ok  ' : 'FEHL'} ${text}`)
  if (!bedingung) fehler++
}

const abrufe: string[] = []
globalThis.fetch = (async (adresse: string) => {
  abrufe.push(String(adresse))
  return new Response(JSON.stringify([[26469, 14839], [26470, 14839, 45], [26471, 14839, 89], [5, 6]]), { status: 200 })
}) as typeof fetch

const kennungen = await ladeKennungen({ SITE_URL: 'https://anime-kalender.de/' })
pruefe(abrufe.length === 1 && abrufe[0] === 'https://anime-kalender.de/data/ak-umleitung.json', 'ak-umleitung.json der Seite wird geladen')
pruefe(kennungen.umleitung?.get(26470) === 14839 && kennungen.umleitung?.get(26471) === 14839 && kennungen.umleitung?.get(5) === 6, 'Dreier: alt → neu, das dritte Element fällt weg')
pruefe([...leseFavoriten('ak:26469,14839', kennungen)].join() === '14839', 'Favoriten [26469, 14839] → genau ein Eintrag')
pruefe([...leseFavoriten('ak:26470,26471,7', kennungen)].join() === '14839,7', 'zwei alte Staffeln und ein fremder Titel → zwei Einträge')
pruefe(zaehleFavoriten('ak:26469,14839') === 2, 'ohne Kennungen wird nicht umgeleitet (gespeicherte Liste bleibt, wie sie ist)')
pruefe(vereinigeGespeichert('ak:26469', 'ak:14839') === 'ak:26469,14839', 'Vereinigen schreibt nichts um (Umleiten erst beim Lesen)')

console.log(fehler ? `worker-ak-umleitung-versatz: ${fehler} Fehler` : 'worker-ak-umleitung-versatz: alle Fälle grün')
process.exit(fehler ? 1 : 0)
