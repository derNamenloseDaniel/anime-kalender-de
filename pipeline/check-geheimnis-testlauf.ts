/**
 * Wächter: Prüfungen und ihre Kindprozesse sehen keine Schlüssel der Datenläufe (tools/bau-umgebung.mjs, GEHEIMNIS_VARIABLEN).
 * Mit Attrappen-Schlüsseln in der Umgebung: (1) `check:logic`-Rahmen reicht sie weder an Prüfung noch an deren Kind weiter,
 * (2) `check-anilist-mangel-lauf.ts` (startet `fetch.ts` mit TMDB-Pfad) trägt sie nirgends in seine Ausgabe. Kein Netz. Aufruf: `check:logic`.
 */
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { BAU_VARIABLEN, CI_TOKEN_VARIABLEN, GEHEIMNIS_VARIABLEN } from '../tools/bau-umgebung.mjs'

const wurzel = resolve(import.meta.dirname, '..')
// Fest eingetragen statt nur aus dem Modul gelesen: sonst wäre die geprüfte Liste ihr eigenes Orakel.
const ERWARTET = ['ANISEARCH_TOKEN', 'CLOUDFLARE_API_TOKEN', 'CR_WEICHE_TOKEN', 'CR_ZUGANG', 'SERPER_API_KEY', 'STREAMING_API_KEY', 'TMDB_API_KEY', 'YOUTUBE_API_KEY']
// Umgebungsnamen, die ein Workflow aus einem Secret setzt, ohne dass sie Schlüssel sind (nur Schalter).
const KEIN_SCHLUESSEL: Record<string, string> = {
  MERGER_TOKEN_DA: 'Schalter (secrets.NACHT_MERGER_TOKEN != \'\'), kein Wert',
  TROCKEN: 'Schalter (secrets.NACHT_MERGER_TOKEN == \'\'), kein Wert',
}
// Anmeldungen der CI (`GH_TOKEN` kommt in Workflows auch aus NACHT_MERGER_TOKEN): `check:logic` entfernt sie wie `tests-alle`.
const ANMELDUNG = ['GH_TOKEN', 'GITHUB_TOKEN']
const attrappen = Object.fromEntries(ERWARTET.map((n) => [n, `ATTRAPPE-${n}`]))
const attrappenLogic = { ...attrappen, ...Object.fromEntries(ANMELDUNG.map((n) => [n, `ATTRAPPE-${n}`])) }
let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}
pruefe('Liste der Schlüssel unverändert (neue bewusst hier eintragen)', JSON.stringify([...GEHEIMNIS_VARIABLEN].sort()) === JSON.stringify(ERWARTET), GEHEIMNIS_VARIABLEN)

/** Umgebungsnamen (`NAME: ${{ … secrets.X … }}`, auch mit `||`), die weder Schlüssel, Bau-/CI-Variable noch bekannter Schalter sind. */
function ungeregelteSecrets(workflows: string[]): string[] {
  const geregelt = new Set([...ERWARTET, ...BAU_VARIABLEN, ...CI_TOKEN_VARIABLEN, ...Object.keys(KEIN_SCHLUESSEL)])
  const namen = new Set<string>()
  for (const text of workflows) for (const m of text.matchAll(/^\s*([A-Z][A-Z0-9_]*):.*\bsecrets\./gm)) namen.add(m[1])
  return [...namen].filter((n) => !geregelt.has(n)).sort()
}
const workflowDir = join(wurzel, '.github/workflows')
const workflows = readdirSync(workflowDir).filter((d) => /\.ya?ml$/.test(d)).map((d) => readFileSync(join(workflowDir, d), 'utf8'))
pruefe('Workflows lesbar (Wächter nicht blind)', workflows.length > 10, workflows.length)
pruefe('Jedes Secret als Umgebungsvariable steht in der Schlüsselliste, bei Bau/CI oder ist begründeter Schalter', ungeregelteSecrets(workflows).length === 0, ungeregelteSecrets(workflows))
pruefe('Wächter erkennt ein unbekanntes Secret auch im `||`-Fall', ungeregelteSecrets(['      NEU_SCHLUESSEL: ${{ secrets.ALT || secrets.NEU }}'])[0] === 'NEU_SCHLUESSEL')

const ordner = mkdtempSync(join(tmpdir(), 'ak-geheimnis-'))
const posix = (p: string) => p.replace(/\\/g, '/')
const kind = join(ordner, 'a-kind.mjs')
writeFileSync(kind, `const da = ${JSON.stringify([...ERWARTET, ...ANMELDUNG])}.filter((n) => n in process.env)\nif (da.length) { console.error('Schluessel: ' + da.join(',')); process.exit(1) }\n`)
const eltern = join(ordner, 'b-eltern.mjs')
writeFileSync(eltern, `import { spawnSync } from 'node:child_process'\nconst r = spawnSync(process.execPath, ['${posix(kind)}'], { stdio: 'inherit', env: { ...process.env } })\nprocess.exit(r.status ?? 1)\n`)
const liste = join(ordner, 'liste.txt')
writeFileSync(liste, `${posix(kind)}\n${posix(eltern)}\n`)
const keineAusnahmen = join(ordner, 'keine.json')
writeFileSync(keineAusnahmen, JSON.stringify({ hoechstens: 0, ausnahmen: [] }))

for (const name of ['check:logic', 'check:bestand-liste']) {
  const r = spawnSync(process.execPath, [join(wurzel, 'tools/check-logic-alle.mjs'), liste, name], { cwd: wurzel, encoding: 'utf8', env: { ...process.env, ...attrappenLogic, BESTAND_AUSNAHMEN: keineAusnahmen } })
  pruefe(`${name}: weder Prüfung noch Kind erben einen Schlüssel`, r.status === 0, `${r.stdout}\n${r.stderr}`.slice(-400))
}

const lauf = spawnSync(process.execPath, ['--import', 'tsx', 'pipeline/check-anilist-mangel-lauf.ts'], { cwd: wurzel, encoding: 'utf8', timeout: 150_000, env: { ...process.env, ...attrappen } })
const ausgabe = `${lauf.stdout}\n${lauf.stderr}`
pruefe('Testlauf mit fetch.ts-Kind: Ausgabe ohne Attrappen-Schlüssel', !ausgabe.includes('ATTRAPPE'), ausgabe.match(/.{0,40}ATTRAPPE.{0,60}/)?.[0])
pruefe('Testlauf mit fetch.ts-Kind endet mit Exit 0', lauf.status === 0, ausgabe.slice(-300))
process.exit(verletzt ? 1 : 0)
