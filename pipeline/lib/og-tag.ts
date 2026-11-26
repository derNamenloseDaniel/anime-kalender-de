/**
 * Vorschaubild des Tages: `public/og/tag-JJJJ-MM-TT.jpg` zeigt das wichtigste Release des Tages
 * (Auswahl: `shared/tages-highlight.ts`). Messenger cachen `og:image` je Adresse — der Tag im Dateinamen
 * ist die neue Adresse; `build-share-pages.ts` hängt sie nur an, wenn die Datei existiert (sonst bleibt das Markenbild).
 */
import { existsSync, readdirSync, unlinkSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Release, Title } from '../../shared/types.ts'
import { formatDate, weekdayName } from '../../shared/time.ts'
import { waehleTageshighlight, type Tageshighlight } from '../../shared/tages-highlight.ts'
import { zeichneKarte } from './og-karte.ts'

/** Tagesbilder älter als diese Tage werden gelöscht (Messenger holen ein Bild kurz nach dem Teilen). */
export const TAGESBILD_TAGE = 7
const MUSTER = /^tag-(\d{4}-\d{2}-\d{2})\.jpg$/

export const tagBildName = (heute: string): string => `tag-${heute}.jpg`

/** Bildbeschreibung zu `og:image:alt`. */
export function tagBildAlt(h: Tageshighlight, heute: string): string {
  return `Heute neu: ${h.release.name} — ${h.folge} ${h.ort}, ${weekdayName(heute, true)}, ${formatDate(heute).slice(0, 6)} · Anime-Kalender DE`
}

/** Schreibt das Tagesbild und räumt alte weg; ohne Highlight oder bei vorhandener Datei bleibt es beim Stand. */
export async function schreibeTagesbild(
  releases: Release[],
  titelVon: Map<number, Title>,
  heute: string,
  ordner: string,
  ladeCover: (url: string | undefined) => Promise<Buffer | undefined>,
  erzwingen = false,
): Promise<Tageshighlight | undefined> {
  raeumeAlteTagesbilder(ordner, heute)
  const h = waehleTageshighlight(releases, titelVon, heute)
  if (!h) return undefined
  const datei = resolve(ordner, tagBildName(heute))
  if (existsSync(datei) && !erzwingen) return h
  const badges = [{ text: 'Heute neu', color: '#ff5a36', akzent: true }]
  const datum = `${weekdayName(heute, true)}, ${formatDate(heute).slice(0, 6)}`
  await zeichneKarte({ title: h.release.name, datum, folge: h.folge, fakt: h.ort, badges }, await ladeCover(titelVon.get(h.titleId)?.coverImage), datei)
  return h
}

/** Löscht `tag-*.jpg`, die älter als `TAGESBILD_TAGE` Tage vor `heute` sind. */
export function raeumeAlteTagesbilder(ordner: string, heute: string): string[] {
  const grenze = new Date(`${heute}T12:00:00Z`).getTime() - TAGESBILD_TAGE * 86_400_000
  const weg = readdirSync(ordner).filter((n) => {
    const tag = MUSTER.exec(n)?.[1]
    return tag !== undefined && new Date(`${tag}T12:00:00Z`).getTime() < grenze
  })
  for (const n of weg) unlinkSync(resolve(ordner, n))
  return weg
}

/** Alt-Text des Tagesbilds, wenn dessen Datei im gebauten `dist` liegt und der Tag ein Highlight hat; sonst `undefined` (Markenbild bleibt). */
export function tagesbildAlt(releases: Release[], titelVon: Map<number, Title>, heute: string, distOrdner: string): string | undefined {
  if (!existsSync(resolve(distOrdner, 'og', tagBildName(heute)))) return undefined
  const h = waehleTageshighlight(releases, titelVon, heute)
  return h ? tagBildAlt(h, heute) : undefined
}

/**
 * Tauscht in der Startseite das Markenbild gegen das Tagesbild (`og:image`, `twitter:image`, `og:image:alt`).
 * Ohne Tagesbild oder ohne Treffer bleibt der Text unverändert.
 */
export function startseiteMitTagesbild(html: string, site: string, heute: string, alt: string | undefined): string {
  if (alt === undefined) return html
  const marke = `${site}og/default.jpg"`
  const neu = html.replaceAll(marke, `${site}og/${tagBildName(heute)}"`)
  return neu.replace(/(property="og:image:alt"\s+content=)"[^"]*"/, (_t, kopf: string) => `${kopf}"${alt.replace(/"/g, '&quot;')}"`)
}
