/**
 * Die Label-Kanäle des Trailerlaufs: Liste (`data/curated/trailer-label-kanaele.yaml`) und ihre Auflösung zur
 * Uploads-Playlist per YouTube-API. Kennungen kommen nur aus einer Antwort der API, nie aus dem Gedächtnis:
 * über ein Beispielvideo (1 Einheit) oder die Kanalsuche (100 Einheiten) mit genau gleichem Kanalnamen.
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import yaml from 'js-yaml'
import { ROOT } from './util.ts'
import { tageSeit } from './tmdb-ablauf.ts'

export interface LabelKanal {
  /** Kanalname wörtlich wie bei YouTube. */
  name: string
  /** Ein Video dieses Kanals: löst die Kennung für 1 statt 100 Einheiten auf. */
  beispielVideo?: string
}

/** Stand je Kanalname: aufgelöste Uploads-Playlist oder der Tag eines Fehlversuchs (Wiederholung nach 30 Tagen). */
export type KanalStand = Record<string, { uploads?: string; versuchAm: string }>

export const FEHLVERSUCH_TAGE = 30

export function ladeLabelKanaele(): LabelKanal[] {
  const pfad = resolve(ROOT, 'data/curated/trailer-label-kanaele.yaml')
  if (!existsSync(pfad)) return []
  const roh = yaml.load(readFileSync(pfad, 'utf8')) as { kanaele?: LabelKanal[] } | null
  return roh?.kanaele ?? []
}

/** Antwort der API, `null` bei 404 und `AUSFALL` bei Netz-/HTTP-Fehler — ein Ausfall ist keine Auskunft und wird nicht gestempelt. */
export const AUSFALL = 'ausfall'
type HoleJson = (url: string) => Promise<unknown>
type Antwort = { items?: { id?: string | { channelId?: string }; snippet?: { channelId?: string; channelTitle?: string; title?: string } }[] } | null

const gleich = (a: string | undefined, b: string): boolean => (a ?? '').trim().toLowerCase() === b.trim().toLowerCase()

/** YouTube bildet die Uploads-Playlist, indem es das zweite Zeichen der Kanalkennung von `C` auf `U` setzt. */
export const uploadsVon = (kanalId: string): string => `UU${kanalId.slice(2)}`

async function kennungVon(k: LabelKanal, schluessel: string, holeJson: HoleJson): Promise<string | undefined | typeof AUSFALL> {
  const basis = 'https://www.googleapis.com/youtube/v3'
  if (k.beispielVideo) {
    const roh = await holeJson(`${basis}/videos?part=snippet&id=${k.beispielVideo}&key=${schluessel}`)
    if (roh === AUSFALL) return AUSFALL
    const s = (roh as Antwort)?.items?.[0]?.snippet
    return gleich(s?.channelTitle, k.name) ? s?.channelId : undefined
  }
  const roh = await holeJson(`${basis}/search?part=snippet&type=channel&maxResults=5&q=${encodeURIComponent(k.name)}&key=${schluessel}`)
  if (roh === AUSFALL) return AUSFALL
  const treffer = ((roh as Antwort)?.items ?? []).filter((i) => gleich(i.snippet?.channelTitle ?? i.snippet?.title, k.name))
  const id = treffer[0] && (typeof treffer[0].id === 'object' ? treffer[0].id.channelId : treffer[0].snippet?.channelId)
  return treffer.length === 1 ? id : undefined
}

/**
 * Löst die noch unbekannten Kanäle auf. Ein Kanal ohne eindeutigen Treffer (Name stimmt nicht, mehrere gleiche)
 * bekommt einen Fehlversuch-Stempel und steht in `nichtGefunden`; er wird erst nach 30 Tagen wieder gesucht,
 * damit kein Lauf 100 Einheiten je Fehlschlag verbraucht.
 */
export async function loeseKanaeleAuf(
  kanaele: LabelKanal[],
  stand: KanalStand,
  heute: string,
  schluessel: string,
  holeJson: HoleJson,
): Promise<{ playlists: { name: string; uploads: string }[]; nichtGefunden: string[]; ausgefallen: string[]; geaendert: boolean }> {
  const jetzt = new Date(heute)
  const nichtGefunden: string[] = []
  const ausgefallen: string[] = []
  let geaendert = false
  for (const k of kanaele) {
    const bekannt = stand[k.name]
    const sperre = bekannt && !bekannt.uploads && (tageSeit(bekannt.versuchAm, jetzt) ?? FEHLVERSUCH_TAGE) < FEHLVERSUCH_TAGE
    if (bekannt?.uploads || sperre) continue
    const id = await kennungVon(k, schluessel, holeJson)
    if (id === AUSFALL) {
      ausgefallen.push(k.name)
      continue
    }
    stand[k.name] = id ? { uploads: uploadsVon(id), versuchAm: heute } : { versuchAm: heute }
    geaendert = true
  }
  const playlists: { name: string; uploads: string }[] = []
  for (const k of kanaele) {
    const uploads = stand[k.name]?.uploads
    if (uploads) playlists.push({ name: k.name, uploads })
    else if (!ausgefallen.includes(k.name)) nichtGefunden.push(k.name)
  }
  return { playlists, nichtGefunden, ausgefallen, geaendert }
}
