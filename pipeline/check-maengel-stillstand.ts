/**
 * Zusicherung: `stillstandZeile` meldet auto-Arten, die seit drei Tagen nicht sinken, obwohl der Bestand wächst (Auftrag auto-arten-2111, 21.11.2026).
 * Läuft in `check:logic`, nur mit Kulisse: der echte Verlauf rollt nach 370 Tagen aus (Messung am echten Verlauf im PR-Text).
 */
import { MAENGEL_STILLSTAND_ZEILE, stillstandZeile, type Tagesstand } from './lib/maengel-stillstand.ts'
import type { Register, Zaehler } from './lib/maengel-register.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const z = (wer: string): Zaehler => ({ wirkung: 1, wer, offen: 0, neu: 0, behoben: 0, rueckfall: 0, ausnahme: 0 })
const register: Register = { stand: '2026-11-21', zaehler: { fsk: z('auto:justwatch'), laufzeit: z('auto:anisearch'), 'titel-de': z('hand:synchro-belegen') }, zeilen: [] }
const tag = (gemessenAm: string, titel: number, maengel: Record<string, number>): Tagesstand => ({ gemessenAm, titel, maengel })
const verlauf = [tag('2026-11-17', 100, { fsk: 50, laufzeit: 20, 'titel-de': 5 }), tag('2026-11-18', 101, { fsk: 50, laufzeit: 19, 'titel-de': 5 })]

console.log('\nStillstand der auto-Arten:')
{
  const zeile = stillstandZeile(verlauf, tag('2026-11-21', 104, { fsk: 50, laufzeit: 25, 'titel-de': 5 }), register)
  pruefe('fsk und laufzeit stehen bei wachsendem Bestand: eine Zeile mit Quelle, Bezug ist der 18.11.', zeile === `${MAENGEL_STILLSTAND_ZEILE}seit 2026-11-18, Bestand +3: fsk 50→50 (auto:justwatch); laufzeit 19→25 (auto:anisearch)`, zeile)
  pruefe('Hand-Art (titel-de) wird nicht gemeldet', !zeile?.includes('titel-de'), zeile)
  const sinkt = stillstandZeile(verlauf, tag('2026-11-21', 104, { fsk: 49, laufzeit: 18, 'titel-de': 5 }), register)
  pruefe('Gegenprobe: beide gesunken, keine Zeile', sinkt === undefined, sinkt)
  const gleich = stillstandZeile(verlauf, tag('2026-11-21', 101, { fsk: 50, laufzeit: 19, 'titel-de': 5 }), register)
  pruefe('Gegenprobe: Bestand nicht gewachsen, keine Zeile', gleich === undefined, gleich)
  const kurz = stillstandZeile(verlauf.slice(1), tag('2026-11-20', 104, { fsk: 50, laufzeit: 19, 'titel-de': 5 }), register)
  pruefe('Grenze: erst zwei Tage, Bezug fehlt, keine Zeile', kurz === undefined, kurz)
  const null_ = stillstandZeile(verlauf, tag('2026-11-21', 104, { fsk: 0, laufzeit: 19, 'titel-de': 5 }), register)
  pruefe('Art ohne offene Mängel steht nicht still', !null_?.includes('fsk'), null_)
}

if (verletzt) {
  console.error(`\n${verletzt} Zusicherung(en) verletzt.`)
  process.exit(1)
}
console.log('\nStillstand der auto-Arten: alle Zusicherungen erfüllt.')
