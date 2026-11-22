/**
 * Zusicherung: `fetch-anisearch-sprecher.ts` holt die Seiten in der Reihenfolge Hauptbestand-Lücken, Nachholer, Katalog — keine der drei Gruppen fällt aus
 * der Liste `dran`. Das Skript läuft ganz gegen eine Kulisse (`AK_ROOT`), `fetch` ist durch einen Aufzeichner ersetzt (kein Netzabruf, Antwort 404).
 * Die Reihenfolge selbst prüft `check-anisearch-sprecher.ts`; hier geht es um die Verdrahtung im Skript.
 *
 * Aufruf: npm run check:logic (steckt darin) oder `tsx pipeline/check-sprecher-dran.ts`
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const ordner = mkdtempSync(join(tmpdir(), 'sprecher-dran-'))
const aufzeichner = join(ordner, 'aufzeichner.mjs')
const aufruf = join(ordner, 'aufrufe.txt')
mkdirSync(join(ordner, 'data'), { recursive: true })
mkdirSync(join(ordner, 'public', 'data'), { recursive: true })

// Zwei je Gruppe: 101/102 Hauptbestand ohne Seite, 201/202 Hauptbestand mit leerer Seite (30 Tage alt, Besetzung ja > 0), 301/302 nur im Katalog.
const alt = { de: [], ja: 3, fetchedAt: new Date(Date.now() - 30 * 86_400_000).toISOString(), stand: 99 }
writeFileSync(join(ordner, 'public', 'data', 'titles.json'), JSON.stringify([101, 102, 201, 202].map((a, i) => ({ id: i + 1, anisearchId: a }))))
writeFileSync(join(ordner, 'data', 'anisearch.json'), JSON.stringify(Object.fromEntries([301, 302].map((a) => [String(a), { anisearchId: a }]))))
writeFileSync(join(ordner, 'data', 'anisearch-sprecher.json'), JSON.stringify({ 201: alt, 202: alt }))
// Der Takt (6 s je Seite) fällt weg, sonst dauert der Lauf eine halbe Minute.
writeFileSync(
  aufzeichner,
  [
    "import { appendFileSync } from 'node:fs'",
    `globalThis.fetch = async (url) => { appendFileSync(${JSON.stringify(aufruf)}, String(url) + '\\n'); return { ok: false, status: 404 } }`,
    'globalThis.setTimeout = (f, _ms, ...a) => setImmediate(f, ...a)',
    '',
  ].join('\n'),
)

const r = spawnSync(process.execPath, ['--import', 'tsx', '--import', pathToFileURL(aufzeichner).href, 'pipeline/fetch-anisearch-sprecher.ts'], {
  encoding: 'utf8',
  timeout: 120_000,
  env: { ...process.env, AK_ROOT: ordner },
})
const gelesen: string[] = existsSync(aufruf)
  ? readFileSync(aufruf, 'utf8').split('\n').filter(Boolean).map((u) => /anime\/(\d+)\/seiyuu/.exec(u)?.[1] ?? u)
  : []
rmSync(ordner, { recursive: true, force: true })

const soll = '101,102,201,202,301,302'
if (r.status === 0 && gelesen.join() === soll) {
  console.log(`  ✓ Hauptbestand, Nachholer und Katalog kommen in dieser Reihenfolge dran (${soll})`)
  process.exit(0)
}
console.error(`  ✖ Reihenfolge der abgerufenen Seiten — erwartet ${soll}, gefunden ${gelesen.join()} (Exit ${r.status})`)
if (r.status !== 0) console.error(`${r.stdout}${r.stderr}`.slice(-1500))
process.exit(1)
