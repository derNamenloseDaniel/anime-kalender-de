/** Handgepflegte Trailer (`data/curated/trailer-hand.yaml`): gehen im Bau vor dem Lauf-Ergebnis `data/trailer.json`. */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import yaml from 'js-yaml'
import { ROOT } from './util.ts'

export interface HandTrailer {
  video: string
  titel: string
  sprache: 'de' | 'en' | 'ja'
}

/** Gesperrte YouTube-Kennungen (`data/curated/trailer-sperre.yaml`): Videos, die kein Trailer sind und die keine Regel erkennt. */
export function ladeTrailerSperre(): Set<string> {
  const pfad = resolve(ROOT, 'data/curated/trailer-sperre.yaml')
  if (!existsSync(pfad)) return new Set()
  const roh = yaml.load(readFileSync(pfad, 'utf8'), { json: false }) as { sperre?: { video?: string; grund?: string }[] } | null
  const aus = new Set<string>()
  for (const e of roh?.sperre ?? []) {
    if (!/^[\w-]{11}$/.test(e.video ?? '') || !e.grund) throw new Error(`trailer-sperre.yaml: Eintrag unvollständig oder ungültig: ${JSON.stringify(e)}`)
    aus.add(e.video!)
  }
  return aus
}

/** Ohne Datei leer; eine kaputte Zeile wirft, statt den Trailer still zu verlieren. */
export function ladeTrailerHand(): Record<string, HandTrailer> {
  const pfad = resolve(ROOT, 'data/curated/trailer-hand.yaml')
  if (!existsSync(pfad)) return {}
  const roh = yaml.load(readFileSync(pfad, 'utf8'), { json: false }) as { trailer?: (Partial<HandTrailer> & { id?: number; beleg?: string })[] } | null
  const aus: Record<string, HandTrailer> = {}
  for (const e of roh?.trailer ?? []) {
    if (!e.id || !/^[\w-]{11}$/.test(e.video ?? '') || !e.titel || !['de', 'en', 'ja'].includes(e.sprache ?? '') || !e.beleg)
      throw new Error(`trailer-hand.yaml: Eintrag unvollständig oder ungültig: ${JSON.stringify(e)}`)
    aus[String(e.id)] = { video: e.video!, titel: e.titel, sprache: e.sprache! }
  }
  return aus
}
