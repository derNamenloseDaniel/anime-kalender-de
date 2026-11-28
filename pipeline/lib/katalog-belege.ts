import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import yaml from 'js-yaml'
import { ROOT } from './util.ts'
import { schreibeKatalogRelease, type KatalogBelege } from '../../shared/katalog-release.ts'
import type { Beobachtung, Beobachtungen } from '../../shared/vermutung-beleg.ts'
import type { Release, ReleaseEvent } from '../../shared/types.ts'

/**
 * **Belege für den Katalog-Release von Hand** (`data/katalog-release-von-hand.yaml`, 13.10.2026): Ohne Eintrag gilt ein Release,
 * dessen Folgen alle an einem Tag liegen, nur als abgeleitet („Vermutlich alle 13 Folgen auf einmal“).
 *  - `komplett`: die Quelle schreibt „Episoden: N (komplett)“ zum Starttag;
 *  - `beobachtet`: alle Folgen waren am selben Tag im Abruf zu sehen, nicht nur als Katalog-Stempel; mit `gesehenAm` und `bisFolge`
 *    (Tag der Messung, höchste Folge) entscheidet `urteilKatalog`: am Starttag oder davor mit der letzten Folge → belegt, später → ≈;
 *  - `teil`: nur ein Teil der Staffel („12 von 24“) — kein Katalog-Release.
 */
export const KATALOG_BELEGE_VON_HAND = 'data/katalog-release-von-hand.yaml'

/** Höchstzahl Wörter im Zitat der Quelle: ein Beleg, kein Abschnitt. */
export const KATALOG_ZITAT_MAX_WOERTER = 15

const ARTEN = ['komplett', 'beobachtet', 'teil']

export interface KatalogBelegEintrag {
  slug: string
  art: string
  url: string
  zitat: string
  /** Nur `beobachtet`: Tag der Messung (Europe/Berlin) und höchste dabei sichtbare Folge; beide oder keins. */
  gesehenAm?: string
  bisFolge?: number
}

export function ladeKatalogBelegEintraege(pfad = resolve(ROOT, KATALOG_BELEGE_VON_HAND)): KatalogBelegEintrag[] {
  if (!existsSync(pfad)) return []
  return (yaml.load(readFileSync(pfad, 'utf8')) as KatalogBelegEintrag[] | null) ?? []
}

/** Strukturfehler je Eintrag, lesbar; leer = in Ordnung. */
export function katalogBelegFehler(eintraege: KatalogBelegEintrag[]): string[] {
  const fehler: string[] = []
  const gesehen = new Set<string>()
  for (const e of eintraege) {
    const at = `Katalog-Release von Hand ${e.slug ?? '?'}`
    if (!e.slug?.trim()) fehler.push(`${at}: Kennung fehlt`)
    if (gesehen.has(e.slug)) fehler.push(`${at}: doppelt`)
    gesehen.add(e.slug)
    if (!ARTEN.includes(e.art)) fehler.push(`${at}: Art ist ${ARTEN.join(', ')}`)
    if (!/^https:\/\//.test(e.url ?? '')) fehler.push(`${at}: Quelle braucht eine https-Adresse`)
    const woerter = (e.zitat ?? '').trim().split(/\s+/).filter(Boolean).length
    if (!woerter) fehler.push(`${at}: Zitat fehlt`)
    else if (woerter >= KATALOG_ZITAT_MAX_WOERTER) fehler.push(`${at}: Zitat hat ${woerter} Wörter, erlaubt sind unter ${KATALOG_ZITAT_MAX_WOERTER}`)
    if ((e.gesehenAm === undefined) !== (e.bisFolge === undefined)) fehler.push(`${at}: gesehenAm und bisFolge stehen zusammen`)
    else if (e.gesehenAm !== undefined && (e.art !== 'beobachtet' || !/^\d{4}-\d{2}-\d{2}$/.test(e.gesehenAm) || !Number.isInteger(e.bisFolge))) fehler.push(`${at}: gesehenAm (JJJJ-MM-TT) und bisFolge gibt es nur bei „beobachtet“`)
    if (e.art === 'komplett' && !/\(komplett\)/.test(e.zitat ?? '')) fehler.push(`${at}: „komplett“ braucht ein Zitat mit „(komplett)“`)
  }
  return fehler
}

/**
 * Gegen `releases.json`: eine Kennung ohne Release wirkt nirgends (tot); eine Quelle, die nicht in den `sources` ihres Releases steht,
 * belegt dort nichts. `beobachtet` hat als Quelle den Abruf, keine Terminaussage, und braucht keinen Eintrag in `sources`.
 */
export function katalogBelegBestandFehler(eintraege: KatalogBelegEintrag[], releases: Pick<Release, 'slug' | 'sources'>[]): string[] {
  const nachKennung = new Map(releases.map((r) => [r.slug, r]))
  const fehler: string[] = []
  for (const e of eintraege) {
    const at = `Katalog-Release von Hand ${e.slug}`
    const r = nachKennung.get(e.slug)
    if (!r) fehler.push(`${at}: kein Release dieser Kennung in releases.json`)
    else if (e.art !== 'beobachtet' && !r.sources.includes(e.url)) fehler.push(`${at}: Quelle fehlt in den sources des Releases (${e.url}); der Artikel kann aus dem Abruf gefallen sein, dann ist ein kuratierter Termin (data/curated) der Weg`)
  }
  return fehler
}

/** Kennung → Urteil: `belegt` (komplett, beobachtet ohne Tag) oder `teil`; eine Beobachtung mit Tag urteilt `katalogBeobachtungen`. */
export function katalogBelege(eintraege: KatalogBelegEintrag[]): KatalogBelege {
  return new Map(eintraege.filter((e) => e.gesehenAm === undefined).map((e) => [e.slug, e.art === 'teil' ? 'teil' : 'belegt']))
}

/** Kennung → Beobachtungen mit Tag und letzter Folge; sie lösen das ≈ nur ab, wenn `urteilKatalog` es sagt. */
export function katalogBeobachtungen(eintraege: KatalogBelegEintrag[]): Beobachtungen {
  const karte = new Map<string, Beobachtung[]>()
  for (const e of eintraege) if (e.gesehenAm !== undefined) karte.set(e.slug, [...(karte.get(e.slug) ?? []), { am: e.gesehenAm, folge: e.bisFolge! }])
  return karte
}

/** `katalog` an die Termine schreiben, mit den Belegen der Handdatei; ein Strukturfehler dort bricht den Bau ab. */
export function schreibeKatalogReleaseVonHand(events: ReleaseEvent[], releases: Release[]): number {
  const eintraege = ladeKatalogBelegEintraege()
  const fehler = katalogBelegFehler(eintraege)
  if (fehler.length) throw new Error(`${KATALOG_BELEGE_VON_HAND}:\n${fehler.join('\n')}`)
  return schreibeKatalogRelease(events, releases, katalogBelege(eintraege), katalogBeobachtungen(eintraege))
}
