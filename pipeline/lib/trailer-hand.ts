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
