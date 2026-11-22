/**
 * Zusicherung zu `lib/nur-omu-vorstand.ts` und zur Bestandswache `check-nur-omu-bestand.ts`: Die Wache rechnet ihr Soll mit einer eigenen Fassung der Regel,
 * nicht mit `nurOmuTitel` aus dem Bau. Läuft in `check:logic`; der Prozessteil fährt die Wache gegen eine Kulisse (`AK_ROOT`), nie gegen das Repo.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Release, Title } from '../shared/types.ts'
import { nurOmuImHauptbestand } from './lib/nur-omu-vorstand.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const titel = (id: number, extra: Partial<Title> = {}): Title => ({ id, streams: [], ...extra }) as unknown as Title
const termin = (titleId: number, sprache: Release['sprache'], extra: Partial<Release> = {}): Release => ({ titleId, slug: `t${titleId}-${sprache}`, sprache, ...extra }) as unknown as Release
const dub = { platform: 'netflix', dub: true } as unknown as Title['streams'][number]

// Zwei Glieder je Rolle: 901/902 sind der Verstoß, 911–918 je ein anderer Freispruch.
const titles = [
  titel(901), titel(902),
  titel(911, { streams: [dub] }), titel(912), titel(913), titel(914, { deErstausgabe: { von: '2026-01-01' } as Title['deErstausgabe'] }),
  titel(915), titel(916, { ankuendigung: { synchro: 'angekuendigt' } as Title['ankuendigung'] }), titel(917), titel(918),
  titel(919, { streams: [{ platform: 'netflix' } as Title['streams'][number]] }),
]
const releases = [
  termin(901, 'omu'), termin(902, 'omu'), termin(902, 'omu'),
  termin(911, 'omu'), termin(912, 'omu'), termin(913, 'omu'), termin(913, 'offen'), termin(914, 'omu'),
  termin(915, 'omu'), termin(916, 'omu'), termin(917, 'omu', { widerlegt: { am: '2026-01-01' } as Release['widerlegt'] }), termin(917, 'omu'),
  termin(918, 'omu', { widerlegt: { am: '2026-01-01' } as Release['widerlegt'] }), termin(919, 'omu'), termin(919, undefined),
]
const stimmen = (id: number): boolean => id === 912
const marke = (id: number): string | undefined => ({ 915: 'p', 917: 'd' }[id as 915 | 917])
const ids = nurOmuImHauptbestand(titles, releases, stimmen, marke).map((t) => t.id)

console.log('Vorstand (Regelfassung):')
pruefe('Verstoß: zwei Titel, deren Termine alle nur Originalton nennen, ohne Beleg', ids.includes(901) && ids.includes(902), ids)
pruefe('Freispruch: ein Deutsch-Stream, deutsche Sprechrollen, ein Termin ohne OmU, deutsche Erstausgabe', [911, 912, 913, 914].every((i) => !ids.includes(i)), ids)
pruefe('Freispruch: aniSearch-Marke „geplant“ oder „vertont“, Ankündigung der Synchro', [915, 917, 916].every((i) => !ids.includes(i)), ids)
pruefe('Freispruch: ohne gültigen Termin (nur widerlegte) und mit einem Termin ohne Sprachangabe', !ids.includes(918) && !ids.includes(919), ids)
pruefe('genau die zwei Verstöße', ids.length === 2, ids)

console.log('Prozess (Wache gegen Kulisse):')
function kulisse(verstoss: boolean): { wurzel: string; exit: number; ausgabe: string } {
  const wurzel = mkdtempSync(join(tmpdir(), 'nur-omu-vorstand-'))
  mkdirSync(join(wurzel, 'public', 'data', 'voices'), { recursive: true })
  mkdirSync(join(wurzel, 'data'), { recursive: true })
  writeFileSync(join(wurzel, 'data', 'anisearch-ids-hand.yaml'), '')
  const stand = verstoss ? titles.filter((t) => [901, 902, 911, 912].includes(t.id)) : titles.filter((t) => [911, 912].includes(t.id))
  writeFileSync(join(wurzel, 'public', 'data', 'titles.json'), JSON.stringify(stand))
  writeFileSync(join(wurzel, 'public', 'data', 'releases.json'), JSON.stringify(releases))
  writeFileSync(join(wurzel, 'public', 'data', 'voices', '912.json'), JSON.stringify({ titleId: 912, updatedAt: '2099-01-01', roles: [{ character: 'A', actor: 'B' }] }))
  const r = spawnSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'pipeline/check-nur-omu-bestand.ts'], { env: { ...process.env, AK_ROOT: wurzel }, encoding: 'utf8', timeout: 60_000 })
  rmSync(wurzel, { recursive: true, force: true })
  return { wurzel, exit: r.status ?? -1, ausgabe: `${r.stdout}${r.stderr}` }
}
const rot = kulisse(true)
pruefe('Kulisse mit zwei Verstößen: Exit 1 und „VERSTÖSSE: 2“', rot.exit === 1 && rot.ausgabe.includes('VERSTÖSSE: 2'), `${rot.exit} ${rot.ausgabe.slice(-200)}`)
const gruen = kulisse(false)
pruefe('Kulisse ohne Verstoß (Deutsch-Stream, Sprechrollen): Exit 0 und „VERSTÖSSE: 0“', gruen.exit === 0 && gruen.ausgabe.includes('VERSTÖSSE: 0'), `${gruen.exit} ${gruen.ausgabe.slice(-200)}`)

console.log(verletzt ? `\nnur-omu-vorstand: ${verletzt} Zusicherung(en) verletzt.` : 'nur-omu-vorstand: alle Zusicherungen halten.')
process.exit(verletzt ? 1 : 0)
