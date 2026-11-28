/** Prüft `lib/trailer-auswahl.ts`: Kandidaten des Trailerlaufs und die TMDB-Videoadresse. */
import { tmdbArt, tmdbVideosUrl, trailerKandidaten, waehleTmdbVideo } from './lib/trailer-auswahl.ts'
import { ablehnungenText, ablehnungsgrund, animeNamen, entferneAbgelehnte, macheAblehner, neueAblehnungen } from './lib/trailer-ablehnung.ts'
import { ladeTrailerSperre } from './lib/trailer-hand.ts'
import { readJson } from './lib/util.ts'

let fehler = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  fehler++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const titel = [
  { id: 1, format: 'TV' },
  { id: 2, format: 'MOVIE' },
  { id: 3, format: 'TV' },
  { id: 4, format: 'OVA' },
  { id: 5, format: 'MOVIE' },
]
const ids = (einstiege: number[]): number[] => trailerKandidaten(titel, new Set(einstiege)).map((t) => t.id)

console.log('Trailer-Kandidaten')
pruefe('ohne Einstiege bleiben nur Filme', JSON.stringify(ids([])) === '[2,5]', ids([]))
pruefe('ein Einstieg als Serie kommt dazu, in Bestandsreihenfolge', JSON.stringify(ids([3])) === '[2,3,5]', ids([3]))
pruefe('ein Film im Einstieg steht nur einmal', JSON.stringify(ids([2, 1])) === '[1,2,5]', ids([2, 1]))
pruefe('eine OVA außerhalb des Pools bleibt draußen', !ids([1, 3]).includes(4))
pruefe('unbekannte Einstiegskennung ist egal', JSON.stringify(ids([99])) === '[2,5]', ids([99]))

console.log('TMDB-Art')
pruefe('kind movie gilt auch für eine Serie', tmdbArt('movie', 'TV') === 'movie')
pruefe('kind tv gilt auch für einen Film', tmdbArt('tv', 'MOVIE') === 'tv')
pruefe('ohne kind: Film -> movie', tmdbArt(undefined, 'MOVIE') === 'movie')
pruefe('ohne kind: Serie -> tv', tmdbArt(undefined, 'TV') === 'tv')
pruefe('ohne kind und Format -> tv', tmdbArt(undefined, undefined) === 'tv')
pruefe('unbekanntes kind folgt dem Format', tmdbArt('foo', 'MOVIE') === 'movie' && tmdbArt('foo', 'TV') === 'tv')

console.log('TMDB-Videoadresse')
const tv = tmdbVideosUrl('https://x/3', 'tv', 7, 'K')
pruefe('Serie fragt tv und alle drei Sprachen', tv === 'https://x/3/tv/7/videos?include_video_language=de,en,ja&api_key=K', tv)
pruefe('Film fragt movie', tmdbVideosUrl('https://x/3', 'movie', 7, 'K').startsWith('https://x/3/movie/7/videos?'))
pruefe('unbekannte Art fällt auf tv', tmdbVideosUrl('https://x/3', 'anderes', 7, 'K').includes('/tv/7/'))

console.log('TMDB-Videoauswahl (Verhalten wie vor dem Auslagern)')
const yt = (key: string, iso: string, am: string, type = 'Trailer') => ({ key, name: key, site: 'YouTube', type, iso_639_1: iso, published_at: am })
pruefe('deutsch vor englisch', waehleTmdbVideo([yt('en1', 'en', '2020'), yt('de1', 'de', '2019')])?.video === 'de1')
pruefe('je Sprache der jüngste', waehleTmdbVideo([yt('a', 'de', '2019'), yt('b', 'de', '2021')])?.video === 'b')
pruefe('Teaser zählt, Featurette nicht', waehleTmdbVideo([yt('t', 'en', '2020', 'Teaser')])?.video === 't' && waehleTmdbVideo([yt('f', 'en', '2020', 'Featurette')]) === null)
pruefe('fremde Site zählt nicht', waehleTmdbVideo([{ ...yt('v', 'de', '2020'), site: 'Vimeo' }]) === null)

console.log('Kein Trailer: echte Fälle aus data/trailer.json (28.11.2026, Call of the Night)')
const grund = (titel: string, ...namen: string[]) => ablehnungsgrund(titel, namen)
pruefe('Review wird abgelehnt', grund('CALL OF THE NIGHT | Der beste Anime der Sommer-Season 2022 | Anime Review', 'Call of the Night') === 'review')
pruefe('Full Movie wird abgelehnt', grund('Detective Conan Movie 2: The Fourteenth Target[Full Movie English Sub][Link below]', 'Detective Conan Movie 2: The Fourteenth Target') === 'ganzer-film')
pruefe('„wrong title“ wird abgelehnt', grund('wrong title, please delete') === 'falscher-titel')
pruefe('Reaktion, Kritik, Top-Liste, Analyse, AMV, Marathon',
  [grund('Chainsaw Man Reaction'), grund('Kritik zu Bleach'), grund('Top 10 Anime 2022'), grund('Ending erklärt'), grund('Fate AMV'), grund('Yuri!!! on ICE Series Marathon | Crunchyroll Movie Night')].join() ===
    'reaktion,kritik,ranking,analyse,fan-edit,marathon')
