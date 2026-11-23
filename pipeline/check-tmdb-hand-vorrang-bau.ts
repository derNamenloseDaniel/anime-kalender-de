/**
 * Handvorrang im Bau (Anlass 99196, 23.11.2026): Jeder Leser des TMDB-Caches in `pipeline/bau/` nimmt die Handzeilen
 * (`mitHandvorrang`), und ein Bau-Leser sieht an einer Kulisse die Handkennung statt der gespeicherten.
 */
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

let verletzt = 0
let faelle = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  faelle++
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const CACHE = 'tmdb-titles.json'

/** Stellen im Quelltext, die den Cache einlesen (`readJson(…'data/tmdb-titles.json'`, auch über mehrere Zeilen) und nicht in `mitHandvorrang(` stehen. */
export function leserOhneVorrang(text: string): number {
  const leser = [...text.matchAll(new RegExp(`readJson(?:<[^(]*>)?\\(\\s*'${['data', CACHE].join('/').replace('.', '\\.')}'`, 'g'))]
  return leser.filter((m) => !/mitHandvorrang\(\s*$/.test(text.slice(Math.max(0, m.index - 40), m.index))).length
}

console.log('\nHandvorrang im Bau: Wächter über die Leser')
{
  const umhuellt = "const a = mitHandvorrang(readJson<Record<string, X>>('data/tmdb-titles.json', {}))"
  const roh = "const a = readJson<Record<string, X>>('data/tmdb-titles.json', {})"
  const rohMehrzeilig = "const a = readJson<Record<string, X>>(\n    'data/tmdb-titles.json',\n    {},\n  )"
  pruefe('Fixture: umhüllter Leser besteht', leserOhneVorrang(umhuellt) === 0)
  pruefe('Fixture: roher Leser fällt auf', leserOhneVorrang(roh) === 1)
  pruefe('Fixture: roher Leser über mehrere Zeilen fällt auf', leserOhneVorrang(rohMehrzeilig) === 1)
  pruefe('Fixture: zwei Leser in einer Datei, nur einer umhüllt: fällt auf', leserOhneVorrang(`${umhuellt}\n${roh}`) === 1)
  const offen = readdirSync('pipeline/bau')
    .filter((f) => f.endsWith('.ts'))
    .map((f) => [f, leserOhneVorrang(readFileSync(`pipeline/bau/${f}`, 'utf8'))] as const)
    .filter(([, n]) => n > 0)
  pruefe('jeder Leser des Caches in pipeline/bau nimmt den Handvorrang', offen.length === 0, offen)
}

console.log('\nHandvorrang im Bau: Kulisse')
const wurzel = mkdtempSync(join(tmpdir(), 'tmdb-hand-vorrang-'))
try {
  mkdirSync(join(wurzel, 'data'))
  const schreibeD = (name: string, inhalt: string): void => writeFileSync(join(wurzel, 'data', name), inhalt)
  schreibeD(CACHE, JSON.stringify({ 99196: { tmdbId: 469912, kind: 'movie', genreIds: [16, 18] }, 98452: { tmdbId: 469912, kind: 'movie', genreIds: [16, 18] } }))
  schreibeD('tmdb-von-hand.yaml', '- anilistId: 99196\n  tmdbId: 483459\n  kind: movie\n')
  process.env.AK_ROOT = wurzel
  const { uebernehmeGenreAusTmdb } = await import('./bau/genre-aus-tmdb.ts')
  const { mehrdeutigeFilmzuordnungen } = await import('./lib/tmdb-eindeutig.ts')
  const { mitHandvorrang } = await import('./lib/tmdb-von-hand.ts')
  const titel = (id: number) => ({ id, genres: [] }) as never
  const titles = new Map([[99196, titel(99196)], [98452, titel(98452)]])
  uebernehmeGenreAusTmdb({ titles, tmdbMehrdeutig: new Set() })
  const g = (id: number) => (titles.get(id) as unknown as { genres?: string[] }).genres?.length ?? 0
  pruefe('Bau-Leser: 99196 trägt nicht mehr die Genres des Films 469912', g(99196) === 0, g(99196))
  pruefe('Bau-Leser: 98452 (Handzeile fehlt) bleibt bei seiner Kennung', g(98452) > 0, g(98452))
  const gelesen = mitHandvorrang(JSON.parse(readFileSync(join(wurzel, 'data', CACHE), 'utf8')) as Record<string, { tmdbId?: number }>)
  pruefe('Handkennung gilt: 99196 → 483459', gelesen['99196']?.tmdbId === 483459, gelesen['99196'])
  pruefe('keine geteilte Filmkennung mehr', mehrdeutigeFilmzuordnungen(gelesen as never).size === 0)
} finally {
  rmSync(wurzel, { recursive: true, force: true })
}

if (verletzt) {
  console.error(`\n${verletzt} von ${faelle} Zusicherung(en) verletzt.`)
  process.exit(1)
}
console.log(`\nHandvorrang im Bau: ${faelle} Zusicherungen grün.`)
