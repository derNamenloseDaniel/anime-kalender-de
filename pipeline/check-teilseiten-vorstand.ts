/**
 * Zusicherungen: Die Bestandswachen geteilter Seiten (`check-cr-teilseiten-bestand.ts`, `check-prime-teilseiten-bestand.ts`) prüfen
 * gegen den Vorstand (zuletzt eingecheckter Stand), nicht nur gegen die Prüfliste, die derselbe Bau schreibt. Fall: Der Bau streicht
 * Bereich und Prüflisten-Eintrag zugleich, der Weg mit Ja bleibt → rot. Eigener Prozess je Lauf gegen ein Wegwerf-Repo unter
 * `os.tmpdir()` (`AK_ROOT`), Kennungen ab 900000. Läuft in `check:logic`.
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

const PLATTFORMEN = [
  { wache: 'check-cr-teilseiten-bestand.ts', plattform: 'crunchyroll', liste: 'data/cr-teilseiten-pruefliste.json', url: 'https://www.crunchyroll.com/de/series/GKULISSE/k' },
  { wache: 'check-prime-teilseiten-bestand.ts', plattform: 'primevideo', liste: 'data/prime-teilseiten-pruefliste.json', url: 'https://www.amazon.de/gp/video/detail/BKULISSE' },
] as const

type Weg = { bereich?: boolean; dub?: boolean; allein?: boolean } | undefined

for (const p of PLATTFORMEN) {
  /** Zwei Titel auf derselben Seite (je zwei Glieder je Rolle); `wege[i]` beschreibt den Weg von Titel 900001 + i, `undefined` = kein Weg. */
  const titel = (wege: Weg[]): unknown[] =>
    wege.map((w, i) => ({
      id: 900001 + i,
      titleDe: `K${i + 1}`,
      episodes: 12,
      streams: w ? [{ platform: p.plattform, url: p.url, dub: w.dub ?? true, sharedWith: w.allein ? undefined : 2, dubRanges: w.bereich ? [{ from: 1, to: 12, dub: true }] : undefined }] : [],
    }))
  const eintrag = (titleId: number) => ({ titleId, titel: 'K', url: p.url, grund: 'g' })

  const wurzel = mkdtempSync(join(tmpdir(), 'teilseiten-vorstand-'))
  try {
    const git = (...a: string[]): void => {
      const r = spawnSync(process.env.GIT_EXE ?? 'git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { cwd: wurzel, windowsHide: true, encoding: 'utf8' })
      if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`)
    }
    mkdirSync(join(wurzel, 'public', 'data'), { recursive: true })
    mkdirSync(join(wurzel, 'data'), { recursive: true })
    const schreibe = (titles: unknown[], liste: unknown[]): void => {
      writeFileSync(join(wurzel, 'public', 'data', 'titles.json'), JSON.stringify(titles))
      writeFileSync(join(wurzel, p.liste), JSON.stringify(liste))
    }
    const lauf = (...args: string[]): { code: number | null; aus: string } => {
      const r = spawnSync(process.execPath, ['--import', import.meta.resolve('tsx'), fileURLToPath(new URL(`./${p.wache}`, import.meta.url)), ...args], {
        cwd: wurzel,
        env: { ...process.env, AK_ROOT: wurzel },
        encoding: 'utf8',
        windowsHide: true,
        timeout: 120_000,
      })
      return { code: r.status, aus: `${r.stdout}${r.stderr}` }
    }
    git('init', '-q')
    // Vorstand: Titel 1 mit Bereich, Titel 2 auf der Prüfliste.
    schreibe(titel([{ bereich: true }, {}]), [eintrag(900002)])
    git('add', '.')
    git('commit', '-q', '-m', 'vorstand')

    pruefe(`${p.plattform}: unverändert grün`, lauf().code === 0, lauf().aus)

    schreibe(titel([{}, {}]), [eintrag(900002)])
    const bereichWeg = lauf()
    pruefe(`${p.plattform}: Bau streicht Bereich, Weg mit Ja bleibt, nicht auf der Liste → rot`, bereichWeg.code === 1 && bereichWeg.aus.includes(`900001|${p.url}`), bereichWeg.aus)

    schreibe(titel([{ bereich: true }, {}]), [])
    const listeWeg = lauf()
    pruefe(`${p.plattform}: Bau streicht Prüflisten-Eintrag, Weg mit Ja bleibt ohne Bereich → rot`, listeWeg.code === 1 && listeWeg.aus.includes(`900002|${p.url}`), listeWeg.aus)

    schreibe(titel([{}, {}]), [])
    const beides = lauf()
    pruefe(`${p.plattform}: Soll und Ist zugleich gestrichen → rot, beide genannt`, beides.code === 1 && beides.aus.includes(`900001|${p.url}`) && beides.aus.includes(`900002|${p.url}`), beides.aus)

    schreibe(titel([{}, { bereich: true }]), [eintrag(900001)])
    pruefe(`${p.plattform}: Bereich und Prüfliste tauschen die Titel → grün`, lauf().code === 0, lauf().aus)

    schreibe(titel([undefined, { dub: false }]), [])
    pruefe(`${p.plattform}: Weg entfällt bzw. ohne Ja → kein Bereich nötig, grün`, lauf().code === 0, lauf().aus)

    // Die Seite ist nicht mehr geteilt: Titel 1 behält den Bereich, Titel 2 verlässt die Liste ohne Bereich (SAO Alternative II, Dorohedoro).
    schreibe(titel([{ bereich: true, allein: true }, { allein: true }]), [])
    pruefe(`${p.plattform}: Seite nicht mehr geteilt → kein Bereich nötig, grün`, lauf().code === 0, lauf().aus)

    schreibe(titel([{ allein: true }, {}]), [eintrag(900002)])
    const alleinOhne = lauf()
    pruefe(`${p.plattform}: Seite nicht mehr geteilt, nur Titel 1 verliert den Bereich → grün`, alleinOhne.code === 0, alleinOhne.aus)

    schreibe(titel([{}, {}]), [])
    const fremd = lauf('--vorstand', 'gibtsnicht')
    pruefe(`${p.plattform}: Vorstand nicht lesbar → rot`, fremd.code === 1 && fremd.aus.includes('Vorstand gibtsnicht nicht lesbar'), fremd.aus)
  } finally {
    rmSync(wurzel, { recursive: true, force: true })
  }
}

if (fehler) {
  console.error(`check-teilseiten-vorstand: ${fehler} von ${faelle} Zusicherungen verletzt`)
  process.exit(1)
}
console.log(`check-teilseiten-vorstand: ${faelle} Zusicherungen grün`)
