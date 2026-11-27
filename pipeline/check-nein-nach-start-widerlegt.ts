/**
 * Zusicherungen zu `bau/nein-nach-start-widerlegt.ts` (27.11.2026): Ein „Synchro offen“-Termin, dessen Handbeleg-Nein nach dem Starttag
 * gemessen ist, gilt als widerlegt (nicht gelöscht); vorher gemessen, am Starttag selbst, mit späterem Ja oder als Kanal-Nein ohne Beleg
 * bleibt er offen. Alle Daten sind Fixtures, „heute“ steht fest (kein Bestand, keine Systemuhr).
 */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pruefeSynchroJePlattform } from './bau/09-synchro.ts'
import { widerlegeNeinNachStart } from './bau/nein-nach-start-widerlegt.ts'
import { berechneAntwort } from '../web/src/components/detail/antwort-berechnen.ts'
import { widerlegtTexte } from '../web/src/components/detail/kasten-texte.ts'
import { festeUhr } from '../tools/feste-uhr.ts'
import type { Release, Title } from '../shared/types.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const HEUTE = '2026-12-01'
type Belege = Parameters<typeof widerlegeNeinNachStart>[1]
const termin = (extra: Partial<Release> = {}): Release =>
  ({ slug: 's', name: 'Probe', titleId: 7, platform: 'primevideo', kanal: 'Aniverse', automatisch: true, sprache: 'offen', schedule: { firstEpisodeDate: '2026-11-26' }, sources: ['https://a/'], ...extra }) as unknown as Release
const nein = (checkedAt: string, extra = {}) => ({ anilistId: 7, platform: 'primevideo' as const, url: 'https://www.amazon.de/gp/video/detail/X', dub: false, checkedAt, ...extra })
const ja = (checkedAt: string, extra = {}) => ({ ...nein(checkedAt), dub: true, ...extra })
const lauf = (r: Release, belege: unknown[], heute = HEUTE) => widerlegeNeinNachStart([r], belege as Belege, heute)

console.log('\nNein nach dem Starttag:')
{
  const danach = termin()
  pruefe('Nein am Tag nach dem Start widerlegt', lauf(danach, [nein('2026-11-27')]).join() === 's' && danach.widerlegt?.am === '2026-11-26', danach.widerlegt)
  pruefe('Grund nennt Anbieter und Messtag, Quelle ist die Seite', /Prime Video führt am 2026-11-27 nur den Originalton/.test(danach.widerlegt?.grund ?? '') && danach.widerlegt?.quelle === 'https://www.amazon.de/gp/video/detail/X', danach.widerlegt)
  pruefe('Anbieter mit Kanal', danach.widerlegt?.anbieter === 'Prime Video (Aniverse)', danach.widerlegt?.anbieter)
  pruefe('News: gemeldet, also keine eigene „erscheint“-Meldung', danach.widerlegt?.gemeldet === true, danach.widerlegt)
  pruefe('Termin bleibt im Datensatz (nur gekennzeichnet)', danach.sprache === 'offen' && danach.slug === 's')
  const zwei = termin()
  lauf(zwei, [nein('2026-11-27'), nein('2026-11-15'), nein('2026-12-01')])
  pruefe('mehrere Neins nach dem Start: das jüngste nennt der Grund', /2026-12-01/.test(zwei.widerlegt?.grund ?? ''), zwei.widerlegt?.grund)
  const altesJa = termin()
  pruefe('Ja zwischen zwei Neins: das jüngste Nein gilt, widerlegt', lauf(altesJa, [nein('2026-11-27'), ja('2026-11-29'), nein('2026-12-01')]).length === 1 && /2026-12-01/.test(altesJa.widerlegt?.grund ?? ''), altesJa.widerlegt)
  const jaDavor = termin()
  pruefe('Ja 20.11. vor dem Nein 26.11.+ hebt nichts auf: widerlegt', lauf(jaDavor, [ja('2026-11-20'), nein('2026-11-27')]).length === 1)
}

console.log('\nBleibt offen:')
{
  const vorher = termin()
  pruefe('Nein vor dem Start: der Ton kann noch kommen', lauf(vorher, [nein('2026-11-25')]).length === 0 && !vorher.widerlegt)
  const amTagGemessen = termin()
  pruefe('Nein am Starttag, Bau am Starttag: kann vor dem Anbieterstart gemessen sein', lauf(amTagGemessen, [nein('2026-11-26')], '2026-11-26').length === 0 && !amTagGemessen.widerlegt)
  const amTagSpaeter = termin()
  pruefe('Nein am Starttag, Bau am Tag danach: widerlegt', lauf(amTagSpaeter, [nein('2026-11-26')], '2026-11-27').length === 1)
  const jaGleich = termin()
  pruefe('Ja am selben Tag wie das Nein hebt das Nein auf', lauf(jaGleich, [nein('2026-11-27'), ja('2026-11-27')]).length === 0)
  const spaeterJa = termin()
  pruefe('jüngeres Ja hebt das Nein auf', lauf(spaeterJa, [nein('2026-11-27'), ja('2026-11-28')]).length === 0)
  const kanalJa = termin()
  pruefe('Kanal-Ja ohne Beleg hebt das Nein nicht auf', lauf(kanalJa, [nein('2026-11-27'), ja('2026-11-28', { kanalOhneBeleg: true })]).length === 1)
  const kanal = termin()
  pruefe('Kanal-Nein ohne Beleg (Amazons Kanal-Angabe) widerlegt nichts', lauf(kanal, [nein('2026-11-27', { kanalOhneBeleg: true })]).length === 0)
  const urteilJa = termin()
  pruefe('jüngstes Urteil derselben Adresse „ja“ widerlegt nichts', lauf(urteilJa, [nein('2026-11-27', { juengstesUrteil: 'ja' })]).length === 0)
  const ohneOffen = termin({ sprache: undefined })
  pruefe('Termin ohne „Synchro offen“ (Ja-Weg, Handtermin) bleibt', lauf(ohneOffen, [nein('2026-11-27')]).length === 0)
  const omu = termin({ sprache: 'omu' })
  pruefe('OmU-Termin bleibt (versprach keine Synchro)', lauf(omu, [nein('2026-11-27')]).length === 0)
  const hand = termin({ automatisch: false })
  pruefe('Handtermin bleibt', lauf(hand, [nein('2026-11-27')]).length === 0)
  const andere = termin({ platform: 'netflix' })
  pruefe('Nein einer anderen Plattform zählt nicht', lauf(andere, [nein('2026-11-27')]).length === 0)
}

