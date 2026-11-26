/**
 * Zusicherungen (Daniel, 26.11.2026, Most Heretical Last Boss Queen): Der Stream-Reiter zeigt nie einen Weg „nur Untertitel“,
 * keinen Prime-Kanal ohne Sprachbeleg, keinen Termin mit offener Sprache als „seit“ und jeden Kanal nur einmal.
 * Fester Tag, Fixtures; Aufruf: `npm run check:logic`.
 */
import type { Release, StreamLink, Title, WatchLink } from '../shared/types.ts'
import { sortiereNachZugang } from '../web/src/components/detail/wege-sortieren.ts'
import { sichtbareTermine, sichtbareWege } from '../web/src/components/detail/wege-sichtbar.ts'

const HEUTE = '2026-11-26'
let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const stream = (extra: Partial<WatchLink>): WatchLink => ({ name: 'X', url: 'https://x/1', kind: 'stream', zugang: 'abo', ...extra }) as WatchLink
const verweis = (extra: Partial<StreamLink>): StreamLink => ({ platform: 'netflix', url: 'https://netflix.com/title/1', zugang: 'abo', ...extra }) as StreamLink
const titel = (streams: StreamLink[], watchLinks: WatchLink[]): Title => ({ id: 1, slug: 'x', streams, watchLinks }) as unknown as Title
const termin = (extra: Partial<Release>): Release =>
  ({ slug: 'r', titleId: 1, platform: 'primevideo', releaseType: 'batch', schedule: { firstEpisodeDate: HEUTE }, ...extra }) as unknown as Release
const wege = (t: Title, rs: Release[] = []) => sichtbareWege(sortiereNachZugang({ title: t }), t, rs)
const namen = (t: Title, rs: Release[] = []) => wege(t, rs).flatMap((g) => [...g.plattformen.map((s) => s.platform + (s.kanal ? `(${s.kanal})` : '')), ...g.streamWege.map((w) => w.shop)])

console.log('\nNur Untertitel ist nie eine Pille:')
const akibapass = stream({ name: 'Akibapass', url: 'https://akibapasstv.vhx.tv/products/the-most-heretical-last-boss-queen-omu-s1' })
pruefe('Bezugsweg mit „omu“ in der Adresse entfällt', namen(titel([], [akibapass])).length === 0, namen(titel([], [akibapass])))
pruefe('derselbe Anbieter ohne „omu“ in der Adresse bleibt', namen(titel([], [stream({ name: 'Akibapass', url: 'https://akibapasstv.vhx.tv/products/x-s1' })])).join() === 'Akibapass')
pruefe('Verweis mit Termin „nur OmU“ beim Anbieter entfällt', namen(titel([verweis({})], []), [termin({ platform: 'netflix', sprache: 'omu' })]).length === 0)
pruefe('Verweis mit belegtem Deutsch bleibt trotz OmU-Termin', namen(titel([verweis({ dub: true })], []), [termin({ platform: 'netflix', sprache: 'omu' })]).join() === 'netflix')
pruefe('Termin mit Sprache „omu“ steht nie, auch in der Zukunft', sichtbareTermine([termin({ sprache: 'omu', schedule: { firstEpisodeDate: '2026-12-24' } as Release['schedule'] })], [], HEUTE).length === 0)

console.log('\nPrime-Kanal ohne Beleg:')
const kanalWeg = stream({ name: 'Amazon Prime (Aniverse)', url: 'https://www.amazon.de/gp/video/detail/B0FBGJLZ4Y' })
pruefe('Bezugsweg über einen Prime-Kanal ohne Sprachbeleg entfällt', namen(titel([], [kanalWeg])).length === 0)
pruefe('Prime-Kanal-Verweis ohne Sprachbeleg entfällt', namen(titel([verweis({ platform: 'primevideo', kanal: 'aniverse' })], [])).length === 0)
pruefe('Prime-Kanal-Verweis mit Beleg bleibt', namen(titel([verweis({ platform: 'primevideo', kanal: 'aniverse', dub: true })], [])).join() === 'primevideo(aniverse)')
pruefe('Anbieter ohne Kanal und ohne Beleg bleibt unter „Weitere Anbieter“', namen(titel([verweis({})], [])).join() === 'netflix')

