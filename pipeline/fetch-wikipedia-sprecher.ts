/**
 * **Deutsche Sprecher aus de.wikipedia** für die Seiten der Handliste `data/wikipedia-sprecher-seiten.yaml`
 * (26.11.2026). Abruf über `/wiki/<Seite>?action=raw` (robots.txt sperrt `/w/` und damit `api.php`), eigener
 * User-Agent, 2 s Abstand, je Seite höchstens einmal je Woche (`FRISCH_TAGE`).
 *
 * Ergebnis: `data/wikipedia-sprecher.json` — je Seite die Zeilen der Sprechertabelle aus dem Abschnitt
 * „Synchron…“. Welche Titel sie bekommen, entscheidet der Bau (`pipeline/bau/sprecher-wikipedia.ts`).
 * Lizenz: CC BY-SA 4.0; die Quelle steht an der Sprecherliste des Titels.
 *
 * Aufruf: npm run data:wikipedia-sprecher
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import yaml from 'js-yaml'
import { todayIso } from '../shared/time.ts'
import { recordSource } from './lib/health.ts'
import { log, readJson, ROOT, sleep, warn, writeText } from './lib/util.ts'
import { alsText, sammle, type SprecherDatei } from './lib/wikipedia-sprecher-sammeln.ts'
import { wikipediaAdresse } from './lib/wikipedia-sprecher-seite.ts'

const UA = 'anime-kalender-de/1.0 (https://anime-kalender.de; ein Abruf je Seite und Woche)'
export const ZIEL = 'data/wikipedia-sprecher.json'
export const HANDLISTE = 'data/wikipedia-sprecher-seiten.yaml'

export async function main(abruf = async (seite: string) => {
  const r = await fetch(`${wikipediaAdresse(seite)}?action=raw`, { headers: { 'User-Agent': UA }, redirect: 'manual' })
  return { status: r.status, text: await r.text() }
}, pause = () => sleep(2000)): Promise<void> {
  const liste = yaml.load(readFileSync(join(ROOT, HANDLISTE), 'utf8')) as { seite: string }[]
  const alt = readJson<SprecherDatei>(ZIEL, { seiten: {} })
  const { datei, abrufe, stoerungen, verworfen } = await sammle(liste.map((e) => e.seite), alt, abruf, todayIso(), pause)
  writeText(ZIEL, alsText(datei))
  for (const s of stoerungen) warn(`Wikipedia-Sprecher ${s}`)
  for (const v of verworfen) warn(`Wikipedia-Sprecher verworfen: ${v}`)
  const mitTabelle = Object.values(datei.seiten).filter((s) => s.zeilen.length).length
  // Gearbeitet hat nur ein gelungener Abruf: ein Lauf, in dem jeder Abruf scheitert, ist nicht grün.
  recordSource('wikipedia-sprecher', mitTabelle, stoerungen.length ? `${stoerungen.length} von ${abrufe} Abrufen gestört` : undefined, abrufe - stoerungen.length, abrufe === 0)
  log(`Wikipedia-Sprecher: ${liste.length} Seiten in der Handliste, ${abrufe} abgerufen, ${stoerungen.length} gestört, ${verworfen.length} Stimmen verworfen (Platzhalter oder gleich Rolle), ${mitTabelle} mit deutscher Tabelle → ${ZIEL}`)
}

if (import.meta.url === pathToFileURL(process.argv[1]!).href) await main()
