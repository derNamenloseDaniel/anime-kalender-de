
import type { WikiFolge } from './wikipedia-folgen.ts'
import type { WikiListen } from './tv-termine.ts'

const hoechsteNr = (folgen: WikiFolge[]): number => folgen.reduce((m, f) => Math.max(m, f.nr), 0)

const letztesWort = (s: string): string => (s.toLowerCase().match(/[\p{L}\p{N}-]+/gu) ?? []).at(-1) ?? ''

/**
 * Gilt die per `nummerFuer` (auch unscharf) gefundene Nummer des Ersatzes? Endet der Titel in der Liste auf ein anderes Zählwort als der der Sendung
 * („Teil 1“ gegen „Teil 2“, „II“ gegen „III“: ein Zeichen Abstand, aber eine andere Folge), ist es eine andere Folge; ein kurzes Schlusswort (bis 3 Zeichen) muss gleich sein.
 */
export function ersatzNummerGilt(ersatz: WikiFolge[], nr: number, folge: string): boolean {
  const dt = ersatz.find((f) => f.nr === nr)?.dt
  if (dt === undefined) return false
  const a = letztesWort(dt)
  const b = letztesWort(folge)
  return a === b || (a.length > 3 && b.length > 3)
}

/**
 * Hängt jeder Liste, die die aniSearch-Liste des Titels überstimmt (TMDB, Wikipedia, RTL+), die aniSearch-Liste als Ersatz an: Nennt die Sendung einen
 * Folgentitel, den nur aniSearch kennt (Dororo, Eyeshield 21: TMDB schreibt sie anders), bekommt sie dort ihre Nummer. Nur bei gleichem Zählmaß:
 * Zählt die führende Liste höher als aniSearch (Pokémon Reisen franchiseweit bis 1235, aniSearch bis 90), wäre die Nummer aus dem Ersatz eine andere Zählung.
 */
export function mitAnisearchErsatz(liste: WikiListen, anisearch: WikiListen): WikiListen {
  return Object.fromEntries(
    Object.entries(liste).map(([id, l]) => {
      const ani = anisearch[id]
      const ersatz = ani && ani !== l && hoechsteNr(l.folgen) <= hoechsteNr(ani.folgen) ? ani.folgen : undefined
      return [id, ersatz ? { ...l, ersatz } : l]
    }),
  )
}
