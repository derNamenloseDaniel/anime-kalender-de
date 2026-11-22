/**
 * Test von `lib/studio-von-hand.ts` (Handstudios, `data/studio-von-hand.yaml`) und seiner Verdrahtung in `bau/12-meta.ts` (`baueMeta`).
 * Anlass 22.11.2026: 104 Titel ohne Studio, AniList und aniSearch-Archiv liefern keins, ein Handweg fehlte. Kulisse im Wegwerf-Ordner über `AK_ROOT`;
 * die echte Datei wird nur auf Struktur und Kennungen gegen `public/data/titles.json` geprüft.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import yaml from 'js-yaml'
import type { Title } from '../shared/types.ts'
import { ladeStudioVonHand, pruefeStudioVonHand, setzeStudiosVonHand } from './lib/studio-von-hand.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}
function wirft(roh: unknown): boolean {
  try {
    pruefeStudioVonHand(roh)
    return false
  } catch {
    return true
  }
}

const gut = { id: 1, studios: ['A'], quellen: ['https://example.org/a'] }
pruefe('gültige Zeile', !wirft([gut]))
pruefe('leere Datei', pruefeStudioVonHand(null).length === 0)
pruefe('keine Liste', wirft({ id: 1 }))
pruefe('id fehlt', wirft([{ ...gut, id: undefined }]))
pruefe('id doppelt', wirft([gut, gut]))
pruefe('Studios leer', wirft([{ ...gut, studios: [] }]))
pruefe('Studios mit leerem Namen', wirft([{ ...gut, studios: ['A', ' '] }]))
pruefe('vier Studios', wirft([{ ...gut, studios: ['A', 'B', 'C', 'D'] }]))
pruefe('drei Studios sind erlaubt', !wirft([{ ...gut, studios: ['A', 'B', 'C'] }]))
pruefe('Quelle fehlt', wirft([{ ...gut, quellen: [] }]))
pruefe('Quelle ohne https', wirft([{ ...gut, quellen: ['http://example.org/a'] }]))

const titel = (id: number, studios: string[]): [number, Title] => [id, { id, studios } as Title]
const karte = new Map([titel(1, []), titel(2, ['AniList']), titel(3, [])])
const gesetzt = setzeStudiosVonHand(karte, [
  { id: 1, studios: ['Hand'], quellen: ['https://example.org/1'] },
  { id: 2, studios: ['Hand'], quellen: ['https://example.org/2'] },
  { id: 99, studios: ['Hand'], quellen: ['https://example.org/99'] },
])
pruefe('Titel ohne Studio bekommt das Handstudio', karte.get(1)!.studios?.join() === 'Hand', karte.get(1)!.studios)
pruefe('vorhandenes AniList-Studio bleibt', karte.get(2)!.studios?.join() === 'AniList', karte.get(2)!.studios)
pruefe('Titel ohne Eintrag bleibt leer', karte.get(3)!.studios?.length === 0)
pruefe('Zahl der gesetzten Titel: 1 (unbekannte Kennung zählt nicht)', gesetzt === 1, gesetzt)

// Die echte Datei: Struktur und jede Kennung gegen den Bestand.
const echt = ladeStudioVonHand()
const bestand = JSON.parse(readFileSync(new URL('../public/data/titles.json', import.meta.url), 'utf8')) as { id: number }[]
const ids = new Set(bestand.map((t) => t.id))
pruefe('echte Datei hat Einträge', echt.length > 0, echt.length)
pruefe('jede Kennung der echten Datei steht in titles.json', echt.every((e) => ids.has(e.id)), echt.filter((e) => !ids.has(e.id)).map((e) => e.id))

// Verdrahtung: baueMeta im Kindprozess gegen eine Kulisse (Mutant „Aufruf in baueMeta entfernt“ muss rot werden).
const wurzel = mkdtempSync(join(tmpdir(), 'studio-von-hand-'))
mkdirSync(join(wurzel, 'data'), { recursive: true })
writeFileSync(join(wurzel, 'data', 'studio-von-hand.yaml'), yaml.dump([{ id: 11, studios: ['Hand'], quellen: ['https://example.org/11'] }, { id: 12, studios: ['Hand'], quellen: ['https://example.org/12'] }]))
writeFileSync(join(wurzel, 'data', 'kino-ankuendigungen.yaml'), '[]\n')
const kind = `
import { baueMeta } from ${JSON.stringify(new URL('./bau/12-meta.ts', import.meta.url).href)}
const t = (id, studios) => [id, { id, studios, genres: [], keywords: [], watchLinks: [] }]
const titles = new Map([t(10, []), t(11, []), t(12, ['AniList'])])
baueMeta({ titles, releases: [], events: [], motnBelege: 0 })
console.log('ERGEBNIS ' + JSON.stringify([...titles.values()].map((x) => [x.id, x.studios])))
`
const lauf = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', kind], { encoding: 'utf8', windowsHide: true, timeout: 60000, env: { ...process.env, AK_ROOT: wurzel } })
const zeile = lauf.stdout.split('\n').find((z) => z.startsWith('ERGEBNIS '))
const ergebnis = new Map<number, string[]>(zeile ? (JSON.parse(zeile.slice(9)) as [number, string[]][]) : [])
pruefe('Kindprozess lief bis zum Ende (Exit 0, Ergebniszeile)', lauf.status === 0 && Boolean(zeile), { status: lauf.status, err: lauf.stderr.slice(0, 300) })
pruefe('baueMeta setzt das Handstudio bei Titel 11', ergebnis.get(11)?.join() === 'Hand', ergebnis.get(11))
pruefe('baueMeta lässt Titel 10 ohne Eintrag leer', ergebnis.get(10)?.length === 0, ergebnis.get(10))
pruefe('baueMeta lässt das AniList-Studio von Titel 12', ergebnis.get(12)?.join() === 'AniList', ergebnis.get(12))

if (verletzt) {
  console.error(`check-studio-von-hand: ${verletzt} Zusicherung(en) verletzt`)
  process.exit(1)
}
console.log('check-studio-von-hand: alle Zusicherungen halten')
