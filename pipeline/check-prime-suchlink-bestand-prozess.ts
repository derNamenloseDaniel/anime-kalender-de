/**
 * Prozesstest der Bestandswache `check-prime-suchlink-bestand.ts` (Prüfer-Auflage A5, PR 5105): sie läuft als eigener Prozess gegen eine Kulisse (`AK_ROOT`) und
 * muss bei einer Prime-Pille ohne Direktlink und ohne Suchauftrag mit Exit 1, „VERSTÖSSE: 1“ und einer Titelmarke enden, mit Auftrag auf der Liste mit Exit 0,
 * ohne Bestandsdatei mit Exit 1. Erfundene Titel (ab 900000), kein Netz. Läuft in `check:logic` (liest nur die Kulisse im Temp-Ordner).
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

let fehler = 0
function pruefe(name: string, ok: boolean, ist?: unknown): void {
  if (ok) return
  fehler++
  console.error(`FEHLER: ${name}`, ist === undefined ? '' : JSON.stringify(ist))
}

const WACHE = fileURLToPath(new URL('./check-prime-suchlink-bestand.ts', import.meta.url))
const termin = (id: number) => ({ slug: `auto-${id}-primevideo`, titleId: id, name: `Testtitel ${id}`, platform: 'primevideo', kanal: 'Aniverse', releaseType: 'batch', sources: ['https://example.org/a'] })
const titel = (id: number) => ({ id, slug: `t-${id}`, titleEn: `Testtitel ${id}`, streams: [], watchLinks: [] })

function lauf(wurzel: string): { status: number | null; aus: string } {
  const r = spawnSync(process.execPath, ['--import', 'tsx', WACHE], { env: { ...process.env, AK_ROOT: wurzel }, encoding: 'utf8', windowsHide: true, timeout: 60_000, stdio: ['ignore', 'pipe', 'pipe'] })
  return { status: r.status, aus: `${r.stdout}\n${r.stderr}` }
}

/** Kulisse: drei Prime-Termine; `auftraege` sind die Titel-IDs auf der Liste der Erweiterung, `ohneTitel` lässt `titles.json` weg. */
function kulisse(wurzel: string, auftraege: number[], ohneTitel = false): void {
  mkdirSync(join(wurzel, 'public/data'), { recursive: true })
  mkdirSync(join(wurzel, 'data'), { recursive: true })
  writeFileSync(join(wurzel, 'public/data/releases.json'), JSON.stringify([termin(900001), termin(900002), termin(900003)]))
  rmSync(join(wurzel, 'public/data/titles.json'), { force: true })
  if (!ohneTitel) writeFileSync(join(wurzel, 'public/data/titles.json'), JSON.stringify([titel(900001), titel(900002), titel(900003)]))
  writeFileSync(join(wurzel, 'public/data/prime-suche.json'), JSON.stringify(Object.fromEntries(auftraege.map((id) => [`k${id}`, { id }]))))
  writeFileSync(join(wurzel, 'data/dub-confirmed.yaml'), '[]\n')
}

const wurzel = mkdtempSync(join(tmpdir(), 'prime-suchlink-bestand-'))
try {
  kulisse(wurzel, [900001, 900002])
  const rot = lauf(wurzel)
  pruefe('ein Titel ohne Auftrag: Exit 1', rot.status === 1, rot.status)
  pruefe('nennt genau einen Verstoß', rot.aus.includes('VERSTÖSSE: 1'), rot.aus.slice(-300))
  pruefe('nennt den Termin', rot.aus.includes('auto-900003-primevideo'), rot.aus.slice(-300))
  pruefe('meldet den Titel an die Quarantäne (Titelmarke mit ID)', rot.aus.includes('900003') && rot.aus.includes('prime-suchlink-bestand'), rot.aus.slice(-300))

  kulisse(wurzel, [900001, 900002, 900003])
  const gruen = lauf(wurzel)
  pruefe('alle drei auf der Liste: Exit 0', gruen.status === 0, `${gruen.status} ${gruen.aus.slice(-300)}`)
  pruefe('Ergebniszeile mit Zählern', gruen.aus.includes('3 Prime-Termine, 3 Suchaufträge geprüft') && gruen.aus.includes('VERSTÖSSE: 0'), gruen.aus.slice(-300))

  kulisse(wurzel, [900001, 900002, 900003], true)
  const fehlt = lauf(wurzel)
  pruefe('titles.json fehlt: Exit 1 mit Fehler, nie still grün', fehlt.status === 1 && fehlt.aus.includes('public/data/titles.json fehlt'), `${fehlt.status} ${fehlt.aus.slice(-300)}`)
} finally {
  rmSync(wurzel, { recursive: true, force: true })
}

if (fehler) process.exit(1)
console.log('check-prime-suchlink-bestand-prozess: ok')
