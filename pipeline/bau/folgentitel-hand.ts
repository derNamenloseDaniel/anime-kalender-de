import { existsSync, readFileSync } from 'node:fs'
import yaml from 'js-yaml'
import { mitCrTiteln } from './folgentitel-cr.ts'
import { istPlatzhalter } from './folgentitel-zeilen.ts'

/**
 * **Aus erlaubten Quellen übernommene deutsche Folgentitel** (`data/folgentitel-hand.yaml`, Auftrag Daniel, 01.11.2026: was keine Stufe automatisch liefert, wird einzeln
 * zugeordnet). Jeder Eintrag nennt Titel, Folge, den deutschen Titel und die Fundstelle (`quelle`) in einer erlaubten Quelle. Die Stufe füllt nur Lücken:
 * ein Titel aus aniSearch, Crunchyroll, RTL+ oder TMDB bleibt. Ein Eintrag ohne Pflichtfeld oder doppelt ist ein Fehler (`handFehler`), kein stilles Überspringen.
 */
export interface HandEintrag {
  anilistId: number
  folge: number
  titel: string
  quelle: string
}

const text = (v: unknown): boolean => typeof v === 'string' && v.trim() !== ''

/** Die Fehler der Einträge: fehlende oder falsche Pflichtfelder, Platzhalter als Titel, dieselbe Folge zweimal. */
export function handFehler(eintraege: unknown): string[] {
  if (!Array.isArray(eintraege)) return ['die Datei ist keine Liste']
  const fehler: string[] = []
  const gesehen = new Set<string>()
  eintraege.forEach((e: Partial<HandEintrag> | null, i) => {
    const wo = `Eintrag ${i + 1}`
    if (!e || typeof e !== 'object') return void fehler.push(`${wo}: kein Eintrag`)
    if (!Number.isInteger(e.anilistId) || (e.anilistId as number) < 1) fehler.push(`${wo}: anilistId fehlt oder ist keine Kennung`)
    if (!Number.isInteger(e.folge) || (e.folge as number) < 1) fehler.push(`${wo}: folge fehlt oder ist keine Nummer`)
    if (!text(e.titel)) fehler.push(`${wo}: titel fehlt`)
    else if (istPlatzhalter(e.titel as string)) fehler.push(`${wo}: titel ist ein Platzhalter`)
    if (!text(e.quelle)) fehler.push(`${wo}: quelle (Fundstelle) fehlt`)
    const schluessel = `${e.anilistId}:${e.folge}`
    if (gesehen.has(schluessel)) fehler.push(`${wo}: Folge ${e.folge} von ${e.anilistId} steht zweimal`)
    gesehen.add(schluessel)
  })
  return fehler
}

/** Die Einträge je Titelkennung → Folgennummer → Titel; fehlt die Datei, gibt es keine; ein Fehler in der Datei wirft. */
export function ladeHandTitel(pfad: string): Record<string, Map<number, string>> {
  if (!existsSync(pfad)) return {}
  const eintraege = yaml.load(readFileSync(pfad, 'utf8')) ?? []
  const fehler = handFehler(eintraege)
  if (fehler.length) throw new Error(`${pfad}: ${fehler.join('; ')}`)
  const je: Record<string, Map<number, string>> = {}
  for (const e of eintraege as HandEintrag[]) (je[String(e.anilistId)] ??= new Map()).set(e.folge, e.titel)
  return je
}

/**
 * Die Hand füllt die Lücken der Liste und legt für Handfolgen **ohne Zeile** eine an (Folgennummer 1 bis Folgenzahl): Eine Liste aus TMDB-Titeln
 * trägt nur Zeilen mit echtem Titel, und `mitCrTiteln` füllt nur vorhandene Zeilen — die Handfolge verschwand dort still (Miraculous, 26.11.2026).
 * Ohne bekannte Folgenzahl gibt es keine neuen Zeilen.
 */
export function mitHandTiteln<T extends { nr: number; de?: string }>(f: T[] | undefined, hand: Map<number, string> | undefined, folgenzahl: number | undefined): T[] | undefined {
  const gefuellt = mitCrTiteln(f as never, hand) as T[] | undefined
  if (!hand || !folgenzahl) return gefuellt
  const da = new Set((gefuellt ?? []).map((x) => x.nr))
  const neu = [...hand].filter(([nr, de]) => !da.has(nr) && nr <= folgenzahl && !istPlatzhalter(de)).map(([nr, de]) => ({ nr, de }) as T)
  return neu.length ? [...(gefuellt ?? []), ...neu].sort((a, b) => a.nr - b.nr) : gefuellt
}
