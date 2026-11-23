/**
 * Zusicherungen zur Zählung an den Chips des Filterfensters (`web/src/lib/filter-zaehlung.ts`, Filterkonzept S5, 23.11.2026): ein Titel zählt je Chip
 * einmal, auch wenn mehrere Wege ihn tragen; die Zahl ist die Trefferzahl des einen Filters (Disc-Weg, Status, kostenlos eingeschlossen); zusammengefasste
 * Staffeln zählen wie die Liste sie zeigt (laufende Staffeln einer Reihe einzeln, sonst eine Karte). Die Rückrechnung am Bestand steht in `check-filter-zaehlung-bestand.ts`. Aufruf: `npm run check:logic`.
 */
import type { Release, Title } from '../shared/types.ts'
import { zaehleFilterGen } from '../web/src/lib/filter-zaehlung.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const HEUTE = '2026-11-23'
let nr = 0
const titel = (teil: Partial<Title> = {}): Title =>
  ({ id: ++nr, titleDe: `T${nr}`, genres: [], keywords: [], streams: [], dubConfidence: 'high', format: 'TV', ...teil }) as unknown as Title
const release = (t: Title, platform: string, releaseType: string, year = 2026): Release =>
  ({ slug: `${t.id}-${platform}-${releaseType}-${year}`, titleId: t.id, name: `T${t.id}`, platform, releaseType, year, schedule: { firstEpisodeDate: `${year}-01-01` } }) as unknown as Release

const yaiba = titel()
const nurNetflix = titel({ keywords: ['Cartoon'] })
const ohneWeg = titel()
/* Pflichtfall aus dem Bestand (auto-544-disc): Plattform disc, Art movie — der Filter „Art Disc" lässt ihn durch. */
const discFilm = titel({ format: 'MOVIE' })
const frei = titel({ watchLinks: [{ name: 'Joyn', url: 'https://www.joyn.de/x', kind: 'stream', zugang: 'kostenlos' }] as never })
const s2 = titel({ franchiseId: 9000 })
const s3 = titel({ franchiseId: 9000 })
const rs = new Map<number, Release[]>([
  [yaiba.id, [release(yaiba, 'disc', 'disc', 2024), release(yaiba, 'disc', 'disc', 2025), release(yaiba, 'joyn', 'weekly'), release(yaiba, 'tv', 'weekly')]],
  [nurNetflix.id, [release(nurNetflix, 'netflix', 'weekly')]],
  [discFilm.id, [release(discFilm, 'disc', 'movie', 2025)]],
  [s2.id, [release(s2, 'netflix', 'weekly')]],
  [s3.id, [release(s3, 'netflix', 'weekly')]],
])
const alle = [yaiba, nurNetflix, ohneWeg, discFilm, frei, s2, s3]
const rechne = (gruppiert: boolean, sort?: string) => {
  const gen = zaehleFilterGen(alle, rs, HEUTE, gruppiert, sort)
  for (;;) {
    const r = gen.next()
    if (r.done) return r.value
  }
}
const z = rechne(false)

console.log('\nZählung an den Chips:')
pruefe('Disc zählt Yaiba und den Disc-Film je einmal, nicht je Disc-Release', z.platforms.get('disc') === 2, z.platforms.get('disc'))
pruefe('Art Disc zählt auch das Release mit Plattform disc und Art movie (wie der Filter)', z.releaseTypes.get('disc') === 2 && z.schnell.disc === 2, [z.releaseTypes.get('disc'), z.schnell.disc])
pruefe('Netflix 3, Joyn 1, TV 1', z.platforms.get('netflix') === 3 && z.platforms.get('joyn') === 1 && z.platforms.get('tv') === 1, [z.platforms.get('netflix'), z.platforms.get('joyn'), z.platforms.get('tv')])
pruefe('Art weekly zählt vier Titel', z.releaseTypes.get('weekly') === 4, z.releaseTypes.get('weekly'))
pruefe('Status: laufend 4, abgeschlossen 2 (Yaiba-Discs, Disc-Film), unbekannt 2 (ohne Weg, nur Link)', z.statuses.get('airing') === 4 && z.statuses.get('abgeschlossen') === 2 && z.statuses.get('unbekannt') === 2, Object.fromEntries(z.statuses))
pruefe('Kostenlos zählt den Titel mit kostenlosem Stream-Link', z.schnell.kostenlos === 1, z.schnell.kostenlos)
pruefe('Schnellchips: TV 1, Cartoon 1', z.schnell.tv === 1 && z.schnell.cartoon === 1, z.schnell)

console.log('\nStaffeln zusammengefasst (Zahl = Karten nach dem Antippen):')
const g = rechne(true)
pruefe('Netflix: zwei laufende Staffeln derselben Reihe stehen als zwei Karten (3), wie die Liste sie zeigt (`ordneListe`)', g.platforms.get('netflix') === 3, g.platforms.get('netflix'))
const nachTitel = rechne(true, 'titel')
pruefe('Netflix bei Sortierung „Titel": eine Karte je Reihe (2), denn nur „Relevanz" listet laufende Staffeln einzeln', nachTitel.platforms.get('netflix') === 2, nachTitel.platforms.get('netflix'))

if (verletzt) {
  console.error(`\n${verletzt} Zusicherung(en) verletzt.`)
  process.exit(1)
}
console.log('\nZählung an den Chips: alle Zusicherungen erfüllt.')
