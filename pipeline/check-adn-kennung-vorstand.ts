/**
 * Zusicherungen: Die Bestandswache `check-adn-kennung-bestand.ts` prüft auch gegen den Vorstand (zuletzt eingecheckter Stand), nicht nur
 * mit `loeseAdnTitelIds`, das der Bau selbst aufruft. Fall: Der Bau verliert Weg bzw. Termin einer ADN-Show, die der Kalender
 * (`data/adn.json`, Sammler) noch führt → rot. Eigener Prozess je Lauf gegen ein Wegwerf-Repo unter `os.tmpdir()` (`AK_ROOT`),
 * Kennungen ab 900000. Läuft in `check:logic`.
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

const ADN = 'https://animationdigitalnetwork.com/de/video'
const show = (showId: number) => ({ showId, title: `S${showId}`, url: `${ADN}/${showId}`, episodes: [] })
const kalender = (...ids: number[]) => ({ scrapedAt: '', window: { from: '', to: '' }, shows: ids.map(show) })
// 900901 hängt als Weg an Titel 900001, 900902 als Termin an Titel 900002; 900903 als Weg ohne Bindestrich-Namen.
const titel = (...wege: number[]) => [
  { id: 900001, streams: wege.filter((w) => w !== 900903).map((w) => ({ platform: 'adn', url: `${ADN}/${w}-k`, dub: true })) },
  { id: 900002, streams: wege.includes(900903) ? [{ platform: 'adn', url: `${ADN}/900903`, dub: true }] : [] },
]
const termine = (...ids: number[]) => ids.map((id) => ({ slug: `s${id}`, titleId: 900002, platform: 'adn', platformUrl: `${ADN}/${id}-k/1-folge`, sources: ['x'] }))

const LEER = ['kino-ankuendigungen.yaml', 'ankuendigungen.yaml']

const wurzel = mkdtempSync(join(tmpdir(), 'adn-kennung-vorstand-'))
try {
  const git = (...a: string[]): void => {
    const r = spawnSync(process.env.GIT_EXE ?? 'git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { cwd: wurzel, windowsHide: true, encoding: 'utf8' })
    if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`)
  }
  mkdirSync(join(wurzel, 'public', 'data'), { recursive: true })
  mkdirSync(join(wurzel, 'data'), { recursive: true })
  const schreibe = (k: unknown, t: unknown[], r: unknown[]): void => {
    writeFileSync(join(wurzel, 'data', 'adn.json'), JSON.stringify(k))
    writeFileSync(join(wurzel, 'data', 'adn-catalog.json'), JSON.stringify(kalender()))
    // Leere Eingaben, die die Titelzuordnung des Baus liest (`loeseAdnTitelIds`).
    for (const datei of LEER) writeFileSync(join(wurzel, 'data', datei), '[]')
    writeFileSync(join(wurzel, 'public', 'data', 'titles.json'), JSON.stringify(t))
    writeFileSync(join(wurzel, 'public', 'data', 'releases.json'), JSON.stringify(r))
  }
  const lauf = (...args: string[]): { code: number | null; aus: string } => {
    const r = spawnSync(process.execPath, ['--import', import.meta.resolve('tsx'), fileURLToPath(new URL('./check-adn-kennung-bestand.ts', import.meta.url)), ...args], {
      cwd: wurzel,
      env: { ...process.env, AK_ROOT: wurzel },
      encoding: 'utf8',
      windowsHide: true,
      timeout: 120_000,
    })
    return { code: r.status, aus: `${r.stdout}${r.stderr}` }
  }
  git('init', '-q')
  schreibe(kalender(900901, 900902, 900903), titel(900901, 900903), termine(900902))
  git('add', '.')
  git('commit', '-q', '-m', 'vorstand')

  const gleich = lauf()
  pruefe('unverändert: grün', gleich.code === 0, gleich.aus)

  schreibe(kalender(900901, 900902, 900903), titel(900903), termine(900902))
  const wegWeg = lauf()
  pruefe('Bau verliert den Weg einer Show im Kalender → rot mit showId', wegWeg.code === 1 && wegWeg.aus.includes('900901') && !wegWeg.aus.includes('900902,'), wegWeg.aus)

  schreibe(kalender(900901, 900902, 900903), titel(900901, 900903), [])
  const terminWeg = lauf()
  pruefe('Bau verliert den Termin einer Show im Kalender → rot mit showId', terminWeg.code === 1 && terminWeg.aus.includes('900902'), terminWeg.aus)

  schreibe(kalender(900901, 900902, 900903), titel(900901), termine(900902))
  const ohneName = lauf()
  pruefe('Weg-Adresse ohne Namensteil (…/video/900903) zählt als Show → rot', ohneName.code === 1 && ohneName.aus.includes('900903'), ohneName.aus)

  schreibe(kalender(900901, 900902, 900903), titel(900903), termine(900901, 900902))
  pruefe('Show wechselt vom Weg zum Termin → grün', lauf().code === 0, lauf().aus)

  schreibe(kalender(900902, 900903), titel(900903), termine(900902))
  pruefe('Show verlässt den Kalender, Weg geht mit → grün', lauf().code === 0, lauf().aus)

  schreibe(kalender(900901, 900902, 900903), titel(900901, 900903), termine(900902))
  const fremd = lauf('--vorstand', 'gibtsnicht')
  pruefe('Vorstand nicht lesbar → rot', fremd.code === 1 && fremd.aus.includes('Vorstand gibtsnicht nicht lesbar'), fremd.aus)
} finally {
  rmSync(wurzel, { recursive: true, force: true })
}

if (fehler) {
  console.error(`check-adn-kennung-vorstand: ${fehler} von ${faelle} Zusicherungen verletzt`)
  process.exit(1)
}
console.log(`check-adn-kennung-vorstand: ${faelle} Zusicherungen grün`)
