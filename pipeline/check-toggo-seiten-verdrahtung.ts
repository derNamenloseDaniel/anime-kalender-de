/**
 * Verdrahtung der TOGGO-Seiten im Bau: die echten Aufrufer rufen `setzeToggoSeiten` und `toggoStaffelFeld` auf.
 * - `schreibeSynopsenUndReichereAn` (`13-1-anreichern.ts`) ruft `setzeToggoSeiten(allTitles, 'Anime')` unbedingt auf, `schreibeCartoons`
 *   (`nebendateien.ts`) `setzeToggoSeiten(titel, 'Cartoons', true)` (geparst: gestrichen, `0 &&`, `if (…) continue` davor und ein anderes Argument fallen auf);
 * - `schreibeFolgenDateien` schreibt `tg` in die Detaildatei von Pokémon 527 (Kulisse über `AK_ROOT`, echter Aufrufer als Kindprozess).
 * Läuft in `check:logic`.
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import yaml from 'js-yaml'
import { unbedingteAufrufe } from './lib/unbedingte-aufrufe.ts'

const KURATIERT = ['data', 'curated'] // in Teilen: Ziel in der Wegwerf-Wurzel, kein Schreibziel der Pipeline (check-workflows)
const wurzelRepo = join(import.meta.dirname, '..')
const lies = (pfad: string) => readFileSync(join(wurzelRepo, pfad), 'utf8')
const aufruf = (datei: string, funktion: string) => unbedingteAufrufe(lies(datei), funktion).filter((a) => a.name === 'setzeToggoSeiten')

const anime = aufruf('pipeline/bau/13-1-anreichern.ts', 'schreibeSynopsenUndReichereAn')
assert.equal(anime.length, 1, 'Anime: genau ein unbedingter Aufruf von setzeToggoSeiten')
assert.equal(anime[0]!.args.join('|'), "allTitles|'Anime'", 'Anime: Argumente')
const cartoons = aufruf('pipeline/bau/nebendateien.ts', 'schreibeCartoons')
assert.equal(cartoons.length, 1, 'Cartoons: genau ein unbedingter Aufruf von setzeToggoSeiten')
assert.equal(cartoons[0]!.args.join('|'), "titel|'Cartoons'|true", 'Cartoons: Argumente (mit automatischer Zuordnung)')

const tsx = createRequire(join(wurzelRepo, 'package.json')).resolve('tsx/cli')
const wurzel = mkdtempSync(join(tmpdir(), 'toggo-tg-bau-'))
try {
  for (const d of ['data/cache', KURATIERT.join('/'), 'public/data']) mkdirSync(join(wurzel, d), { recursive: true })
  const folgen = [1, 2, 3].map((nr) => ({ nr, datum: `2020-01-0${nr}`, minuten: 24, de: `Folge ${nr}` }))
  writeFileSync(join(wurzel, 'data/anisearch-folgen.json'), JSON.stringify({ 777: { folgen } }))
  writeFileSync(join(wurzel, 'data/anisearch.json'), JSON.stringify({ 527: { anisearchId: 777 } }))
  writeFileSync(join(wurzel, 'data/folgen-hinweise.yaml'), '[]\n')
  writeFileSync(join(wurzel, 'data/kino-ankuendigungen.yaml'), '[]\n')
  for (const d of ['toggo-seiten.yaml', 'pokemon-staffeln.yaml']) cpSync(join(wurzelRepo, ...KURATIERT, d), join(wurzel, ...KURATIERT, d))
  const hand = yaml.load(lies(join(...KURATIERT, 'toggo-seiten.yaml'))) as { pokemon: { staffel: number; serie: string }[] }
  const katalog = hand.pokemon.map((h, i) => ({ id: `VSE${i}`, uname: h.serie, titel: h.serie, figuren: ['pokemon'], frei: true }))
  writeFileSync(join(wurzel, 'data/toggo.json'), JSON.stringify({ katalog, titel: {} }))
  const r = spawnSync(process.execPath, [tsx, join(wurzelRepo, 'pipeline/lib/kulisse-toggo-tg.ts')], { env: { ...process.env, AK_ROOT: wurzel }, encoding: 'utf8', windowsHide: true, timeout: 120_000 })
  assert.equal(r.status, 0, r.stderr.slice(-500))
  const tg = JSON.parse(r.stdout.trim().split('\n').pop()!) as [number, string][]
  assert.deepEqual(tg?.map(([staffel]) => staffel), [1, 2, 3, 4, 5], 'tg: die fünf Staffeln von Pokémon 527')
  assert.equal(tg[0]![1], 'https://www.toggo.de/pokemon/serien/pokemon-indigo-liga', 'tg: Staffel 1 = Indigo-Liga')
} finally {
  rmSync(wurzel, { recursive: true, force: true })
}
console.log('check-toggo-seiten-verdrahtung: ok (Aufrufe im Bau geparst, tg in der Detaildatei von 527 aus dem echten Aufrufer)')
