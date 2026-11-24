/**
 * Vergleichsrahmen für Zerlegungen einer einzelnen exportierten Funktion (Alternative zu `bau-vergleich.mjs`, das den ganzen
 * Bau fährt und dafür `data/cache/` braucht): alte Fassung (Git-Ref, Standard origin/main) und neue Fassung bekommen dieselben,
 * tief kopierten Eingaben; verglichen werden Rückgabe (oder Fehler), die danach veränderten Eingaben und die Dateien, die unter
 * einer `AK_ROOT`-Kulisse entstanden sind, jeweils gleich (Werte in kanonischer Textform `kanon`, nicht V8-`serialize`; Dateien byte-gleich).
 *
 *   node tools/vergleich-alt-neu.mjs <datei> <funktion> <fallmodul> [--ref <ref>] [--zweige a,b]
 *   (für .ts-Dateien: `npx tsx tools/vergleich-alt-neu.mjs …`)
 *
 * Das Fallmodul exportiert `faelle`: `[{ name, args: [...], dateien?: { 'rel/pfad': 'Inhalt' }, zweig?: 'Etikett' }]`.
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

/**
 * Kanonische Textform eines Werts für den Vergleich. `v8.serialize` taugt dafür nicht: es schreibt dieselbe Zahl als Smi (`I`)
 * oder als HeapNumber (`N`, 8 Byte mehr), je nachdem, wie V8 sie intern hält (z. B. in einem Double-Array); alt gegen alt
 * lieferte so andere Bytes. Hier zählt nur der Wert: Schlüssel- und Array-Reihenfolge, undefined, Löcher, NaN, -0, Date, Map,
 * Set und geteilte Verweise (zweites Auftreten desselben Objekts wird zur Nummer des ersten) bleiben unterscheidbar.
 */
export function kanon(wurzel) {
  const gesehen = new Map()
  const geh = (v) => {
    if (v === undefined) return { $u: 1 }
    if (v === null) return null
    if (typeof v === 'string') return `s:${v}`
    if (typeof v === 'number') return `n:${Object.is(v, -0) ? '-0' : String(v)}`
    if (typeof v === 'boolean') return `b:${v}`
    if (typeof v !== 'object') throw new TypeError(`kanon: ${typeof v} nicht vergleichbar`)
    if (gesehen.has(v)) return { $ref: gesehen.get(v) }
    gesehen.set(v, gesehen.size)
    if (v instanceof Date) return { $d: String(v.getTime()) }
    if (v instanceof Set) return { $set: [...v].map(geh) }
    if (v instanceof Map) return { $map: [...v].map(([k, w]) => [geh(k), geh(w)]) }
    if (Array.isArray(v)) return { $a: Array.from(v, (x, i) => (i in v ? geh(x) : { $loch: 1 })) }
    return { $o: Object.keys(v).map((k) => [k, geh(v[k])]) }
  }
  return JSON.stringify(geh(wurzel))
}

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
    return { ergebnis: kanon(ergebnis), eingaben: kanon(args), dateien: hashOrdner(kulisse) }
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
      const a = await ruf(alt, structuredClone(f.args), f.dateien)
      const n = await ruf(neu, structuredClone(f.args), f.dateien)
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
  console.log(`${faelle.length} Fälle, Abdeckung ${JSON.stringify(r.abdeckung)}: ${r.gleich ? 'gleich' : 'NICHT gleich'}`)
  process.exit(r.gleich ? 0 : 1)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main(process.argv.slice(2))
