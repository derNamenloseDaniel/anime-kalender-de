/**
 * Prozess-Test für `pipeline/check-ics-rfc-bestand.ts` (27.11.2026): Der Wächter muss als eigener Prozess mit Exit 1 enden, wenn eine ICS-Datei
 * kaputt ist oder der Ordner keine hat, und mit Exit 0 bei gültigen Dateien. Läuft auf Temp-Ordnern (Ordner als Argument), nie am echten Bestand.
 * Aufruf: `npm run check:logic`.
 */
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const REPO = join(import.meta.dirname, '..')
const TSX = createRequire(join(REPO, 'package.json')).resolve('tsx/cli')
const SKRIPT = join(REPO, 'pipeline', 'check-ics-rfc-bestand.ts')

const GUT = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//test//DE', 'BEGIN:VEVENT', 'UID:a@test', 'DTSTAMP:20261127T000000Z', 'DTSTART:20261127T100000Z', 'SUMMARY:Titel', 'END:VEVENT', 'END:VCALENDAR', ''].join('\r\n')
const KAPUTT = GUT.replace('UID:a@test\r\n', '')

let verletzt = 0
function pruefe(name: string, ok: boolean, info: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name} — gefunden: ${JSON.stringify(info)}`)
}

/** Der Wächter auf einem Ordner mit den genannten Dateien; Ausgabe beider Ströme zusammen. */
function lauf(dateien: Record<string, string>): { status: number | null; text: string } {
  const ordner = mkdtempSync(join(tmpdir(), 'ics-rfc-lauf-'))
  try {
    for (const [name, inhalt] of Object.entries(dateien)) writeFileSync(join(ordner, name), inhalt)
    const r = spawnSync(process.execPath, [TSX, SKRIPT, ordner], { encoding: 'utf8', timeout: 60_000, stdio: ['ignore', 'pipe', 'pipe'] })
    return { status: r.status, text: `${r.stdout}${r.stderr}` }
  } finally {
    rmSync(ordner, { recursive: true, force: true })
  }
}

console.log('\nWächter für feeds/*.ics als Prozess:')
const gut = lauf({ 'gut.ics': GUT })
pruefe('gültige Datei: Exit 0, VERSTÖSSE: 0', gut.status === 0 && gut.text.includes('VERSTÖSSE: 0') && gut.text.includes('1 ICS-Dateien'), gut)
const kaputt = lauf({ 'gut.ics': GUT, 'kaputt.ics': KAPUTT })
pruefe('kaputte Datei: Exit 1, Regel und Dateiname genannt', kaputt.status === 1 && kaputt.text.includes('✖ vevent-ohne-uid: 1 (kaputt.ics)') && kaputt.text.includes('VERSTÖSSE: 1'), kaputt)
const leer = lauf({})
pruefe('leerer Ordner: Exit 1, Grund genannt', leer.status === 1 && leer.text.includes('✖ keine ICS-Datei im Bestand') && leer.text.includes('VERSTÖSSE: 1'), leer)
const fremd = lauf({ 'notiz.txt': 'kein Kalender' })
pruefe('Ordner ohne .ics-Datei: Exit 1', fremd.status === 1 && fremd.text.includes('0 ICS-Dateien'), fremd)

console.log(`\nVERSTÖSSE: ${verletzt}`)
process.exit(verletzt ? 1 : 0)
