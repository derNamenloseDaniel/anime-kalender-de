/**
 * Wächter für `data/curated/weg-handrecherche-w3.yaml` (Auftrag weg-handrecherche-w3, 27.11.2026): Jeder Handeintrag gibt einem W3-Titel ohne Weg
 * eine Disc-Ausgabe mit belegter deutscher Tonspur. Der Bau liest die Datei über `loadCurated`; hier steht, was ein Eintrag mindestens tragen muss.
 */
import { loadCurated } from './lib/curated.ts'

let fehler = 0
function pruefe(name: string, bedingung: boolean, gefunden?: unknown): void {
  if (bedingung) return void console.log(`  ✓ ${name}`)
  fehler++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

/** Erwartung je Eintrag: Kennung, Tag und EAN stehen als feste Werte hier, nicht aus der Datei. */
const SOLL = [
  { slug: 'sinbad-mahou-no-lamp-trilogie-uncut-2019-06-14', anilistId: 21368, tag: '2019-06-14', ean: '7630017517128' },
  { slug: 'sinbad-mahiru-no-yoru-trilogie-uncut-2019-06-14', anilistId: 100658, tag: '2019-06-14', ean: '7630017517128' },
  { slug: 'to-love-ru-darkness-2nd-specials-komplettset-2024-03-08', anilistId: 21852, tag: '2024-03-08', ean: '7630017535337' },
]

const alle = loadCurated()
pruefe('alle Handeinträge stehen in der kuratierten Liste', alle.filter((e) => SOLL.some((s) => s.slug === e.slug)).length === SOLL.length)

for (const soll of SOLL) {
  const e = alle.find((x) => x.slug === soll.slug)
  pruefe(`${soll.slug}: Eintrag vorhanden`, e !== undefined)
  if (!e) continue
  pruefe(`${soll.slug}: AniList-Kennung`, e.anilistId === soll.anilistId, e.anilistId)
  pruefe(`${soll.slug}: Disc mit Erscheinungstag`, e.platform === 'disc' && e.releaseType === 'disc' && e.schedule?.firstEpisodeDate === soll.tag, e.schedule)
  pruefe(`${soll.slug}: erste Quelle ist der aniSearch-Artikel mit der Tonspur`, (e.sources ?? [])[0]?.startsWith('https://www.anisearch.de/article/') === true, e.sources)
  pruefe(`${soll.slug}: deutsche Tonspur im Hinweis`, /Deutsche Tonspur/.test(e.note ?? ''), e.note)
  pruefe(`${soll.slug}: kein eigener deutscher Titel (der Bau übernähme ihn als titleDe)`, e.titleDe === undefined, e.titleDe)
  pruefe(`${soll.slug}: EAN ${soll.ean}`, e.ean === soll.ean, e.ean)
}

process.exit(fehler ? 1 : 0)
