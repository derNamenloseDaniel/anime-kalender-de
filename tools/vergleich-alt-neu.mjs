/**
 * Vergleichsrahmen für Zerlegungen einer einzelnen exportierten Funktion (Alternative zu `bau-vergleich.mjs`, das den ganzen
 * Bau fährt und dafür `data/cache/` braucht): alte Fassung (Git-Ref, Standard origin/main) und neue Fassung bekommen dieselben,
 * tief kopierten Eingaben; verglichen werden Rückgabe (oder Fehler), die danach veränderten Eingaben und die Dateien, die unter
 * einer `AK_ROOT`-Kulisse entstanden sind, jeweils byte-gleich.
 *
 *   node tools/vergleich-alt-neu.mjs <datei> <funktion> <fallmodul> [--ref <ref>] [--zweige a,b]
 *   (für .ts-Dateien: `npx tsx tools/vergleich-alt-neu.mjs …`)
 *
 * Das Fallmodul exportiert `faelle`: `[{ name, args: [...] | argsFabrik: () => [...], dateien?: { 'rel/pfad': 'Inhalt' }, zweig?: 'Etikett' }]`
 * (`argsFabrik` liefert je Lauf frische Eingaben mit Funktionen, die sich nicht klonen lassen).
 * `dateien` füllt die Kulisse vor jedem Aufruf; `zweig` zählt, welche Pfade der Funktion die Fälle erreichen (`--zweige`: jedes
 * genannte Etikett muss mindestens einmal vorkommen, sonst Exit 1). Exit 0 gleich, 1 Abweichung oder Lücke, 2 Aufruf.
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const LIMIT_GIT_MS = 30_000
let laufNr = 0

/** Einfache Zählhilfe: wie oft ein Etikett vorkam. */
export function zaehler() {
  const m = new Map()
  return { zaehle: (name) => m.set(name, (m.get(name) ?? 0) + 1), anzahl: (name) => m.get(name) ?? 0, alle: () => Object.fromEntries(m) }
}

/** Hash aller Dateien unter `ordner` (Pfad und Inhalt, sortiert). */
export function hashOrdner(ordner) {
  const h = createHash('sha256')
  const geh = (rel) => {
    for (const name of readdirSync(join(ordner, rel)).sort()) {
      const r = rel ? `${rel}/${name}` : name
      if (statSync(join(ordner, r)).isDirectory()) geh(r)
      else h.update(`${r}\0`).update(readFileSync(join(ordner, r))).update('\0')
    }
  }
  geh('')
  return h.digest('hex')
}

/** Alte Fassung per `git show` in eine Wegwerfdatei neben dem Original, damit relative Importe gehen. */
function schreibeAlt(wurzel, ref, abs) {
  const rel = relative(resolve(wurzel), abs).split(/[\\/]/).join('/')
  const inhalt = execFileSync('git', ['-C', wurzel, 'show', `${ref}:${rel}`], { encoding: 'buffer', timeout: LIMIT_GIT_MS })
  const weg = join(dirname(abs), `${basename(abs, extname(abs))}.alt-${process.pid}${extname(abs)}`)
  writeFileSync(weg, inhalt)
  return weg
}

/** Frische Eingaben je Lauf: `argsFabrik` für Aufrufe mit Funktionen (nicht klonbar), sonst tiefe Kopie von `args`. */
function frischeArgs(f) {
  return f.argsFabrik ? f.argsFabrik() : structuredClone(f.args)
}

/**
 * Kanonische Schreibweise eines Wertes: Typ-Marken, Einfügereihenfolge, `undefined` ≠ fehlend, geteilte Objekte als `&n`.
 * Statt `v8.serialize`: dessen Bytes hängen von der inneren Zeichenkettendarstellung (ein-/zweibyte) ab und waren bei
 * gleichem Inhalt von Lauf zu Lauf verschieden (24.11.2026, baueReleases). Funktionen werden zur Marke; ihr Aufrufprotokoll
 * steht als Feld in der Eingabe der Attrappe.
 */
