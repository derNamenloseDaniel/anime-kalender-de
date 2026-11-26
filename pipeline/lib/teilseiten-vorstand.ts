import type { Title } from '../../shared/types.ts'
import type { TeilseitenPruefung } from './teilseiten.ts'
import { readJson } from './util.ts'
import { abgaengeOhneGrund, leseVorstandJson } from './vorstand-abgang.ts'

const TITEL = 'public/data/titles.json'

/** Ein Stand der geteilten Seiten einer Plattform: Ausgabe (`titles.json`) und die Prüfliste, die der Bau dazu schreibt. */
export interface TeilseitenStand {
  titles: Title[]
  liste: TeilseitenPruefung[]
}

const schluessel = (titleId: number, url: string): string => `${titleId}|${url}`

/** Titel und Adresse, die geführt sind: auf der Prüfliste oder als geteilter Weg mit Folgenbereich. */
function gefuehrt(stand: TeilseitenStand, plattform: string): Set<string> {
  const mitBereich = stand.titles.flatMap((t) =>
    t.streams.filter((s) => s.platform === plattform && s.sharedWith && s.dubRanges?.length).map((s) => schluessel(t.id, s.url)),
  )
  return new Set([...stand.liste.map((p) => schluessel(p.titleId, p.url)), ...mitBereich])
}

/**
 * Titel und Adresse, die im Vorstand Bereich oder Prüflisten-Eintrag hatten und jetzt keins von beiden, obwohl der Titel dort noch
 * einen Weg mit Ja führt. Verliert der Titel den Weg (oder verlässt den Hauptbestand), braucht er keinen Bereich mehr.
 */
export function teilseitenAbgaenge(vorher: TeilseitenStand, jetzt: TeilseitenStand, plattform: string): string[] {
  const offen = new Set(
    jetzt.titles.flatMap((t) => t.streams.filter((s) => s.platform === plattform && s.dub === true).map((s) => schluessel(t.id, s.url))),
  )
  return abgaengeOhneGrund(gefuehrt(vorher, plattform), gefuehrt(jetzt, plattform), (k) => !offen.has(k))
}

/** Die Wache am echten Bestand: Fehlerzeilen gegen den Vorstand `ref`; ein nicht lesbarer Vorstand ist selbst ein Fehler (Nichtauskunft ist kein „gleich“). */
export function teilseitenGegenVorstand(plattform: string, liste: string, ref: string): string[] {
  let vorher: TeilseitenStand
  try {
    vorher = { titles: leseVorstandJson<Title[]>(TITEL, ref) ?? [], liste: leseVorstandJson<TeilseitenPruefung[]>(liste, ref) ?? [] }
  } catch (e) {
    return [`Vorstand ${ref} nicht lesbar: ${(e as Error).message.split('\n')[0]}`]
  }
  const jetzt = { titles: readJson<Title[]>(TITEL, []), liste: readJson<TeilseitenPruefung[]>(liste, []) }
  const weg = teilseitenAbgaenge(vorher, jetzt, plattform)
  return weg.length ? [`${weg.length} Weg(e) hatten im Vorstand ${ref} Bereich oder Prüflisten-Eintrag und jetzt keins von beiden: ${weg.slice(0, 10).join(', ')}`] : []
}
