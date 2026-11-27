/**
 * Zusicherung am gebauten Bestand (`public/data/feeds/*.ics`): jede erzeugte Kalenderdatei erfüllt RFC 5545 (Zähler je Verstoß).
 * Nachnutzer wie AniNews importieren den Kalender. Läuft in `check:bestand` über `tools/check-bestand-liste.txt` (`npm run check:bestand-liste`);
 * die Regeln und ihre Gegenfälle: `shared/ics-pruefung.ts`, `pipeline/check-ics-rfc-faelle.ts`; Exit 1 bei Verstoß und bei leerem Ordner:
 * `pipeline/check-ics-rfc-bestand-lauf.ts`.
 * Aufruf: `npx tsx pipeline/check-ics-rfc-bestand.ts [ordner]` (Standard `public/data/feeds`)
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { ICS_REGELN, pruefeIcs, summiere } from '../shared/ics-pruefung.ts'

const ORDNER = process.argv[2] ?? join(import.meta.dirname, '..', 'public', 'data', 'feeds')
const dateien = readdirSync(ORDNER).filter((d) => d.endsWith('.ics'))
const je = dateien.map((d) => ({ d, z: pruefeIcs(readFileSync(join(ORDNER, d), 'utf8')) }))
const summe = summiere(je.map((e) => e.z))
console.log(`\n${dateien.length} ICS-Dateien gegen RFC 5545:`)
if (!dateien.length) console.error('  ✖ keine ICS-Datei im Bestand')
for (const r of ICS_REGELN) {
  if (summe[r]) console.error(`  ✖ ${r}: ${summe[r]} (${je.filter((e) => e.z[r]).slice(0, 5).map((e) => e.d).join(', ')})`)
  else console.log(`  ✓ ${r}: 0`)
}
const verletzt = ICS_REGELN.filter((r) => summe[r]).length + (dateien.length ? 0 : 1)
console.log(`VERSTÖSSE: ${verletzt}`)
process.exit(verletzt ? 1 : 0)