export function kanonisch(w, gesehen = new Map()) {
  if (typeof w === 'function') return '[Funktion]'
  if (typeof w === 'string') return JSON.stringify(w)
  if (typeof w === 'bigint') return `${w}n`
  if (typeof w === 'number') return Object.is(w, -0) ? '-0' : String(w)
  if (w === null || typeof w !== 'object') return String(w)
  if (gesehen.has(w)) return `&${gesehen.get(w)}`
  gesehen.set(w, gesehen.size)
  const k = (x) => kanonisch(x, gesehen)
  if (Array.isArray(w)) return `[${w.map(k).join(',')}]`
  if (w instanceof Map) return `Map{${[...w].map(([a, b]) => `${k(a)}=>${k(b)}`).join(',')}}`
  if (w instanceof Set) return `Set{${[...w].map(k).join(',')}}`
  if (w instanceof Date) return `Date(${w.getTime()})`
  if (w instanceof Error) return `Error(${k(w.name)},${k(w.message)})`
  return `{${Object.entries(w).map(([a, b]) => `${JSON.stringify(a)}:${k(b)}`).join(',')}}`
}

/** Ein Aufruf unter frischer Kulisse; liefert Bytes von Rückgabe/Fehler und veränderten Eingaben sowie den Kulisse-Hash. */
async function ruf(fn, args, dateien) {
  const kulisse = mkdtempSync(join(tmpdir(), 'ak-alt-neu-'))
  const vorher = process.env.AK_ROOT
  process.env.AK_ROOT = kulisse
  try {
    for (const [rel, inhalt] of Object.entries(dateien ?? {})) {
      mkdirSync(dirname(join(kulisse, rel)), { recursive: true })
      writeFileSync(join(kulisse, rel), inhalt)
    }
    let ergebnis
    try {
      ergebnis = { rueckgabe: await fn(...args) }
    } catch (e) {
      ergebnis = { wirft: String(e?.message ?? e) }
    }
    return { ergebnis: kanonisch(ergebnis), eingaben: kanonisch(args), dateien: hashOrdner(kulisse) }
  } finally {
    if (vorher === undefined) delete process.env.AK_ROOT
    else process.env.AK_ROOT = vorher
    rmSync(kulisse, { recursive: true, force: true })
  }
}

/** Vergleicht alt und neu über alle Fälle. `wurzel` ist der Git-Baum, `datei` relativ dazu oder absolut. */
export async function vergleicheAltNeu({ datei, funktion, faelle, ref = 'origin/main', wurzel = process.cwd(), erwarteteZweige = [] }) {
  const abs = resolve(wurzel, datei)
  const weg = schreibeAlt(wurzel, ref, abs)
  const z = zaehler()
  const abweichungen = []
  try {
    const alt = (await import(pathToFileURL(weg).href))[funktion]
    // Query gegen den Modul-Cache: mehrere Aufrufe im selben Prozess sehen die jeweils aktuelle Datei.
    const neu = (await import(`${pathToFileURL(abs).href}?lauf=${++laufNr}`))[funktion]
    if (typeof alt !== 'function' || typeof neu !== 'function') throw new Error(`${funktion} ist in alter oder neuer Fassung keine exportierte Funktion`)
    for (const f of faelle) {
      if (f.zweig) z.zaehle(f.zweig)
      const a = await ruf(alt, frischeArgs(f), f.dateien)
      const n = await ruf(neu, frischeArgs(f), f.dateien)
      for (const was of ['ergebnis', 'eingaben', 'dateien']) if (a[was] !== n[was]) abweichungen.push({ fall: f.name, was })
    }
  } finally {
    unlinkSync(weg)
  }
  const luecken = erwarteteZweige.filter((e) => z.anzahl(e) === 0)
  return { gleich: abweichungen.length === 0 && luecken.length === 0, abweichungen, luecken, abdeckung: z.alle() }
}

async function main(argv) {
  const opt = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined)
  const [datei, funktion, fallmodul] = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')))
  if (!datei || !funktion || !fallmodul) {
    console.error('Aufruf: node tools/vergleich-alt-neu.mjs <datei> <funktion> <fallmodul> [--ref <ref>] [--zweige a,b]')
    process.exit(2)
  }
  const { faelle } = await import(pathToFileURL(resolve(fallmodul)).href)
  const r = await vergleicheAltNeu({ datei, funktion, faelle, ref: opt('--ref'), erwarteteZweige: opt('--zweige')?.split(',') ?? [] })
  for (const a of r.abweichungen) console.log(`ABWEICHUNG ${a.fall}: ${a.was}`)
  for (const l of r.luecken) console.log(`LÜCKE: Zweig „${l}“ von keinem Fall erreicht`)
  console.log(`${faelle.length} Fälle, Abdeckung ${JSON.stringify(r.abdeckung)}: ${r.gleich ? 'byte-gleich' : 'NICHT gleich'}`)
  process.exit(r.gleich ? 0 : 1)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main(process.argv.slice(2))
