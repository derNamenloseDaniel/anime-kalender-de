/**
 * Crunchyroll zählt Folgen absolut, der Datensatz je Staffel (Black Clover Staffel 2, 26.11.2026): Kalender-Folge 174 am 28.11.
 * ist Folge 4 der Staffel (Folge 1 = 171 am 07.11.). Fixtures wörtlich aus dem Datensatz vom 26.11.2026.
 * Aufruf: npx tsx pipeline/check-cr-zaehlung.ts
 */
import { crAbsoluteZaehlungFehler, slotAufStaffelzaehlung } from './lib/cr-zaehlung.ts'
import { derivedStart, observedEpisodes } from './bau/titel-hilfen.ts'
import type { CrunchyrollEntry } from './lib/crunchyroll.ts'
import type { Release, Title } from '../shared/types.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const slot = (obs: { date: string; episode: number }[]): CrunchyrollEntry =>
  ({ time: '17:00', weekday: 5, dates: obs.map((o) => o.date), rawTitle: 'Black Clover (Deutsch)', observations: obs, earliest: obs[0] }) as CrunchyrollEntry

const roh = slot([{ date: '2026-11-28', episode: 174 }])
pruefe('ohne Versatz bleibt der Slot, wie er ist', slotAufStaffelzaehlung(roh, undefined) === roh)
pruefe('vorher: die absolute Nummer landet in observed', JSON.stringify(observedEpisodes(roh)) === '{"174":"2026-11-28"}')

const staffel = slotAufStaffelzaehlung(roh, 171)
pruefe('Folge 174 wird Folge 4', JSON.stringify(observedEpisodes(staffel)) === '{"4":"2026-11-28"}', observedEpisodes(staffel))
pruefe('Start rechnet auf den 07.11. zurück', derivedStart(staffel)?.date === '2026-11-07', derivedStart(staffel))
pruefe('Folgen aus der Vorgängerstaffel entfallen', observedEpisodes(slotAufStaffelzaehlung(slot([{ date: '2026-10-31', episode: 170 }, { date: '2026-11-07', episode: 171 }]), 171)) && Object.keys(observedEpisodes(slotAufStaffelzaehlung(slot([{ date: '2026-10-31', episode: 170 }, { date: '2026-11-07', episode: 171 }]), 171))).join() === '1')

const titel = (episodes?: number) => new Map<number, Title>([[195604, { id: 195604, episodes } as unknown as Title]])
const release = (observed: Record<number, string>, extra: object = {}): Release =>
  ({ slug: 'bc', titleId: 195604, platform: 'crunchyroll', releaseType: 'weekly', schedule: { firstEpisodeDate: '2026-11-07', observed, episodeCount: 12 }, ...extra }) as unknown as Release
const LIVE = { 1: '2026-11-07', 2: '2026-11-14', 3: '2026-11-21', 174: '2026-11-28' }

pruefe('Wächter: Sprung 3 → 174 in einer Woche ist ein Fehler', crAbsoluteZaehlungFehler([release(LIVE)], titel()).length === 1)
pruefe('Wächter: umgerechnet kein Fehler', crAbsoluteZaehlungFehler([release({ 1: '2026-11-07', 2: '2026-11-14', 3: '2026-11-21', 4: '2026-11-28' })], titel()).length === 0)
pruefe('Wächter: Nummer über der Titel-Folgenzahl ist ein Fehler', crAbsoluteZaehlungFehler([release({ 174: '2026-11-28' })], titel(12)).length === 1)
pruefe('Wächter: Staffel ab Folge 13 mit Titel-Folgenzahl 12 ist in Ordnung', crAbsoluteZaehlungFehler([release({ 13: '2026-11-07', 24: '2027-01-23' }, { schedule: { firstEpisodeDate: '2026-11-07', firstEpisodeNumber: 13, episodeCount: 12, observed: { 13: '2026-11-07', 24: '2027-01-23' } } })], titel(12)).length === 0)
pruefe('Wächter: Doppelfolge (Nummer +2 in einer Woche) ist in Ordnung', crAbsoluteZaehlungFehler([release({ 1: '2026-11-07', 3: '2026-11-14' })], titel()).length === 0)
pruefe('Wächter: andere Plattformen bleiben unberührt', crAbsoluteZaehlungFehler([release(LIVE, { platform: 'tv' })], titel()).length === 0)

if (verletzt) {
  console.error(`${verletzt} Prüfung(en) verletzt`)
  process.exit(1)
}
console.log('Crunchyroll-Zählung ok')
