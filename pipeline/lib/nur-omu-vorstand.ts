import type { Release, Title } from '../../shared/types.ts'

/**
 * Unabhängiger Vorstand zu `nurOmuTitel` (`bau/omu-ohne-termin.ts`): Titel im Hauptbestand, deren Termine alle nur Originalton nennen
 * und die keinen Deutsch-Beleg haben. Die Fachregel steht hier aus den Feldern der Ausgabe neu, ohne Import aus `bau/`: Ein Fehler in
 * `nurOmuTitel` trifft so nicht beide Seiten zugleich (die Wache rief vorher dieselbe Funktion auf wie der Bau und konnte nie anschlagen).
 * `deutschMarke`: aniSearchs Marke je Titel (`lib/anisearch-marke.ts`, Eingabe des Baus); `d`, `c` (Teilsynchro) und `p` (geplant) halten den Titel drin.
 */
export function nurOmuImHauptbestand(
  titel: Title[],
  releases: Release[],
  hatStimmen: (id: number) => boolean,
  deutschMarke: (id: number) => string | undefined,
): Title[] {
  return titel.filter((t) => {
    const termine = releases.filter((r) => r.titleId === t.id && !r.widerlegt)
    if (!termine.length || !termine.every((r) => r.sprache === 'omu')) return false
    if (t.streams.some((s) => s.dub === true) || t.deErstausgabe || t.ankuendigung?.synchro === 'angekuendigt') return false
    return !['d', 'c', 'p'].includes(deutschMarke(t.id) ?? '') && !hatStimmen(t.id)
  })
}
