import { liesSprechertabelle, type SprecherTabelle } from './wikipedia-sprecher.ts'

/**
 * Sprechertabelle aus dem Wikitext einer ganzen de.wikipedia-Seite (`?action=raw`): nur innerhalb eines Abschnitts,
 * dessen Überschrift „Synchron…“ enthält („Synchronisation“, „Synchronsprecher“, „Besetzung und Synchronisation“).
 * Ohne diese Grenze träfe der Parser die Episodenliste („Deutsche Erstausstrahlung“ beginnt mit „Deutsch“).
 */
export interface SeitenTabelle extends SprecherTabelle {
  /** Überschrift des Abschnitts, aus dem die Tabelle stammt; null = kein Abschnitt mit deutscher Spalte. */
  abschnitt: string | null
}

/** Leseadresse einer Seite (Quellenlink an der Sprecherliste; der Sammler hängt `?action=raw` an). */
export const wikipediaAdresse = (seite: string): string => `https://de.wikipedia.org/wiki/${encodeURIComponent(seite.replace(/ /g, '_'))}`

/** Abschnitte mit „Synchron“ in der Überschrift, je bis zur nächsten Überschrift gleicher oder höherer Ebene. */
export function synchronAbschnitte(wikitext: string): { ueberschrift: string; text: string }[] {
  const zeilen = wikitext.split('\n')
  const aus: { ueberschrift: string; text: string }[] = []
  zeilen.forEach((zeile, i) => {
    const kopf = /^(=+)\s*(.*?)\s*\1\s*$/.exec(zeile)
    if (!kopf || !/synchron/i.test(kopf[2]!)) return
    const ebene = kopf[1]!.length
    const ende = zeilen.findIndex((z, j) => j > i && (/^(=+)[^=].*?\1\s*$/.exec(z)?.[1]?.length ?? 99) <= ebene)
    aus.push({ ueberschrift: kopf[2]!, text: zeilen.slice(i, ende < 0 ? undefined : ende).join('\n') })
  })
  return aus
}

/** Der erste Synchron-Abschnitt mit deutscher Spalte. */
export function sprecherAusSeite(wikitext: string): SeitenTabelle {
  for (const a of synchronAbschnitte(wikitext)) {
    const tabelle = liesSprechertabelle(a.text)
    if (tabelle.deutscheSpalte) return { ...tabelle, abschnitt: a.ueberschrift }
  }
  return { deutscheSpalte: false, zeilen: [], abschnitt: null }
}
