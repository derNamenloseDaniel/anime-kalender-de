/**
 * Zusicherungen zum Weg-Filter (`web/src/lib/wege-filter.ts`, Filterkonzept 22.11.2026): Ausschluss und Einschluss entscheiden
 * über **Wege** (Release, Stream, Stream-Link), nicht über den Titel. Fixtures statt Bestand (`check:logic` liest kein `public/data`);
 * die Erwartungen stammen aus dem Umsetzungsplan (Yaiba bei „Disc aus", Netflix + Disc → 0, Crunchyroll + Film bleibt).
 * Mutationsprobe: Rückbau auf `releases.some` im Ausschluss muss die Yaiba-Zeilen rot machen. Aufruf: `npm run check:logic`.
 */
import type { Release, Title } from '../shared/types.ts'
import { EMPTY_FILTERS, emptyLists, filterTitles, type FilterState } from '../web/src/lib/filters.ts'
import { bestehendeWege, istDiscWeg, wegeVon } from '../web/src/lib/wege-filter.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const HEUTE = '2026-11-22'
let nr = 0
const titel = (teil: Partial<Title> = {}): Title =>
  ({ id: ++nr, titleDe: `T${nr}`, genres: [], keywords: [], streams: [], dubConfidence: 'high', format: 'TV', ...teil }) as unknown as Title
const release = (t: Title, platform: string, releaseType: string, year = 2026): Release =>
  ({ slug: `${t.id}-${platform}-${releaseType}-${year}`, titleId: t.id, name: `T${t.id}`, platform, releaseType, year, schedule: { firstEpisodeDate: `${year}-01-01` } }) as unknown as Release
const stream = (platform: string, zugang?: string) => ({ platform, url: 'https://www.youtube.com/watch?v=x', zugang }) as never
const link = (name: string) => ({ name, url: 'https://example.org', kind: 'stream' }) as never
const kauf = (name: string) => ({ name, url: 'https://example.org', kind: 'buy' }) as never

function bleibt(t: Title, rs: Release[], f: FilterState): boolean {
  const data = { releasesByTitle: new Map([[t.id, rs]]) } as never
  return filterTitles([t], data, f, HEUTE, new Set()).length === 1
}
const aus = (k: keyof FilterState['excluded'], v: unknown[]): FilterState => ({ ...EMPTY_FILTERS, excluded: { ...emptyLists(), [k]: v } })
const ein = (teil: Partial<FilterState>): FilterState => ({ ...EMPTY_FILTERS, ...teil })

console.log('\nAusschluss entscheidet über Wege:')
const yaiba = titel({ streams: [stream('joyn')] })
const yaibaR = [release(yaiba, 'disc', 'disc', 2024), release(yaiba, 'disc', 'disc', 2025), release(yaiba, 'joyn', 'weekly'), release(yaiba, 'tv', 'weekly')]
pruefe('Yaiba (Disc ×2, Joyn, TV, Stream) bleibt bei „Disc aus"', bleibt(yaiba, yaibaR, aus('releaseTypes', ['disc'])))
pruefe('… und bei „Disc als Plattform aus"', bleibt(yaiba, yaibaR, aus('platforms', ['disc'])))
const nurDisc = titel()
pruefe('Titel nur auf Disc fällt bei „Disc aus" weg', !bleibt(nurDisc, [release(nurDisc, 'disc', 'disc')], aus('releaseTypes', ['disc'])))
const discMitLink = titel({ watchLinks: [link('Apple TV')] })
pruefe('Nur Disc, aber ein Stream-Link: bleibt (Rettungsweg)', bleibt(discMitLink, [release(discMitLink, 'disc', 'disc')], aus('releaseTypes', ['disc'])))
const discMitKauf = titel({ watchLinks: [kauf('Amazon')] })
pruefe('Nur Disc und ein Kauflink: fällt weg (Kauf ist kein Weg)', !bleibt(discMitKauf, [release(discMitKauf, 'disc', 'disc')], aus('releaseTypes', ['disc'])))
const ohneWeg = titel()
pruefe('Titel ohne jeden Weg bleibt bei Ausschlüssen', bleibt(ohneWeg, [], aus('releaseTypes', ['disc'])) && bleibt(ohneWeg, [], aus('platforms', ['netflix'])))
const discPlattformFilm = titel()
pruefe('Release mit Plattform disc, Art movie: zählt als Disc-Weg', istDiscWeg(wegeVon(discPlattformFilm, [release(discPlattformFilm, 'disc', 'movie')], HEUTE)[0]!))
const prime = titel({ streams: [stream('primevideo'), stream('crunchyroll')] })
pruefe('Prime + Crunchyroll: „Prime aus" lässt ihn über Crunchyroll stehen', bleibt(prime, [], aus('platforms', ['primevideo'])))
const nurPrime = titel({ streams: [stream('primevideo')] })
pruefe('Nur Prime: „Prime aus" nimmt ihn heraus', !bleibt(nurPrime, [], aus('platforms', ['primevideo'])))
const filmWerk = titel({ format: 'MOVIE', streams: [stream('crunchyroll')] })
pruefe('Film-Werk fällt bei „Film aus" weg, auch ohne Movie-Release', !bleibt(filmWerk, [], aus('releaseTypes', ['movie'])))
pruefe('Die bestehenden Wege der Karte: Yaiba ohne Disc', bestehendeWege(wegeVon(yaiba, yaibaR, HEUTE), aus('releaseTypes', ['disc']).excluded).map((w) => w.plattform).sort().join() === 'joyn,joyn,tv')
const anbieter = titel({ streams: [stream('joyn')], watchLinks: [link('maxdome')] })
pruefe('Anbieter „maxdome" aus: Titel mit Joyn-Stream bleibt', bleibt(anbieter, [], aus('providers', ['maxdome'])))

