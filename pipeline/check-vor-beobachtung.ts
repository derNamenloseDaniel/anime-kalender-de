/**
 * Zusicherung (Kalender-Inventur N1/N2, 26.11.2026): Eine Folge vor einer beobachteten Folge ist sicher erschienen
 * (`vorBeobachtung`, kein „≈“ am Erscheinen, der Tag bleibt `estimated`); `belegtBis` gilt auch bei
 * `firstEpisodeNumber` > 1 ohne niedrigere Beobachtung im selben Release. Fester Tag, kein `new Date()`.
 */
import { expandEvents } from '../shared/logic.ts'
import { planGeschaetzt } from '../web/src/components/detail/folgen-spanne.ts'
import type { Release } from '../shared/types.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const heute = new Date('2026-11-26T12:00:00Z')
const release = (schedule: Record<string, unknown>): Release =>
  ({ slug: 'probe', titleId: 1, name: 'Probe', platform: 'netflix', releaseType: 'weekly', year: 2026, sources: ['x'], schedule: { firstEpisodeDate: '2026-07-08', episodeCount: 12, estimated: true, ...schedule } }) as unknown as Release

console.log('\nFolge vor einer beobachteten Folge (N1, Thunder 3):')
const thunder = expandEvents(release({ observed: { 6: '2026-08-12' } }))
const vor = thunder.filter((e) => e.episode! < 6)
pruefe('Folge 1–5 tragen vorBeobachtung', vor.length === 5 && vor.every((e) => e.vorBeobachtung === true), vor)
pruefe('… ihr Tag bleibt geschätzt', vor.every((e) => e.estimated === true))
pruefe('Folge 6 (beobachtet) und 7 tragen es nicht', thunder.filter((e) => e.episode! >= 6).every((e) => !e.vorBeobachtung))
pruefe('Pille ohne ≈, wenn nur Folge 1–5 gezählt werden', !planGeschaetzt(vor, undefined, [], heute))
pruefe('Pille mit ≈, wenn Folge 7 (nur fortgeschrieben) dabei ist', planGeschaetzt(thunder, undefined, [], heute))

console.log('\nbelegtBis bei firstEpisodeNumber > 1 (N2, Ranma S3):')
const ranma = expandEvents(release({ firstEpisodeDate: '2026-10-10', firstEpisodeNumber: 2, episodeCount: 11, belegtBis: { folge: 4, am: '2026-10-24' } }))
const bis = ranma.filter((e) => e.episode! <= 4)
pruefe('Folge 2–4 sind belegt (kein estimated)', bis.length === 3 && bis.every((e) => e.estimated === undefined), bis.map((e) => e.estimated))
pruefe('Folge 5 hinter belegtBis bleibt geschätzt', ranma.find((e) => e.episode === 5)?.estimated === true)
const ohne = expandEvents(release({ belegtBis: { folge: 4, am: '2026-07-29' } }))
pruefe('first = 1 ohne Beobachtung: belegtBis spricht nichts frei', ohne.filter((e) => e.episode! <= 4).every((e) => e.estimated === true))

if (verletzt) {
  console.error(`\n${verletzt} Zusicherung(en) verletzt.`)
  process.exit(1)
}
console.log('\nOK')
