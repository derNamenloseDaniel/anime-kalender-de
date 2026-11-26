/**
 * Wächter: Joyn-Folgen, Takt und Finale folgen dem belegten TV-Sendeplan, ohne „≈“ (Yaiba, 26.11.2026).
 * Fixtures, festes „heute“: kein Datensatz, keine Uhr. Aufruf: npx tsx pipeline/check-joyn-folgen-aus-tv.ts
 */
import { expandEvents } from '../shared/logic.ts'
import { leiteJoynAusTv } from './bau/13-1-joyn-aus-tv.ts'
import { joynHinterTv, belegvermerkImHinweis } from './lib/joyn-folgen-aus-tv.ts'
import { joynAngabe } from '../web/src/lib/joyn.ts'
import type { Release } from '../shared/types.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const HEUTE = '2026-11-26'
const plan = { firstEpisodeDate: '2026-11-05', episodeCount: 24, wochentage: [1, 2, 3, 4, 5], skipDates: ['2026-11-13', '2026-11-17'] }
const bestand = (): Release[] => [
  { slug: 'tv', titleId: 1, name: 'X', platform: 'tv', sender: 'ProSieben MAXX', releaseType: 'weekly', sources: ['https://a.de'], schedule: { ...plan, time: '18:25', sendeplanBelegt: true, observed: { 1: '2026-11-05', 2: '2026-11-06' } } },
  { slug: 'joyn', titleId: 1, name: 'X', platform: 'joyn', releaseType: 'weekly', sources: ['https://b.de'], schedule: { firstEpisodeDate: '2026-11-05', episodeCount: 24, time: '18:50', wochentage: [1, 2, 3, 4, 5], skipDates: plan.skipDates, observed: { 1: '2026-11-05' } } },
] as unknown as Release[]
const events = (rs: Release[]) => rs.flatMap((r) => expandEvents(r))

const vorher = bestand()
const evVorher = events(vorher)
const fehlerVorher = joynHinterTv(vorher, evVorher, HEUTE)
pruefe('ohne Ableitung: Wächter meldet geschätzte Joyn-Folgen und zu wenige erschienene', fehlerVorher.length === 2, fehlerVorher)

const rs = bestand()
const ev = events(rs)
const abgeleitet = leiteJoynAusTv(rs, ev)
pruefe('Joyn-Termin mit TV-Partner wird abgeleitet', abgeleitet.join() === 'joyn', abgeleitet)
const joynEv = ev.filter((e) => e.releaseSlug === 'joyn')
pruefe('kein ≈ an Joyn-Folge 3–24', joynEv.every((e) => !e.estimated), joynEv.filter((e) => e.estimated).length)
pruefe('Finale am 10.12.', joynEv.at(-1)?.date === '2026-12-10' && joynEv.at(-1)?.episode === 24, joynEv.at(-1))
pruefe('Folge 14 am 26.11. (heute) wie beim Fernsehen', joynEv.find((e) => e.episode === 14)?.date === '2026-11-26')
pruefe('Uhrzeit bleibt die des Joyn-Termins', joynEv[0]?.time === '18:50', joynEv[0]?.time)
pruefe('Wächter schweigt nach der Ableitung', joynHinterTv(rs, ev, HEUTE).length === 0, joynHinterTv(rs, ev, HEUTE))

const ohnePlan = bestand()
delete ohnePlan[0]!.schedule.sendeplanBelegt
pruefe('TV ohne belegten Plan: keine Ableitung, kein Wächter-Alarm', leiteJoynAusTv(ohnePlan, events(ohnePlan)).length === 0 && joynHinterTv(ohnePlan, events(ohnePlan), HEUTE).length === 0)

const andererSender = bestand()
andererSender[0]!.sender = 'RTL'
pruefe('Sender ohne Joyn-Muster: keine Ableitung', leiteJoynAusTv(andererSender, events(andererSender)).length === 0)

const mitVermerk = bestand()
mitVermerk[0]!.hinweis = 'Nach der TV-Ausstrahlung auf Joyn (seit 05.11.2026 belegt).'
pruefe('Belegdatum im Hinweis wird gemeldet', belegvermerkImHinweis(mitVermerk).length === 1)
mitVermerk[0]!.hinweis = 'Nach der TV-Ausstrahlung auf Joyn; die Folgenzahl ist nicht belegt.'
pruefe('„nicht belegt“ ohne Datum bleibt erlaubt', belegvermerkImHinweis(mitVermerk).length === 0)

const fenster = (geschaetzt: boolean) => [{ nr: 1, ab: '2026-11-05T18:50', ende: '2026-12-04T23:59', ...(geschaetzt ? { geschaetzt: true as const } : {}) }]
pruefe('Pille ohne geschätztes Fenster: kein ≈', joynAngabe(fenster(false), '2026-11-26T20:40') === 'Fg. 1', joynAngabe(fenster(false), '2026-11-26T20:40'))
pruefe('Pille mit geschätztem Fenster: ≈', joynAngabe(fenster(true), '2026-11-26T20:40') === '≈ Fg. 1', joynAngabe(fenster(true), '2026-11-26T20:40'))

if (verletzt) {
  console.error(`${verletzt} Prüfung(en) verletzt`)
  process.exit(1)
}
console.log('check-joyn-folgen-aus-tv: ok')
