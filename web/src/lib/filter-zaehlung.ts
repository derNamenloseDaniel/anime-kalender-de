import type { PlatformId, Release, ReleaseStatus, ReleaseType, Title } from '@shared/types.ts'
import { kostenloseFolgen } from '@shared/kostenlos.ts'
import { CARTOON_KEYWORD } from './filters.ts'
import type { SchnellId } from './schnellfilter.ts'
import { istDiscWeg, wegeVon } from './wege-filter.ts'

/** Wie viele Titel des Kernbestands je Chip einen passenden Weg haben (nur Plattform, Art, Status und Schnellchips). */
export interface FilterZaehlung {
  platforms: Map<PlatformId, number>
  releaseTypes: Map<ReleaseType, number>
  statuses: Map<ReleaseStatus, number>
  schnell: Partial<Record<SchnellId, number>>
}

const hoch = <K>(m: Map<K, number>, k: K) => m.set(k, (m.get(k) ?? 0) + 1)

/**
 * Zählt den Kernbestand einmal durch (je Titel ein Durchgang über seine Wege, nicht je Chip ein Filterlauf) und gibt zwischendurch
 * ab, damit das Öffnen des Filterfensters den Hauptfaden nicht blockiert (`useZeitscheibe`).
 */
export function* zaehleFilterGen(kern: Title[], releasesByTitle: Map<number, Release[]>, heute: string): Generator<void, FilterZaehlung> {
  const z: FilterZaehlung = { platforms: new Map(), releaseTypes: new Map(), statuses: new Map(), schnell: {} }
  const schnell = (id: SchnellId) => (z.schnell[id] = (z.schnell[id] ?? 0) + 1)
  let marke = performance.now()
  for (const t of kern) {
    if (performance.now() - marke > 6) {
      yield
      marke = performance.now()
    }
    const wege = wegeVon(t, releasesByTitle.get(t.id) ?? [], heute)
    /* Ein Titel zählt je Chip einmal, auch wenn mehrere Wege ihn tragen. */
    for (const p of new Set(wege.map((w) => w.plattform))) if (p) hoch(z.platforms, p as PlatformId)
    for (const a of new Set(wege.flatMap((w) => (w.art ? [w.art] : [])))) hoch(z.releaseTypes, a)
    for (const s of new Set(wege.flatMap((w) => (w.status ? [w.status] : [])))) hoch(z.statuses, s)
    if (wege.some(istDiscWeg)) schnell('disc')
    if (wege.some((w) => w.plattform === 'tv')) schnell('tv')
    if (t.keywords.includes(CARTOON_KEYWORD)) schnell('cartoon')
    if (kostenloseFolgen(t)) schnell('kostenlos')
  }
  return z
}
