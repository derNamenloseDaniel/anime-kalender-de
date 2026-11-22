/**
 * Zusicherungen zum TMDB-Genre-Rückfall (`bau/genre-aus-tmdb.ts`, Mängelart genre, 22.11.2026): Vorrang von AniList/aniSearch,
 * Kennzeichnung `genreQuelle`, Zuordnungstabelle, nur Animation-Treffer. Aufruf: `npm run check:logic`.
 */
import { genreQuelleFehler, genresAusTmdb, TMDB_GENRE, uebernehmeGenreAusTmdb } from './bau/genre-aus-tmdb.ts'
import { GENRE_DE } from '../shared/mappings.ts'
import type { Title } from '../shared/types.ts'

let verletzt = 0
const pruefe = (name: string, ok: boolean, detail?: unknown): void => {
  if (!ok) {
    verletzt++
    console.error(`✖ ${name}`, detail ?? '')
  } else console.log(`✔ ${name}`)
}

console.log('Genre aus TMDB: Zuordnung')
pruefe('Tabelle: jedes Ziel ist ein Genre-Name der Oberfläche', Object.values(TMDB_GENRE).flat().every((g) => g in GENRE_DE), Object.values(TMDB_GENRE).flat().filter((g) => !(g in GENRE_DE)))
pruefe('Comedy + Animation → Comedy', genresAusTmdb([16, 35]).join() === 'Comedy')
pruefe('Action & Adventure → Action, Adventure', genresAusTmdb([16, 10759]).join() === 'Action,Adventure')
pruefe('Doppelte fallen weg (Adventure + Action & Adventure)', genresAusTmdb([16, 12, 10759]).join() === 'Adventure,Action')
pruefe('nur Animation / Family / Kids: kein Genre', genresAusTmdb([16, 10751, 10762]).length === 0)
pruefe('ohne Animation (Realtitel): kein Genre', genresAusTmdb([35, 18]).length === 0)
pruefe('fehlende oder leere Liste: kein Genre', genresAusTmdb(undefined).length === 0 && genresAusTmdb([]).length === 0)

console.log('\nGenre aus TMDB: Vorrang und Kennzeichnung')
const titel = (id: number, genres: string[]): Title => ({ id, genres }) as unknown as Title
const titles = new Map<number, Title>([[1, titel(1, ['Drama'])], [2, titel(2, [])], [3, titel(3, [])], [4, titel(4, [])]])
const eintraege = { 1: { genreIds: [16, 35] }, 2: { genreIds: [16, 35] }, 3: { genreIds: [16, 35] }, 4: { genreIds: [16] } }
uebernehmeGenreAusTmdb({ titles, tmdbMehrdeutig: new Set(['3']), tmdb: eintraege })
pruefe('vorhandenes Genre bleibt, ohne Kennzeichnung', titles.get(1)!.genres.join() === 'Drama' && titles.get(1)!.genreQuelle === undefined)
pruefe('Titel ohne Genre bekommt TMDB-Genre, gekennzeichnet', titles.get(2)!.genres.join() === 'Comedy' && titles.get(2)!.genreQuelle === 'tmdb')
pruefe('mehrdeutige Zuordnung bleibt ohne Genre', titles.get(3)!.genres.length === 0 && titles.get(3)!.genreQuelle === undefined)
pruefe('nur Animation: bleibt ohne Genre', titles.get(4)!.genres.length === 0)
pruefe('Zusicherung: gekennzeichnet nur mit Genre', genreQuelleFehler(titles.values()).length === 0)
pruefe('Zusicherung meldet Kennzeichen ohne Genre', genreQuelleFehler([{ id: 9, genres: [], genreQuelle: 'tmdb' } as unknown as Title]).length === 1)

console.log('\nGenre aus TMDB: jede Zeile der Tabelle, Echtfall, Zählung, Einbau')
const ERWARTET: Record<number, string> = {
  12: 'Adventure', 14: 'Fantasy', 18: 'Drama', 27: 'Horror', 28: 'Action', 35: 'Comedy', 53: 'Thriller', 80: 'Crime', 878: 'Sci-Fi', 9648: 'Mystery',
  10402: 'Music', 10749: 'Romance', 10759: 'Action,Adventure', 10765: 'Sci-Fi,Fantasy',
}
for (const [id, soll] of Object.entries(ERWARTET)) pruefe(`TMDB ${id} → ${soll}`, genresAusTmdb([16, Number(id)]).join() === soll, genresAusTmdb([16, Number(id)]))
pruefe('Tabelle hat genau diese Zeilen', Object.keys(TMDB_GENRE).length === Object.keys(ERWARTET).length)

const gemeldet: string[] = []
const alt = console.log
console.log = (...a: unknown[]) => void gemeldet.push(a.join(' '))
/* 16570 (AniList, ohne Genre bei AniList, 22.11.2026): TMDB 467885 nennt [16,12,10751,14,878] aus der echten Datei. */
const echt = new Map<number, Title>([[16570, titel(16570, [])]])
uebernehmeGenreAusTmdb({ titles: echt, tmdbMehrdeutig: new Set() })
console.log = alt
pruefe('Echtfall aus data/tmdb-titles.json: Adventure, Fantasy, Sci-Fi, gekennzeichnet', echt.get(16570)!.genres.join() === 'Adventure,Fantasy,Sci-Fi' && echt.get(16570)!.genreQuelle === 'tmdb', echt.get(16570))
pruefe('Baulog nennt die Zahl der ergänzten Titel', gemeldet.some((z) => z.includes('Genre aus TMDB: 1 Titel')), gemeldet)

const abschluss = await import('./bau/11-wege-abschluss.ts')
const text = (await import('node:fs')).readFileSync(new URL('./bau/11-wege-abschluss.ts', import.meta.url), 'utf8')
pruefe('Einbau: der Bauschritt ruft den Rückfall auf', typeof abschluss.schliesseWegeAb === 'function' && /uebernehmeGenreAusTmdb\(\{ titles, tmdbMehrdeutig \}\)/.test(text))

if (verletzt) {
  console.error(`\n${verletzt} Zusicherung(en) verletzt.`)
  process.exit(1)
}
console.log('\nGenre aus TMDB: alle Zusicherungen grün.')
