import type { Title } from '../../shared/types.ts'
import { aehnlich } from './folgentitel-tmdb.ts'

interface Folge {
  nr: number
  minuten?: number
  de?: string
  en?: string
  ja?: string
}

const MIN_VERGLICHEN = 3

/** Mindestens vier von fünf bei beiden benannten Folgen tragen denselben Titel: die Nummern beider Quellen meinen dieselben Folgen. */
function nummernGleich(eigene: Map<number, string>, tmdb: Map<number, string>): boolean {
  const verglichen = [...eigene].filter(([nr]) => tmdb.has(nr))
  return verglichen.length >= MIN_VERGLICHEN && verglichen.filter(([nr, de]) => aehnlich(de, tmdb.get(nr) as string)).length * 5 >= verglichen.length * 4
}

/**
 * aniSearch führt weniger Folgen als die Folgenzahl (Kickers 23 von 26, T・P Bon 12 von 24), TMDB hat die übrigen mit deutschem Titel. `mitCrTiteln` füllt nur
 * vorhandene Zeilen; hier kommen die fehlenden Nummern bis zur Folgenzahl dazu — aber nur, wenn die vor TMDB schon benannten Folgen (`eigene`, nicht die eben aus TMDB gefüllten) mit TMDB übereinstimmen,
 * sonst verschöbe eine fremde Nummerierung die Titel. Ohne Folgenzahl oder bei Abweichung bleibt die Liste, wie sie ist.
 */
export function verlaengereBisFolgenzahl(t: Title, f: Folge[] | undefined, tmdb: Map<number, string> | undefined, eigene: Map<number, string>): Folge[] | undefined {
  if (!f || f.length < 2 || !tmdb || !t.episodes || f.length >= t.episodes || !nummernGleich(eigene, tmdb)) return f
  const vorhanden = new Set(f.map((x) => x.nr))
  const neu = [...tmdb].filter(([nr]) => !vorhanden.has(nr) && nr >= 1 && nr <= (t.episodes as number)).map(([nr, de]): Folge => ({ nr, de }))
  return [...f, ...neu].sort((a, b) => a.nr - b.nr)
}
