/**
 * Zusicherungen: Ein TMDB-Film, den ein AniList-Titel und die aniSearch-Zeile seiner eigenen Seite tragen, ist nicht mehrdeutig
 * (`mehrdeutigeFilmzuordnungen`, `lib/tmdb-eindeutig.ts`): die aniSearch-Zeile kommt nicht in den Bestand (`vergebeneSeiten`).
 * Belegt am Bestand vom 26.11.2026: Spycies 163696 ↔ 10014868, Rohirrim 185613 ↔ 10019566. Gegenprobe: Code Geass Akito (zwei AniList-Titel)
 * und Kitaro (aniSearch-Zeile ohne Träger) bleiben mehrdeutig. Teil 2 fährt `ladeQuellen()` gegen eine Wegwerf-Wurzel (`AK_ROOT`).
 * Aufruf: `npm run check:logic`.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/* `ROOT` (lib/util.ts) steht beim ersten Import fest; deshalb die Wurzel vor jedem Pipeline-Import. */
const wurzel = mkdtempSync(join(tmpdir(), 'ak-zwilling-'))
process.env.AK_ROOT = wurzel
const { mehrdeutigeFilmzuordnungen } = await import('./lib/tmdb-eindeutig.ts')

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify([...(gefunden as Iterable<unknown>)])}`}`)
}

console.log('\nTMDB-Film: AniList-Titel und aniSearch-Zeile seiner Seite')
const spycies = { tmdbId: 550738, kind: 'movie' as const }
const rohirrim = { tmdbId: 839033, kind: 'movie' as const }
const akito = { tmdbId: 212161, kind: 'movie' as const }
const kitaro = { tmdbId: 904759, kind: 'movie' as const }
const bruecke = new Map([['163696', '14868'], ['185613', '19566'], ['8888', '6300'], ['15197', '6300'], ['130622', '16981']])

const echt = mehrdeutigeFilmzuordnungen({ '163696': spycies, '10014868': spycies, '185613': rohirrim, '10019566': rohirrim }, bruecke)
pruefe('Spycies und Rohirrim: Partner ist die eigene aniSearch-Zeile, nichts wird verworfen', echt.size === 0, echt)

const gegen = mehrdeutigeFilmzuordnungen({ '8888': akito, '15197': akito, '130622': kitaro, '10019697': kitaro }, bruecke)
pruefe('Gegenprobe Code Geass Akito: zwei AniList-Titel derselben Seite bleiben mehrdeutig', gegen.has('8888') && gegen.has('15197'), gegen)
pruefe('Gegenprobe Kitaro: aniSearch-Zeile, deren Seite kein Partner trägt, bleibt mehrdeutig', gegen.has('130622') && gegen.has('10019697'), gegen)

const dritter = mehrdeutigeFilmzuordnungen({ '163696': spycies, '10014868': spycies, '777': spycies }, bruecke)
pruefe('Zwilling plus ein dritter Titel: alle drei verlieren den Film', dritter.size === 3, dritter)

const fremd = mehrdeutigeFilmzuordnungen({ '777': spycies, '10014868': spycies }, bruecke)
pruefe('aniSearch-Zeile, deren Seite ein Titel außerhalb der Gruppe trägt, zählt mit', fremd.size === 2, fremd)

const ohne = mehrdeutigeFilmzuordnungen({ '163696': spycies, '10014868': spycies })
pruefe('ohne Brücke bleibt die alte Regel', ohne.size === 2, ohne)

console.log('\nTMDB-Film-Zwilling im Bau (ladeQuellen)')
try {
  mkdirSync(join(wurzel, 'data', 'curated'), { recursive: true })
  mkdirSync(join(wurzel, 'data', 'cache'), { recursive: true })
  writeFileSync(join(wurzel, 'data', 'kino-ankuendigungen.yaml'), '[]')
  writeFileSync(join(wurzel, 'data', 'anisearch-ids-hand.yaml'), '185613: 19566\n')
  writeFileSync(join(wurzel, 'data', 'anisearch.json'), JSON.stringify({ '163696': { anisearchId: 14868 } }))
  writeFileSync(join(wurzel, 'data', 'cache', 'anilist-by-id.json'), '{"1":{"id":1}}')
  const titel = {
    '163696': { ...spycies, fsk: 6 },
    '10014868': { ...spycies, fsk: 6 },
    '185613': { ...rohirrim, fsk: 12 },
    '10019566': { ...rohirrim, fsk: 12 },
    '8888': akito,
    '15197': akito,
  }
  writeFileSync(join(wurzel, 'data', 'tmdb-titles.json'), JSON.stringify(titel))
  const { ladeQuellen } = await import('./bau/01-quellen.ts')
  const { tmdbTitles, tmdbMehrdeutig } = ladeQuellen()
  pruefe('Spycies (Abruf-Brücke) und Rohirrim (Handdatei) behalten FSK 6 und 12', tmdbTitles['163696']?.fsk === 6 && tmdbTitles['185613']?.fsk === 12, tmdbMehrdeutig)
  pruefe('im Bau verworfen bleibt nur Code Geass Akito', [...tmdbMehrdeutig].sort().join() === '15197,8888', tmdbMehrdeutig)
} finally {
  rmSync(wurzel, { recursive: true, force: true })
}
if (verletzt) process.exit(1)
console.log('TMDB-Film-Zwilling: 8 Zusicherungen ✓')