pruefe('Folgen-Upload ohne Trailer-Wort wird abgelehnt, mit Vorschau bleibt', grund('Show Episode 3 English Sub') === 'folgen-upload' && grund('Show Episode 3 Preview') === null)
pruefe('Animename mit „Ranking“ bleibt (Videotitel ohne Namen geprüft)', grund('Ranking of Kings | Offizieller Trailer', 'Ranking of Kings') === null)
pruefe('ohne bekannten Namen hielte „Ranking“ an', grund('Ranking of Kings | Offizieller Trailer') === 'ranking')
pruefe('„Let’s Play“ bleibt', grund('Let’s Play | Offizieller Trailer - OmU', 'Let’s Play') === null)
pruefe('Lupin III. vs. Detektiv Conan bleibt', grund('Lupin III. vs. Detektiv Conan | Offizieller Trailer', 'Lupin III. vs. Detektiv Conan') === null)
for (const t of ['Space Dandy Season 2 - Blu-ray/DVD Combo - Coming Soon!', 'Kiss Him, Not Me! Complete Series | Pre-Order Now!', 'Persona3 THE MOVIE #2 Midsummer Knight’s Dream Coming to Blu-ray!', 'Code Geass (Seasons 1 and 2) – Available Now', 'The Place Promised in Our Early Days | On Blu-ray & Digital', 'Chainsaw Man | JETZT AUF CRUNCHYROLL'])
  pruefe(`Disc-/Streamwerbung bleibt: ${t}`, grund(t) === null)

console.log('TMDB-Auswahl nimmt den nächsten echten Trailer')
const callOfTheNight = [yt('iPvK4ORRTHA', 'de', '2022-09-01'), { ...yt('ENtrailer1', 'en', '2022-06-01'), name: 'CALL OF THE NIGHT | Official Trailer' }]
callOfTheNight[0]!.name = 'CALL OF THE NIGHT | Der beste Anime der Sommer-Season 2022 | Anime Review'
const zahl = neueAblehnungen()
const gewaehlt = waehleTmdbVideo(callOfTheNight, macheAblehner(['Call of the Night']), zahl)
pruefe('Review (de) übergangen, englischer Trailer genommen', gewaehlt?.video === 'ENtrailer1' && gewaehlt.sprache === 'en', gewaehlt)
pruefe('Ablehnung gezählt und im Text benannt', zahl.review === 1 && ablehnungenText(zahl) === '1× review', ablehnungenText(zahl))
pruefe('nur ein Review: kein Trailer', waehleTmdbVideo([callOfTheNight[0]!], macheAblehner(['Call of the Night'])) === null)
pruefe('gesperrte Kennung wird abgelehnt', waehleTmdbVideo([yt('KomeKKNbY5c', 'de', '2022')], macheAblehner([], new Set(['KomeKKNbY5c']))) === null)

console.log('Bestand')
const bestand = { 141391: { video: 'iPvK4ORRTHA', titel: 'X Anime Review' }, 2: { video: 'ok', titel: 'X | Trailer' } }
const weg = entferneAbgelehnte(bestand, () => ['X'], new Set())
pruefe('entfernt nur den Nicht-Trailer und nennt ihn', weg.length === 1 && weg[0]!.id === '141391' && weg[0]!.grund === 'review' && Object.keys(bestand).join() === '2', weg)

const echt = readJson<Record<string, { video: string; titel: string }>>('data/trailer.json', {})
const titles = new Map(readJson<{ id: number; titleDe?: string; titleEn?: string; titleRomaji?: string }[]>('public/data/titles.json', []).map((t) => [String(t.id), t]))
const tmdbNamen = readJson<Record<string, { nameDe?: string }>>('data/tmdb-titles.json', {})
const uebrig = entferneAbgelehnte({ ...echt }, (id) => animeNamen(titles.get(id) ?? {}, tmdbNamen[id]?.nameDe), ladeTrailerSperre())
pruefe('data/trailer.json enthält keinen Nicht-Trailer', uebrig.length === 0, uebrig.map((e) => `${e.id} ${e.grund} ${e.titel}`))

if (fehler) {
  console.error(`${fehler} Fehler`)
  process.exit(1)
}
console.log('Trailer-Auswahl: alle Fälle grün')
