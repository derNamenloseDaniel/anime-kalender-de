/**
 * Zusicherungen: `zaehleWarnung` zählt WARNUNG-Zeilen je Art, `warnungsZusammenfassung` sortiert absteigend, kappt bei 20 Arten und nennt die
 * Gesamtzahl; `log`/`warn` aus `util.ts` zählen mit, `meldeWarnungen` schreibt ins Step Summary. Läuft in `check:logic`. Kein Netz, keine Uhr.
 */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { meldeWarnungen } from './lib/warnungen-melden.ts'
import { artDerWarnung, MAX_ARTEN, setzeWarnungenZurueck, warnungsZusammenfassung, zaehleWarnung } from './lib/warnungen-zaehlen.ts'
import { log, warn } from './lib/util.ts'

let fehler = 0
let faelle = 0
function pruefe(name: string, ok: boolean, ist?: unknown): void {
  faelle++
  if (ok) return
  fehler++
  console.error(`FEHLER: ${name}`, ist === undefined ? '' : JSON.stringify(ist))
}
function stumm(f: () => void): void {
  const l = console.log
  const w = console.warn
  console.log = () => {}
  console.warn = () => {}
  try {
    f()
  } finally {
    console.log = l
    console.warn = w
  }
}

pruefe('Art: bis zum Doppelpunkt', artDerWarnung('⚠ WARNUNG JustWatch: 3 Filme abgewiesen') === 'JustWatch')
pruefe('Art: Präfix und Einrückung egal', artDerWarnung('  ⚠ WARNUNG Folgentitel: 2 Titel') === 'Folgentitel')
pruefe('Art: ohne Doppelpunkt die ersten drei Wörter', artDerWarnung('WARNUNG eins zwei drei vier fünf') === 'eins zwei drei')
pruefe('Art: Zeile ohne WARNUNG zählt nicht', artDerWarnung('ohne-weg.json: 5 Titel') === undefined)
pruefe('Art: Marke ohne Text', artDerWarnung('⚠ WARNUNG') === '(ohne Text)')

setzeWarnungenZurueck()
pruefe('leer: Nullzeile', warnungsZusammenfassung() === 'Warnungen im Bau: 0', warnungsZusammenfassung())
for (const z of ['⚠ WARNUNG A: x', '⚠ WARNUNG B: y', '⚠ WARNUNG A: z', '⚠ WARNUNG C: w', '⚠ WARNUNG A: v', '⚠ WARNUNG B: u', 'keine Warnung']) zaehleWarnung(z)
const z1 = warnungsZusammenfassung()
pruefe('Summe 6 in 3 Arten, absteigend', z1 === 'Warnungen im Bau: 6 in 3 Arten — 3× A; 2× B; 1× C', z1)
pruefe('Zusammenfassung enthält kein „WARNUNG“', !z1.includes('WARNUNG'), z1)

setzeWarnungenZurueck()
stumm(() => {
  log('⚠ WARNUNG L: eins')
  warn('⚠ WARNUNG W: zwei')
  warn('WARNUNG W: drei')
  log('normale Zeile')
  warn('Hinweis ohne Marke')
})
const z2 = warnungsZusammenfassung()
pruefe('log/warn aus util zählen mit', z2 === 'Warnungen im Bau: 3 in 2 Arten — 2× W; 1× L', z2)

setzeWarnungenZurueck()
for (let i = 0; i < MAX_ARTEN + 5; i++) for (let k = 0; k <= i; k++) zaehleWarnung(`⚠ WARNUNG Art${String(i).padStart(2, '0')}: x`)
const z3 = warnungsZusammenfassung()
const gesamt = ((MAX_ARTEN + 5) * (MAX_ARTEN + 6)) / 2
pruefe(
  'Kappung: 20 Arten, Rest genannt, Gesamtzahl bleibt',
  z3.startsWith(`Warnungen im Bau: ${gesamt} in ${MAX_ARTEN + 5} Arten`) && z3.split('; ').length === MAX_ARTEN + 1 && z3.endsWith('… 5 weitere Arten') && z3.includes('25× Art24') && !z3.includes('Art04'),
  z3,
)

const arten20 = Array.from({ length: MAX_ARTEN }, (_, i) => `⚠ WARNUNG Z${i}: x`)
setzeWarnungenZurueck()
arten20.forEach((z) => zaehleWarnung(z))
pruefe('genau 20 Arten: kein „weitere“', !warnungsZusammenfassung().includes('weitere'), warnungsZusammenfassung())
setzeWarnungenZurueck()
arten20.concat('⚠ WARNUNG Z99: x').forEach((z) => zaehleWarnung(z))
pruefe('21 Arten: „… 1 weitere Arten“', warnungsZusammenfassung().endsWith('; … 1 weitere Arten'), warnungsZusammenfassung())
setzeWarnungenZurueck()
for (const z of ['⚠ WARNUNG y: 1', '⚠ WARNUNG x: 1', '⚠ WARNUNG z: 1', '⚠ WARNUNG z: 2']) zaehleWarnung(z)
pruefe('Gleichstand: alphabetisch', warnungsZusammenfassung().endsWith('2× z; 1× x; 1× y'), warnungsZusammenfassung())
const lang40 = 'L'.repeat(40)
pruefe('Art: Doppelpunkt nach genau 40 Zeichen gilt', artDerWarnung(`⚠ WARNUNG ${lang40}: x`) === lang40)
pruefe('Art: Doppelpunkt nach 41 Zeichen gilt nicht (drei Wörter, auf 40 gekappt)', artDerWarnung(`⚠ WARNUNG ${lang40}L: x`) === lang40)
pruefe('Art: lange drei Wörter auf 40 gekappt', artDerWarnung(`WARNUNG ${'a'.repeat(30)} ${'b'.repeat(30)} c`)?.length === 40)
setzeWarnungenZurueck()
const gelogt: string[] = []
const alt = console.log
console.log = (...a: unknown[]) => void gelogt.push(a.join(' '))
try { meldeWarnungen(undefined) } finally { console.log = alt }
pruefe('Logzeile mit Präfix „[pipeline]“', gelogt.length === 1 && gelogt[0] === '[pipeline] Warnungen im Bau: 0', gelogt)
process.env.GITHUB_STEP_SUMMARY = join(tmpdir(), `warnungen-env-${process.pid}.md`)
stumm(() => meldeWarnungen())
pruefe('GITHUB_STEP_SUMMARY aus der Umgebung wird beschrieben', readFileSync(process.env.GITHUB_STEP_SUMMARY, 'utf8') === 'Warnungen im Bau: 0\n\n')
rmSync(process.env.GITHUB_STEP_SUMMARY, { force: true })
delete process.env.GITHUB_STEP_SUMMARY

const ordner = mkdtempSync(join(tmpdir(), 'warnungen-'))
const datei = join(ordner, 'summary.md')
stumm(() => meldeWarnungen(datei))
const inhalt = readFileSync(datei, 'utf8')
pruefe('Step Summary bekommt die Zeile', inhalt.startsWith('Warnungen im Bau: '), inhalt.slice(0, 40))
rmSync(ordner, { recursive: true, force: true })

console.log(`check-warnungen-zaehlen: ${faelle} Zusicherungen, ${fehler} Fehler`)
process.exit(fehler ? 1 : 0)