console.log('\nEinschluss auf demselben Weg:')
const netflixDisc = titel({ streams: [stream('netflix')] })
const netflixDiscR = [release(netflixDisc, 'netflix', 'batch'), release(netflixDisc, 'disc', 'disc')]
pruefe('Netflix + Disc: zwei verschiedene Wege → kein Treffer', !bleibt(netflixDisc, netflixDiscR, ein({ platforms: ['netflix'], releaseTypes: ['disc'] })))
pruefe('… auch mit „UND" bei Art', !bleibt(netflixDisc, netflixDiscR, ein({ platforms: ['netflix'], releaseTypes: ['disc'], modus: { releaseTypes: 'und' } })))
pruefe('Netflix allein und Disc allein treffen weiter', bleibt(netflixDisc, netflixDiscR, ein({ platforms: ['netflix'] })) && bleibt(netflixDisc, netflixDiscR, ein({ releaseTypes: ['disc'] })))
const netflixBatch = titel()
pruefe('Netflix + Sammelveröffentlichung auf einem Weg trifft', bleibt(netflixBatch, [release(netflixBatch, 'netflix', 'batch')], ein({ platforms: ['netflix'], releaseTypes: ['batch'] })))
pruefe('Crunchyroll + Film: Stream auf einem Film-Werk trifft', bleibt(filmWerk, [], ein({ platforms: ['crunchyroll'], releaseTypes: ['movie'] })))
const beide = titel({ streams: [stream('netflix'), stream('primevideo')] })
pruefe('Netflix UND Prime: verschiedene Wege genügen', bleibt(beide, [], ein({ platforms: ['netflix', 'primevideo'], modus: { platforms: 'und' } })))
pruefe('Netflix UND Prime: nur Netflix genügt nicht', !bleibt(netflixDisc, [], ein({ platforms: ['netflix', 'primevideo'], modus: { platforms: 'und' } })))
pruefe('Netflix ODER Prime: einer genügt', bleibt(netflixDisc, [], ein({ platforms: ['netflix', 'primevideo'] })))
const frei = titel({ streams: [stream('youtube', 'kostenlos'), stream('netflix')] })
pruefe('kostenlos + YouTube trifft', bleibt(frei, [], ein({ kostenlosOnly: true, platforms: ['youtube'] })))
pruefe('kostenlos + Netflix: der Netflix-Weg ist nicht kostenlos', !bleibt(frei, [], ein({ kostenlosOnly: true, platforms: ['netflix'] })))
pruefe('kostenlos allein trifft', bleibt(frei, [], ein({ kostenlosOnly: true })))
const jahre = titel({ streams: [stream('netflix')] })
const jahreR = [release(jahre, 'netflix', 'batch', 2024), release(jahre, 'primevideo', 'batch', 2026)]
pruefe('Netflix + 2026: Netflix kam 2024, Prime 2026 → kein Treffer', !bleibt(jahre, jahreR, ein({ platforms: ['netflix'], years: [2026] })))
pruefe('Prime + 2026 trifft', bleibt(jahre, jahreR, ein({ platforms: ['primevideo'], years: [2026] })))
pruefe('Netflix + Disc ausgeschlossen: Ausschluss gilt für die Kandidaten', !bleibt(netflixDisc, netflixDiscR, { ...ein({ platforms: ['netflix'] }), excluded: { ...emptyLists(), platforms: ['netflix'] } }))
const ohneRelease = titel({ jpYear: 2026 })
pruefe('Jahr ohne Release: jpYear gilt (wie vorher)', bleibt(ohneRelease, [], ein({ years: [2026] })) && !bleibt(ohneRelease, [], ein({ years: [2025] })))

if (verletzt) {
  console.error(`\ncheck-filter-wege: ${verletzt} Verletzung(en)`)
  process.exit(1)
}
console.log('\ncheck-filter-wege: alle Zusicherungen grün')
