import { zurueckgestellt, type WegListe } from './anisearch-archiv-vorrang.ts'
import type { Sprecher } from './anisearch-sprecher.ts'

/** Hochzählen, sobald `sprecherAus()` ein Feld mehr liest. */
export const PARSER_STAND = 1
const ALTER_TAGE = 180
/** Hauptbestand-Seite ohne deutsche Rolle: nach zwei Wochen wieder fragen, aniSearch trägt die deutsche Besetzung oft erst Wochen nach dem Start nach (21.11.2026: 332 offene Sprecher-Mängel auf Seiten vom Oktober). */
export const LEER_TAGE = 14

export interface Eintrag extends Sprecher {
  fetchedAt: string
  stand: number
}
export interface AnisearchEintrag {
  anisearchId?: number
  info?: { languages?: { language: string; dubbed?: boolean }[] }
}
/** aniSearch-ID → trägt die Marke „Deutsch synchronisiert". */
export type Katalog = Map<number, boolean>

export function katalogAus(anisearch: Record<string, AnisearchEintrag>): Katalog {
  const titel: Katalog = new Map()
  for (const e of Object.values(anisearch)) {
    if (!e.anisearchId) continue
    titel.set(e.anisearchId, !!e.info?.languages?.some((l) => l.language === 'Deutsch' && l.dubbed))
  }
  return titel
}

export function faellig(bestand: Record<string, Eintrag>, id: number, jetztMs: number): boolean {
  const e = bestand[String(id)]
  if (!e || e.stand < PARSER_STAND) return true
  return (jetztMs - Date.parse(e.fetchedAt)) / 86_400_000 >= ALTER_TAGE
}

export interface Luecken {
  haupt: number[]
  katalog: number[]
  /** Hauptbestand-Seiten ohne deutsche Rolle, mindestens {@link LEER_TAGE} alt: werden erneut gefragt. */
  nachholen: number[]
}

/**
 * Seiten ohne jede Besetzung (`ja` 0) wechseln mit solchen ab, die eine führen: 15 leere in Folge hält der Lauf für eine Sperrseite (`anisearch-sprecher-lauf.ts`).
 * Je Seite mit Besetzung kommt höchstens eine ohne dran; der Überhang wartet auf einen späteren Lauf (die ältesten stehen vorn, siehe `nachholen`).
 */
export function verzahne(mitJa: number[], ohneJa: number[]): number[] {
  return mitJa.flatMap((id, i) => (i < ohneJa.length ? [ohneJa[i]!, id] : [id]))
}

function nachholen(ids: number[], bestand: Record<string, Eintrag>, jetztMs: number): number[] {
  const alter = (id: number): number => (jetztMs - Date.parse(bestand[String(id)]!.fetchedAt)) / 86_400_000
  const leer = ids
    .filter((id) => {
      const e = bestand[String(id)]
      return e !== undefined && !e.de?.length && alter(id) >= LEER_TAGE
    })
    .sort((a, b) => alter(b) - alter(a))
  const ja = (id: number): number => bestand[String(id)]!.ja
  return verzahne(leer.filter((id) => ja(id) > 0), leer.filter((id) => !ja(id)))
}

/**
 * **Die Vorrangliste für Sprecherseiten:** zuerst die Lücken im Hauptbestand (Titel mit Synchro-Marke vor dem Rest), danach der Katalog (ohne Marke zuerst, wie bisher).
 * Eine Lücke ist eine fällige Kennung, die nicht nach einer endgültigen Auskunft (404/410) noch in der Frist steht. Jede Kennung steht einmal — auch wenn sich
 * mehrere Titel eine teilen (117 Titel, 10.10.2026).
 */
export function sprecherLuecken(e: {
  haupt: number[]
  katalog: Katalog
  bestand: Record<string, Eintrag>
  weg: WegListe
  jetztMs: number
}): Luecken {
  const offen = (id: number): boolean => faellig(e.bestand, id, e.jetztMs) && !zurueckgestellt(e.weg, id, e.jetztMs)
  const imHaupt = new Set(e.haupt)
  const markiert = (id: number): number => Number(e.katalog.get(id) === true)
  return {
    haupt: [...imHaupt].filter(offen).sort((a, b) => markiert(b) - markiert(a)),
    katalog: [...e.katalog.keys()].filter((id) => !imHaupt.has(id) && offen(id)).sort((a, b) => markiert(a) - markiert(b)),
    nachholen: nachholen([...imHaupt].filter((id) => !offen(id) && !zurueckgestellt(e.weg, id, e.jetztMs)), e.bestand, e.jetztMs),
  }
}
