/**
 * Zusicherungen: Die Bestandswache `check-cover-luecken-bestand.ts` prüft gegen den Vorstand (zuletzt eingecheckter Stand), nicht nur
 * gegen die Lückenliste, die derselbe Bau aus der Ausgabe schreibt. Fall: Der Bau verliert ein Cover und führt die Kennung zugleich auf
 * der Lückenliste → rot (Reihe und `ohne-synchro.json`, die keine Handliste deckt). Eigener Prozess je Lauf gegen ein Wegwerf-Repo
 * unter `os.tmpdir()`. Läuft in `check:logic`.
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

const bild = 'https://image.tmdb.org/t/p/w500/x.jpg'
type Stand = { reihen: Record<string, unknown[]>; titel: unknown[]; ohne: unknown[]; luecken: Record<string, string> }
// Vorstand: Reihe 1 mit zwei Gliedern (900001, 900002) mit Cover; Hauptbestand 900001 mit Cover, 900003 ohne (bekannt);
// Katalog 900004 mit, 900005 ohne Cover.
const VORSTAND: Stand = {
  reihen: { '900001': [{ id: 900001, cover: bild }, { id: 900002, cover: bild }] },
  titel: [{ id: 900001, coverImage: bild }, { id: 900003 }],
  ohne: [{ id: 900004, coverImage: bild }, { id: 900005 }],
  luecken: { '900003': 'ohne-quelle', '900005': 'ohne-quelle' },
}

const wurzel = mkdtempSync(join(tmpdir(), 'cover-luecken-vorstand-'))
try {
  const git = (...a: string[]): void => {
    const r = spawnSync(process.env.GIT_EXE ?? 'git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { cwd: wurzel, windowsHide: true, encoding: 'utf8' })
    if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`)
  }
  mkdirSync(join(wurzel, 'public', 'data'), { recursive: true })
  mkdirSync(join(wurzel, 'data'), { recursive: true })
  const schreibe = (s: Stand): void => {
    writeFileSync(join(wurzel, 'public', 'data', 'franchises.json'), JSON.stringify(s.reihen))
    writeFileSync(join(wurzel, 'public', 'data', 'titles.json'), JSON.stringify(s.titel))
    writeFileSync(join(wurzel, 'public', 'data', 'ohne-synchro.json'), JSON.stringify(s.ohne))
    writeFileSync(join(wurzel, 'data', 'cover-luecken.json'), JSON.stringify(s.luecken))
    writeFileSync(join(wurzel, 'data', 'cover-ohne-bekannt.json'), JSON.stringify({ '900003': 'Film ohne Bildquelle' }))
  }
  const lauf = (...args: string[]): { code: number | null; aus: string } => {
    const r = spawnSync(process.execPath, ['--import', import.meta.resolve('tsx'), fileURLToPath(new URL('./check-cover-luecken-bestand.ts', import.meta.url)), wurzel, ...args], {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 120_000,
    })
    return { code: r.status, aus: `${r.stdout}${r.stderr}` }
  }
  git('init', '-q')
  schreibe(VORSTAND)
  git('add', '.')
  git('commit', '-q', '-m', 'vorstand')

  const gleich = lauf()
  pruefe('unverändert: grün', gleich.code === 0 && !gleich.aus.includes('Cover-Verlust'), gleich.aus)

  // Der Bau verliert das Cover des Reihenglieds 900002 und schreibt es zugleich auf die Lückenliste.
  schreibe({ ...VORSTAND, reihen: { '900001': [{ id: 900001, cover: bild }, { id: 900002 }] }, luecken: { ...VORSTAND.luecken, '900002': 'ohne-quelle' } })
  const reihe = lauf()
  pruefe('Reihe: Cover verloren und auf der Lückenliste → rot mit Kennung', reihe.code === 1 && reihe.aus.includes('Cover-Verlust gegen den Vorstand') && reihe.aus.includes('900002'), reihe.aus)

  schreibe({ ...VORSTAND, ohne: [{ id: 900004 }, { id: 900005 }], luecken: { ...VORSTAND.luecken, '900004': 'ohne-quelle' } })
  const katalog = lauf()
  pruefe('Katalog (ohne-synchro): Cover verloren und auf der Lückenliste → rot mit Kennung', katalog.code === 1 && katalog.aus.includes('900004'), katalog.aus)

  schreibe({ ...VORSTAND, reihen: { '900001': [{ id: 900001 }, { id: 900002, cover: bild }] }, luecken: { ...VORSTAND.luecken, '900001': 'ohne-quelle' } })
  const teil = lauf()
  pruefe('Kennung verliert das Cover nur in der Reihe, Datenbank behält es → rot', teil.code === 1 && teil.aus.includes('900001'), teil.aus)

  schreibe({ ...VORSTAND, ohne: [...VORSTAND.ohne, { id: 900006 }], luecken: { ...VORSTAND.luecken, '900006': 'nicht-abgerufen' } })
  pruefe('neue Kennung ohne Cover auf der Lückenliste → grün', lauf().code === 0, lauf().aus)

  schreibe({ ...VORSTAND, reihen: { '900001': [{ id: 900001, cover: bild }] }, ohne: [{ id: 900005 }] })
  pruefe('Kennungen verlassen den Bestand → grün', lauf().code === 0, lauf().aus)

  schreibe({ ...VORSTAND, titel: [{ id: 900001, coverImage: bild }, { id: 900003, coverImage: bild }], luecken: { '900005': 'ohne-quelle' } })
  const gewonnen = lauf()
  pruefe('Cover gewonnen, Lücke gestrichen → kein Cover-Verlust', !gewonnen.aus.includes('Cover-Verlust'), gewonnen.aus)

  schreibe(VORSTAND)
  const fremd = lauf('--vorstand', 'gibtsnicht')
  pruefe('Vorstand nicht lesbar → rot', fremd.code === 1 && fremd.aus.includes('Vorstand gibtsnicht nicht lesbar'), fremd.aus)
} finally {
  rmSync(wurzel, { recursive: true, force: true })
}

if (fehler) {
  console.error(`check-cover-luecken-vorstand: ${fehler} von ${faelle} Zusicherungen verletzt`)
  process.exit(1)
}
console.log(`check-cover-luecken-vorstand: ${faelle} Zusicherungen grün`)
