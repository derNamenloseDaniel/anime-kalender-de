import type { Release, ReleaseEvent } from './types.ts'
import { anzeigeFolge, expandEvents, type StaffelLage } from './logic.ts'
import { istAusgeblieben } from './termin-zustand.ts'
import { mediumAus } from './disc-medium.ts'

/** Der früheste künftige Termin, aus dem die Marke am Reiter folgt (Tooltip: „○ = Blu-ray Vol. 2 am 15.01.2027 (≈)“). */
export interface LageGrund {
  date: string
  episode?: number
  platform: ReleaseEvent['platform']
  sender?: string
  estimated: boolean
  /** Disc: Ausgabe („Blu-ray“) und Teil („Vol. 2“) aus dem Release. */
  disc?: string
}

export type LageMitGrund = { lage: StaffelLage; grund?: LageGrund }

/** Der früheste Termin ab `today` unter `ereignisse` (Release, Ereignis) als Grund; ein ausgebliebener zählt nicht. Ohne Termin `undefined`. */
export function fruehesterTermin(ereignisse: { r: Release; e: ReleaseEvent }[], today: string): LageGrund | undefined {
  const [erster] = ereignisse.filter(({ e }) => e.date >= today && !istAusgeblieben(e)).sort((a, b) => a.e.date.localeCompare(b.e.date))
  if (!erster) return undefined
  const { r, e } = erster
  const disc = e.platform === 'disc' ? discKurz(r) : undefined
  return { date: e.date, episode: e.episode, platform: e.platform, sender: e.sender, estimated: Boolean(e.estimated), disc }
}

const ART = /\b(Gesamtausgabe|Komplettbox|Staffelbox|Complete Box|Filmbox|Trilogie)/i
const TEIL = /\b((?:Vol\.|Box)\s*\d+)/i

/**
 * Die Disc kurz: Medium, Art und Teil („Blu-ray Vol. 2“, „DVD + BD Box 1“, „Blu-ray Gesamtausgabe“), nie die ganze Editionsangabe
 * (die nennt dieselbe Ausgabe oft zweimal). Ohne Edition zählt die übernommene Schlagzeile in `herkunft`; ohne jede Angabe „Disc“.
 */
export function discKurz(r: Pick<Release, 'name' | 'edition' | 'herkunft'>): string {
  const schlagzeile = /„([^“"]+)/.exec(r.herkunft ?? '')?.[1]
  const angabe = r.edition ?? schlagzeile ?? ''
  const art = ART.exec(angabe)?.[1]
  const teil = TEIL.exec(r.name)?.[1] ?? TEIL.exec(angabe)?.[1]
  return [mediumAus(angabe), art && art[0]!.toUpperCase() + art.slice(1), teil].filter(Boolean).join(' ') || 'Disc'
}

/**
 * Läuft eine Staffel `[von, bis]` (offen: ohne `bis`), kommt sie noch oder ruht sie? Es läuft, was schon eine deutsche Folge hat und
 * offen ist oder noch einen Termin ab heute mit belegter Folgennummer darin hat; es kommt, was keine hat, aber einen solchen Termin.
 * Dazu der Termin, der die Marke auslöst (Marke und Grund kommen aus derselben Rechnung).
 */
export function staffelLageMitGrund(von: number, bis: number | undefined, mitDeutscher: boolean, releases: Release[], today: string): LageMitGrund {
  const drin = (e: ReleaseEvent) => anzeigeFolge(e) && e.episode! >= von && (bis === undefined || e.episode! <= bis)
  const grund = fruehesterTermin(releases.flatMap((r) => expandEvents(r).filter(drin).map((e) => ({ r, e }))), today)
  if (mitDeutscher) return { lage: bis === undefined || grund ? 'laeuft' : 'ruht', grund }
  return grund ? { lage: 'kommt', grund } : { lage: 'ruht' }
}

/** Nur die Marke von `staffelLageMitGrund`. */
export function staffelLage(von: number, bis: number | undefined, mitDeutscher: boolean, releases: Release[], today: string): StaffelLage {
  return staffelLageMitGrund(von, bis, mitDeutscher, releases, today).lage
}
