/**
 * Wächter (22.11.2026, Stargazer 120892): Kein Titel trägt Anbieter, die TMDB nur als Kopie der Liste seines Namensvetters führt.
 * Echte Daten aus `data/`, kein Vollbau: Der Bau (`ladeQuellen`) verwirft die Kopien, `uebernehmeTmdbAngebote` legt dann keinen Weg an.
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

const jw = JSON.parse(readFileSync('data/justwatch-audio.json', 'utf8')) as Record<string, JwBefundKopf>
const lade = () => JSON.parse(readFileSync('data/tmdb-titles.json', 'utf8')) as Record<string, TmdbTitelEintrag>

/* Echte Daten: genau ein Titel im Bestand hat eine kopierte Liste (Zählung 22.11.2026), und es ist Stargazer. */
const kopien = [...titelMitKopierterAnbieterliste(jw, lade())]
pruefe('Bestand: kopierte TMDB-Anbieterliste nur bei Stargazer 120892', kopien.join(',') === '120892', kopien.join(','))

/* Der Bau: nach dem Verwerfen legt `uebernehmeTmdbAngebote` für Stargazer keinen Weg an. */
const tmdbTitles = lade()
verwirfKopierteAnbieter(tmdbTitles, jw)
const stargazer = { id: 120892, format: 'MOVIE', streams: [], watchLinks: [] } as unknown as Title
uebernehmeTmdbAngebote({ titles: new Map([[120892, stargazer]]), tmdbTitles, toteAdressen: new Set() })
pruefe('Stargazer trägt keinen Weg aus der Kopie', (stargazer.watchLinks ?? []).length === 0, JSON.stringify(stargazer.watchLinks))
pruefe('Stargazer behält Kennung und Namen', tmdbTitles['120892']?.tmdbId === 779019 && !!tmdbTitles['120892']?.nameDe)
pruefe('Nach dem Verwerfen gibt es keine Kopie mehr', titelMitKopierterAnbieterliste(jw, tmdbTitles).size === 0)

/* Gegenprobe: Der Nachbar 99470 behält seine Angebote, und echte Filmangebote bei Namensvettern bleiben (Mob Psycho 100 Film 100353). */
pruefe('Nachbar 99470 behält seine Liste', (tmdbTitles['99470']?.offers ?? []).length > 0)
pruefe('Film mit eigener, kleinerer Liste (100353) bleibt unberührt', (tmdbTitles['100353']?.offers ?? []).length > 0)

/* Der Bau ruft das Verwerfen auf (sonst bliebe der Wächter oben grün, der Bau aber ohne Riegel). */
pruefe('01-quellen verwirft kopierte Listen', /^\s*verwirfKopierteAnbieter\(tmdbTitles\)/m.test(readFileSync('pipeline/bau/01-quellen.ts', 'utf8')))

/* Synthetisch: Teilmenge allein ist keine Kopie; mit Treffer des JustWatch-Eintrags (gleicherName) auch nicht. */
const nachbar: JwBefundKopf = { jwId: 'ts1', angebote: [{ anbieter: 'Netflix', art: 'FLATRATE' }, { anbieter: 'Maxdome Store', art: 'RENT' }] }
const befund = (gleicherName: boolean): JwBefundKopf => ({ ohneTreffer: true, namenTreffer: { jwId: 'ts1', gleicherName } })
const tmdb = (...namen: string[]) => ({ x: { offers: namen.map((name) => ({ name })) } })
pruefe('Teilmenge ist keine Kopie', titelMitKopierterAnbieterliste({ n: nachbar, x: befund(false) }, tmdb('Netflix')).size === 0)
pruefe('gleicherName: false und gleiche Liste ist Kopie', titelMitKopierterAnbieterliste({ n: nachbar, x: befund(false) }, tmdb('Netflix', 'maxdome Store')).has('x'))
pruefe('gleicherName: true ist Zuordnungsfrage, keine Kopie', titelMitKopierterAnbieterliste({ n: nachbar, x: befund(true) }, tmdb('Netflix', 'maxdome Store')).size === 0)

process.exit(fehler ? 1 : 0)
