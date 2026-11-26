import { ohneCover } from './cover-luecken.ts'
import { abgaengeOhneGrund, leseVorstandJson } from './vorstand-abgang.ts'

type Eintrag = { id: number; cover?: string; coverImage?: string }

/** Reihen (`franchises.json`) und Datenbank (`titles.json` + `ohne-synchro.json`) eines Standes. */
export interface CoverStand {
  reihen: Record<string, Eintrag[]>
  datenbank: Eintrag[]
}

function kennungen(s: CoverStand): { alle: Set<string>; mitCover: Set<string> } {
  const ohne = ohneCover(s.reihen, s.datenbank)
  const alle = new Set([...Object.values(s.reihen).flat(), ...s.datenbank].map((e) => String(e.id)))
  return { alle, mitCover: new Set([...alle].filter((k) => !ohne.has(Number(k)))) }
}

/**
 * Kennungen, die im Vorstand überall ein Cover hatten und jetzt irgendwo keins, obwohl es sie noch gibt. Die Lückenliste deckt jeden
 * Eintrag ohne Cover, weil der Bau sie aus der Ausgabe schreibt; ein Cover-Verlust fällt nur gegen den Vorstand auf. Neue Kennungen zählen nicht.
 */
export function coverVerlust(vorher: CoverStand, jetzt: CoverStand): string[] {
  const j = kennungen(jetzt)
  return abgaengeOhneGrund(kennungen(vorher).mitCover, j.mitCover, (k) => !j.alle.has(k))
}

const liste = <T>(roh: T[] | Record<string, T> | undefined): T[] => (Array.isArray(roh) ? roh : Object.values(roh ?? {}))

/** Der Stand im Vorstand `ref` unter `wurzel`; wirft bei unbekanntem Stand oder kaputtem Inhalt. */
export function coverStandImVorstand(ref: string, wurzel: string): CoverStand {
  const lies = <T>(name: string) => leseVorstandJson<T>(`public/data/${name}`, ref, wurzel)
  return {
    reihen: lies<Record<string, Eintrag[]>>('franchises.json') ?? {},
    datenbank: [...liste(lies<Eintrag[]>('titles.json')), ...liste(lies<Eintrag[] | Record<string, Eintrag>>('ohne-synchro.json'))],
  }
}
