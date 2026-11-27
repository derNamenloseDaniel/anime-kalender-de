import { diffDays } from '../../shared/time.ts'
import type { SprecherZeile } from './wikipedia-sprecher.ts'
import { sprecherAusSeite } from './wikipedia-sprecher-seite.ts'
import { verwirfFalscheStimmen } from './wikipedia-sprecher-waechter.ts'

/**
 * Sammler-Kern für die Sprechertabellen der Handliste `data/wikipedia-sprecher-seiten.yaml`: je Seite ein Abruf
 * höchstens alle `FRISCH_TAGE` Tage. Eine Störung (HTTP ≠ 200, Weiterleitung, Netzfehler) ist kein Befund: der
 * alte Stand der Seite bleibt, die Störung wird gemeldet. Seiten, die nicht mehr in der Handliste stehen, fallen weg.
 */
export const FRISCH_TAGE = 7

export interface SeitenEintrag {
  /** Berliner Datum des Abrufs. */
  abgerufen: string
  /** Überschrift des Abschnitts mit der Tabelle; null = keine Tabelle mit deutscher Spalte. */
  abschnitt: string | null
  zeilen: SprecherZeile[]
}

export interface SprecherDatei {
  seiten: Record<string, SeitenEintrag>
}

export type Abruf = (seite: string) => Promise<{ status: number; text: string }>

export interface Sammelergebnis {
  datei: SprecherDatei
  abrufe: number
  stoerungen: string[]
  /** Vom Wächter verworfene Stimmen („Seite: Rolle → Sprecher (Grund)“), kein Abrufproblem. */
  verworfen: string[]
}

export async function sammle(seiten: string[], alt: SprecherDatei, abruf: Abruf, heute: string, pause: () => Promise<void>): Promise<Sammelergebnis> {
  const aus: SprecherDatei = { seiten: {} }
  const stoerungen: string[] = []
  const verworfen: string[] = []
  let abrufe = 0
  for (const seite of seiten) {
    const vorher = alt.seiten[seite]
    if (vorher && diffDays(vorher.abgerufen, heute) < FRISCH_TAGE) {
      aus.seiten[seite] = vorher
      continue
    }
    if (abrufe > 0) await pause()
    abrufe++
    const grund = await hole(seite, abruf, heute, aus, verworfen)
    if (!grund) continue
    stoerungen.push(`${seite}: ${grund}`)
    if (vorher) aus.seiten[seite] = vorher
  }
  return { datei: aus, abrufe, stoerungen, verworfen }
}

/** Eine Tabellenzeile je Textzeile: lesbare Diffs im Sammler-PR bei einem Drittel der eingerückten Größe. */
export function alsText(datei: SprecherDatei): string {
  const seiten = Object.entries(datei.seiten).map(([seite, e]) => {
    const kopf = `    ${JSON.stringify(seite)}: { "abgerufen": ${JSON.stringify(e.abgerufen)}, "abschnitt": ${JSON.stringify(e.abschnitt)}, "zeilen": [`
    return e.zeilen.length ? `${kopf}\n${e.zeilen.map((z) => `      ${JSON.stringify(z)}`).join(',\n')}\n    ] }` : `${kopf}] }`
  })
  return `{\n  "seiten": {\n${seiten.join(',\n')}\n  }\n}\n`
}

/** Trägt die Seite in `aus` ein; Rückgabe ist der Störungsgrund, sonst null. */
async function hole(seite: string, abruf: Abruf, heute: string, aus: SprecherDatei, verworfen: string[]): Promise<string | null> {
  try {
    const { status, text } = await abruf(seite)
    if (status !== 200) return `HTTP ${status}`
    if (/^#(?:WEITERLEITUNG|REDIRECT)/i.test(text.trim())) return 'Weiterleitung (Handliste auf die Zielseite umstellen)'
    const gelesen = sprecherAusSeite(text)
    const geprueft = verwirfFalscheStimmen(gelesen.zeilen)
    verworfen.push(...geprueft.verworfen.map((v) => `${seite}: ${v}`))
    aus.seiten[seite] = { abgerufen: heute, abschnitt: gelesen.abschnitt, zeilen: geprueft.zeilen }
    return null
  } catch (e) {
    return e instanceof Error ? e.message : String(e)
  }
}
