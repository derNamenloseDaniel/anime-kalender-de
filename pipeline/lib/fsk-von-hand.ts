import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import yaml from 'js-yaml'
import type { Fsk, Title } from '../../shared/types.ts'
import { ROOT, log, warn } from './util.ts'

const FSK_STUFEN = [0, 6, 12, 16, 18]
const ARTEN = ['fsk-datenbank', 'disc']

/** Eine Zeile aus `data/fsk-von-hand.yaml`: offizielle Freigabe eines Titels, belegt durch FSK-Datenbank oder die deutsche Disc. */
export interface FskVonHand {
  anilistId: number
  titel: string
  fsk: Fsk
  art: 'fsk-datenbank' | 'disc'
  sources: string[]
  beleg: string
}

export function ladeFskVonHand(): FskVonHand[] {
  const pfad = resolve(ROOT, 'data/fsk-von-hand.yaml')
  return existsSync(pfad) ? ((yaml.load(readFileSync(pfad, 'utf8')) as FskVonHand[] | null) ?? []) : []
}

/** Formfehler der Handliste für `data:validate`: jede Zeile braucht Kennung, gültige Stufe, Art, https-Quelle und Belegtext. */
export function fskVonHandFehler(zeilen: FskVonHand[]): string[] {
  const fehler: string[] = []
  const gesehen = new Set<number>()
  for (const z of zeilen) {
    const at = `fsk-von-hand.yaml "${z?.titel ?? z?.anilistId}"`
    if (!Number.isInteger(z?.anilistId)) fehler.push(`${at}: anilistId fehlt`)
    else if (gesehen.has(z.anilistId)) fehler.push(`${at}: anilistId ${z.anilistId} doppelt`)
    else gesehen.add(z.anilistId)
    if (!FSK_STUFEN.includes(z?.fsk)) fehler.push(`${at}: ungültige FSK "${z?.fsk}"`)
    if (!ARTEN.includes(z?.art)) fehler.push(`${at}: art ist ${ARTEN.join(' oder ')}, nicht "${z?.art}"`)
    if (!z?.sources?.length || z.sources.some((q) => !/^https:\/\//.test(q))) fehler.push(`${at}: sources braucht https-Adressen`)
    if (!z?.beleg?.trim()) fehler.push(`${at}: beleg fehlt`)
  }
  return fehler
}

/**
 * Setzt die von Hand belegte Freigabe an Titeln ohne FSK, vor JustWatch und Franchise (Handbeleg vor Ableitung).
 * Trägt der Titel schon eine andere Freigabe (TMDB, Disc-Termin), bleibt sie und der Widerspruch steht im Log.
 */
export function uebernehmeFskVonHand(titles: Map<number, Title>, zeilen: FskVonHand[] = ladeFskVonHand()): void {
  let gesetzt = 0
  const ohneTitel: number[] = []
  for (const z of zeilen) {
    const t = titles.get(z.anilistId)
    if (!t) ohneTitel.push(z.anilistId)
    else if (t.fsk === undefined) {
      t.fsk = z.fsk
      gesetzt++
    } else if (t.fsk !== z.fsk) warn(`FSK von Hand: ${z.anilistId} trägt schon FSK ${t.fsk}, Handbeleg sagt ${z.fsk} (Freigabe bleibt)`)
  }
  log(`FSK von Hand: ${gesetzt} von ${zeilen.length} Zeilen gesetzt${ohneTitel.length ? `, ohne Titel im Bestand: ${ohneTitel.join(', ')}` : ''}`)
}
