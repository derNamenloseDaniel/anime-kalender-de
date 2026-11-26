/**
 * Prozesstest von `check-horizonte-staffeln-bestand.ts`: das echte Skript läuft als eigener Prozess in einer Wegwerf-Kulisse (Arbeitsordner mit
 * eigenen `data/wikipedia-folgen.json`, `data/toggo.json`, `public/data/{titles,events}.json`, `public/data/folgen/*`), je Fall wird genau eine
 * Größe verfälscht. Die Staffelgrenzen kommen aus der echten `data/curated/horizonte-staffeln.yaml` (F157: ein Titel, Staffeln als Abschnitte).
 * Dazu: der Wächter steht in der Bestandsliste. Läuft in `check:logic`.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const REPO = resolve(import.meta.dirname, '..')
const tsx = pathToFileURL(join(REPO, 'node_modules/tsx/dist/esm/index.mjs')).href
const SKRIPT = 'pipeline/check-horizonte-staffeln-bestand.ts'
const ID = 158871

type Termin = { titleId: number; platform: string; episode?: number; staffelFolge?: [number, number]; date?: string; time?: string; sender?: string }
type Sendung = { titleId: number; folge: string; sender: string; start: string }
type Kulisse = { wiki?: number[]; toggo?: number[]; datei?: object | null; kopf?: number[] | null; titel?: number[]; termine?: Termin[]; sendungen?: Sendung[] }
const NAMEN = { 1: 'Pokémon Horizonte: Die Serie', 2: 'Pokémon Horizonte: Staffel 2 – Die Suche nach Laqua', 3: 'Pokémon Horizonte: Staffel 3 – Gute Aussichten', 4: 'Pokémon Horizonte: Staffel 4 – Wunder in Sicht' }
const GUT: Required<Kulisse> = {
  wiki: [45, 44, 47, 23],
  toggo: [45, 44, 47, 1],
  datei: { f: [], de: [], s: [[1, 1, 45], [2, 46, 89], [3, 90, 136], [4, 137]], sn: NAMEN },
  kopf: [137, 137, 1],
  titel: [ID, 20],
  sendungen: [],
  termine: [
    { titleId: ID, platform: 'tv', episode: 78, staffelFolge: [2, 33] },
    { titleId: ID, platform: 'rtlplus', episode: 137, staffelFolge: [4, 1] },
    { titleId: 20, platform: 'tv', episode: 3 },
  ],
}

/** Folgen je Staffel → Wikipedia-Zeilen mit `st` und eindeutigem Folgentitel („Titel <durchlaufende Folge>“) bzw. TOGGO-Einträge. */
const wikiFolgen = (je: number[]) => je.flatMap((n) => Array.from({ length: n }, (_, i) => ({ st: i + 1 }))).map((f, i) => ({ ...f, dt: `Titel ${i + 1}` }))
const toggoFolgen = (je: number[]) => je.flatMap((n, s) => Array.from({ length: n }, (_, i) => ({ staffel: s + 1, folge: i + 1 })))

function lauf(k: Kulisse): { status: number | null; aus: string } {
  const w = { ...GUT, ...k }
  const wurzel = mkdtempSync(join(tmpdir(), 'horizonte-bestand-'))
  try {
    mkdirSync(join(wurzel, 'data'))
    mkdirSync(join(wurzel, 'public/data/folgen'), { recursive: true })
    writeFileSync(join(wurzel, 'data/wikipedia-folgen.json'), JSON.stringify({ titel: k.wiki === undefined && 'wiki' in k ? {} : { [ID]: { folgen: wikiFolgen(w.wiki) } } }))
    writeFileSync(join(wurzel, 'data/toggo.json'), JSON.stringify({ titel: { [ID]: { folgen: toggoFolgen(w.toggo) } } }))
    writeFileSync(join(wurzel, 'data/tv-programm.json'), JSON.stringify({ sendungen: Object.fromEntries(w.sendungen.map((x, i) => [String(i), x])) }))
    writeFileSync(join(wurzel, 'public/data/titles.json'), JSON.stringify(w.titel.map((id) => ({ id }))))
    writeFileSync(join(wurzel, 'public/data/events.json'), JSON.stringify(w.termine))
    if (w.datei) writeFileSync(join(wurzel, `public/data/folgen/${ID}.json`), JSON.stringify(w.datei))
    writeFileSync(join(wurzel, 'public/data/folgen/zaehlung.json'), JSON.stringify(w.kopf ? { [ID]: w.kopf } : {}))
    const r = spawnSync(process.execPath, ['--import', tsx, join(REPO, SKRIPT)], { cwd: wurzel, encoding: 'utf8', timeout: 90_000 })
    return { status: r.status, aus: `${r.stdout}${r.stderr}` }
  } finally {
    rmSync(wurzel, { recursive: true, force: true })
  }
}

