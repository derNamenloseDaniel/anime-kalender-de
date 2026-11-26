import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import yaml from 'js-yaml'
import { ROOT } from './util.ts'
import { istBestanden, vergleiche, woerter } from '../../tools/handlung-fakten/naehe.ts'

/**
 * **Ein Satz Handlung je Titel** (`data/curated/ein-satz-handlung/teil-NN.yaml`, Daniel 23.11.2026): kurz, selbst geschrieben, mit Quellenfamilien und Prüfdatum.
 * Ausgeliefert wird nur `satz` (und `umfang: reihe` als Kennzeichen); Quellen und Datum bleiben in der Handdatei.
 */
export const HANDLUNG_SATZ_ORDNER = 'data/curated/ein-satz-handlung'
export const SATZ_MAX = 160

export interface EinSatz {
  id: number
  satz: string
  /** Quellenfamilien, aus denen die Fakten stammen (z. B. `Wikipedia`, `aniSearch`). */
  quellen: string[]
  /** Datum der Prüfung (`JJJJ-MM-TT`; YAML liest es als Date). */
  geprueftAm: string | Date
  /** `reihe`: der Satz beschreibt die Reihe, nicht diesen Titel. */
  umfang?: 'reihe'
}

export interface SatzDatei {
  datei: string
  eintraege: EinSatz[]
}

/** `.yaml`-Namen in fester Reihenfolge (readdir ist nicht überall sortiert; „erste Datei gewinnt“ bei doppelter Kennung hängt daran). */
export const teilDateien = (namen: string[]): string[] => namen.filter((f) => f.endsWith('.yaml')).sort()

/** Alle Teil-Dateien des Ordners, nach Namen sortiert; ein fehlender Ordner ist leer. */
export function ladeSaetze(ordner = resolve(ROOT, HANDLUNG_SATZ_ORDNER)): SatzDatei[] {
  if (!existsSync(ordner)) return []
  return teilDateien(readdirSync(ordner))
    .map((datei) => ({ datei, eintraege: (yaml.load(readFileSync(join(ordner, datei), 'utf8'), { schema: yaml.CORE_SCHEMA }) as EinSatz[] | null) ?? [] }))
}

const istDatum = (d: unknown): boolean => d instanceof Date ? !Number.isNaN(d.getTime()) : typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)

/** Strukturfehler über alle Teil-Dateien (Form, Länge, doppelte Kennung); leer = in Ordnung. Ohne Bestand prüfbar, läuft in `check:logic`. */
export function satzDateiFehler(dateien: SatzDatei[]): string[] {
  const fehler: string[] = []
  const gesehen = new Map<number, string>()
  for (const { datei, eintraege } of dateien) {
    for (const e of eintraege) {
      const at = `${datei} Titel ${e.id}`
      if (!Number.isInteger(e.id) || e.id <= 0) fehler.push(`${at}: id fehlt oder ist keine Titel-Kennung`)
      else if (gesehen.has(e.id)) fehler.push(`${at}: doppelt vergeben (auch in ${gesehen.get(e.id)})`)
      else gesehen.set(e.id, datei)
      if (typeof e.satz !== 'string' || !e.satz.trim()) fehler.push(`${at}: satz fehlt`)
      else if (e.satz.length > SATZ_MAX) fehler.push(`${at}: satz hat ${e.satz.length} Zeichen, höchstens ${SATZ_MAX}`)
      if (!Array.isArray(e.quellen) || !e.quellen.length || e.quellen.some((q) => typeof q !== 'string' || !q.trim())) fehler.push(`${at}: quellen braucht mindestens eine Quellenfamilie`)
      if (!istDatum(e.geprueftAm)) fehler.push(`${at}: geprueftAm fehlt oder ist kein Datum (JJJJ-MM-TT)`)
      if (e.umfang !== undefined && e.umfang !== 'reihe') fehler.push(`${at}: umfang ist nur "reihe" oder weggelassen, nicht "${String(e.umfang)}"`)
    }
  }
  return fehler
}

/** Ausgelieferte Texte eines Titels, gegen die der Satz nicht abgeschrieben sein darf. */
export type QuellTexte = (titelId: number) => { name: string; text: string }[]

/** Fehler gegen den Bestand: Titel existiert, Satz ist nicht der Titel, kein 5-Wort-Abschnitt wie in einem ausgelieferten Text des Titels. */
export function satzBestandFehler(dateien: SatzDatei[], titelVon: ReadonlyMap<number, string[]>, texteVon: QuellTexte): string[] {
  const fehler: string[] = []
  for (const { datei, eintraege } of dateien) {
    for (const e of eintraege) {
      const at = `${datei} Titel ${e.id}`
      const titel = titelVon.get(e.id)
      if (titel === undefined) { fehler.push(`${at}: Titel nicht im Bestand`); continue }
      if (titel.some((t) => woerter(e.satz).join(' ') === woerter(t).join(' '))) fehler.push(`${at}: satz ist nur der Titel`)
      for (const z of texteVon(e.id).map((q) => vergleiche(e.satz, q)).filter((z) => !istBestanden([z]))) {
        fehler.push(`${at}: ${z.laengste} Wörter gleich mit ${z.quelle}: „${z.folge}“`)
      }
    }
  }
  return fehler
}
