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

const SEGMENT_TRENNER = ' · '

/**
 * Ein Eintrag nimmt ein Segment nur ab, wenn sein `muster` das ganze Segment trifft (vorn und hinten verankert):
 * der Warnungstext besteht aus Segmenten (` · `, `bestand-bauen.yml`), ein loses Muster verschluckte fremde Segmente davor.
 */
const trifft = (eintrag, segment) => new RegExp(`^(?:${eintrag.muster})$`).test(segment)

/**
 * `warnungen`: `{ workflow, notiz }`. `bekannt` (mit den Einträgen je Segment) nur, wenn JEDES Segment der Notiz bekannt ist;
 * sonst bleibt die ganze Warnung sichtbar, `unbekannt` nennt die Reste. `abgelaufen`: alle Einträge nach `bis`, auch ohne
 * passende Warnung (entfernen oder verlängern).
 */
export function wendeBekannteAn(eintraege, warnungen, jetztMs) {
  const gueltig = eintraege.filter((e) => !abgelaufen(e, jetztMs))
  const bekannt = []
  const unbekannt = []
  for (const w of warnungen) {
    const segmente = w.notiz.split(SEGMENT_TRENNER)
    const treffer = segmente.map((s) => gueltig.find((e) => e.workflow === w.workflow && trifft(e, s)))
    if (treffer.every(Boolean)) bekannt.push({ warnung: w, eintraege: [...new Set(treffer)] })
    else unbekannt.push({ warnung: w, rest: segmente.filter((_, i) => !treffer[i]) })
  }
  return { bekannt, unbekannt, abgelaufen: eintraege.filter((e) => abgelaufen(e, jetztMs)) }
}

export const bekanntZeile = (e) => `bekannt bis ${e.bis}: ${e.notiz} (${e.workflow})`
export const abgelaufenZeile = (e) => `abgelaufen: ${e.workflow} „${e.muster}“ (bis ${e.bis}) – entfernen oder verlängern`

/**
 * Nimmt vollständig bekannte Warnungen ab (`senden(laufId, notiz)` = POST an den Worker), zeigt alle anderen samt unbekanntem
 * Rest weiter (`verlaufsZeile`) und meldet abgelaufene Einträge. Ohne `lauf_id`, `--trocken` oder Token wird nichts gesendet.
 * Gesendet wird nur bei vollständig bekannter Warnung: der Verlaufseintrag verliert so nie einen fremden Warnungsteil.
 */
export async function nimmBekannteAb({ eintraege, warnungen, jetztMs, trocken, token, senden, zeigeWarnung, log }) {
  const { bekannt, unbekannt, abgelaufen } = wendeBekannteAn(eintraege, warnungen, jetztMs)
  for (const { warnung, rest } of unbekannt) log(zeigeWarnung(warnung, rest.join(SEGMENT_TRENNER)))
  for (const { warnung, eintraege: treffer } of bekannt) {
    const zusatz = trocken
      ? ' (trocken, nicht abgenommen)'
      : !token
        ? ' (LAUF_TOKEN fehlt, nicht abgenommen)'
        : warnung.laufId == null
          ? ' (ohne lauf_id, nicht abgenommen)'
          : ''
    log(treffer.map(bekanntZeile).join(SEGMENT_TRENNER) + zusatz)
    if (!zusatz) await senden(warnung.laufId, treffer.map((e) => `bekannt bis ${e.bis}: ${e.notiz}`).join(SEGMENT_TRENNER))
  }
  for (const e of abgelaufen) log(abgelaufenZeile(e))
}
