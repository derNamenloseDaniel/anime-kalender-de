import type { Title } from '../../shared/types.ts'
import { abgaengeOhneGrund } from './vorstand-abgang.ts'

const ANISEARCH_AB = 10_000_000

/** aniSearch-Titel (Kennung ab 10 000 000) → Wurzel ihrer Reihe, nur wo sie einer fremden Wurzel angehören. */
function gruppiert(titel: Pick<Title, 'id' | 'franchiseId'>[]): Map<string, number> {
  return new Map(titel.filter((t) => t.id >= ANISEARCH_AB && t.franchiseId !== undefined && t.franchiseId !== t.id).map((t) => [String(t.id), t.franchiseId!]))
}

/**
 * aniSearch-Titel, die im Vorstand einer Reihe angehörten und jetzt allein stehen, obwohl Titel und Reihenwurzel noch ausgeliefert werden.
 * Die Wache `check-reihen-namen-bestand.ts` sucht solche Titel mit `anisearchNamensKanten`, derselben Funktion, die die Reihen bildet;
 * ein Fehler darin traf Bau und Wache zugleich. Ein Wechsel in eine andere Reihe zählt nicht als Abgang.
 */
export function reihenAbgaenge(vorher: Pick<Title, 'id' | 'franchiseId'>[], jetzt: Pick<Title, 'id' | 'franchiseId'>[]): string[] {
  const alt = gruppiert(vorher)
  const da = new Set(jetzt.map((t) => t.id))
  return abgaengeOhneGrund(alt.keys(), new Set(gruppiert(jetzt).keys()), (k) => !da.has(Number(k)) || !da.has(alt.get(k)!))
}
