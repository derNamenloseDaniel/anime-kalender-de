/**
 * Zusicherungen zu `pipeline/lib/vorstand-abgang.ts`: Abgänge gegen den Vorstand, Freigaben, `--vorstand` und das Lesen einer Datei aus
 * einem Git-Stand (Wegwerf-Repo unter `os.tmpdir()`, nie der echte Bestand). Läuft in `check:logic`.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { abgaengeOhneGrund, leseVorstandJson, ohneFreigabe, vorstandRef } from './lib/vorstand-abgang.ts'

let fehler = 0
let faelle = 0
function pruefe(name: string, ist: unknown, soll: unknown): void {
  faelle++
  if (JSON.stringify(ist) === JSON.stringify(soll)) return
  fehler++
  console.error(`FEHLER: ${name}\n  ist  ${JSON.stringify(ist)}\n  soll ${JSON.stringify(soll)}`)
}

// Abgänge: vorher a, b, c, d (b doppelt); jetzt a; c entfällt erklärt; b und d fehlen ohne Grund.
pruefe('Abgänge ohne Grund, sortiert, ohne Doppel', abgaengeOhneGrund(['d', 'a', 'b', 'c', 'b'], new Set(['a']), (k) => k === 'c'), ['b', 'd'])
pruefe('nichts weg: leer', abgaengeOhneGrund(['a', 'b'], new Set(['a', 'b', 'x']), () => false), [])
pruefe('alles erklärt: leer', abgaengeOhneGrund(['a', 'b'], new Set(), () => true), [])

const frei = { w1: { b: 'gewollt, 26.11.2026' }, w2: { d: 'x' } }
pruefe('Freigabe nimmt nur die Schlüssel der eigenen Wache heraus', ohneFreigabe(['b', 'd'], 'w1', frei), ['d'])
pruefe('Wache ohne Freigaben: alles bleibt', ohneFreigabe(['b', 'd'], 'w3', frei), ['b', 'd'])

pruefe('--vorstand <ref>', vorstandRef(['x', '--vorstand', 'HEAD^1']), 'HEAD^1')
pruefe('--vorstand als erstes Argument', vorstandRef(['--vorstand', 'HEAD~2']), 'HEAD~2')
pruefe('ohne --vorstand: HEAD', vorstandRef(['x']), 'HEAD')
pruefe('--vorstand ohne Wert: HEAD', vorstandRef(['--vorstand']), 'HEAD')

const wurzel = mkdtempSync(join(tmpdir(), 'vorstand-abgang-'))
try {
  const git = (...a: string[]): void => {
    const r = spawnSync(process.env.GIT_EXE ?? 'git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { cwd: wurzel, windowsHide: true, encoding: 'utf8' })
    if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`)
  }
  const wirft = (f: () => unknown): boolean => {
    try {
      f()
      return false
    } catch {
      return true
    }
  }
  git('init', '-q')
  mkdirSync(join(wurzel, 'd'))
  writeFileSync(join(wurzel, 'd', 'a.json'), '[1,2]')
  writeFileSync(join(wurzel, 'd', 'kaputt.json'), '{')
  git('add', '.')
  git('commit', '-q', '-m', 'eins')
  writeFileSync(join(wurzel, 'd', 'a.json'), '[3]')
  git('commit', '-q', '-am', 'zwei')
  writeFileSync(join(wurzel, 'd', 'a.json'), '[4]')

  pruefe('liest den eingecheckten Stand, nicht die Arbeitskopie', leseVorstandJson(join('d', 'a.json'), 'HEAD', wurzel), [3])
  pruefe('älterer Stand über die Referenz', leseVorstandJson('d/a.json', 'HEAD^1', wurzel), [1, 2])
  pruefe('Datei fehlt im Stand: undefined', leseVorstandJson('d/fehlt.json', 'HEAD', wurzel), undefined)
  pruefe('unbekannter Stand wirft', wirft(() => leseVorstandJson('d/a.json', 'gibtsnicht', wurzel)), true)
  pruefe('kaputter Inhalt wirft', wirft(() => leseVorstandJson('d/kaputt.json', 'HEAD', wurzel)), true)
} finally {
  rmSync(wurzel, { recursive: true, force: true })
}

if (fehler) {
  console.error(`check-vorstand-abgang: ${fehler} von ${faelle} Zusicherungen verletzt`)
  process.exit(1)
}
console.log(`check-vorstand-abgang: ${faelle} Zusicherungen grün`)
