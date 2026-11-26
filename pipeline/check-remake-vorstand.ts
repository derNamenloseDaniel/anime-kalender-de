/**
 * Zusicherungen zu `lib/remake-vorstand.ts` und ihrer Verdrahtung in `check-remake-zaehlung-bestand.ts`: Eine Neuverfilmung, die im
 * Vorstand (zuletzt eingecheckter Stand) markiert war und jetzt nicht mehr, obwohl beide Teile noch in den Reihen stehen → rot.
 * Die Wache selbst trägt feste Anlassfälle aus dem echten Bestand und läuft deshalb nicht gegen eine Kulisse; geprüft wird die
 * Vorstand-Funktion an einem Wegwerf-Repo unter `os.tmpdir()` (`AK_ROOT`) und der Aufruf in der Wache. Läuft in `check:logic`.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

let fehler = 0
let faelle = 0
function pruefe(name: string, ok: boolean, ist?: unknown): void {
  faelle++
  if (ok) return
  fehler++
  console.error(`FEHLER: ${name}`, ist === undefined ? '' : JSON.stringify(ist))
}

const wurzel = mkdtempSync(join(tmpdir(), 'remake-vorstand-'))
process.env.AK_ROOT = wurzel
try {
  const { remakeAbgaenge, remakeGegenVorstand } = await import('./lib/remake-vorstand.ts')
  const git = (...a: string[]): void => {
    const r = spawnSync(process.env.GIT_EXE ?? 'git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { cwd: wurzel, windowsHide: true, encoding: 'utf8' })
    if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`)
  }
  // Reihe 1: 900002 ist die Neuverfilmung von 900001; Reihe 2: 900004 die von 900003.
  const reihen = (a: boolean, b: boolean, ohne?: number) => ({
    '900001': [{ id: 900001 }, { id: 900002, ...(a ? { remakeVon: 900001 } : {}) }].filter((m) => m.id !== ohne),
    '900003': [{ id: 900003 }, { id: 900004, ...(b ? { remakeVon: 900003 } : {}) }].filter((m) => m.id !== ohne),
  })
  const datei = join(wurzel, 'public', 'data', 'franchises.json')
  mkdirSync(join(wurzel, 'public', 'data'), { recursive: true })
  git('init', '-q')
  writeFileSync(datei, JSON.stringify(reihen(true, true)))
  git('add', '.')
  git('commit', '-q', '-m', 'vorstand')

  pruefe('unverändert: nichts', remakeGegenVorstand('HEAD').length === 0, remakeGegenVorstand('HEAD'))
  writeFileSync(datei, JSON.stringify(reihen(false, true)))
  const weg = remakeGegenVorstand('HEAD')
  pruefe('Markierung verloren, beide Teile da → Zeile mit Schlüssel', weg.length === 1 && weg[0]!.includes('900002|900001') && !weg[0]!.includes('900004'), weg)
  writeFileSync(datei, JSON.stringify(reihen(false, false)))
  const beide = remakeGegenVorstand('HEAD')
  pruefe('zwei verloren → beide genannt', beide.length === 1 && beide[0]!.includes('2 Neuverfilmung') && beide[0]!.includes('900004|900003'), beide)
  writeFileSync(datei, JSON.stringify(reihen(false, true, 900002)))
  pruefe('Neuverfilmung verlässt die Reihen → nichts', remakeGegenVorstand('HEAD').length === 0, remakeGegenVorstand('HEAD'))
  writeFileSync(datei, JSON.stringify(reihen(false, true, 900001)))
  pruefe('Original verlässt die Reihen → nichts', remakeGegenVorstand('HEAD').length === 0, remakeGegenVorstand('HEAD'))
  const fremd = remakeGegenVorstand('gibtsnicht')
  pruefe('Vorstand nicht lesbar → Zeile', fremd.length === 1 && fremd[0]!.includes('Vorstand gibtsnicht nicht lesbar'), fremd)
  pruefe('neue Markierung ist kein Abgang', remakeAbgaenge(reihen(false, false), reihen(true, true)).length === 0)

  // Verdrahtung: Die Wache ruft die Vorstand-Prüfung auf und zählt ihr Ergebnis als Verstoß.
  const wache = readFileSync(new URL('./check-remake-zaehlung-bestand.ts', import.meta.url), 'utf8')
  pruefe('Wache ruft remakeGegenVorstand mit --vorstand auf', wache.includes('remakeGegenVorstand(vorstandRef(process.argv.slice(2)))'))
  pruefe('Wache meldet das Ergebnis über pruefe', /pruefe\([^\n]*gegenVorstand\.length === 0/.test(wache))
} finally {
  rmSync(wurzel, { recursive: true, force: true })
}

if (fehler) {
  console.error(`check-remake-vorstand: ${fehler} von ${faelle} Zusicherungen verletzt`)
  process.exit(1)
}
console.log(`check-remake-vorstand: ${faelle} Zusicherungen grün`)
