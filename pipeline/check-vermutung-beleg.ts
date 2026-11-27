/**
 * Zusicherung: eine Vermutung (Katalog-Release ≈, angenommene Folgenzahl) verschwindet, sobald ihr Beleg vorliegt, und bleibt, wo er fehlt
 * (`shared/vermutung-beleg.ts`, Daniel 27.11.2026). Fall Fool Night: „Folgen 1–12 mit deutschem Ton“ am Starttag, Kachel „Katalog-Release ≈“.
 * Dazu der Wächter: er meldet jeden Marker, dessen Beleg vorliegt. Aufruf: `npm run check:logic`.
 */
import type { Release, ReleaseEvent } from '../shared/types.ts'
import { schreibeKatalogRelease } from '../shared/katalog-release.ts'
import { loeseFolgenzahlAnnahmen, urteilFolgenzahl, urteilKatalog, vermutungenMitBeleg, type Beobachtungen } from '../shared/vermutung-beleg.ts'
import { katalogBelege, katalogBelegFehler, ladeKatalogBelegEintraege, katalogBeobachtungen } from './lib/katalog-belege.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const START = '2026-11-26'
const rel = (o: Partial<Release> = {}): Release =>
  ({ slug: 'fool', titleId: 1, name: 'Fool', platform: 'netflix', releaseType: 'batch', schedule: { firstEpisodeDate: START, episodeCount: 12 }, ...o }) as unknown as Release
const ev = (o: Partial<ReleaseEvent> = {}): ReleaseEvent =>
  ({ id: `fool@${START}`, releaseSlug: 'fool', titleId: 1, name: 'Fool', date: START, releaseType: 'batch', platform: 'netflix', episodeCount: 12, ...o }) as unknown as ReleaseEvent
const mit = (am: string, folge: number): Beobachtungen => new Map([['fool', [{ am, folge }]]])
const katalog = (b: Beobachtungen): string | undefined => {
  const e = ev()
  schreibeKatalogRelease([e], [rel()], new Map(), b)
  return e.katalog
}

console.log('\nKatalog-Release: Beobachtung am Starttag oder davor mit der letzten Folge löst das ≈ ab:')
pruefe('Fool Night: am Starttag Folge 12 von 12 gesehen → belegt', katalog(mit(START, 12)) === 'belegt', katalog(mit(START, 12)))
pruefe('vor dem Starttag gesehen → belegt', katalog(mit('2026-11-25', 12)) === 'belegt')
pruefe('Gegenfall: erst nach dem Starttag gemessen → bleibt ≈', katalog(mit('2026-11-27', 12)) === 'abgeleitet')
pruefe('Gegenfall: nur Folge 1 gesehen → bleibt ≈', katalog(mit(START, 1)) === 'abgeleitet')
pruefe('Gegenfall: keine Beobachtung → bleibt ≈', katalog(new Map()) === 'abgeleitet')
pruefe('urteilKatalog ohne Folgenzahl bleibt', urteilKatalog(START, undefined, [{ am: START, folge: 12 }]) === 'bleibt')

console.log('\nAngenommene Folgenzahl:')
const s = (o: Partial<Release['schedule']>): Release['schedule'] => ({ firstEpisodeDate: START, episodeCount: 12, episodeCountAssumed: true, ...o }) as Release['schedule']
pruefe('letzte Folge beobachtet und belegtes Ende auf ihrem Tag → belegt', urteilFolgenzahl(s({ observed: { 12: '2026-12-10' }, lastEpisodeDate: '2026-12-10' })) === 'belegt')
pruefe('Gegenfall: letzte Folge beobachtet, Ende nicht belegt → bleibt', urteilFolgenzahl(s({ observed: { 12: '2026-12-10' } })) === 'bleibt')
pruefe('Gegenfall: nur eine frühere Folge beobachtet → bleibt', urteilFolgenzahl(s({ observed: { 5: '2026-11-01' }, lastEpisodeDate: '2026-12-10' })) === 'bleibt')
pruefe('Beobachtung über der Zahl widerlegt die Annahme', urteilFolgenzahl(s({ observed: { 13: '2026-12-17' } })) === 'widerlegt')
{
  const geloest = rel({ slug: 'a', schedule: s({ observed: { 12: '2026-12-10' }, lastEpisodeDate: '2026-12-10', episodeCountSource: 'anisearch' }) })
  const bleibt = rel({ slug: 'b', schedule: s({}) })
  const kennungen = loeseFolgenzahlAnnahmen([geloest, bleibt])
  pruefe('der Bau nimmt die Annahme nur dort weg, wo sie belegt ist', kennungen.join() === 'a' && !geloest.schedule.episodeCountAssumed && !geloest.schedule.episodeCountSource && !!bleibt.schedule.episodeCountAssumed, kennungen)
}

console.log('\nWächter:')
{
  const abgeleitet = ev({ katalog: 'abgeleitet' })
  const b = vermutungenMitBeleg([rel()], [abgeleitet], mit(START, 12))
  pruefe('meldet ein ≈, dessen Beleg vorliegt', b.zeilen.length === 1 && b.katalog.aufloesbar === 1, b)
  const ohne = vermutungenMitBeleg([rel()], [abgeleitet], new Map())
  pruefe('schweigt, wo der Beleg fehlt, und zählt den Marker', ohne.zeilen.length === 0 && ohne.katalog.marker === 1 && ohne.katalog.aufloesbar === 0)
  const f = vermutungenMitBeleg([rel({ schedule: s({ observed: { 12: '2026-12-10' }, lastEpisodeDate: '2026-12-10' }) })], [], new Map())
  pruefe('meldet eine angenommene Folgenzahl mit belegter letzter Folge', f.zeilen.length === 1 && f.folgenzahl.aufloesbar === 1, f)
}

console.log('\nHandbelege (Handdatei):')
{
  const eintraege = ladeKatalogBelegEintraege()
  pruefe('Handdatei ohne Strukturfehler', katalogBelegFehler(eintraege).length === 0, katalogBelegFehler(eintraege))
  const fool = eintraege.find((e) => e.slug === 'auto-10021751-netflix')
  pruefe('Fool Night steht als beobachtet mit Tag und letzter Folge', fool?.art === 'beobachtet' && fool.gesehenAm === START && fool.bisFolge === 12, fool)
  pruefe('mit Tag und Folge wirkt der Beleg über die zentrale Regel, nicht als Behauptung', !katalogBelege(eintraege).has('auto-10021751-netflix') && katalogBeobachtungen(eintraege).get('auto-10021751-netflix')?.[0]?.folge === 12)
}

console.log(verletzt ? `\n${verletzt} Zusicherung(en) verletzt.` : '\nAlle Zusicherungen halten.')
process.exit(verletzt ? 1 : 0)
