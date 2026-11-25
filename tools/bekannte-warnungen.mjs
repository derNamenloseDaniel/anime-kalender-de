/**
 * Bekannte, geprüfte Warnungen mit Besitzer und Nachprüftermin (`tools/bekannte-warnungen.json`): `laeufe-aufraeumen.mjs`
 * nimmt sie ab, solange `bis` nicht vorbei ist. Ein Eintrag gilt nur für seinen Workflow und seinen Warnungstext (`muster`,
 * regulärer Ausdruck), nie für den ganzen Workflow; jede andere Warnung bleibt sichtbar.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const DATEI = fileURLToPath(new URL('./bekannte-warnungen.json', import.meta.url))
const TAG_MS = 86_400_000

export function ladeBekannte(datei = DATEI) {
  return JSON.parse(readFileSync(datei, 'utf8'))
}

/** `bis` gilt den ganzen Tag (UTC) mit. */
const abgelaufen = (eintrag, jetztMs) => jetztMs >= Date.parse(eintrag.bis) + TAG_MS

/**
 * `warnungen`: `{ workflow, notiz }`. Liefert `bekannt` (je passende Warnung ihr gültiger Eintrag) und `abgelaufen`
 * (alle Einträge nach `bis`, auch ohne passende Warnung: sie gehören entfernt oder verlängert).
 */
export function wendeBekannteAn(eintraege, warnungen, jetztMs) {
  const gueltig = eintraege.filter((e) => !abgelaufen(e, jetztMs))
  const bekannt = []
  for (const w of warnungen) {
    const eintrag = gueltig.find((e) => e.workflow === w.workflow && new RegExp(e.muster).test(w.notiz))
    if (eintrag) bekannt.push({ warnung: w, eintrag })
  }
  return { bekannt, abgelaufen: eintraege.filter((e) => abgelaufen(e, jetztMs)) }
}

export const bekanntZeile = (e) => `bekannt bis ${e.bis}: ${e.notiz} (${e.workflow})`
export const abgelaufenZeile = (e) => `abgelaufen: ${e.workflow} „${e.muster}“ (bis ${e.bis}) – entfernen oder verlängern`
