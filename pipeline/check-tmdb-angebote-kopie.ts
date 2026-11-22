/**
 * Wächter (22.11.2026, Stargazer 120892): Kein Titel trägt Anbieter, die TMDB nur als Kopie der Liste seines Namensvetters führt.
 * Der Anlassfall steht als feste Fixture da (Daten vom 22.11.2026), damit eine Korrektur im Bestand die Kette nicht rot färbt; am echten
 * Bestand gilt nur die Regel „nach dem Verwerfen bleibt keine Kopie“, ein Fund davor ist eine Warnung (der Bau fängt ihn ab).
 *
 * Aufruf: `npx tsx pipeline/check-tmdb-angebote-kopie.ts`
 */
import { readFileSync } from 'node:fs'
import { uebernehmeTmdbAngebote } from './bau/03-4-tmdb-angebote.ts'
import { titelMitKopierterAnbieterliste, verwirfKopierteAnbieter, type JwBefundKopf } from './lib/tmdb-angebote-kopie.ts'
import type { TmdbTitelEintrag } from './bau/01-quellen.ts'
import type { Title } from '../shared/types.ts'

let fehler = 0
const pruefe = (name: string, ok: boolean, detail = '') => {
  console.log(`${ok ? '✓' : '✖'} ${name}${ok ? '' : ` ${detail}`}`)
  if (!ok) fehler++
}

/* Anlassfall: JustWatch kennt den Nachbarn (99470) mit Angeboten, Stargazer (120892) nur als Namenstreffer ohne gleichen Namen. */
const angebote = [
  { anbieter: 'Amazon Prime Video', art: 'FLATRATE' },
  { anbieter: 'Aniverse Amazon Channel', art: 'FLATRATE' },
  { anbieter: 'Apple TV Store', art: 'RENT' },
  { anbieter: 'MagentaTV', art: 'RENT' },
  { anbieter: 'maxdome Store', art: 'RENT' },
  { anbieter: 'Apple TV Store', art: 'BUY' },
  { anbieter: 'Amazon DVD / Blu-ray', art: 'BUY' },
]
const jw: Record<string, JwBefundKopf> = {
  '99470': { jwId: 'tm474818', angebote },
  '120892': { ohneTreffer: true, namenTreffer: { jwId: 'tm474818', gleicherName: false } },
}
const liste = (...namen: string[]) => namen.map((name) => ({ name, kind: 'rent' as const }))
const gemeinsam = liste('Amazon Prime Video', 'Aniverse Amazon Channel', 'Apple TV Store', 'Videoload', 'maxdome Store')
const fixture = (): Record<string, TmdbTitelEintrag> => ({
  '99470': { tmdbId: 601980, kind: 'movie', offers: gemeinsam, justwatchUrl: 'https://tmdb.example/601980' },
  '120892': { tmdbId: 779019, kind: 'movie', nameDe: 'Stargazer', offers: gemeinsam, justwatchUrl: 'https://tmdb.example/779019' },
})

pruefe('Fixture: nur Stargazer ist Kopie', [...titelMitKopierterAnbieterliste(jw, fixture())].join(',') === '120892')
const tmdbTitles = fixture()
verwirfKopierteAnbieter(tmdbTitles, jw)
const stargazer = { id: 120892, format: 'MOVIE', streams: [], watchLinks: [] } as unknown as Title
const nachbar = { id: 99470, format: 'MOVIE', streams: [], watchLinks: [] } as unknown as Title
uebernehmeTmdbAngebote({ titles: new Map([[120892, stargazer], [99470, nachbar]]), tmdbTitles, toteAdressen: new Set() })
pruefe('Stargazer trägt keinen Weg aus der Kopie', (stargazer.watchLinks ?? []).length === 0, JSON.stringify(stargazer.watchLinks))
pruefe('Fixture: nach dem Verwerfen keine Kopie mehr', titelMitKopierterAnbieterliste(jw, tmdbTitles).size === 0)
pruefe('Stargazer behält Kennung und Namen', tmdbTitles['120892']?.tmdbId === 779019 && tmdbTitles['120892']?.nameDe === 'Stargazer')
pruefe('Nachbar 99470 behält seine Wege', (nachbar.watchLinks ?? []).length > 0)

/* Der Bau ruft das Verwerfen auf (sonst bliebe der Wächter oben grün, der Bau aber ohne Riegel). */
pruefe('01-quellen verwirft kopierte Listen', /^\s*verwirfKopierteAnbieter\(tmdbTitles\)/m.test(readFileSync('pipeline/bau/01-quellen.ts', 'utf8')))

/* Synthetisch: Teilmenge allein ist keine Kopie; mit gleichem Namen auch nicht. */
const nb: JwBefundKopf = { jwId: 'ts1', angebote: [{ anbieter: 'Netflix', art: 'FLATRATE' }, { anbieter: 'Maxdome Store', art: 'RENT' }] }
const befund = (gleicherName: boolean): JwBefundKopf => ({ ohneTreffer: true, namenTreffer: { jwId: 'ts1', gleicherName } })
const tmdb = (...namen: string[]) => ({ x: { offers: namen.map((name) => ({ name })) } })
pruefe('Teilmenge ist keine Kopie', titelMitKopierterAnbieterliste({ n: nb, x: befund(false) }, tmdb('Netflix')).size === 0)
pruefe('gleicherName: false und gleiche Liste ist Kopie', titelMitKopierterAnbieterliste({ n: nb, x: befund(false) }, tmdb('Netflix', 'maxdome Store')).has('x'))
pruefe('gleicherName: true ist Zuordnungsfrage, keine Kopie', titelMitKopierterAnbieterliste({ n: nb, x: befund(true) }, tmdb('Netflix', 'maxdome Store')).size === 0)

/* Echter Bestand: nach dem Verwerfen bleibt keine Kopie; ein Fund davor ist nur eine Warnung. */
const echtJw = JSON.parse(readFileSync('data/justwatch-audio.json', 'utf8')) as Record<string, JwBefundKopf>
const echt = JSON.parse(readFileSync('data/tmdb-titles.json', 'utf8')) as Record<string, TmdbTitelEintrag>
const roh = titelMitKopierterAnbieterliste(echtJw, echt)
if (roh.size) console.log(`  Hinweis: ${roh.size} Kopie(n) im Rohbestand (${[...roh].join(', ')}); der Bau verwirft sie`)
verwirfKopierteAnbieter(echt, echtJw)
pruefe('Echter Bestand: nach dem Verwerfen keine Kopie mehr', titelMitKopierterAnbieterliste(echtJw, echt).size === 0)

process.exit(fehler ? 1 : 0)
