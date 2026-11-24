/**
 * Zusicherungen zu `lib/disc-nachlese.ts` und dem Wächter `check-disc-ohne-lesequelle-bestand.ts` (24.11.2026): Ein Titel mit Disc-Termin
 * ohne Cache-Eintrag kommt in die Nachlese, wenn eine Kennung bekannt ist (Katalogtitel: aus der Titelkennung, sonst ID-Brücke);
 * ohne Kennung ist er „ohne Quelle" und der Wächter wird rot. Fixture nach den Katalogtiteln 10011635 und 10013220. Läuft in `check:logic`.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { discNachlese } from './lib/disc-nachlese.ts'

let fehler = 0
function pruefe(text: string, ist: unknown, soll: unknown) {
  if (JSON.stringify(ist) !== JSON.stringify(soll)) {
    fehler++
    console.error(`FEHLER ${text}:\n  ist  ${JSON.stringify(ist)}\n  soll ${JSON.stringify(soll)}`)
  }
}

// Mit Lesequelle: Titel 5 und 6 (Eintrag); ohne Eintrag: 7 (Brücke), 10011635 und 10013220 (Katalog); ohne alles: 8 und 9.
const cache = { 5: { fetchedAt: 'x' }, 6: { fetchedAt: 'x' } }
const bruecke = { 7: 4007, 5: 4005 }
const n = discNachlese(new Set([5, 6, 7, 8, 9, 10011635, 10013220]), cache, bruecke)
pruefe('Nachlese: Brücke und Katalog nach Titelnummer; Titel mit Eintrag fehlen (auch mit Brücke: 5)', n.auftraege, [
  { asId: 4007, titelIds: [] },
  { asId: 11635, titelIds: [] },
  { asId: 13220, titelIds: [] },
])
pruefe('ohne Quelle: Titel 8 und 9', n.ohneQuelle, [8, 9])
pruefe('nichts zu tun ohne Disc-Titel', discNachlese(new Set(), cache, bruecke), { auftraege: [], ohneQuelle: [] })

// Wächter als Prozess auf Wegwerf-Wurzel: rot bei Titeln ohne Quelle, grün sonst.
const vorher = process.cwd()
const wurzel = mkdtempSync(join(tmpdir(), 'ak-disc-lesequelle-'))
try {
  mkdirSync(join(wurzel, 'data'), { recursive: true })
  const schreibe = (pfad: string, inhalt: unknown) => writeFileSync(join(wurzel, 'data', pfad), JSON.stringify(inhalt))
  const zukunft = [{ edition: 'Zukunft', datum: '2999-12-31' }]
  const alt = [{ edition: 'Alt', datum: '2000-01-01' }]
  const lauf = (ausgaben: unknown) => {
    schreibe('disc-ausgaben.json', ausgaben)
    schreibe('anisearch.json', { 5: { fetchedAt: 'x' } })
    schreibe('anime-ids.json', { anisearch: { 7: 4007 } })
    return spawnSync(process.execPath, ['--import', 'tsx', join(vorher, 'pipeline/check-disc-ohne-lesequelle-bestand.ts'), '2026-11-24'], {
      cwd: vorher,
      env: { ...process.env, AK_ROOT: wurzel },
      encoding: 'utf8',
      timeout: 60_000,
      windowsHide: true,
    })
  }
  pruefe('Wächter grün: Eintrag, Brücke, zwei Katalogtitel', lauf({ 5: zukunft, 7: zukunft, 10011635: zukunft, 10013220: zukunft }).status, 0)
  const schlecht = lauf({ 5: zukunft, 8: zukunft, 9: zukunft })
  pruefe('Wächter rot: zwei Titel ohne Quelle', [schlecht.status, /VERSTÖSSE: 2/.test(schlecht.stdout)], [1, true])
  pruefe('Wächter grün: alte Termine zählen nicht', lauf({ 5: zukunft, 8: alt, 9: alt }).status, 0)
} finally {
  rmSync(wurzel, { recursive: true, force: true })
}
if (fehler) process.exit(1)
console.log('Disc-Nachlese: Titel ohne Eintrag werden nachgelesen, ohne Kennung wird der Wächter rot')
