/**
 * Wächter zu Daniels Meldung vom 22.11.2026 (Pokémon Horizonte, `/t/14839`): Kopf „137 Folgen auf Deutsch“ statt je Staffel,
 * TOGGO „47 von 136“ (Staffel 1–3 fielen in der Zählung auf die Folgennummern einer Staffel zusammen), TOGGO-Karte ohne „Staffel 4 ab 27.11.“,
 * Link-Vorschau „Pokémon Horizonte – Staffel 4“ / „Folge 137 am Freitag“. Feste Daten nach `data/toggo.json` und
 * `data/curated/horizonte-staffeln.yaml`. Läuft in `check:logic`.
 */
import type { Release, Title, WatchLink } from '../shared/types.ts'
import type { StaffelZeile } from '../shared/staffel-folge.ts'
import { kostenloseFolgen } from '../shared/kostenlos.ts'
import { deFolgenZahlText, offeneStaffelText } from '../web/src/components/detail/antwort-regeln.ts'
import { toggoAngabe } from '../web/src/lib/toggo.ts'
import { describe, folgeImTitel, head } from './lib/termin-seite.ts'
import type { Umfeld } from './lib/titel-umfeld.ts'

let fehler = 0
let faelle = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  faelle++
  if (ok) return void console.log(`  ✓ ${name}`)
  fehler++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

type Block = NonNullable<WatchLink['toggo']>[number]
const HEUTE = '2026-11-22T12:00'
const NACH_START = '2026-11-27T12:00'
const staffelBloecke = (staffel: number, folgen: number, ab: string, ende = '2027-12-31T23:59'): Block[] =>
  Array.from({ length: folgen }, (_, i) => ({ staffel, von: i + 1, bis: i + 1, ab, ende }))
const toggo: Block[] = [
  ...staffelBloecke(1, 45, '2025-10-01T00:00', '2026-12-31T23:59'),
  ...staffelBloecke(2, 44, '2025-02-21T00:00', '2026-12-31T23:59'),
  ...staffelBloecke(3, 47, '2026-01-02T00:00'),
  ...staffelBloecke(4, 1, '2026-11-27T00:00'),
]
const toggoWeg: WatchLink = { name: 'TOGGO', url: 'https://www.toggo.de/x', kind: 'stream', zugang: 'kostenlos', toggo } as WatchLink
const STAFFELN: StaffelZeile[] = [[1, 1, 45], [2, 46, 89], [3, 90, 136], [4, 137]]

console.log('\nTOGGO-Zählung über mehrere Staffeln:')
pruefe('Horizonte am 22.11.: Staffel 1–3 frei = 136 Folgen', kostenloseFolgen({ watchLinks: [toggoWeg] }, HEUTE)?.frei === 136, kostenloseFolgen({ watchLinks: [toggoWeg] }, HEUTE))
pruefe('Horizonte ab 27.11.: mit Staffel 4 Folge 1 = 137', kostenloseFolgen({ watchLinks: [toggoWeg] }, NACH_START)?.frei === 137, kostenloseFolgen({ watchLinks: [toggoWeg] }, NACH_START))
const eineStaffel: WatchLink = { ...toggoWeg, toggo: staffelBloecke(1, 5, '2026-01-01T00:00') }
const youtube = { name: 'YouTube', url: 'https://www.youtube.com/playlist?list=x', kind: 'stream', zugang: 'kostenlos', dubRanges: [{ from: 1, to: 5, dub: true }] } as WatchLink
pruefe('Eine Staffel: Nummern fallen mit dubRanges eines anderen freien Weges zusammen (5, nicht 10)', kostenloseFolgen({ watchLinks: [eineStaffel, youtube] }, HEUTE)?.frei === 5, kostenloseFolgen({ watchLinks: [eineStaffel, youtube] }, HEUTE))

console.log('\nTOGGO-Karte:')
pruefe('Horizonte am 22.11.: „136 Folgen · Staffel 4 ab 27.11.“', toggoAngabe(toggo, HEUTE) === '136 Folgen · Staffel 4 ab 27.11.', toggoAngabe(toggo, HEUTE))
pruefe('ab 27.11.: keine angekündigte Staffel mehr', toggoAngabe(toggo, NACH_START) === '137 Folgen', toggoAngabe(toggo, NACH_START))
pruefe('Folge derselben Staffel in der Zukunft ist keine neue Staffel', toggoAngabe(staffelBloecke(1, 2, '2026-01-01T00:00').concat({ staffel: 1, von: 3, bis: 3, ab: '2026-12-01T00:00', ende: '2027-12-31T23:59' }), HEUTE) === 'Fg. 1–2 · bis 31.12.')

