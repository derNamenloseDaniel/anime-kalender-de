/**
 * Bestandswächter (Daniel, 26.10.2026, Beerus): Im Hauptbestand (`titles.json`) steht kein Titel, dessen Termine alle nur Originalton nennen
 * und der keinen Deutsch-Beleg hat (Regel `nurOmuTitel`, Schritt `bau/hinter-toggle.ts`; deutsche Sprechrollen halten ihn drin).
 * Liest `public/data` und läuft deshalb in `check:bestand`; der Fall mit Kulisse steht in `check-nur-omu-hauptbestand.ts`.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Release, Title } from '../shared/types.ts'
import { deutschMarke } from './lib/anisearch-marke.ts'
import { nurOmuImHauptbestand } from './lib/nur-omu-vorstand.ts'
import { melde } from './lib/quarantaene.ts'
import { ROOT, readJson } from './lib/util.ts'

const titel = readJson<Title[]>('public/data/titles.json', [])
const releases = readJson<Release[]>('public/data/releases.json', [])

function mitSprechrollen(id: number): boolean {
  const datei = join(ROOT, 'public/data/voices', `${id}.json`)
  return existsSync(datei) && ((JSON.parse(readFileSync(datei, 'utf8')) as { roles?: unknown[] }).roles?.length ?? 0) > 0
}

// Soll aus einer eigenen Fassung der Regel (`lib/nur-omu-vorstand.ts`), nicht aus `nurOmuTitel`, das der Bau selbst aufruft.
const falsch = nurOmuImHauptbestand(titel, releases, mitSprechrollen, deutschMarke)
for (const t of falsch) melde(t.id, 'nur-omu-bestand', 'nur OmU-Termine, kein Deutsch-Beleg: gehört hinter den Toggle')
for (const t of falsch) console.error(`✖ ${t.id} ${t.slug}: nur OmU-Termine ohne Deutsch-Beleg im Hauptbestand`)
console.log(`  ${falsch.length ? '✖' : '✓'} ${titel.length} Titel, ${falsch.length} nur mit OmU-Terminen ohne Deutsch-Beleg im Hauptbestand`)
console.log(`VERSTÖSSE: ${falsch.length}`)
if (falsch.length) process.exit(1)
