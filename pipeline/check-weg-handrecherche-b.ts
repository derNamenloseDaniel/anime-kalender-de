/**
 * Wächter für `data/curated/weg-handrecherche-b.yaml` (Auftrag maengel-weg-b, 26.11.2026): Jeder Handeintrag gibt einem Titel ohne Weg einen belegten Weg.
 * Der Bau liest die Datei über `loadCurated`; hier steht, was ein Eintrag mindestens tragen muss.
 */
import { loadCurated } from './lib/curated.ts'

let fehler = 0
function pruefe(name: string, bedingung: boolean, gefunden?: unknown): void {
  if (bedingung) return void console.log(`  ✓ ${name}`)
  fehler++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const eintraege = loadCurated().filter((e) => e.slug === 'devil-may-cry-s2-netflix')
pruefe('Devil May Cry Staffel 2 steht in der kuratierten Liste', eintraege.length === 1, eintraege.length)

for (const e of eintraege) {
  pruefe(`${e.slug}: Netflix-Adresse mit Serienkennung`, e.platform === 'netflix' && /netflix\.com\/title\/\d+$/.test(e.platformUrl ?? ''), e.platformUrl)
  pruefe(`${e.slug}: Termin mit Tag und Folgenzahl`, /^\d{4}-\d{2}-\d{2}$/.test(e.schedule?.firstEpisodeDate ?? '') && e.schedule?.episodeCount === 8, e.schedule)
  pruefe(`${e.slug}: Quelle ist eine https-Adresse`, (e.sources ?? []).length > 0 && (e.sources ?? []).every((s) => s.startsWith('https://')), e.sources)
  pruefe(`${e.slug}: Termin ist „im Angebot seit“, kein Erscheinungstag`, e.dateMeaning === 'available-from', e.dateMeaning)
}

process.exit(fehler ? 1 : 0)
