/**
 * Prozesstest von `check-horizonte-staffeln-bestand.ts`: das echte Skript läuft als eigener Prozess in einer Wegwerf-Kulisse (Arbeitsordner mit
 * eigenen `data/wikipedia-folgen.json`, `data/toggo.json`, `public/data/folgen/*`), je Fall wird genau eine Größe verfälscht. Die Staffelgrenzen
 * kommen aus der echten `data/curated/horizonte-staffeln.yaml`. Dazu: der Wächter steht in der Bestandsliste. Läuft in `check:logic`.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const REPO = resolve(import.meta.dirname, '..')
const tsx = pathToFileURL(join(REPO, 'node_modules/tsx/dist/esm/index.mjs')).href
const SKRIPT = 'pipeline/check-horizonte-staffeln-bestand.ts'
const ID = '158871'

/** Je Kennung der Staffeln die Kopfzählung (`zaehlung.json`); `dateien`: Kennungen mit Detaildatei. Staffel 4 = Basis (158871), offen, ohne Detaildatei. */
type Kopf = Record<string, number[] | null>
type Kulisse = { wiki?: number[]; toggo?: number[]; dateien?: string[]; kopf?: Kopf }
const GUT: Required<Kulisse> = {
  wiki: [45, 44, 47, 23],
  toggo: [45, 44, 47, 1],
  dateien: ['7000001', '7000002', '7000003'],
  kopf: { 7000001: [45, 45], 7000002: [44, 44], 7000003: [47, 47], [ID]: [1, 1, 1] },
}

/** Folgen je Staffel → Wikipedia-Zeilen mit `st` bzw. TOGGO-Einträge. */
const wikiFolgen = (je: number[]) => je.flatMap((n) => Array.from({ length: n }, (_, i) => ({ st: i + 1 })))
const toggoFolgen = (je: number[]) => je.flatMap((n, s) => Array.from({ length: n }, (_, i) => ({ staffel: s + 1, folge: i + 1 })))

function lauf(k: Kulisse): { status: number | null; aus: string } {
  const w = { ...GUT, ...k }
  const wurzel = mkdtempSync(join(tmpdir(), 'horizonte-bestand-'))
  try {
    mkdirSync(join(wurzel, 'data'))
    mkdirSync(join(wurzel, 'public/data/folgen'), { recursive: true })
    writeFileSync(join(wurzel, 'data/wikipedia-folgen.json'), JSON.stringify({ titel: k.wiki === undefined && 'wiki' in k ? {} : { [ID]: { folgen: wikiFolgen(w.wiki) } } }))
    writeFileSync(join(wurzel, 'data/toggo.json'), JSON.stringify({ titel: { [ID]: { folgen: toggoFolgen(w.toggo) } } }))
    for (const d of w.dateien) writeFileSync(join(wurzel, `public/data/folgen/${d}.json`), JSON.stringify({ f: [], de: [] }))
    writeFileSync(join(wurzel, 'public/data/folgen/zaehlung.json'), JSON.stringify(Object.fromEntries(Object.entries(w.kopf).filter(([, v]) => v !== null))))
    const r = spawnSync(process.execPath, ['--import', tsx, join(REPO, SKRIPT)], { cwd: wurzel, encoding: 'utf8', timeout: 90_000 })
    return { status: r.status, aus: `${r.stdout}${r.stderr}` }
  } finally {
    rmSync(wurzel, { recursive: true, force: true })
  }
}

let fehler = 0
function fall(name: string, k: Kulisse, exit: 0 | 1, zeile: string, ohne?: string): void {
  const r = lauf(k)
  const ok = r.status === exit && r.aus.includes(zeile) && (!ohne || !r.aus.includes(ohne)) && !r.aus.includes('ENOENT')
  if (ok) return console.log(`  ✓ ${name}`)
  fehler++
  console.error(`  ✖ ${name}: Exit ${r.status}, erwartet ${exit} mit „${zeile}“\n${r.aus.slice(-1200)}`)
}

fall('Quellen und Bestand passen', {}, 0, 'check-horizonte-staffeln-bestand: ok', '⚠ WARNUNG')
fall('Wikipedia zählt Staffel 2 anders: rot', { wiki: [45, 45, 46, 23] }, 1, 'Staffel 2: 44 Folgen, de.wikipedia 45')
fall('TOGGO zählt Staffel 3 anders: rot', { toggo: [45, 44, 48, 1] }, 1, 'Staffel 3: 47 Folgen, TOGGO 48')
fall('TOGGO führt Staffel 5: Warnzeile, grün', { toggo: [45, 44, 47, 24, 1] }, 0, '⚠ WARNUNG Horizonte-Staffeln: TOGGO führt Staffel 5')
fall('Wikipedia ohne den Titel: Warnzeile, grün', { wiki: undefined }, 0, '⚠ WARNUNG Horizonte-Staffeln: de.wikipedia')
fall('Detaildatei einer Staffel fehlt: Meldung statt Absturz', { dateien: ['7000001', '7000003'] }, 1, 'Detaildatei public/data/folgen/7000002.json fehlt')
fall('Staffel 4 (offen) braucht keine Detaildatei', { dateien: GUT.dateien }, 0, 'check-horizonte-staffeln-bestand: ok')
fall('Kopfzählung einer abgeschlossenen Staffel unter ihren Folgen: rot', { kopf: { ...GUT.kopf, 7000003: [46, 46] } }, 1, 'Kopfzählung 46 Folgen, belegt sind 47')
fall('Kopfzählung einer Staffel fehlt: rot', { kopf: { ...GUT.kopf, 7000002: null } }, 1, 'Kopfzählung undefined Folgen, belegt sind 44')
fall('Staffel 4 offen, Kopf ohne Kennzeichen („1 von 1“): rot', { kopf: { ...GUT.kopf, [ID]: [1, 1] } }, 1, 'Kopfzählung ohne Kennzeichen „Staffel offen“')
fall('Abgeschlossene Staffel mit Kennzeichen „Staffel offen“: rot', { kopf: { ...GUT.kopf, 7000001: [45, 45, 1] } }, 1, 'Kopfzählung mit Kennzeichen „Staffel offen“, die Datei sagt abgeschlossen')
fall('Kopfzählung der Basis-Staffel 4 fehlt: rot', { kopf: { ...GUT.kopf, [ID]: null } }, 1, 'Kopfzählung undefined Folgen, belegt sind 1')

const liste = readFileSync(join(REPO, 'tools/check-bestand-liste.txt'), 'utf8').split('\n').map((z) => z.trim())
if (liste.includes(SKRIPT)) console.log('  ✓ Wächter steht in tools/check-bestand-liste.txt')
else {
  fehler++
  console.error(`  ✖ ${SKRIPT} fehlt in tools/check-bestand-liste.txt`)
}

if (fehler) process.exit(1)
console.log('check-horizonte-staffeln-bestand-lauf: ok (12 Fälle und Listeneintrag)')
