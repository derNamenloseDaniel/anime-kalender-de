/**
 * Dorohedoro Staffel 2 (ADN 1375): Folge 13–15 am 01.04., dann wöchentlich bis Folge 23 am 27.05. Zahl 11 und Ende
 * stimmen, der Wochenraster setzte aber nur 9 Termine (Folge 10 und 11 fehlten, kein Finale). Jetzt trägt ADNs
 * Tag jeder Folge (`beobachteteFolgen`), und der Termin-Zähler stimmt mit `episodeCount` überein.
 */
import { expandEvents } from '../shared/logic.ts'
import type { Release } from '../shared/types.ts'
import type { AdnEpisode } from './lib/adn.ts'
import { beobachteteFolgen } from './lib/adn-beobachtet.ts'
import { adnRelease } from './bau/07-adn.ts'

let fehler = 0
function pruefe(name: string, bedingung: boolean, gefunden?: unknown): void {
  if (bedingung) return void console.log(`  ✓ ${name}`)
  fehler++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const folge = (nr: number, date: string): AdnEpisode => ({ date, time: '16:00', episode: nr, url: `https://adn.test/${nr}` })
const woche = (n: number) => new Date(Date.UTC(2026, 3, 1 + 7 * n)).toISOString().slice(0, 10)
const dorohedoro = [
  folge(13, '2026-04-01'),
  folge(14, '2026-04-01'),
  folge(15, '2026-04-01'),
  ...Array.from({ length: 8 }, (_, i) => folge(16 + i, woche(i + 1))),
]

console.log('\nbeobachteteFolgen')
const obs = beobachteteFolgen(dorohedoro)
pruefe('Mehrfachstart: 11 Folgen belegt, 1–3 am 01.04.', Object.keys(obs ?? {}).length === 11 && obs?.[3] === '2026-04-01' && obs?.[11] === '2026-05-27', obs)
pruefe('Wochentakt ohne Mehrfachtag: nichts nötig', beobachteteFolgen(dorohedoro.slice(2)) === undefined)
pruefe('Folge ohne Nummer: nichts behaupten', beobachteteFolgen([{ ...folge(1, '2026-04-01'), episode: undefined }, folge(2, '2026-04-01')]) === undefined)

console.log('\nTermine')
const bau = (rhythm: string): Release =>
  adnRelease({
    lauf: { artikelProShow: new Map() },
    show: { showId: 1375, title: 'Dorohedoro', fromCatalog: false },
    block: { rhythm, episodes: dorohedoro },
    abschnitt: { title: undefined, adnVon: 13, adnBis: 23 },
    zuordnung: { teile: [], unscharf: false },
    folgen: dorohedoro,
    first: dorohedoro[0],
    letzte: dorohedoro.at(-1),
    slug: 'adn-1375',
    anzeigename: 'Dorohedoro: Staffel 2',
  } as never)
const release = bau('weekly')
pruefe('adnRelease trägt die Beobachtung ins Release', Object.keys(release.schedule.observed ?? {}).length === 11, release.schedule.observed)
pruefe('Komplettabwurf (batch) bekommt keine', bau('batch').schedule.observed === undefined)
const termine = expandEvents(release)
pruefe('11 Termine wie episodeCount', termine.length === 11, termine.length)
pruefe('Finale Folge 11 am 27.05.', termine.at(-1)?.episode === 11 && termine.at(-1)?.date === '2026-05-27', termine.at(-1))
const ohne = expandEvents({ ...release, schedule: { ...release.schedule, observed: undefined } } as Release)
pruefe('Gegenprobe: ohne Beleg weiter nur 9 Termine (die main-Fassung)', ohne.length === 9, ohne.length)

if (fehler) {
  console.error(`\n${fehler} Prüfung(en) fehlgeschlagen`)
  process.exit(1)
}
console.log('\nalle Prüfungen bestanden')
