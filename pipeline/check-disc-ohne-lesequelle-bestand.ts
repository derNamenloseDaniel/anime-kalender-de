/**
 * Bestandswächter: Ein Disc-Termin (künftig oder jüngst) braucht eine Quelle, die ihn neu liest — einen Eintrag in `anisearch.json` oder
 * eine Kennung für die Nachlese (`lib/disc-nachlese.ts`). Ohne beides steht das Datum für immer so da (Nebenbefund zu PR 4854, 24.11.2026:
 * Katalogtitel 10011635, 10013220, 10018543). Läuft in `check:bestand`.
 */
import { readJson } from './lib/util.ts'
import { melde } from './lib/quarantaene.ts'
import { discNachlese } from './lib/disc-nachlese.ts'
import { discTitelMitTermin, type DiscAusgabeKurz } from './lib/disc-termin-frische.ts'
import { todayIso } from '../shared/time.ts'

const heute = process.argv[2] ?? todayIso()
const ausgaben = readJson<Record<string, DiscAusgabeKurz[]>>('data/disc-ausgaben.json', {})
const cache = readJson<Record<string, unknown>>('data/anisearch.json', {})
const bruecke = readJson<{ anisearch: Record<number, number> }>('data/anime-ids.json', { anisearch: {} }).anisearch
if (!Object.keys(ausgaben).length || !Object.keys(cache).length) {
  console.error('FEHLER: data/disc-ausgaben.json oder data/anisearch.json leer oder fehlt')
  console.log('VERSTÖSSE: 1')
  process.exit(1)
}

const { ohneQuelle } = discNachlese(discTitelMitTermin(ausgaben, heute), cache, bruecke)
for (const id of ohneQuelle) {
  melde(id, 'disc-ohne-lesequelle', 'Disc-Termin ohne Eintrag in anisearch.json und ohne Kennung zum Nachlesen')
  console.error(`FEHLER: Titel ${id} hat einen Disc-Termin, aber keine Lesequelle (kein Eintrag in anisearch.json, keine aniSearch-Kennung)`)
}
console.log(`Disc-Termine ohne Lesequelle: ${ohneQuelle.length}`)
console.log(`VERSTÖSSE: ${ohneQuelle.length}`)
if (ohneQuelle.length) process.exit(1)
