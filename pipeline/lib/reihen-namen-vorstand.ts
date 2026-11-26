import type { Title } from '../../shared/types.ts'
import { readJson } from './util.ts'
import { abgaengeOhneGrund, FREIGABE_HINWEIS, leseVorstandJson, ohneFreigabe } from './vorstand-abgang.ts'

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

type Zeile = Pick<Title, 'id' | 'franchiseId'>
const liste = (roh: Zeile[] | Record<string, Zeile> | undefined): Zeile[] => (Array.isArray(roh) ? roh : Object.values(roh ?? {}))

/** Die Wache am echten Bestand (`titles.json` + `ohne-synchro.json`): Fehlerzeilen gegen den Vorstand `ref`; ein nicht lesbarer Vorstand ist selbst ein Fehler. */
export function reihenGegenVorstand(ref: string): string[] {
  const bestand = (lies: (pfad: string) => Zeile[] | Record<string, Zeile> | undefined): Zeile[] => [
    ...liste(lies('public/data/titles.json')),
    ...liste(lies('public/data/ohne-synchro.json')),
  ]
  let vorher: Zeile[]
  try {
    vorher = bestand((pfad) => leseVorstandJson(pfad, ref))
  } catch (e) {
    return [`Vorstand ${ref} nicht lesbar: ${(e as Error).message.split('\n')[0]}`]
  }
  const weg = ohneFreigabe(reihenAbgaenge(vorher, bestand((pfad) => readJson(pfad, []))), 'reihen-namen')
  return weg.length ? [`${weg.length} aniSearch-Titel gehörten im Vorstand ${ref} einer Reihe an und stehen jetzt allein: ${weg.slice(0, 10).join(', ')} (${FREIGABE_HINWEIS})`] : []
}
