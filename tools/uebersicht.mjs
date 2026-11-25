#!/usr/bin/env node
/**
 * Gesamtübersicht aus stand.md (einzige Wahrheit): schreibt `uebersicht.md` und `uebersicht.html` neben die Eingabedatei.
 *
 *   node tools/uebersicht.mjs [<stand.md>] [--jetzt <ISO-Zeit>] [--ohne-gh]
 *
 * Mit gh (offene PRs, Merges 7 Tage, PR-Labels und Abnahme-Kommentare, Zwischenspeicher `.uebersicht-cache.json` neben stand.md);
 * ohne gh oder bei einem gh-Fehler entstehen beide Dateien trotzdem (Warnung auf stderr, dann ohne PR-Labels).
 * Exit 0 bei geschriebenen Dateien, 1 wenn stand.md fehlt.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { holeMerges, holeOffene, holePrDaten } from './uebersicht-gh.mjs'
import { htmlVon } from './uebersicht-html.mjs'
import { kennzahlen } from './uebersicht-kopf.mjs'
import { markdownVon } from './uebersicht-md.mjs'
import { baueModell } from './uebersicht-modell.mjs'

const STAND = 'C:/code/ai/anime-kalender-de/daniel-zum-abarbeiten/stand.md'
const FENSTER_TAGE = 7

/** Netzlose Teile zuerst, dann gh; jeder gh-Fehler wird zur Warnung mit der ersten Ursache, nie zum Abbruch. */
export function holeGh(nummern, ausfuehren, cache, jetzt, warne) {
  const gh = { prDaten: {}, offene: null, merges: null }
  const schritte = [
    ['PR-Labels', () => { gh.prDaten = holePrDaten(ausfuehren, nummern, cache, jetzt) }],
    ['offene PRs', () => { gh.offene = holeOffene(ausfuehren) }],
    ['Merges', () => { gh.merges = holeMerges(ausfuehren, jetzt - FENSTER_TAGE * 86_400_000) }],
  ]
  for (const [name, f] of schritte) {
    try {
      f()
    } catch (fehler) {
      warne(`gh ${name}: ${String(fehler.stderr || fehler.message).split('\n')[0]}`)
    }
  }
  return gh
}

/** `{markdown, html}` aus dem Text; `ausfuehren` null = ohne gh. */
export function erzeuge(text, jetzt, ausfuehren, cache, warne) {
  const erst = baueModell(text, jetzt, null)
  const nummern = [...new Set(erst.abschnitte.flatMap((a) => a.gruppen.flatMap((g) => g.themen.flatMap((t) => t.eintraege.flatMap((e) => e.prs)))))]
  const gh = ausfuehren ? holeGh(nummern, ausfuehren, cache, jetzt, warne) : null
  const modell = gh ? baueModell(text, jetzt, gh) : erst
  const k = kennzahlen(modell, gh, jetzt)
  return { markdown: markdownVon(modell, k), html: htmlVon(modell, k), modell, k }
}

/** Runner für `befehl, args, optionen` (stdin zu, windowsHide) oder null, wenn `programm` nicht startet. */
export function ghAusfuehren(programm = 'gh') {
  const lauf = (befehl, args, opt) => execFileSync(befehl, args, { encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'], ...opt })
  try {
    lauf(programm, ['--version'], { timeout: 10_000 })
    return lauf
  } catch (fehler) {
    console.error(`Warnung: gh nicht verfügbar: ${String(fehler.message).split('\n')[0]}`)
    return null
  }
}

function leseCache(pfad) {
  if (!existsSync(pfad)) return {}
  try {
    return JSON.parse(readFileSync(pfad, 'utf8'))
  } catch (fehler) {
    console.error(`Warnung: Zwischenspeicher unlesbar, neu aufgebaut: ${fehler.message}`)
    return {}
  }
}

/** `ghLauf` liefert den gh-Runner (Test: Attrappe) oder null. */
export function main(argv, jetztStandard, ghLauf = ghAusfuehren) {
  const wert = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined)
  const stand = argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--jetzt') ?? STAND
  if (!existsSync(stand)) {
    console.error(`stand.md fehlt: ${stand}`)
    return 1
  }
  const jetzt = wert('--jetzt') ? Date.parse(wert('--jetzt')) : jetztStandard
  const ausfuehren = argv.includes('--ohne-gh') ? null : ghLauf()
  if (!ausfuehren) console.error('Warnung: ohne gh: keine PR-Labels, keine PR-Zahlen')
  const cachePfad = join(dirname(stand), '.uebersicht-cache.json')
  const cache = leseCache(cachePfad)
  const r = erzeuge(readFileSync(stand, 'utf8'), jetzt, ausfuehren, cache, (m) => console.error(`Warnung: ${m}`))
  writeFileSync(join(dirname(stand), 'uebersicht.md'), r.markdown)
  writeFileSync(join(dirname(stand), 'uebersicht.html'), r.html)
  if (ausfuehren) writeFileSync(cachePfad, JSON.stringify(cache))
  console.log(`Übersicht: ${r.modell.eintraege} Einträge, Labels ${JSON.stringify(r.k.labels)}, Streichkandidaten ${r.modell.streichkandidaten.length}`)
  return 0
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(main(process.argv.slice(2), Date.now()))