console.log('\nPanel (berechneAntwort → widerlegtTexte):')
{
  const T = (k: string, v?: Record<string, string | number>) => `${k}${v ? JSON.stringify(v) : ''}`
  const titel = { id: 7, slug: 'x7', format: 'TV', jpYear: 2025, episodes: 12, hasVoices: true, watchLinks: [], titleDe: 'Probe', streams: [{ platform: 'primevideo', url: 'https://x/p', dub: false }] } as unknown as Title
  const antwort = (r: Release) => berechneAntwort({ title: titel, releases: [r], today: HEUTE, jetzt: new Date(`${HEUTE}T12:00:00+01:00`) }) as { art: string; anbieter?: string } | undefined
  const r = termin()
  lauf(r, [nein('2026-11-27')])
  const a = antwort(r)
  pruefe('Antwort ist „widerlegt“ und trägt den Anbieter des Handbelegs', a?.art === 'widerlegt' && a.anbieter === 'Prime Video (Aniverse)', a)
  pruefe('Panel nennt den Anbieter, nicht Crunchyrolls Wochenprogramm', /widerlegtNebenAnbieter.*Prime Video \(Aniverse\)/.test(widerlegtTexte(a as never, T).neben), a && widerlegtTexte(a as never, T).neben)
  const wochen = antwort(termin({ widerlegt: { am: '2026-11-26', grund: 'x', gemeldet: false } }))
  pruefe('Wochenprogramm-Widerlegung (ohne Anbieter) bleibt beim alten Text', wochen?.art === 'widerlegt' && /antwort\.widerlegtNeben\{/.test(widerlegtTexte(wochen as never, T).neben), wochen)
}

console.log('\nVerdrahtung in Bauphase 9 (Handbelege als Fixture, Bautag fest):')
{
  const queen = termin({ slug: 'auto-156040-primevideo', titleId: 156040, sprache: undefined })
  const trinity = termin({ slug: 'auto-103631-primevideo', titleId: 103631, sprache: undefined, schedule: { firstEpisodeDate: '2026-10-15' } as Release['schedule'] })
  const handbelege = [
    nein('2026-11-27', { anilistId: 156040, url: 'https://www.amazon.de/gp/video/detail/B0FBGJHHXK' }),
    nein('2026-11-10', { anilistId: 156040, url: 'https://www.amazon.de/gp/video/detail/B0FBGJHHXK' }),
    nein('2026-11-20', { anilistId: 103631, url: 'https://www.amazon.de/dp/B0HFKQ7R7T', kanalOhneBeleg: true }),
    nein('2026-11-20', { anilistId: 900001, url: 'https://www.amazon.de/dp/B000000001' }),
  ]
  const schreibWurzel = mkdtempSync(join(tmpdir(), 'nein-nach-start-'))
  const zurueck = festeUhr(`${HEUTE}T12:00:00Z`)
  try {
    pruefeSynchroJePlattform({
      releases: [queen, trinity],
      titles: new Map(),
      crBySeriesId: new Map(),
      tmdbMehrdeutig: new Set(),
      tmdbTitles: {},
      tvJeTmdb: new Set(),
      toteAdressen: new Set(),
      anisearch: {},
      verweiseEntfernt: [],
      katalogEintraege: [],
      adnKatalog: { scrapedAt: '', shows: [] } as never,
      adnVerweiseErgaenzt: 0,
      vorherTitles: [],
      schreibWurzel,
      handbelege: handbelege as never,
    })
  } finally {
    zurueck()
    rmSync(schreibWurzel, { recursive: true, force: true })
  }
  pruefe('Last Boss Queen (angekündigt 26.11., Amazon danach nur 日本語): widerlegt', queen.widerlegt?.am === '2026-11-26', queen.widerlegt)
  pruefe('Trinity Seven (Kanal-Nein ohne Beleg): bleibt „Synchro offen“, nicht widerlegt', trinity.sprache === 'offen' && !trinity.widerlegt, trinity.widerlegt)
}

if (verletzt) {
  console.error(`\n${verletzt} Fehler`)
  process.exit(1)
}
console.log('\nHandbeleg-Nein nach dem Start: alle Fälle ok, 0 Fehler')
