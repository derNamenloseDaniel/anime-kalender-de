/**
 * Wächter für `data/curated/weg-handrecherche-c.yaml` (Auftrag weg-handrecherche-c, 27.11.2026): Jeder Handeintrag gibt einem Titel ohne Weg
 * eine Disc-Ausgabe mit belegter deutscher Tonspur. Der Bau liest die Datei über `loadCurated`; hier steht, was ein Eintrag mindestens tragen muss.
 */
import { loadCurated } from './lib/curated.ts'

let fehler = 0
function pruefe(name: string, bedingung: boolean, gefunden?: unknown): void {
  if (bedingung) return void console.log(`  ✓ ${name}`)
  fehler++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

/** Erwartung je Eintrag: Kennung, Titel und Tag stehen als feste Werte hier, nicht aus der Datei. */
const SOLL = [
  { slug: 'wolfs-rain-ova-peppermint-classics-5-blu-ray-2017-07-28', anilistId: 1023, tag: '2017-07-28', quelle: 'https://bluray-disc.de/', ean: undefined },
  { slug: 'techno-police-das-gesetz-der-zukunft-dvd-2017-08-31', anilistId: 5090, tag: '2017-08-31', quelle: 'https://www.ofdb.de/fassung/', ean: '4043962215200' },
]

const alle = loadCurated()
const eintraege = alle.filter((e) => SOLL.some((s) => s.slug === e.slug))
pruefe('beide Handeinträge stehen in der kuratierten Liste', eintraege.length === SOLL.length, eintraege.length)

for (const soll of SOLL) {
  const e = alle.find((x) => x.slug === soll.slug)
  pruefe(`${soll.slug}: Eintrag vorhanden`, e !== undefined)
  if (!e) continue
  pruefe(`${soll.slug}: AniList-Kennung`, e.anilistId === soll.anilistId, e.anilistId)
  pruefe(`${soll.slug}: Disc mit Erscheinungstag`, e.platform === 'disc' && e.schedule?.firstEpisodeDate === soll.tag, e.schedule)
  pruefe(`${soll.slug}: Quelle ist die Einzelseite des Anbieters`, (e.sources ?? []).length === 1 && (e.sources ?? []).every((s) => s.startsWith(soll.quelle)), e.sources)
  pruefe(`${soll.slug}: deutsche Tonspur im Hinweis`, /Deutsche Tonspur/.test(e.note ?? ''), e.note)
  pruefe(`${soll.slug}: EAN ${soll.ean ?? 'keine'}`, e.ean === soll.ean, e.ean)
}

process.exit(fehler ? 1 : 0)