let fehler = 0
let faelle = 0
function fall(name: string, k: Kulisse, exit: 0 | 1, zeile: string, ohne?: string): void {
  faelle++
  const r = lauf(k)
  const ok = r.status === exit && r.aus.includes(zeile) && (!ohne || !r.aus.includes(ohne)) && !r.aus.includes('ENOENT')
  if (ok) return console.log(`  ✓ ${name}`)
  fehler++
  console.error(`  ✖ ${name}: Exit ${r.status}, erwartet ${exit} mit „${zeile}“\n${r.aus.slice(-1200)}`)
}

const datei = GUT.datei as { s: unknown; sn: Record<string, string> }
fall('Quellen und Bestand passen', {}, 0, 'check-horizonte-staffeln-bestand: ok (2 Titel, 3 Termine gelesen)', '⚠ WARNUNG')
fall('Wikipedia zählt Staffel 2 anders: rot', { wiki: [45, 45, 46, 23] }, 1, 'Staffel 2: 44 Folgen, de.wikipedia 45')
fall('TOGGO zählt Staffel 3 anders: rot', { toggo: [45, 44, 48, 1] }, 1, 'Staffel 3: 47 Folgen, TOGGO 48')
fall('TOGGO führt Staffel 5: Warnzeile, grün', { toggo: [45, 44, 47, 24, 1] }, 0, '⚠ WARNUNG Horizonte-Staffeln: TOGGO führt Staffel 5')
fall('Wikipedia ohne den Titel: Warnzeile, grün', { wiki: undefined }, 0, '⚠ WARNUNG Horizonte-Staffeln: de.wikipedia')
fall('ein Staffel-Titel im Bestand: rot', { titel: [ID, 7000002] }, 1, 'FEHLER: 7000002: Titel im Raum der Staffel-Titel')
fall('ein Termin an einem Staffel-Titel: rot', { termine: [...GUT.termine, { titleId: 7000003, platform: 'tv', episode: 5 }] }, 1, 'FEHLER: 7000003: Termin an einem Staffel-Titel')
fall('Detaildatei fehlt: Meldung statt Absturz', { datei: null }, 1, `Detaildatei public/data/folgen/${ID}.json fehlt`)
fall('Detaildatei mit anderer Grenze: rot', { datei: { ...datei, s: [[1, 1, 45], [2, 46, 90], [3, 91, 136], [4, 137]] } }, 1, 'Detaildatei: s [[1,1,45],[2,46,90]')
fall('Detaildatei ohne Staffelnamen: rot', { datei: { ...datei, sn: undefined } }, 1, 'Detaildatei: sn undefined')
fall('Kopfzählung unter der letzten belegten Folge: rot', { kopf: [136, 136, 1] }, 1, 'Kopfzählung 136 Folgen, belegt sind 137')
fall('Kopfzählung fehlt: rot', { kopf: null }, 1, 'Kopfzählung undefined Folgen, belegt sind 137')
fall('Staffel 4 offen, Kopf ohne Kennzeichen („137 von 137“): rot', { kopf: [137, 137] }, 1, 'Kopfzählung ohne Kennzeichen „Staffel offen“')
fall('staffelFolge passt nicht zur Folge: rot', { termine: [{ titleId: ID, platform: 'tv', episode: 78, staffelFolge: [3, 33] }] }, 1, 'Termin Folge 78: staffelFolge [3,33], die Grenzen sagen [2,33]')
fall('Fernsehtermin ohne Staffel: Warnzeile, grün', { termine: [...GUT.termine, { titleId: ID, platform: 'tv', episode: 50 }] }, 0, '⚠ WARNUNG Horizonte-Staffeln: Fernsehtermine: 1 ohne Staffel (1 Termine')
const tv78: Termin = { titleId: ID, platform: 'tv', episode: 78, date: '2026-11-02', time: '16:00', sender: 'Super RTL' }
const sendung78: Sendung = { titleId: ID, folge: 'Titel 78', sender: 'Super RTL', start: '2026-11-02T16:00:00+01:00' }
fall('Fernsehtermin ohne Staffel, Folgentitel eindeutig (Verdrahtung fehlt): rot', { termine: [...GUT.termine, tv78], sendungen: [sendung78] }, 1, `FEHLER: ${ID}: 1 Fernsehtermine ohne staffelFolge, obwohl ihr Folgentitel eindeutig`)
fall('derselbe Termin mit staffelFolge: grün', { termine: [...GUT.termine, { ...tv78, staffelFolge: [2, 33] }], sendungen: [sendung78] }, 0, 'check-horizonte-staffeln-bestand: ok', '⚠ WARNUNG')
fall('keine Termine gelesen: rot', { termine: [] }, 1, 'FEHLER: 2 Titel, 0 Termine gelesen')

const bestandsliste = readFileSync(join(REPO, 'tools/check-bestand-liste.txt'), 'utf8').split('\n').map((z) => z.trim())
if (bestandsliste.includes(SKRIPT)) console.log('  ✓ Wächter steht in tools/check-bestand-liste.txt')
else {
  fehler++
  console.error(`  ✖ ${SKRIPT} fehlt in tools/check-bestand-liste.txt`)
}

if (fehler) process.exit(1)
console.log(`check-horizonte-staffeln-bestand-lauf: ok (${faelle} Fälle und Listeneintrag)`)
