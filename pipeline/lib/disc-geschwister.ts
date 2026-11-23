/**
 * **Eine Disc gehört zu der Staffel, deren Ausgabe sie führt** (23.11.2026, 2.5 Dimensional Seduction – Vol. 4).
 *
 * Ein Handeintrag mit `search:` löst über die AniList-Suche zur *jüngsten* Staffel auf: „2.5-jigen no Ririsa" fand die
 * angekündigte 2nd Season (185515), `Vol. 4/4` führt aber aniSearch bei Staffel 1 (158559). Ergebnis: ein Disc-Termin an
 * einem Titel, der noch nicht erschienen ist.
 *
 * Umgehängt wird nur, wenn der eigene Titel die Nummer in seinen Ausgaben **nicht** führt und genau **ein** Titel derselben
 * Franchise sie führt (gleiche Nummer, gleiche Staffelangabe, nicht lange vor dem Termin erschienen wie in `disc-termin.ts`).
 */
import type { Release, Title } from '../../shared/types.ts'
import { discNummer, type DiscAusgabe } from './disc-termin.ts'
import { staffelVon } from './disc-anisearch-datum.ts'

const TAG = 86_400_000

export function discAufGeschwisterUmhaengen(
  releases: Release[],
  titles: Map<number, Title>,
  ausgaben: Record<string, DiscAusgabe[]>,
): { name: string; von: number; nach: number }[] {
  const geaendert: { name: string; von: number; nach: number }[] = []
  releases.forEach((r, i) => {
    const nummer = r.releaseType === 'disc' ? discNummer(r.name) : null
    const tag = r.schedule.firstEpisodeDate
    const franchise = titles.get(r.titleId)?.franchiseId
    if (!nummer || !tag || franchise === undefined) return
    const fruehestens = Date.parse(tag) - 400 * TAG
    const fuehrt = (id: number): boolean =>
      (ausgaben[String(id)] ?? []).some((a) => {
        const n = discNummer(a.kurz ?? a.edition)
        return n && n.art === nummer.art && n.nr === nummer.nr && staffelVon(a.edition) === staffelVon(r.name) && Date.parse(a.datum) >= fruehestens
      })
    if (fuehrt(r.titleId)) return
    const treffer = [...titles.values()].filter((t) => t.id !== r.titleId && t.franchiseId === franchise && fuehrt(t.id))
    if (treffer.length !== 1) return
    releases[i] = { ...r, titleId: treffer[0]!.id }
    geaendert.push({ name: r.name, von: r.titleId, nach: treffer[0]!.id })
  })
  return geaendert
}
