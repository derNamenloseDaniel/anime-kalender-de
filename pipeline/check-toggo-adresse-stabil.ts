/**
 * Prozesstest von `fetch-toggo.ts`: die Serienseite jedes zugeordneten Titels steht in `data/toggo.json`, gleich ob `titles.json` gerade die Figurenseite
 * oder schon die Serienseite verlinkt (bis 24.11.2026 kippte sie täglich: Figurenseite → Adresse, Serienseite → keine Adresse → am nächsten Tag wieder
 * Figurenseite). Dazu: der Katalog wird abgelegt, bei einer Störung der Serienliste bleiben Katalog und Adressen von gestern.
 * Das echte Skript läuft in einer Wegwerf-Wurzel (`AK_ROOT`) mit einer Attrappe für `fetch` (`--import`). Läuft in `check:logic`.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const REPO = resolve(import.meta.dirname, '..')
const tsx = pathToFileURL(join(REPO, 'node_modules/tsx/dist/esm/index.mjs')).href
const B = 'https://www.toggo.de'
const FIGUR = `${B}/spiel-pty900`
const SERIENSEITE = `${B}/spiel-pty900/serien/spiel-vse900`

/** Drei Serien, die richtige in der Mitte; Antworten der Schnittstelle in der Form der echten (`data.items`). */
const SERIEN = [
  { id: 'vse899', u_name: 'anderes-vse899', title: 'Ein anderes Spiel', characters: [{ u_name: 'spiel-pty900' }], fvod_latest_end_date: 1 },
  { id: 'vse900', u_name: 'spiel-vse900', title: 'Das Spiel', characters: [{ u_name: 'spiel-pty900' }], fvod_latest_end_date: 1 },
  { id: 'vse901', u_name: 'drittes-vse901', title: 'Ein drittes Spiel', characters: [{ u_name: 'dritte-pty901' }], catchup_latest_end_date: 1 },
  { id: 'vse902', u_name: 'viertes-vse902', title: 'Ein viertes Spiel', characters: [{ u_name: 'vierte-pty902' }] },
]
const ATTRAPPE = `
const antwort = (daten, status = 200) => new Response(JSON.stringify(daten), { status })
globalThis.fetch = async (url) => {
  if (process.env.TOGGO_STOERUNG && String(url).includes('type[series]')) return antwort({}, 500)
  if (String(url).includes('type[series]')) return antwort({ data: { items: ${JSON.stringify(SERIEN)} } })
  return antwort({ data: { items: [] } })
}
`

function lauf(links: string[], stoerung = false, vorher?: object): { status: number | null; toggo: { katalog?: { uname: string; frei: boolean }[]; titel: Record<string, { adresse?: string }> } } {
  const wurzel = mkdtempSync(join(tmpdir(), 'toggo-adresse-'))
  try {
    mkdirSync(join(wurzel, 'data'))
    mkdirSync(join(wurzel, 'public/data'), { recursive: true })
    writeFileSync(join(wurzel, 'attrappe.mjs'), ATTRAPPE)
    writeFileSync(join(wurzel, 'public/data/titles.json'), JSON.stringify([{ id: 900001, titleEn: 'Das Spiel', watchLinks: links.map((url) => ({ url })) }]))
    if (vorher) writeFileSync(join(wurzel, 'data/toggo.json'), JSON.stringify(vorher))
    const env = { ...process.env, AK_ROOT: wurzel, ...(stoerung ? { TOGGO_STOERUNG: '1' } : {}) }
    const args = ['--import', tsx, '--import', pathToFileURL(join(wurzel, 'attrappe.mjs')).href, join(REPO, 'pipeline/fetch-toggo.ts')]
    const r = spawnSync(process.execPath, args, { cwd: wurzel, env, encoding: 'utf8', timeout: 90_000 })
    if (r.status !== 0) console.error(`${r.stdout}${r.stderr}`.slice(-800))
    return { status: r.status, toggo: JSON.parse(readFileSync(join(wurzel, 'data/toggo.json'), 'utf8')) }
  } finally {
    rmSync(wurzel, { recursive: true, force: true })
  }
}

let fehler = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  fehler++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

console.log('\nTOGGO-Adresse im Sammler (Prozess):')
const mitFigur = lauf([FIGUR])
pruefe('Figurenseite verlinkt: Adresse = Serienseite', mitFigur.toggo.titel['900001']?.adresse === SERIENSEITE, mitFigur.toggo)
const mitSerie = lauf([SERIENSEITE])
pruefe('Serienseite schon verlinkt (der Tag danach): Adresse bleibt', mitSerie.toggo.titel['900001']?.adresse === SERIENSEITE, mitSerie.toggo)
pruefe('Katalog abgelegt, alle vier Serien', mitSerie.toggo.katalog?.map((s) => s.uname).join(',') === 'anderes-vse899,spiel-vse900,drittes-vse901,viertes-vse902', mitSerie.toggo.katalog)
pruefe('frei = kostenloses Fenster (fvod oder catchup), sonst nicht', mitSerie.toggo.katalog?.map((s) => s.frei).join(',') === 'true,true,true,false', mitSerie.toggo.katalog)
const gestern = { geholtAm: '2026-11-23T00:00:00Z', katalog: [{ id: 'VSE1', uname: 'alt-vse1', titel: 'Alt', figuren: [], frei: false }], titel: { 900001: { serie: 'VSE900', adresse: SERIENSEITE, folgen: [] } } }
const gestoert = lauf([SERIENSEITE], true, gestern)
pruefe('Störung der Serienliste: Katalog von gestern bleibt', gestoert.status === 0 && gestoert.toggo.katalog?.[0]?.uname === 'alt-vse1', gestoert.toggo.katalog)
pruefe('Störung der Serienliste: Adresse von gestern bleibt', gestoert.toggo.titel['900001']?.adresse === SERIENSEITE, gestoert.toggo.titel)

console.log(fehler ? `\n${fehler} Fälle verletzt.` : '\nTOGGO-Adresse im Sammler: alle Fälle halten.')
process.exit(fehler ? 1 : 0)
