/**
 * Vorschaubild des Tages: `public/og/tag-JJJJ-MM-TT-<slug>.jpg` zeigt das wichtigste Release des Tages
 * (Auswahl: `shared/tages-highlight.ts`). Messenger cachen `og:image` je Adresse — Tag und Slug im Dateinamen
 * sind die Adresse; Bild und Alt-Text kommen so immer vom selben Sieger. `build-share-pages.ts` hängt sie nur
 * an, wenn die Datei existiert (sonst bleibt das Markenbild).
 */
import { existsSync, readdirSync, unlinkSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Release, Title } from '../../shared/types.ts'
import { formatDate, weekdayName } from '../../shared/time.ts'
import { waehleTageshighlight, type Tageshighlight } from '../../shared/tages-highlight.ts'
import { zeichneKarte, type KartenDaten } from './og-karte.ts'

/** Tagesbilder älter als diese Tage werden gelöscht (Messenger holen ein Bild kurz nach dem Teilen). */
export const TAGESBILD_TAGE = 7
const MUSTER = /^tag-(\d{4}-\d{2}-\d{2})-.+\.jpg$/

export const tagBildName = (heute: string, slug: string): string => `tag-${heute}-${slug}.jpg`

/** Bildbeschreibung zu `og:image:alt`. */
export function tagBildAlt(h: Tageshighlight, heute: string): string {
  return `Heute neu: ${h.release.name} — ${h.folge} ${h.ort}, ${weekdayName(heute, true)}, ${formatDate(heute).slice(0, 6)} · Anime-Kalender DE`
}

/** Schreibt das Tagesbild des Siegers, räumt alte und Bilder anderer Sieger desselben Tags weg; vorhandene Datei bleibt. */
export async function schreibeTagesbild(
  releases: Release[],
  titelVon: Map<number, Title>,
  heute: string,
  ordner: string,
  ladeCover: (url: string | undefined) => Promise<Buffer | undefined>,
  erzwingen = false,
): Promise<Tageshighlight | undefined> {
  const h = waehleTageshighlight(releases, titelVon, heute)
  raeumeAlteTagesbilder(ordner, heute, h && tagBildName(heute, h.release.slug))
  if (!h) return undefined
  const datei = resolve(ordner, tagBildName(heute, h.release.slug))
  if (existsSync(datei) && !erzwingen) return h
  await zeichneKarte(tagesKarte(h, heute), await ladeCover(titelVon.get(h.titleId)?.coverImage), datei)
  return h
}

/** Der Karteninhalt des Tagesbilds. */
export function tagesKarte(h: Tageshighlight, heute: string): KartenDaten {
  const datum = `${weekdayName(heute, true)}, ${formatDate(heute).slice(0, 6)}`
  return { title: h.release.name, datum, folge: h.folge, fakt: h.ort, badges: [{ text: 'Heute neu', color: '#ff5a36', akzent: true }] }
}

/** Der Tagesbild-Schritt des Bestandsbaus: ein Fehler beim Zeichnen wird gemeldet, das Markenbild bleibt, der Bau läuft weiter. */
export async function baueTagesbild(
  releases: Release[],
  titelVon: Map<number, Title>,
  heute: string,
  ordner: string,
  ladeCover: (url: string | undefined) => Promise<Buffer | undefined>,
  erzwingen: boolean,
  melde: { log: (t: string) => void; warn: (t: string) => void },
): Promise<void> {
  const von = Date.now()
  try {
    const h = await schreibeTagesbild(releases, titelVon, heute, ordner, ladeCover, erzwingen)
    melde.log(h ? `Tagesbild ${heute}: ${h.release.name} (${h.folge} ${h.ort}, ${Date.now() - von} ms)` : `Tagesbild ${heute}: kein belegtes Release, Markenbild bleibt`)
  } catch (err) {
    melde.warn(`Tagesbild ${heute} nicht erzeugt, Markenbild bleibt: ${(err as Error).message}`)
  }
}

/** Löscht `tag-*.jpg`, die älter als `TAGESBILD_TAGE` Tage vor `heute` sind, und Bilder von `heute` mit anderem Namen als `behalte`. */
export function raeumeAlteTagesbilder(ordner: string, heute: string, behalte?: string): string[] {
  const grenze = new Date(`${heute}T12:00:00Z`).getTime() - TAGESBILD_TAGE * 86_400_000
  const weg = readdirSync(ordner).filter((n) => {
    const tag = MUSTER.exec(n)?.[1]
    if (tag === undefined) return false
    return new Date(`${tag}T12:00:00Z`).getTime() < grenze || (tag === heute && n !== behalte)
  })
  for (const n of weg) unlinkSync(resolve(ordner, n))
  return weg
}

/** Name und Alt-Text des Tagesbilds, wenn dessen Datei im gebauten `dist` liegt und der Tag ein Highlight hat; sonst `undefined` (Markenbild bleibt). */
export function tagesbildAlt(releases: Release[], titelVon: Map<number, Title>, heute: string, distOrdner: string): { name: string; alt: string } | undefined {
  const h = waehleTageshighlight(releases, titelVon, heute)
  if (!h) return undefined
  const name = tagBildName(heute, h.release.slug)
  return existsSync(resolve(distOrdner, 'og', name)) ? { name, alt: tagBildAlt(h, heute) } : undefined
}

/**
 * Tauscht in der Startseite das Markenbild gegen das Tagesbild (`og:image`, `twitter:image`, `og:image:alt`).
 * Ohne Tagesbild oder ohne Treffer bleibt der Text unverändert.
 */
export function startseiteMitTagesbild(html: string, site: string, bild: { name: string; alt: string } | undefined): string {
  if (!bild) return html
  const marke = `${site}og/default.jpg"`
  const neu = html.replaceAll(marke, `${site}og/${bild.name}"`)
  return neu.replace(/(property="og:image:alt"\s+content=)"[^"]*"/, (_t, kopf: string) => `${kopf}"${bild.alt.replace(/"/g, '&quot;')}"`)
}

/** Die Startseiten-Vorlage des Tages: mit Tagesbild, wenn dessen Datei im `dist` liegt. */
export function startseiteFuerTag(vorlage: string, site: string, releases: Release[], titelVon: Map<number, Title>, heute: string, distOrdner: string): string {
  return startseiteMitTagesbild(vorlage, site, tagesbildAlt(releases, titelVon, heute, distOrdner))
}