console.log('\nTermin mit offener Sprache:')
const offen = (datum: string) => termin({ sprache: 'offen', kanal: 'Aniverse', schedule: { firstEpisodeDate: datum } as Release['schedule'] })
pruefe('am Starttag kein „seit“-Termin', sichtbareTermine([offen(HEUTE)], [], HEUTE).length === 0)
pruefe('vergangener Termin entfällt', sichtbareTermine([offen('2026-11-01')], [], HEUTE).length === 0)
pruefe('künftiger Termin steht als Ankündigung', sichtbareTermine([offen('2026-12-01')], [], HEUTE).length === 1)
pruefe('Termin ohne Sprachangabe bleibt', sichtbareTermine([termin({ kanal: 'Aniverse' })], [], HEUTE).length === 1)
pruefe('Fernsehtermin bleibt', sichtbareTermine([termin({ platform: 'tv', sprache: 'offen' })], [], HEUTE).length === 1)

console.log('\nEin Kanal, eine Pille:')
const mitVerweis = titel([verweis({ platform: 'primevideo', kanal: 'aniverse', dub: true, url: 'https://www.amazon.de/gp/video/detail/B0B7D8FYH8' })], [{ ...kanalWeg, dubRanges: [{ from: 1, to: 12, dub: true }] } as WatchLink])
pruefe('Verweis und Bezugsweg desselben Kanals: eine Pille', namen(mitVerweis).join() === 'primevideo(aniverse)', namen(mitVerweis))
pruefe('Kanal in anderer Schreibweise (Hbo Max / HBO Max) ebenso', namen(titel([verweis({ platform: 'primevideo', kanal: 'HBO Max', dub: true })], [stream({ name: 'Amazon Prime (Hbo Max)', dubRanges: [{ from: 1, to: 12, dub: true }] } as Partial<WatchLink>)])).length === 1)
pruefe('Bezugsweg eines anderen Kanals bleibt', namen(titel([verweis({ platform: 'primevideo', kanal: 'aniverse', dub: true })], [stream({ name: 'Amazon Prime (Crunchyroll)', dubRanges: [{ from: 1, to: 12, dub: true }], url: 'https://x/cr' } as Partial<WatchLink>)])).length === 2)
const belegterWeg = titel([], [stream({ name: 'Amazon Prime (Aniverse)', dubRanges: [{ from: 1, to: 12, dub: true }] } as Partial<WatchLink>)])
pruefe('belegter Bezugsweg bleibt; sein Kanal-Termin entfällt', namen(belegterWeg).length === 1 && sichtbareTermine([termin({ kanal: 'Aniverse' })], wege(belegterWeg), HEUTE).length === 0)
pruefe('Kanal-Termin ohne Weg desselben Kanals bleibt', sichtbareTermine([termin({ kanal: 'Aniverse' })], wege(titel([], [])), HEUTE).length === 1)

console.log('\nDaniels Fall (Most Heretical Last Boss Queen, 26.11.2026): nichts bleibt:')
const fall = titel([], [kanalWeg, akibapass, stream({ name: 'aniSearch', kind: 'buy', zugang: 'kauf', url: 'https://www.anisearch.de/article/1' } as Partial<WatchLink>)])
const fallTermine = [offen(HEUTE)]
const stehen = wege(fall, fallTermine).flatMap((g) => [...g.plattformen, ...g.streamWege])
pruefe('kein Stream-Weg', stehen.length === 0, stehen.length)
pruefe('kein Termin', sichtbareTermine(fallTermine, wege(fall, fallTermine), HEUTE).length === 0)
pruefe('der Kaufweg bleibt (Disc-Reiter)', wege(fall, fallTermine).some((g) => g.shops.length > 0))

if (verletzt) {
  console.error(`\n${verletzt} Prüfung(en) verletzt`)
  process.exit(1)
}
