/**
 * Zusicherungen: Die Bestandswachen `check-cartoon-staffeln-bestand.ts` und `check-cartoon-wege-bestand.ts` prüfen gegen den Vorstand
 * (zuletzt eingecheckter Stand), nicht nur gegen die Staffel-Prüfliste, die derselbe Bau schreibt. Fall: Der Bau streicht Staffeln bzw.
 * Verteilung und Prüflisten-Eintrag zugleich, der Titel bleibt → rot. Eigener Prozess je Lauf gegen ein Wegwerf-Repo unter
 * `os.tmpdir()` (`AK_ROOT`), Kennungen ab -900001. Läuft in `check:logic`.
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

const LISTE = 'data/cartoon-staffeln-pruefliste.json'
const ZWEI = [{ nr: 1, folgen: 6 }, { nr: 2, folgen: 6 }]
const weg = (von: number, bis: number) => ({ platform: 'netflix', url: 'https://www.netflix.com/title/1', teilBereich: { von, bis }, dubQuelle: 'justwatch', dubStand: '2026-11-01', dubHintOnly: true })
const ganz = { platform: 'netflix', url: 'https://www.netflix.com/title/1' }

/** Ein Cartoon: `staffeln` = Zahl der Staffeln (0 = keine), `verteilt` = Weg je Staffel geteilt. */
const cartoon = (id: number, staffeln: number, verteilt = false) => ({
  id,
  titleDe: `C${-id}`,
  episodes: 12,
  ...(staffeln ? { staffeln: staffeln === 2 ? ZWEI : [{ nr: 1, folgen: 12 }], staffelnQuelle: 'justwatch' } : {}),
  streams: verteilt ? [weg(1, 6), weg(7, 12)] : [ganz],
})
const eintrag = (titleId: number) => ({ titleId, titel: 'C', quelle: 'justwatch', gruende: ['g'] })

const wurzel = mkdtempSync(join(tmpdir(), 'cartoon-staffeln-vorstand-'))
try {
  const git = (...a: string[]): void => {
    const r = spawnSync(process.env.GIT_EXE ?? 'git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { cwd: wurzel, windowsHide: true, encoding: 'utf8' })
    if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`)
  }
  mkdirSync(join(wurzel, 'public', 'data'), { recursive: true })
  mkdirSync(join(wurzel, 'data', 'curated'), { recursive: true })
  const schreibe = (cartoons: unknown[], liste: unknown[]): void => {
    writeFileSync(join(wurzel, 'public', 'data', 'cartoons.json'), JSON.stringify(cartoons))
    writeFileSync(join(wurzel, LISTE), JSON.stringify(liste))
  }
  const lauf = (wache: string, ...args: string[]): { code: number | null; aus: string } => {
    const r = spawnSync(process.execPath, ['--import', import.meta.resolve('tsx'), fileURLToPath(new URL(`./${wache}`, import.meta.url)), ...args], {
      cwd: wurzel,
      env: { ...process.env, AK_ROOT: wurzel },
      encoding: 'utf8',
      windowsHide: true,
      timeout: 120_000,
    })
    return { code: r.status, aus: `${r.stdout}${r.stderr}` }
  }
  const staffeln = (...a: string[]) => lauf('check-cartoon-staffeln-bestand.ts', ...a)
  const wege = (...a: string[]) => lauf('check-cartoon-wege-bestand.ts', ...a)

  git('init', '-q')
  // Vorstand: -900001 verteilt, -900002 auf der Prüfliste (zwei Staffeln, Weg ganz), -900003 mit einer Staffel.
  schreibe([cartoon(-900001, 2, true), cartoon(-900002, 2), cartoon(-900003, 1)], [eintrag(-900002)])
  git('add', '.')
  git('commit', '-q', '-m', 'vorstand')

  pruefe('unverändert: Staffel-Wache grün', staffeln().code === 0, staffeln().aus)
  pruefe('unverändert: Wege-Wache grün', wege().code === 0, wege().aus)

  // Staffeln: Bau streicht Staffeln von -900003 (nicht gelistet) bzw. Staffeln und Listeneintrag von -900002.
  schreibe([cartoon(-900001, 2, true), cartoon(-900002, 2), cartoon(-900003, 0)], [eintrag(-900002)])
  const ohneStaffeln = staffeln()
  pruefe('Staffeln: Bau streicht Staffeln eines Titels, der bleibt → rot', ohneStaffeln.code === 1 && ohneStaffeln.aus.includes('-900003') && ohneStaffeln.aus.includes('hatten im Vorstand HEAD Staffeln oder'), ohneStaffeln.aus)
  schreibe([cartoon(-900001, 2, true), cartoon(-900002, 0), cartoon(-900003, 1)], [])
  const beides = staffeln()
  pruefe('Staffeln: Soll und Ist zugleich gestrichen → rot', beides.code === 1 && beides.aus.includes('-900002'), beides.aus)
  schreibe([cartoon(-900001, 2, true), cartoon(-900003, 1)], [])
  pruefe('Staffeln: Titel verlässt die Cartoons → grün', staffeln().code === 0, staffeln().aus)

  // Wege: Bau hebt die Verteilung von -900001 auf, ohne den Titel auf die Liste zu setzen (Soll und Ist zugleich ohne ihn).
  schreibe([cartoon(-900001, 2), cartoon(-900002, 2), cartoon(-900003, 1)], [eintrag(-900002)])
  const ganzWeg = wege()
  pruefe('Wege: Verteilung aufgehoben, Titel mit zwei Staffeln nicht gelistet → rot', ganzWeg.code === 1 && ganzWeg.aus.includes('-900001') && ganzWeg.aus.includes('hatten im Vorstand HEAD verteilte Wege'), ganzWeg.aus)
  schreibe([cartoon(-900001, 2), cartoon(-900002, 2), cartoon(-900003, 1)], [eintrag(-900001), eintrag(-900002)])
  pruefe('Wege: Verteilung aufgehoben, Titel steht jetzt auf der Liste → grün', wege().code === 0, wege().aus)
  schreibe([cartoon(-900001, 2, true), cartoon(-900002, 2), cartoon(-900003, 1)], [])
  const listeWeg = wege()
  pruefe('Wege: Titel verlässt die Liste ohne Verteilung → kein Abgang der Wege (Staffelsumme prüft die Staffel-Wache)', listeWeg.code === 0, listeWeg.aus)
  schreibe([cartoon(-900001, 2), cartoon(-900002, 2, true), cartoon(-900003, 1)], [eintrag(-900001)])
  pruefe('Wege: Liste und Verteilung tauschen die Titel → grün', wege().code === 0, wege().aus)
  schreibe([cartoon(-900001, 1), cartoon(-900002, 1), cartoon(-900003, 1)], [])
  pruefe('Wege: nur noch eine Staffel, nichts zu verteilen → grün', wege().code === 0, wege().aus)

  for (const [name, f] of [['Staffel', staffeln], ['Wege', wege]] as const) {
    const fremd = f('--vorstand', 'gibtsnicht')
    pruefe(`${name}-Wache: Vorstand nicht lesbar → rot`, fremd.code === 1 && fremd.aus.includes('Vorstand gibtsnicht nicht lesbar'), fremd.aus)
  }
} finally {
  rmSync(wurzel, { recursive: true, force: true })
}

if (fehler) {
  console.error(`check-cartoon-staffeln-vorstand: ${fehler} von ${faelle} Zusicherungen verletzt`)
  process.exit(1)
}
console.log(`check-cartoon-staffeln-vorstand: ${faelle} Zusicherungen grün`)
