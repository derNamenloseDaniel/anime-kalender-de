/**
 * **TMDBs Anbieterliste eines Films, die nur die Kopie der Liste seines Namensvetters ist** (22.11.2026, Stargazer 120892).
 *
 * TMDB führt zu „Grisaia: Phantom Trigger THE ANIMATION – Stargazer“ (779019, 2020) dieselben acht Anbieter wie zu „Grisaia Phantom Trigger“
 * (601980, 2019, Titel 99470). JustWatch kennt unter 779019 nichts (`ohneTreffer`, einziger Namenstreffer ist 99470 mit `gleicherName: false`).
 * Aus der Kopie wurden MagentaTV/Videoload mit angenommenem Deutsch und der Titel kam in die Quarantäne. Eine Liste gilt als Kopie,
 * wenn JustWatch den Titel verfehlt, der Namenstreffer ein anderer Bestandstitel ist und beide Listen dieselben Anbieter nennen
 * (Kauf-Duplikate des Nachbarn ausgenommen). Eine bloße Teilmenge genügt nicht: ein Film darf einzelne Anbieter seiner Serie führen.
 */
import { log, readJson } from './util.ts'

export interface JwBefundKopf {
  ohneTreffer?: boolean
  jwId?: string
  angebote?: { anbieter: string; art?: string }[]
  namenTreffer?: { jwId: string; gleicherName?: boolean }
}

/** Gleicher Anbieter unter wechselnder Schreibweise; Videoload und MagentaTV sind derselbe Telekom-Katalog. */
const kern = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]/g, '').replace('videoload', 'magentatv')

const anbieterMenge = (namen: string[]): string => [...new Set(namen.map(kern))].sort().join('|')

/** Kennungen (Schlüssel von `tmdb-titles.json`), deren `offers` die Kopie der Liste eines anderen JustWatch-Eintrags im Bestand sind. */
export function titelMitKopierterAnbieterliste(
  jw: Record<string, JwBefundKopf>,
  tmdbTitles: Record<string, { offers?: { name: string }[] }>,
): Set<string> {
  const nachJwId = new Map<string, JwBefundKopf[]>()
  for (const e of Object.values(jw)) if (e.jwId && !e.ohneTreffer) nachJwId.set(e.jwId, [...(nachJwId.get(e.jwId) ?? []), e])
  const kopien = new Set<string>()
  for (const [id, e] of Object.entries(jw)) {
    const offers = tmdbTitles[id]?.offers
    if (!e.ohneTreffer || !e.namenTreffer || e.namenTreffer.gleicherName || !offers?.length) continue
    const eigene = anbieterMenge(offers.map((o) => o.name))
    const gleicheListe = (nachbar: JwBefundKopf) =>
      anbieterMenge((nachbar.angebote ?? []).filter((a) => a.art !== 'BUY').map((a) => a.anbieter)) === eigene
    if ((nachJwId.get(e.namenTreffer.jwId) ?? []).some(gleicheListe)) kopien.add(id)
  }
  return kopien
}

/** Nimmt den Kopien ihre Anbieterliste (an Ort und Stelle); Handlung, FSK und Kennung bleiben. Gibt die Kennungen zurück. */
export function verwirfKopierteAnbieter<T extends { offers?: { name: string }[]; providers?: unknown; justwatchUrl?: unknown }>(
  tmdbTitles: Record<string, T>,
  jw: Record<string, JwBefundKopf> = readJson('data/justwatch-audio.json', {}),
): Set<string> {
  const kopien = titelMitKopierterAnbieterliste(jw, tmdbTitles)
  for (const id of kopien) {
    delete tmdbTitles[id]!.offers
    delete tmdbTitles[id]!.providers
    delete tmdbTitles[id]!.justwatchUrl
  }
  if (kopien.size) log(`${kopien.size} TMDB-Anbieterlisten verworfen: Kopie der Liste eines Namensvetters (${[...kopien].join(', ')})`)
  return kopien
}
