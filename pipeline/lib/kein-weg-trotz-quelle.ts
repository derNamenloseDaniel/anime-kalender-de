import type { Release } from '../../shared/types.ts'
import { istSichererTermin } from '../bau/11-7-wege-aus-terminen.ts'
import { dubKey, type DubCheck } from './dub-confirmed.ts'

/** Arten, bei denen der Titel gar keinen Weg führt (`maengel-regeln.ts`). */
export const OHNE_WEG_ARTEN = ['kein-weg', 'erstausgabe-ohne-weg'] as const

/** Ein Titel steht ohne Weg offen, obwohl eine Quelle einen Weg nennt; `rot` bei Termin, nur Warnung beim Ja-Beleg (eine tote Adresse nimmt den Weg zu Recht). */
export interface Fund { titleId: number; platform: string; quelle: string; rot: boolean }

/** Ein kuratierter Eintrag (`data/curated/*.yaml`) in der Form, die `istSichererTermin` liest. */
export type KuratierterEintrag = Pick<Release, 'platform' | 'releaseType' | 'schedule' | 'sources'> & { anilistId?: number; slug?: string }

/**
 * Offene `kein-weg`/`erstausgabe-ohne-weg`-Titel, zu denen ein sicherer, begonnener Streaming-Termin (gebaut in `releases.json` oder kuratiert) oder ein
 * jüngster Handbeleg „deutsch“ einen Weg nennt. Ein gültiges Nein (`baueNeinGilt`) entschuldigt den Termin; Kino, Fernsehen und Disc zählen nicht
 * (`istSichererTermin`).
 */
export function keinWegTrotzQuelle(a: {
  offen: ReadonlySet<number>
  releases: Release[]
  kuratiert: { datei: string; eintraege: KuratierterEintrag[] }[]
  belege: DubCheck[]
  neinGilt: (id: number, plattform: string, ab: string) => boolean
  heute: string
}): Fund[] {
  const funde = new Map<string, Fund>()
  const termin = (id: number | undefined, r: KuratierterEintrag, quelle: string) => {
    const ab = r.schedule?.firstEpisodeDate
    if (!id || !a.offen.has(id) || !ab || ab > a.heute || !istSichererTermin(r as Release) || a.neinGilt(id, r.platform, ab)) return
    funde.set(`${id}|${r.platform}`, { titleId: id, platform: r.platform, quelle, rot: true })
  }
  for (const r of a.releases) termin(r.titleId, r, `releases.json ${r.slug}`)
  for (const { datei, eintraege } of a.kuratiert) for (const e of eintraege) termin(e.anilistId, e, `${datei} ${e.slug ?? ''}`.trim())
  for (const b of juengsteBelege(a.belege)) {
    const k = dubKey(b.anilistId, b.platform)
    if (a.offen.has(b.anilistId) && b.dub === true && b.available !== false && !funde.has(k)) funde.set(k, { titleId: b.anilistId, platform: b.platform, quelle: `dub-confirmed.yaml ${b.checkedAt}`, rot: false })
  }
  return [...funde.values()]
}

/** Je Titel und Anbieter der jüngste Handbeleg. */
function juengsteBelege(belege: DubCheck[]): DubCheck[] {
  const je = new Map<string, DubCheck>()
  for (const b of belege) {
    const k = dubKey(b.anilistId, b.platform)
    if ((b.checkedAt ?? '') >= (je.get(k)?.checkedAt ?? '')) je.set(k, b)
  }
  return [...je.values()]
}
