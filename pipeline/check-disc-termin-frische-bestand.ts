/**
 * Bestandswächter: Eine Disc-Ausgabe mit künftigem (oder jüngstem) Datum steht auf einer aniSearch-Titelseite, die zu lange nicht neu
 * gelesen wurde (`lib/disc-termin-frische.ts`, 24.11.2026; Anlass Pokémon-Reisen: 18.12.2026 angezeigt, 30.04.2027 laut aniSearch).
 * Warnung ab `DISC_WARN_TAGE` (auch ohne Lesezeitpunkt: Katalogtitel ohne Eintrag in `anisearch.json`), rot über `DISC_FEHLER_TAGE`. Läuft in `check:bestand`.
 */
import { readJson } from './lib/util.ts'
import { bestandWarnzeile } from './lib/bestand-warnzeile.ts'
import { DISC_FEHLER_TAGE, DISC_WARN_TAGE, unbestaetigteTermine, type DiscAusgabeKurz } from './lib/disc-termin-frische.ts'
import { todayIso } from '../shared/time.ts'

const heute = process.argv[2] ?? todayIso()
const ausgaben = readJson<Record<string, DiscAusgabeKurz[]>>('data/disc-ausgaben.json', {})
const cache = readJson<Record<string, { fetchedAt?: string }>>('data/anisearch.json', {})
if (!Object.keys(ausgaben).length || !Object.keys(cache).length) {
  console.error('FEHLER: data/disc-ausgaben.json oder data/anisearch.json leer oder fehlt')
  console.log('VERSTÖSSE: 1')
  process.exit(1)
}

const alle = unbestaetigteTermine(ausgaben, cache, heute, DISC_WARN_TAGE)
const hart = alle.filter((t) => t.alter !== null && t.alter > DISC_FEHLER_TAGE)
const weich = alle.filter((t) => !hart.includes(t))
if (weich.length) {
  console.log(bestandWarnzeile(`Disc-Termin seit über ${DISC_WARN_TAGE} Tagen nicht neu gelesen`, 'Titel', [...new Set(weich.map((t) => t.titelId))]))
}
for (const t of hart) {
  console.error(`FEHLER: Disc „${t.edition}" (${t.datum}), Titel ${t.titelId}: Titelseite seit ${t.alter} Tagen nicht gelesen (Grenze ${DISC_FEHLER_TAGE})`)
}
console.log(`Disc-Termine: ${alle.length} Ausgaben mit Datum ab heute minus 30 Tage auf Seiten über ${DISC_WARN_TAGE} Tage, davon ${hart.length} rot`)
console.log(`VERSTÖSSE: ${hart.length}`)
if (hart.length) process.exit(1)