console.log('\nKopf je Staffel:')
const T = (k: string, v?: Record<string, string | number>) => (v ? `${k}:${JSON.stringify(v)}` : k)
const EINE = 'detail.dubKopfStaffelnEine:{"voll":"detail.staffelBereich:{\\"von\\":1,\\"bis\\":3}","n":136,"offen":4,"m":1}'
pruefe('Horizonte [137,137,1]: Staffel 1–3 mit 136 · Staffel 4 mit 1 Folge', deFolgenZahlText([137, 137, 1], [], T, STAFFELN) === EINE, deFolgenZahlText([137, 137, 1], [], T, STAFFELN))
pruefe('Staffel 4 mit zwei Folgen: Mehrzahl', offeneStaffelText([138, 138, 1], STAFFELN, T)?.startsWith('detail.dubKopfStaffeln:') === true && offeneStaffelText([138, 138, 1], STAFFELN, T)!.endsWith('"m":2}'), offeneStaffelText([138, 138, 1], STAFFELN, T))
pruefe('Zwei Staffeln: „Staffel 1“ statt Bereich', offeneStaffelText([46, 46, 1], [[1, 1, 45], [2, 46]], T)?.includes('detail.staffelNummer:{\\"n\\":1}') === true, offeneStaffelText([46, 46, 1], [[1, 1, 45], [2, 46]], T))
pruefe('Ohne Staffelgrenzen: Gesamtzahl wie bisher', deFolgenZahlText([137, 137, 1], [], T) === 'detail.dubKopf:{"n":137}')
pruefe('Nicht alle Folgen deutsch: Gesamtzahl', offeneStaffelText([137, 130, 1], STAFFELN, T) === undefined)
pruefe('Zahl reicht nicht in die offene Staffel: Gesamtzahl', offeneStaffelText([136, 136, 1], STAFFELN, T) === undefined)
pruefe('Letzte Staffel abgeschlossen: keine Staffelzeile', deFolgenZahlText([136, 136], [], T, [[1, 1, 45], [2, 46, 89], [3, 90, 136]]) === 'detail.dubKopf:{"n":136}')

console.log('\nLink-Vorschau:')
const s4 = {
  slug: 'pokemon-horizonte-s4-rtlplus',
  titleId: 158871,
  name: 'Pokémon Horizonte – Staffel 4',
  platform: 'rtlplus',
  releaseType: 'batch',
  schedule: { firstEpisodeDate: '2026-11-20', firstEpisodeNumber: 137, episodeCount: 1 },
  sources: [],
} as unknown as Release
const titel = {
  id: 158871,
  slug: 'pokemon-horizons',
  titleRomaji: 'Pocket Monsters (2023)',
  titleDe: 'Pokémon Horizonte',
  genres: [],
  streams: [],
} as unknown as Title
const umfeld = { aehnlichHtml: '', krumenJsonLd: '' } as unknown as Umfeld
pruefe('folgeImTitel: 137 → Staffel 4 Folge 1', folgeImTitel(137, STAFFELN) === 'Staffel 4 Folge 1', folgeImTitel(137, STAFFELN))
pruefe('folgeImTitel: 136 → Staffel 3 Folge 47', folgeImTitel(136, STAFFELN) === 'Staffel 3 Folge 47', folgeImTitel(136, STAFFELN))
pruefe('folgeImTitel ohne Grenzen: Folge 137', folgeImTitel(137, undefined) === 'Folge 137')
pruefe('Beschreibung: „Staffel 4 Folge 1 am Freitag“', describe(s4, titel, '2026-11-22', STAFFELN).startsWith('Staffel 4 Folge 1 am Freitag, 20.11.2026'), describe(s4, titel, '2026-11-22', STAFFELN))
const kopf = head(s4, titel, '2026-11-22', 14839, 'pokemon-horizonte-14839', umfeld, false, STAFFELN)
pruefe('og:title nennt den ganzen Titel, nicht „Staffel 4“', /og:title" content="Pokémon Horizonte/.test(kopf) && !/og:title" content="[^"]*Staffel 4/.test(kopf), kopf.match(/og:title" content="[^"]*"/)?.[0])
pruefe('og:description in Staffelzählung, ohne „Folge 137“', /og:description" content="Staffel 4 Folge 1 am/.test(kopf) && !kopf.includes('Folge 137'), kopf.match(/og:description" content="[^"]*"/)?.[0])
const ohne = head(s4, titel, '2026-11-22', 14839, 'pokemon-horizonte-14839', umfeld, false)
pruefe('Gegenprobe ohne Staffelgrenzen: Release-Name und Folge 137 bleiben', /og:title" content="Pokémon Horizonte – Staffel 4/.test(ohne) && ohne.includes('Folge 137 am'))

console.log(`\n${faelle - fehler}/${faelle} Fälle grün`)
process.exit(fehler ? 1 : 0)
