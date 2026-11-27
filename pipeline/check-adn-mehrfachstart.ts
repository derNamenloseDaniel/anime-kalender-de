/**
 * Dorohedoro Staffel 2 (ADN 1375): Folge 13–15 am 01.04., dann wöchentlich bis Folge 23 am 27.05. Zahl 11 und Ende
 * stimmen, der Wochenraster setzte aber nur 9 Termine (Folge 10 und 11 fehlten, kein Finale). Jetzt trägt ADNs
 * Tag jeder Folge (`beobachteteFolgen`), und der Termin-Zähler stimmt mit `episodeCount` überein.
 */
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { expandEvents } from '../shared/logic.ts'
import type { Release } from '../shared/types.ts'
import type { AdnEpisode } from './lib/adn.ts'
import { staffelBloecke } from './lib/adn.ts'
import { beobachteteFolgen } from './lib/adn-beobachtet.ts'
import { katalogShowAus } from './lib/adn-folgen.ts'
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
const wiederholung = folge(13, '2026-04-08')
pruefe('Folge an zwei Tagen (Wiederholung hinten): der frühere Tag gilt', beobachteteFolgen([...dorohedoro, wiederholung])?.[1] === '2026-04-01')
pruefe('Folge an zwei Tagen (Wiederholung vorn): der frühere Tag gilt', beobachteteFolgen([wiederholung, ...dorohedoro])?.[1] === '2026-04-01')
pruefe('Folge ohne Nummer: nichts behaupten', beobachteteFolgen([{ ...folge(1, '2026-04-01'), episode: undefined }, folge(2, '2026-04-01')]) === undefined)

console.log('\nTermine')
const bau = (rhythm: string, liste: AdnEpisode[] = dorohedoro): Release =>
  adnRelease({
    lauf: { artikelProShow: new Map() },
    show: { showId: 1375, title: 'Dorohedoro', fromCatalog: false },
    block: { rhythm, episodes: liste },
    abschnitt: { title: undefined, adnVon: 13, adnBis: 23 },
    zuordnung: { teile: [], unscharf: false },
    folgen: liste,
    first: liste[0],
    letzte: liste.at(-1),
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

/* ADNs Kalendertag gilt auch für noch nicht erschienene Folgen als belegt (Sendeplan), nicht als Schätzung. */
const kuenftig = bau('weekly', dorohedoro.map((e) => ({ ...e, date: e.date.replace('2026', '2099') })))
const kuenftigeTermine = expandEvents(kuenftig)
pruefe('Zukunftstermine: 11 Termine, keiner geschätzt', kuenftigeTermine.length === 11 && !kuenftigeTermine.some((t) => t.estimated), kuenftigeTermine.filter((t) => t.estimated).length)

/* Echte Rohdaten statt Fixture: Archiv → Katalogserie → Block → Release (A2, PR 5110). */
console.log('\nEchte Blöcke aus data/adn-raw')
const echterBlock = (id: number, staffel: string) => {
  const roh = JSON.parse(gunzipSync(readFileSync(new URL(`../data/adn-raw/${id}.json.gz`, import.meta.url))).toString())
  const serie = katalogShowAus({ id, title: String(id) }, roh.videos)
  const block = staffelBloecke(serie!).find((b) => b.season === staffel)!
  const nachTag = [...block.episodes].sort((a, b) => a.date.localeCompare(b.date))
  return { serie: serie!, block, nachTag }
}
const echt = (id: number, staffel: string): Release => {
  const { serie, block, nachTag } = echterBlock(id, staffel)
  return adnRelease({
    lauf: { artikelProShow: new Map() },
    show: serie,
    block,
    abschnitt: { title: undefined, adnVon: 0, adnBis: 9999 },
    zuordnung: { teile: [], unscharf: false },
    folgen: block.episodes,
    first: nachTag[0],
    letzte: nachTag.at(-1),
    slug: `adn-${id}`,
    anzeigename: serie.title,
  } as never)
}
const doro = expandEvents(echt(1375, '2'))
pruefe('Dorohedoro S2 (Rohdaten): 11 Termine, Finale 27.05.2026', doro.length === 11 && doro.at(-1)?.date === '2026-05-27', doro.length)
/* ADN lieferte Fire Force S1 mit Lücken-Wochen und Doppel-Finale (Folge 23 und 24 am 27.12.2019); der Raster endete am 13.12. */
const feuer = expandEvents(echt(562, '1'))
pruefe('Fire Force S1 (Rohdaten): 24 Termine, Folge 23 und 24 am 27.12.2019', feuer.length === 24 && feuer.filter((t) => t.date === '2019-12-27').length === 2, feuer.at(-1))

if (fehler) {
  console.error(`\n${fehler} Prüfung(en) fehlgeschlagen`)
  process.exit(1)
}
console.log('\nalle Prüfungen bestanden')
