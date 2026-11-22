import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import yaml from 'js-yaml'
import type { Title } from '../../shared/types.ts'
import { log, ROOT } from './util.ts'

export const STUDIO_VON_HAND_DATEI = 'data/studio-von-hand.yaml'

/** Zeile von `data/studio-von-hand.yaml`: Studios eines Titels, den AniList ohne Studio führt; `quellen` sind die Seiten, die das Studio nennen. */
export interface StudioVonHand {
  id: number
  studios: string[]
  quellen: string[]
}

/** Prüft die Struktur; jeder Fehler nennt die Zeile. Studios höchstens drei wie bei AniList, mindestens eine https-Quelle je Titel. */
export function pruefeStudioVonHand(roh: unknown): StudioVonHand[] {
  if (roh === null || roh === undefined) return []
  if (!Array.isArray(roh)) throw new Error(`${STUDIO_VON_HAND_DATEI}: keine Liste`)
  const gesehen = new Set<number>()
  return roh.map((z: Partial<StudioVonHand>, i: number) => {
    const wo = `${STUDIO_VON_HAND_DATEI}, Eintrag ${i + 1}`
    if (!Number.isInteger(z?.id)) throw new Error(`${wo}: id fehlt`)
    if (gesehen.has(z.id!)) throw new Error(`${wo}: id ${z.id} doppelt`)
    gesehen.add(z.id!)
    const namen = z.studios
    if (!Array.isArray(namen) || !namen.length || namen.length > 3 || namen.some((n) => typeof n !== 'string' || !n.trim())) throw new Error(`${wo} (id ${z.id}): studios braucht 1 bis 3 Namen`)
    const quellen = z.quellen
    if (!Array.isArray(quellen) || !quellen.length || quellen.some((q) => typeof q !== 'string' || !/^https:\/\/\S+$/.test(q))) throw new Error(`${wo} (id ${z.id}): quellen braucht mindestens eine https-Adresse`)
    return { id: z.id!, studios: namen, quellen }
  })
}

export function ladeStudioVonHand(wurzel: string = ROOT): StudioVonHand[] {
  const datei = resolve(wurzel, STUDIO_VON_HAND_DATEI)
  return existsSync(datei) ? pruefeStudioVonHand(yaml.load(readFileSync(datei, 'utf8'))) : []
}

/** Setzt die Handstudios bei Titeln ohne Studio; ein vorhandenes Studio (AniList) wird nie ersetzt. Rückgabe: Zahl der gesetzten Titel. */
export function setzeStudiosVonHand(titles: Map<number, Title>, hand: StudioVonHand[]): number {
  let gesetzt = 0
  for (const e of hand) {
    const t = titles.get(e.id)
    if (!t) {
      log(`⚠ WARNUNG ${STUDIO_VON_HAND_DATEI}: Kennung ${e.id} steht nicht im Bestand (Eintrag entfernen oder Kennung prüfen)`)
      continue
    }
    if (t.studios?.length) continue
    t.studios = [...e.studios]
    gesetzt++
  }
  return gesetzt
}
