/**
 * **Eine angekündigte Staffel ohne eigene Seite** (Daniel, 24.11.2026, The Mighty Nein Staffel 2): Ein künftiges Release, dessen erste Folge
 * hinter der Folgenzahl seines Titels liegt, ist eine weitere Staffel, die nur als Termin am Grundtitel hängt. Sie hat dann keine Detailseite,
 * ihre News-Meldung steht an der falschen Staffel und ihr Sprachhinweis an der Seite der ersten. Der Bau schneidet sie über
 * `data/curated/staffel-titel-cartoons.yaml` (oder `horizonte-staffeln.yaml`) in einen eigenen Titel; hier steht, was übrig bleibt.
 */
import type { Release, Title } from '../../shared/types.ts'

export type StaffelOhneSeite = { slug: string; titleId: number; titel: string; ab: number; am: string }

export function staffelnOhneSeite(
  titles: Pick<Title, 'id' | 'episodes' | 'staffelTitel' | 'titleEn' | 'titleDe'>[],
  releases: Pick<Release, 'slug' | 'titleId' | 'schedule' | 'widerlegt'>[],
  heute: string,
): StaffelOhneSeite[] {
  const jeId = new Map(titles.map((t) => [t.id, t]))
  return releases.flatMap((r): StaffelOhneSeite[] => {
    const t = jeId.get(r.titleId)
    const ab = r.schedule?.firstEpisodeNumber
    const am = r.schedule?.firstEpisodeDate
    if (!t || t.staffelTitel || r.widerlegt || ab === undefined || am === undefined) return []
    if (am < heute || ab < 2 || t.episodes === undefined || ab <= t.episodes) return []
    return [{ slug: r.slug, titleId: t.id, titel: t.titleEn ?? t.titleDe ?? String(t.id), ab, am }]
  })
}

/** `neu`: Fälle, die nicht in der Liste stehen (rot); `erledigt`: Einträge der Liste, die kein Fall mehr sind (rot, die Liste darf nur sinken). */
export function abweichungVonBekannt(faelle: StaffelOhneSeite[], bekannt: ReadonlyMap<string, string>): { neu: string[]; erledigt: string[] } {
  const slugs = new Set(faelle.map((f) => f.slug))
  return { neu: [...slugs].filter((s) => !bekannt.has(s)), erledigt: [...bekannt.keys()].filter((s) => !slugs.has(s)) }
}
