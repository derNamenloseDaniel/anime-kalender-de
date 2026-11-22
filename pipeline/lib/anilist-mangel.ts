import type { AniListMedia } from './anilist.ts'

/** Höchstens so viele Einträge mit offenem Mangel je Lauf: MAL-Weg 100 = 2 Blöcke zu 50; der Lauf ist stündlich, AniList erlaubt 90 Abrufe je Minute. */
export const MANGEL_GRENZE_JE_LAUF = 100
/** Kennungs-Weg: jeder Eintrag ist ein eigener Abruf (750 ms Abstand), deshalb nur 10 je Lauf. */
export const MANGEL_GRENZE_KENNUNG = 10
/** Ein Eintrag mit Mangel wird frühestens nach so vielen Tagen erneut geholt: AniLists Antwort von heute ändert sich morgen nicht. */
export const MANGEL_ABSTAND_TAGE = 2

export type MitStempel = AniListMedia & { abgerufen?: string }

/** Fehlt dem Eintrag Wertung oder Studio? Nur das holt ein Neuabruf nach; ein abgeschlossener Titel wird sonst nie wieder gefragt. */
export function hatOffenenMangel(m: Pick<AniListMedia, 'averageScore' | 'meanScore' | 'studios'>): boolean {
  const ohneWertung = !(m.averageScore || m.meanScore)
  const ohneStudio = (m.studios?.nodes?.length ?? 0) === 0
  return ohneWertung || ohneStudio
}

const TAG_MS = 86_400_000

/** Welche Einträge mit offenem Mangel jetzt neu geholt werden: ohne Stempel oder Stempel älter als `MANGEL_ABSTAND_TAGE`, älteste zuerst, höchstens `grenze`. Fehlende Einträge und das Cache-Alter anderer Einträge spielen keine Rolle. */
export function mangelNeuHolen(
  zwischenspeicher: Record<string, MitStempel | undefined>,
  ids: number[],
  heute: string,
  grenze = MANGEL_GRENZE_JE_LAUF,
): number[] {
  const jetzt = Date.parse(heute)
  const faellig = ids.filter((id) => {
    const m = zwischenspeicher[id]
    if (!m || !hatOffenenMangel(m)) return false
    return !m.abgerufen || jetzt - Date.parse(m.abgerufen) >= MANGEL_ABSTAND_TAGE * TAG_MS
  })
  const stempel = (id: number): string => zwischenspeicher[id]?.abgerufen ?? ''
  return faellig.sort((a, b) => stempel(a).localeCompare(stempel(b))).slice(0, grenze)
}

/** Stempelt frisch geholte Einträge mit dem Abruftag. */
export function stempeln<T extends object>(m: T, heute: string): T & { abgerufen: string } {
  return { ...m, abgerufen: heute }
}
