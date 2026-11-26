/**
 * Zusicherungen: Die Bestandswache `check-reihen-namen-bestand.ts` prüft auch gegen den Vorstand (zuletzt eingecheckter Stand), nicht nur
 * mit `anisearchNamensKanten`, derselben Funktion, die die Reihen bildet. Fall: Der Bau löst einen aniSearch-Titel aus seiner Reihe, und
 * die Namenssuche findet ihn nicht (anderer Name) → rot. Eigener Prozess je Lauf gegen ein Wegwerf-Repo unter `os.tmpdir()`.
 * Läuft in `check:logic`.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

let fehler = 0
let faelle = 0
function pruefe(name: string, ok: boolean, ist?: unknown): void {
  faelle++
  if (ok) return
  fehler++
  console.error(`FEHLER: ${name}`, ist === undefined ? '' : JSON.stringify(ist))
}

// Reihe 900001 („Kulisse“) mit zwei aniSearch-Gliedern; ihre Namen nennen die Reihe nicht, die Namenssuche findet sie also nie.
const wurzelTitel = { id: 900001, titleEn: 'Kulisse', streams: [] }
const glied = (id: number, inReihe: boolean, reihe = 900001) => ({ id, titleEn: `Anderer Name ${id}`, streams: [], ...(inReihe ? { franchiseId: reihe } : {}) })

const LEER = ['kino-ankuendigungen.yaml', 'ankuendigungen.yaml']

const wurzel = mkdtempSync(join(tmpdir(), 'reihen-namen-vorstand-'))
try {
  const git = (...a: string[]): void => {
    const r = spawnSync(process.env.GIT_EXE ?? 'git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { cwd: wurzel, windowsHide: true, encoding: 'utf8' })
    if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`)
  }
  mkdirSync(join(wurzel, 'public', 'data'), { recursive: true })
  mkdirSync(join(wurzel, 'data'), { recursive: true })
  // Leere Eingaben, die die Namenssuche des Baus beim Laden liest.
  for (const datei of LEER) writeFileSync(join(wurzel, 'data', datei), '[]')
  const schreibe = (haupt: unknown[], ohne: unknown[]): void => {
    writeFileSync(join(wurzel, 'public', 'data', 'titles.json'), JSON.stringify(haupt))
    writeFileSync(join(wurzel, 'public', 'data', 'ohne-synchro.json'), JSON.stringify(ohne))
  }
  const lauf = (...args: string[]): { code: number | null; aus: string } => {
    const r = spawnSync(process.execPath, ['--import', import.meta.resolve('tsx'), fileURLToPath(new URL('./check-reihen-namen-bestand.ts', import.meta.url)), ...args], {
      cwd: wurzel,
      env: { ...process.env, AK_ROOT: wurzel },
      encoding: 'utf8',
      windowsHide: true,
      timeout: 120_000,
    })
    return { code: r.status, aus: `${r.stdout}${r.stderr}` }
  }
  git('init', '-q')
  schreibe([wurzelTitel, glied(10_900_001, true)], [glied(10_900_002, true)])
  git('add', '.')
  git('commit', '-q', '-m', 'vorstand')

  pruefe('unverändert: grün', lauf().code === 0, lauf().aus)

  schreibe([wurzelTitel, glied(10_900_001, false)], [glied(10_900_002, true)])
  const haupt = lauf()
  pruefe('Hauptbestand: Glied verliert die Reihe → rot mit Kennung', haupt.code === 1 && haupt.aus.includes('10900001'), haupt.aus)

  schreibe([wurzelTitel, glied(10_900_001, true)], [glied(10_900_002, false)])
  const katalog = lauf()
  pruefe('Katalog (ohne-synchro): Glied verliert die Reihe → rot mit Kennung', katalog.code === 1 && katalog.aus.includes('10900002'), katalog.aus)

  schreibe([wurzelTitel, { ...glied(10_900_001, false), franchiseId: 10_900_001 }], [glied(10_900_002, true)])
  const eigen = lauf()
  pruefe('Glied wird eigene Wurzel (franchiseId = eigene Kennung) → rot', eigen.code === 1 && eigen.aus.includes('10900001'), eigen.aus)

  schreibe([wurzelTitel, glied(10_900_001, true, 10_900_002)], [{ ...glied(10_900_002, false) }])
  const wechsel = lauf()
  pruefe('Glied wechselt in eine andere Reihe → nur das allein gelassene Glied ist rot', wechsel.code === 1 && wechsel.aus.includes('10900002') && !wechsel.aus.includes('10900001'), wechsel.aus)

  schreibe([glied(10_900_001, false)], [glied(10_900_002, false)])
  pruefe('Reihenwurzel verlässt den Bestand → grün', lauf().code === 0, lauf().aus)

  schreibe([wurzelTitel], [glied(10_900_002, true)])
  pruefe('Glied verlässt den Bestand → grün', lauf().code === 0, lauf().aus)

  schreibe([wurzelTitel, glied(10_900_001, true)], [glied(10_900_002, true)])
  const fremd = lauf('--vorstand', 'gibtsnicht')
  pruefe('Vorstand nicht lesbar → rot', fremd.code === 1 && fremd.aus.includes('Vorstand gibtsnicht nicht lesbar'), fremd.aus)

  // Zweiter Vorstand: ein AniList-Glied (900002) und das kleinste aniSearch-Glied (10 000 000) in der Reihe.
  schreibe([wurzelTitel, glied(900_002, true), glied(10_000_000, true)], [])
  git('add', '.')
  git('commit', '-q', '-m', 'vorstand 2')
  schreibe([wurzelTitel, glied(900_002, false), glied(10_000_000, true)], [])
  pruefe('AniList-Titel verliert die Reihe → nicht Sache dieser Wache, grün', lauf().code === 0, lauf().aus)
  schreibe([wurzelTitel, glied(900_002, true), glied(10_000_000, false)], [])
  const grenze = lauf()
  pruefe('kleinste aniSearch-Kennung 10000000 verliert die Reihe → rot', grenze.code === 1 && grenze.aus.includes('10000000'), grenze.aus)
} finally {
  rmSync(wurzel, { recursive: true, force: true })
}

if (fehler) {
  console.error(`check-reihen-namen-vorstand: ${fehler} von ${faelle} Zusicherungen verletzt`)
  process.exit(1)
}
console.log(`check-reihen-namen-vorstand: ${faelle} Zusicherungen grün`)
