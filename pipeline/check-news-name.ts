/**
 * Wächter zur Auflage von PR 4603 (23.11.2026): „Pokémon: Horizonte: Die Serie: Jetzt auch auf Deutsch bei RTL+“ im News-Feed.
 * Ein Teil mit Doppelpunkt oder Reihenpräfix steht als voller Name allein, der Satz folgt nach Gedankenstrich. Läuft in `check:logic`.
 */
import { newsName, newsRss, newsZeile } from './lib/news-rss.ts'
import { baueNews } from './lib/news.ts'
import type { Release, Title } from '../shared/types.ts'

let fehler = 0
let faelle = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  faelle++
  if (ok) return void console.log(`  ✓ ${name}`)
  fehler++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

pruefe('Teil mit Doppelpunkt steht allein', newsName('Pokémon', 'Pokémon Horizonte: Die Serie') === 'Pokémon Horizonte: Die Serie')
pruefe('Teil ohne Doppelpunkt und ohne Reihenpräfix: „Reihe: Teil“', newsName('Spy × Family', 'Staffel 2') === 'Spy × Family: Staffel 2')
pruefe('Teil mit Reihenpräfix ohne Doppelpunkt steht allein', newsName('Dragon Ball', 'Dragon Ball Z') === 'Dragon Ball Z')
pruefe('ohne Teil bleibt der Titel', newsName('Naruto') === 'Naruto')
pruefe('Name mit Doppelpunkt: Gedankenstrich', newsZeile('Pokémon Horizonte: Die Serie', 'Jetzt auch bei RTL+') === 'Pokémon Horizonte: Die Serie – Jetzt auch bei RTL+')
pruefe('Name ohne Doppelpunkt: Doppelpunkt', newsZeile('Naruto', 'x') === 'Naruto: x')

// teilName in baueNews: ein Teil „Reihe Teil: Untertitel“ behält den vollen Namen (nicht „Teil: Untertitel“ unter dem Kopf „Reihe“).
const titelNr = (id: number, titleDe: string, extra: object = {}): Title =>
  ({ id, slug: `t${id}`, format: 'TV', episodes: 12, jpYear: 2025, hasVoices: true, streams: [], watchLinks: [], titleDe, ...extra }) as unknown as Title
const tvAm = (id: number): Release =>
  ({
    slug: `probe-${id}`,
    titleId: id,
    name: 'Probe',
    platform: 'tv',
    sender: 'ProSieben MAXX',
    releaseType: 'weekly',
    schedule: {
      firstEpisodeDate: '2999-11-05',
      time: '18:25',
      episodeCount: 12,
    },
    year: 2999,
    sources: ['https://example.org/a'],
  }) as unknown as Release
const teileVon = (teilTitel: string): (string | undefined)[] =>
  baueNews([titelNr(900201, 'Reihe'), titelNr(900202, teilTitel, { franchiseId: 900201 })], [tvAm(900201), tvAm(900202)], [], [], { zuerst: {} })
    .flatMap((e) => e.meldungen).map((m) => m.teil).filter((t) => t !== undefined)
pruefe('baueNews: Teil „Reihe Teil: Untertitel“ bleibt voll', teileVon('Reihe Teil: Untertitel').includes('Reihe Teil: Untertitel'), teileVon('Reihe Teil: Untertitel'))
pruefe('baueNews: Teil „Reihe: Staffel 2“ ohne weiteren Doppelpunkt wird gekürzt', teileVon('Reihe: Staffel 2').includes('Staffel 2'), teileVon('Reihe: Staffel 2'))

const rss = newsRss(
  [{ am: '2026-11-20', titelId: 527, titel: 'Pokémon', slug: 'p', meldungen: [{ art: 'neu', platform: 'rtlplus', teil: 'Pokémon Horizonte: Die Serie', teilId: 158871 }] }] as unknown as Parameters<typeof newsRss>[0],
  'https://anime-kalender.de/',
)
const titel = rss.match(/<title>([^<]*)<\/title>/g)?.[1] ?? ''
pruefe('Feed-Titel ohne doppelten Doppelpunkt', titel.startsWith('<title>Pokémon Horizonte: Die Serie – ') && (titel.match(/: /g) ?? []).length === 1, titel)

console.log(`\n${faelle - fehler}/${faelle} Fälle grün`)
process.exit(fehler ? 1 : 0)
