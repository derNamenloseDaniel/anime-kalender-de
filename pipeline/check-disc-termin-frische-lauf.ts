/**
 * Prozesstest zu `fetch-anisearch.ts` (24.11.2026): Der Lauf verdrahtet `disc-ausgaben.json` mit der Warteschlange. Ein Titel mit
 * künftiger Disc-Ausgabe (2999-12-31) und einer Seite von 2000 kommt dran, obwohl die allgemeine Frist (`--alter 100000`) nie greift;
 * Titel 2 (Ausgabe 2000-01-01) und Titel 3 (keine Ausgabe) bleiben draußen. Abrufe gehen an eine Attrappe (404), nie ins Netz. Läuft in `check:logic`.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const vorher = process.cwd()
const wurzel = mkdtempSync(join(tmpdir(), 'ak-disc-frische-lauf-'))
let fehler = 0
try {
  for (const d of ['data/anisearch-raw', 'public/data']) mkdirSync(join(wurzel, d), { recursive: true })
  const schreibe = (pfad: string, inhalt: unknown) => writeFileSync(join(wurzel, pfad), JSON.stringify(inhalt))
  for (const asId of [701, 702, 703]) writeFileSync(join(wurzel, `data/anisearch-raw/${asId}.html.gz`), '')
  const attrappe = join(wurzel, 'attrappe.mjs')
  writeFileSync(attrappe, "globalThis.fetch = async () => new Response('', { status: 404 })\n")
  const alt = { info: {}, fetchedAt: '2000-01-01T00:00:00.000Z' }
  const ausgaben = { 1: [{ edition: 'Zukunft', datum: '2999-12-31' }], 2: [{ edition: 'Vergangen', datum: '2000-01-01' }] }

  /** Ein Lauf auf frischem Stand (der Lauf schreibt `anisearch.json` um); `null` lässt `disc-ausgaben.json` weg. */
  function lauf(args: string[], disc: unknown) {
    schreibe('data/anime-ids.json', { updatedAt: '2999-01-01T00:00:00.000Z', anisearch: { 1: 701, 2: 702, 3: 703 } })
    schreibe('public/data/titles.json', [{ id: 1 }, { id: 2 }, { id: 3 }])
    schreibe('public/data/releases.json', [])
    schreibe('public/data/ohne-synchro.json', [])
    schreibe('data/anisearch.json', { 1: alt, 2: alt, 3: alt })
    for (const alte of ['disc-ausgaben.json', 'anisearch-archiv-weg.json']) rmSync(join(wurzel, 'data', alte), { force: true })
    if (disc) schreibe(join('data', 'disc-ausgaben.json'), disc)
    const r = spawnSync(
      process.execPath,
      ['--import', pathToFileURL(attrappe).href, '--import', 'tsx', join(vorher, 'pipeline/fetch-anisearch.ts'), '--alter', '100000', ...args],
      { cwd: vorher, env: { ...process.env, AK_ROOT: wurzel }, encoding: 'utf8', timeout: 90_000, windowsHide: true },
    )
    return { status: r.status, aus: `${r.stdout}${r.stderr}` }
  }
  const pruefe = (text: string, l: { status: number | null; aus: string }, soll: RegExp) => {
    if (l.status === 0 && soll.test(l.aus)) return
    fehler++
    console.error(`FEHLER ${text} (Exit ${l.status}, erwartet ${soll})\n${l.aus.slice(-600)}`)
  }
  pruefe('genau eine Seite (Titel 1, künftige Ausgabe)', lauf(['--limit', '5'], ausgaben), /aniSearch: 1 Seiten werden geholt/)
  pruefe('Katalogtitel ohne Eintrag (künftige Ausgabe) wird nachgelesen', lauf(['--limit', '5'], { 10000704: ausgaben[1] }), /aniSearch: 1 Seiten werden geholt/)
  pruefe('ohne disc-ausgaben.json läuft der Lauf weiter, nichts fällig', lauf(['--limit', '5'], null), /nichts nachzuladen/)
  pruefe('force holt alle drei, limit schneidet auf zwei', lauf(['--force', '--limit', '2'], ausgaben), /aniSearch: 2 Seiten werden geholt/)
} finally {
  rmSync(wurzel, { recursive: true, force: true })
}
if (fehler) process.exit(1)
console.log('Disc-Termin-Frische (Lauf): Titel mit künftiger Ausgabe kommt in die Warteschlange, die anderen nicht')
