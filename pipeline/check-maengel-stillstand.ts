/**
 * Zusicherung: `stillstand` meldet auto-Arten mit offenen Mängeln, die seit drei Tagen nicht sinken (Auftrag auto-arten-2111, 21.11.2026).
 * Läuft in `check:logic`, nur mit Kulisse: der echte Verlauf rollt nach 370 Tagen aus (Messung am echten Verlauf im PR-Text).
 */
import { MAENGEL_STILLSTAND_ZEILE, stillstand, type Tagesstand } from './lib/maengel-stillstand.ts'
import type { Register, Zaehler } from './lib/maengel-register.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const z = (wer: string): Zaehler => ({ wirkung: 1, wer, offen: 0, neu: 0, behoben: 0, rueckfall: 0, ausnahme: 0 })
const register: Register = {
  stand: '2026-11-21',
  zaehler: { fsk: z('auto:justwatch'), laufzeit: z('auto:anisearch'), cover: z('auto:tmdb-poster'), neu: z('auto:anilist'), 'titel-de': z('hand:synchro-belegen') },
  zeilen: [],
}
const tag = (gemessenAm: string, titel: number, maengel?: Record<string, number>): Tagesstand => ({ gemessenAm, titel, ...(maengel ? { maengel } : {}) })
const verlauf = [tag('2026-11-17', 100, { fsk: 50, laufzeit: 20, cover: 0, 'titel-de': 5 }), tag('2026-11-18', 101, { fsk: 50, laufzeit: 19, cover: 0, 'titel-de': 5 })]
const heute = (m: Record<string, number>, titel = 104): Tagesstand => tag('2026-11-21', titel, { cover: 0, 'titel-de': 5, ...m })

console.log('\nStillstand der auto-Arten:')
{
  const s = stillstand(verlauf, heute({ fsk: 50, laufzeit: 25 }), register)
  pruefe('fsk (gleich) und laufzeit (gestiegen) stehen: kurze Zeile mit Zahl und Bezugstag 18.11.', s?.zeile === `${MAENGEL_STILLSTAND_ZEILE}2 auto-Arten sinken nicht seit 2026-11-18`, s)
  pruefe('Einzelheiten je Art mit Quelle', s?.einzeln === 'fsk 50→50 (auto:justwatch); laufzeit 19→25 (auto:anisearch)', s?.einzeln)
  pruefe('Hand-Art (titel-de) wird nicht gemeldet', !s?.einzeln.includes('titel-de'), s)
  pruefe('gelöste Art bleibt still: cover 0→0 ist kein Stillstand', !s?.einzeln.includes('cover'), s)
  pruefe('Gegenprobe: beide gesunken, keine Meldung', stillstand(verlauf, heute({ fsk: 49, laufzeit: 18 }), register) === undefined)
  const gleich = stillstand(verlauf, heute({ fsk: 50, laufzeit: 19 }, 101), register)
  pruefe('ohne Bestandswachstum: Meldung kommt (ein Sammler, der die Lücke abbauen soll, muss auch dann sinken)', gleich?.zeile.startsWith(`${MAENGEL_STILLSTAND_ZEILE}2 `) === true, gleich)
  pruefe('Grenze: erst zwei Tage, Bezug fehlt, keine Meldung', stillstand(verlauf.slice(1), tag('2026-11-20', 104, { fsk: 50, laufzeit: 19 }), register) === undefined)
  const o = stillstand([verlauf[0]!, tag('2026-11-18', 101)], heute({ fsk: 50, laufzeit: 25 }), register)
  pruefe('jüngster Eintrag vor der Grenze ohne Mängelzahlen: Bezug ist der Eintrag davor (17.11.)', o?.zeile.endsWith('seit 2026-11-17') === true && o.einzeln.includes('laufzeit 20→25'), o)
  const n = stillstand(verlauf, heute({ fsk: 49, laufzeit: 18, neu: 7 }), register)
  pruefe('Art neu im Register, im Bezug unbekannt: keine Meldung', n === undefined, n)
}

if (verletzt) {
  console.error(`\n${verletzt} Zusicherung(en) verletzt.`)
  process.exit(1)
}
console.log('\nStillstand der auto-Arten: alle Zusicherungen erfüllt.')
