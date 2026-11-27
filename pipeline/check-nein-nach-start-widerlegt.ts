/**
 * Zusicherungen zu `bau/nein-nach-start-widerlegt.ts` (27.11.2026): Ein „Synchro offen“-Termin, dessen Handbeleg-Nein am Starttag oder
 * danach gemessen ist, gilt als widerlegt (nicht gelöscht); vorher gemessen, mit späterem Ja oder als Kanal-Nein ohne Beleg bleibt er offen.
 */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pruefeSynchroJePlattform } from './bau/09-synchro.ts'
import { widerlegeNeinNachStart } from './bau/nein-nach-start-widerlegt.ts'
import { widerlegtTexte } from '../web/src/components/detail/kasten-texte.ts'
import type { Release } from '../shared/types.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const termin = (extra: Partial<Release> = {}): Release =>
  ({ slug: 's', name: 'Probe', titleId: 7, platform: 'primevideo', kanal: 'Aniverse', automatisch: true, sprache: 'offen', schedule: { firstEpisodeDate: '2026-11-26' }, sources: ['https://a/'], ...extra }) as unknown as Release
const nein = (checkedAt: string, extra = {}) => ({ anilistId: 7, platform: 'primevideo' as const, url: 'https://www.amazon.de/gp/video/detail/X', dub: false, checkedAt, ...extra })
const lauf = (r: Release, belege: Parameters<typeof widerlegeNeinNachStart>[1]) => widerlegeNeinNachStart([r], belege)

console.log('\nNein am oder nach dem Starttag:')
{
  const amTag = termin()
  pruefe('Nein am Starttag widerlegt', lauf(amTag, [nein('2026-11-26')]).join() === 's' && amTag.widerlegt?.am === '2026-11-26', amTag.widerlegt)
  pruefe('Grund nennt Anbieter und Messtag, Quelle ist die Seite', /Prime Video führt am 2026-11-26 nur den Originalton/.test(amTag.widerlegt?.grund ?? '') && amTag.widerlegt?.quelle === 'https://www.amazon.de/gp/video/detail/X')
  pruefe('Anbieter mit Kanal', amTag.widerlegt?.anbieter === 'Prime Video (Aniverse)', amTag.widerlegt?.anbieter)
  pruefe('Termin bleibt im Datensatz (nur gekennzeichnet)', amTag.sprache === 'offen' && amTag.slug === 's')
  const danach = termin()
  pruefe('Nein nach dem Starttag widerlegt', lauf(danach, [nein('2026-11-15'), nein('2026-12-01')]).length === 1 && /2026-12-01/.test(danach.widerlegt?.grund ?? ''))
}

console.log('\nBleibt offen:')
{
  const vorher = termin()
  pruefe('Nein vor dem Start: der Ton kann noch kommen', lauf(vorher, [nein('2026-11-25')]).length === 0 && !vorher.widerlegt)
  const spaeterJa = termin()
  pruefe('jüngeres Ja hebt das Nein auf', lauf(spaeterJa, [nein('2026-11-26'), { ...nein('2026-11-28'), dub: true }]).length === 0)
  const kanal = termin()
  pruefe('Kanal-Nein ohne Beleg (Amazons Kanal-Angabe) widerlegt nichts', lauf(kanal, [nein('2026-11-26', { kanalOhneBeleg: true })]).length === 0)
  const urteilJa = termin()
  pruefe('jüngstes Urteil derselben Adresse „ja“ widerlegt nichts', lauf(urteilJa, [nein('2026-11-26', { juengstesUrteil: 'ja' })]).length === 0)
  const ohneOffen = termin({ sprache: undefined })
  pruefe('Termin ohne „Synchro offen“ (Ja-Weg, Handtermin) bleibt', lauf(ohneOffen, [nein('2026-11-26')]).length === 0)
  const omu = termin({ sprache: 'omu' })
  pruefe('OmU-Termin bleibt (versprach keine Synchro)', lauf(omu, [nein('2026-11-26')]).length === 0)
  const hand = termin({ automatisch: false })
  pruefe('Handtermin bleibt', lauf(hand, [nein('2026-11-26')]).length === 0)
  const andere = termin({ platform: 'netflix' })
  pruefe('Nein einer anderen Plattform zählt nicht', lauf(andere, [nein('2026-11-26')]).length === 0)
}

console.log('\nPanel-Text:')
{
  const T = (k: string, v?: Record<string, string | number>) => `${k}${v ? JSON.stringify(v) : ''}`
  const basis = { art: 'widerlegt' as const, datum: '2026-11-26', grund: 'x', terminOffen: false }
  pruefe('Handbeleg-Widerlegung nennt den Anbieter, nicht Crunchyrolls Wochenprogramm', /widerlegtNebenAnbieter.*Prime Video \(Aniverse\)/.test(widerlegtTexte({ ...basis, anbieter: 'Prime Video (Aniverse)' }, T).neben))
  pruefe('Wochenprogramm-Widerlegung bleibt beim alten Text', /antwort\.widerlegtNeben\{/.test(widerlegtTexte(basis, T).neben))
}

console.log('\nVerdrahtung in Bauphase 9 (echte Handbelege):')
{
  const queen = termin({ slug: 'auto-156040-primevideo', titleId: 156040, sprache: undefined })
  const trinity = termin({ slug: 'auto-103631-primevideo', titleId: 103631, sprache: undefined, schedule: { firstEpisodeDate: '2026-10-15' } as Release['schedule'] })
  const schreibWurzel = mkdtempSync(join(tmpdir(), 'nein-nach-start-'))
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
    })
  } finally {
    rmSync(schreibWurzel, { recursive: true, force: true })
  }
  pruefe('Last Boss Queen (Aniverse, angekündigt 26.11., Amazon 26.11. nur 日本語): widerlegt', queen.widerlegt?.am === '2026-11-26', queen.widerlegt)
  pruefe('Trinity Seven (Kanal-Nein ohne Beleg): bleibt „Synchro offen“, nicht widerlegt', trinity.sprache === 'offen' && !trinity.widerlegt, trinity.widerlegt)
}

if (verletzt) {
  console.error(`\n${verletzt} Fehler`)
  process.exit(1)
}
console.log('\nHandbeleg-Nein nach dem Start: 17 Fälle, 0 Fehler')
