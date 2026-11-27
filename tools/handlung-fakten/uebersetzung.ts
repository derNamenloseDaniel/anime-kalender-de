/**
 * Übersetzungsprobe: eine deutsche Fassung, die den fremdsprachigen Klappentext Satz für Satz übersetzt, teilt keine 5-Wort-Folge
 * (`naehe.ts`), behält aber Namen, Zahlen und verwandte Wörter in derselben Reihenfolge und hat ähnliche Länge.
 * Gemessen wird die längste gemeinsame Folge von Stamm-Ankern (erste STAMM Zeichen jedes Wortes ab STAMM Zeichen: Abyss, Riko, human-/humanoid,
 * robot-/Roboter) als Anteil an der kürzeren Ankerliste, nur bei Längenverhältnis (Wörter eigen/fremd) in LAENGE_VON…LAENGE_BIS.
 * Schwelle an 24 eigenen Texten aus data/handlung-eigen.yaml gegen ihre AniList-Beschreibung gemessen (22.11.2026): im Längenfenster höchstens 0.121 (102501 ohne die
 * „(Source: …)“-Zeile der Beschreibung; 5 von 24 im Fenster), die wörtliche Übersetzung der AniList-Beschreibung von 101343 0.175; Schwelle dazwischen. Dünn belegt (ein Übersetzungsfall) — bei jedem neuen echten Fall nachmessen.
 */
import { woerter } from './naehe.ts'

export const STAMM = 4
export const SCHWELLE = 0.145
export const LAENGE_VON = 0.75
export const LAENGE_BIS = 1.33

const anker = (w: string[]): string[] => w.filter((x) => x.length >= STAMM).map((x) => x.slice(0, STAMM))

function laengsteGemeinsameFolge(a: string[], b: string[]): number {
  let zeile = new Array<number>(b.length + 1).fill(0)
  for (const x of a) {
    const neu = [0]
    for (let j = 1; j <= b.length; j++) neu[j] = x === b[j - 1] ? zeile[j - 1]! + 1 : Math.max(zeile[j]!, neu[j - 1]!)
    zeile = neu
  }
  return zeile[b.length]!
}

export interface UebersetzungsMass {
  anteil: number
  laengenverhaeltnis: number
  verdacht: boolean
}

export function uebersetzungsNaehe(eigenerText: string, fremderText: string): UebersetzungsMass {
  const eigen = woerter(eigenerText)
  const fremd = woerter(fremderText)
  const a = anker(eigen)
  const b = anker(fremd)
  const laengenverhaeltnis = fremd.length ? eigen.length / fremd.length : 0
  const anteil = Math.min(a.length, b.length) ? laengsteGemeinsameFolge(a, b) / Math.min(a.length, b.length) : 0
  const verdacht = laengenverhaeltnis >= LAENGE_VON && laengenverhaeltnis <= LAENGE_BIS && anteil >= SCHWELLE
  return { anteil, laengenverhaeltnis, verdacht }
}
