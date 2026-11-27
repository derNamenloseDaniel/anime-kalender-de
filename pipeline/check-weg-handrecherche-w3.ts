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
type Soll = (typeof SOLL)[number]
type Eintrag = ReturnType<typeof loadCurated>[number]

/** Was an einem Eintrag gegen die Erwartung verstößt; leer = in Ordnung. */
function eintragFehler(e: Eintrag, soll: Soll): string[] {
  const f: string[] = []
  if (e.anilistId !== soll.anilistId) f.push('AniList-Kennung')
  if (!(e.platform === 'disc' && e.releaseType === 'disc' && e.schedule?.firstEpisodeDate === soll.tag)) f.push('Disc mit Erscheinungstag')
  if ((e.sources ?? [])[0]?.startsWith('https://www.anisearch.de/article/') !== true) f.push('erste Quelle ist der aniSearch-Artikel')
  if (!/Deutsche Tonspur/.test(e.note ?? '')) f.push('deutsche Tonspur im Hinweis')
  if (e.titleDe !== undefined) f.push('eigener deutscher Titel (der Bau übernähme ihn als titleDe)')
  if (e.ean !== soll.ean) f.push(`EAN ${soll.ean}`)
  return f
}

const alle = loadCurated()
pruefe('alle Handeinträge stehen in der kuratierten Liste', alle.filter((e) => SOLL.some((s) => s.slug === e.slug)).length === SOLL.length)

for (const soll of SOLL) {
  const e = alle.find((x) => x.slug === soll.slug)
  pruefe(`${soll.slug}: Eintrag vorhanden`, e !== undefined)
  if (!e) continue
  pruefe(`${soll.slug}: Erwartung erfüllt`, eintragFehler(e, soll).length === 0, eintragFehler(e, soll))
}

// Negativproben: jede Verletzung muss genau ihre Meldung auslösen (sonst wäre der Wächter nur ein Ist-Stand).
const gut = alle.find((x) => x.slug === SOLL[0]!.slug)!
const verletzt = (aus: Partial<Eintrag>, erwartet: string): void =>
  pruefe(`Negativprobe: ${erwartet}`, eintragFehler({ ...gut, ...aus }, SOLL[0]!).join('|') === erwartet, eintragFehler({ ...gut, ...aus }, SOLL[0]!))
verletzt({ anilistId: 1 }, 'AniList-Kennung')
verletzt({ platform: 'netflix' }, 'Disc mit Erscheinungstag')
verletzt({ schedule: { firstEpisodeDate: '2019-06-15' } }, 'Disc mit Erscheinungstag')
verletzt({ sources: ['https://www.anime2you.de/news/318357/x/'] }, 'erste Quelle ist der aniSearch-Artikel')
verletzt({ sources: [] }, 'erste Quelle ist der aniSearch-Artikel')
verletzt({ note: 'Japanisch' }, 'deutsche Tonspur im Hinweis')
verletzt({ titleDe: 'Sinbad' }, 'eigener deutscher Titel (der Bau übernähme ihn als titleDe)')
verletzt({ ean: '7630017535337' }, `EAN ${SOLL[0]!.ean}`)
verletzt({ ean: undefined }, `EAN ${SOLL[0]!.ean}`)

process.exit(fehler ? 1 : 0)
