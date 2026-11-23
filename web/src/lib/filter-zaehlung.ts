import { PLATFORMS, RELEASE_TYPES, type PlatformId, type Release, type ReleaseStatus, type ReleaseType, type Title } from '@shared/types.ts'
import { kostenloseFolgen } from '@shared/kostenlos.ts'
import { CARTOON_KEYWORD, EMPTY_FILTERS, modusVon, type FilterState } from './filters.ts'
import type { SchnellId } from './schnellfilter.ts'
import { passtWege } from './wege-filter.ts'
import { groupByFranchise } from './db-gruppen.ts'
import { ordneListe } from './db-liste.ts'

/** Wie viele Titel (bei zusammengefassten Staffeln: Karten) des Kernbestands je Chip dieser einen Bedingung genügen. */
export interface FilterZaehlung {
  platforms: Map<PlatformId, number>
  releaseTypes: Map<ReleaseType, number>
  statuses: Map<ReleaseStatus, number>
  schnell: Partial<Record<SchnellId, number>>
}

const STATUS: ReleaseStatus[] = ['airing', 'tba', 'abgeschlossen', 'erschienen', 'unbekannt']

/** Ein Chip der Zählung: Fundort in `FilterZaehlung`, Schlüssel und der Titel-Test, den auch der Filter anwendet. */
interface Posten {
  gruppe: 'platforms' | 'releaseTypes' | 'statuses' | 'schnell'
  schluessel: string
  passt: (t: Title, releases: Release[], heute: string) => boolean
}

const modus = (f: FilterState) => (feld: Parameters<typeof modusVon>[1]) => modusVon(f, feld)
/** Die Weg-Chips fragen `passtWege` mit genau ihrem einen Filter — dieselbe Frage, die der Filter stellt (Zahl = Treffer nach dem Antippen). */
const wegPosten = (gruppe: Posten['gruppe'], schluessel: string, patch: Partial<FilterState>): Posten => {
  const f: FilterState = { ...EMPTY_FILTERS, ...patch }
  return { gruppe, schluessel, passt: (t, rs, heute) => passtWege(t, rs, f, heute, modus(f)) }
}

const POSTEN: Posten[] = [
  ...(Object.keys(PLATFORMS) as PlatformId[]).map((p) => wegPosten('platforms', p, { platforms: [p] })),
  ...(Object.keys(RELEASE_TYPES) as ReleaseType[]).map((a) => wegPosten('releaseTypes', a, { releaseTypes: [a] })),
  ...STATUS.map((s) => wegPosten('statuses', s, { statuses: [s] })),
  wegPosten('schnell', 'disc', { releaseTypes: ['disc'] }),
  wegPosten('schnell', 'tv', { platforms: ['tv'] }),
  { gruppe: 'schnell', schluessel: 'cartoon', passt: (t) => t.keywords.includes(CARTOON_KEYWORD) },
  { gruppe: 'schnell', schluessel: 'kostenlos', passt: (t) => !!kostenloseFolgen(t) },
]

/** So viele Karten zeigt die Liste für diese Treffer: dieselbe Rechnung wie `DatabaseView` (laufende und kommende Staffeln einer Reihe stehen einzeln, `ordneListe`). */
const kartenVon = (treffer: Title[], releasesByTitle: Map<number, Release[]>, heute: string): number =>
  ordneListe(groupByFranchise(treffer), 'relevanz', '', releasesByTitle, heute).liste.length

/**
 * Zählt den Kernbestand einmal durch und gibt zwischendurch ab, damit das Öffnen des Filterfensters den Hauptfaden nicht blockiert
 * (`useZeitscheibe`). Zusammengefasste Staffeln zählen so, wie die Liste sie zeigt (`kartenVon`): so viele Karten stehen danach da.
 */
export function* zaehleFilterGen(kern: Title[], releasesByTitle: Map<number, Release[]>, heute: string, gruppiert = false): Generator<void, FilterZaehlung> {
  const treffer = POSTEN.map(() => [] as Title[])
  let marke = performance.now()
  for (const t of kern) {
    if (performance.now() - marke > 6) {
      yield
      marke = performance.now()
    }
    const rs = releasesByTitle.get(t.id) ?? []
    POSTEN.forEach((p, i) => {
      if (p.passt(t, rs, heute)) treffer[i]!.push(t)
    })
  }
  const z: FilterZaehlung = { platforms: new Map(), releaseTypes: new Map(), statuses: new Map(), schnell: {} }
  for (const [i, p] of POSTEN.entries()) {
    if (gruppiert) yield
    const n = gruppiert ? kartenVon(treffer[i]!, releasesByTitle, heute) : new Set(treffer[i]!.map((t) => t.id)).size
    if (p.gruppe === 'schnell') z.schnell[p.schluessel as SchnellId] = n
    else (z[p.gruppe] as Map<string, number>).set(p.schluessel, n)
  }
  return z
}
