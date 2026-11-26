/**
 * Crunchyroll zählt Folgen absolut, der Datensatz je Staffel (Black Clover Staffel 2, 26.11.2026): Kalender-Folge 174 am 28.11.
 * ist Folge 4 der Staffel (Folge 1 = 171 am 07.11.). Fixtures wörtlich aus dem Datensatz vom 26.11.2026.
 * Aufruf: npx tsx pipeline/check-cr-zaehlung.ts
 */
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parse } from 'yaml'
import type { CrunchyrollEntry } from './lib/crunchyroll.ts'
import type { Release, Title } from '../shared/types.ts'

// `AK_ROOT` vor dem ersten Laden der Bau-Module setzen (`util.ts` liest es beim Import), sonst schriebe der Bau ins echte `public/data`.
const wurzel = mkdtempSync(join(tmpdir(), 'cr-zaehlung-'))
process.env.AK_ROOT = wurzel
const { crAbsoluteZaehlungFehler, slotAufStaffelzaehlung } = await import('./lib/cr-zaehlung.ts')
const { derivedStart, observedEpisodes } = await import('./bau/titel-hilfen.ts')

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

console.log('\nBau (baueReleases mit den echten Black-Clover-Einträgen aus data/curated):')
{
  mkdirSync(join(wurzel, 'data'))
  mkdirSync(join(wurzel, 'public', 'data'), { recursive: true })
  writeFileSync(join(wurzel, 'data', 'ankuendigungen.yaml'), 'eintraege: []\n')
  writeFileSync(join(wurzel, 'data', 'kino-ankuendigungen.yaml'), '[]\n')
  const { baueReleases } = await import('./bau/05-releases.ts')
  type Kuratiert = { slug: string; crZaehlungAb?: number; sprache?: string; platform?: string }
  const alle = parse(readFileSync(join(import.meta.dirname, '..', 'data', 'curated', 'streaming-herbst-2026.yaml'), 'utf8')) as Kuratiert[]
  const eintraege = alle.filter((e) => e.slug.startsWith('black-clover-s2-crunchyroll'))
  const bau = (curated: object[]) =>
    baueReleases({ curated: curated as never, curatedIds: {}, titles: new Map(), tmdb: {}, anisearchEpisodes: () => undefined, findCrunchyroll: () => slot([{ date: '2026-11-28', episode: 174 }]), crKalenderBis: '2026-12-31', crunchyroll: { window: { from: '2026-01-01', to: '2027-01-01' }, entries: [] } as never }).releases
  const von = (rs: Release[], slug: string) => rs.find((r) => r.slug === slug)
  const synchro = 'black-clover-s2-crunchyroll-synchro'
  const mit = bau(eintraege)
  pruefe('Bau: Synchro-Eintrag trägt Folge 4 statt 174', JSON.stringify(von(mit, synchro)?.schedule.observed) === '{"1":"2026-11-07","2":"2026-11-14","3":"2026-11-21","4":"2026-11-28"}', von(mit, synchro)?.schedule.observed)
  pruefe('Bau: Start bleibt der 07.11., kein Staffelstart am 28.11.', von(mit, synchro)?.schedule.firstEpisodeDate === '2026-11-07', von(mit, synchro)?.schedule.firstEpisodeDate)
  const omu = von(mit, 'black-clover-s2-crunchyroll')
  pruefe('Bau: OmU-Begleiter behält den Untertitel-Start 03.10. ohne Beobachtungen', omu?.schedule.firstEpisodeDate === '2026-10-03' && !omu.schedule.observed, omu?.schedule)
  // Gegenprobe: ohne `crZaehlungAb` (Stand vor dem Fix) steht die absolute Nummer im Datensatz und der Wächter schlägt an.
  const ohne = bau(eintraege.map(({ crZaehlungAb: _weg, ...rest }) => rest))
  pruefe('Bau ohne crZaehlungAb: 174 im Datensatz (der Test ist ohne den Fix rot)', von(ohne, synchro)?.schedule.observed?.[174] !== undefined, von(ohne, synchro)?.schedule.observed)
  pruefe('Bau ohne crZaehlungAb: der Wächter schlägt an', crAbsoluteZaehlungFehler(ohne, new Map()).length === 1, crAbsoluteZaehlungFehler(ohne, new Map()))
  pruefe('Bau mit crZaehlungAb: der Wächter schweigt', crAbsoluteZaehlungFehler(mit, new Map()).length === 0, crAbsoluteZaehlungFehler(mit, new Map()))
  pruefe('Nur ein kuratierter Eintrag ist OmU mit Crunchyroll-Slot (Black Clover, Stand 26.11.2026)', alle.filter((e) => e.sprache === 'omu' && e.platform === 'crunchyroll').length === 1)
}

if (verletzt) {
  console.error(`${verletzt} Prüfung(en) verletzt`)
  process.exit(1)
}
console.log('Crunchyroll-Zählung ok')
