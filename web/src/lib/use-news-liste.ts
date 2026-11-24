import { useMemo } from 'react'
import { type NewsArt, type NewsEintrag } from '@shared/types.ts'
import { type Dataset } from './data.ts'
import { ohneAusgeblendete } from './ecchi.ts'
import { ohneEingeordnete, verlaeufeAus, type Verlaeufe } from './news-verlauf.ts'

export interface NewsListe {
  verlaeufe: Verlaeufe
  jeArt: Map<NewsArt, number>
  tage: [string, NewsEintrag[]][]
  aeltereGibtEs: boolean
}

/** Aus den geladenen Meldungen die Tagesliste ableiten: Zeitfenster, Ausblendungen, Verläufe, Filter. */
export function useNewsListe(
  data: Dataset,
  meldungen: NewsEintrag[] | null,
  grenze: string,
  filter: NewsArt | null,
): NewsListe {
  /* Überholte Meldungen stehen unter der, die sie überholt hat — nicht mehr in ihrer eigenen Tagesliste. */
  const verlaeufe = useMemo(() => verlaeufeAus(meldungen ?? []), [meldungen])
  const sichtbar = useMemo(
    () => ohneEingeordnete(ohneAusgeblendete((meldungen ?? []).filter((e) => e.am >= grenze), data.titleById), verlaeufe.eingeordnet),
    [meldungen, grenze, verlaeufe, data],
  )
  const aeltereGibtEs = ohneEingeordnete(ohneAusgeblendete(meldungen ?? [], data.titleById), verlaeufe.eingeordnet).some((e) => e.am < grenze)

  /* Wie oft jede Art vorkommt — die Filterleiste zeigt nur, was es gibt. */
  const jeArt = useMemo(() => {
    const zahl = new Map<NewsArt, number>()
    for (const e of sichtbar) for (const m of e.meldungen) zahl.set(m.art, (zahl.get(m.art) ?? 0) + 1)
    return zahl
  }, [sichtbar])

  const tage = useMemo(() => {
    const jeTag = new Map<string, NewsEintrag[]>()
    for (const e of sichtbar) {
      if (filter && !e.meldungen.some((m) => m.art === filter)) continue
      /* Gruppiert wird nach dem Tag, nicht nach dem Zeitstempel — sonst bekäme jede Uhrzeit ihre eigene Überschrift. */
      const tag = e.am.slice(0, 10)
      const liste = jeTag.get(tag) ?? []
      liste.push(e)
      jeTag.set(tag, liste)
    }
    return [...jeTag.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [sichtbar, filter])

  return { verlaeufe, jeArt, tage, aeltereGibtEs }
}
