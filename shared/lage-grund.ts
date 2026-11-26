import type { Release, ReleaseEvent } from './types.ts'
import { anzeigeFolge, expandEvents, type StaffelLage } from './logic.ts'

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

/** Der früheste Termin ab `today` unter `ereignisse` (Release, Ereignis) als Grund; ohne Termin `undefined`. */
export function fruehesterTermin(ereignisse: { r: Release; e: ReleaseEvent }[], today: string): LageGrund | undefined {
  const [erster] = ereignisse.filter(({ e }) => e.date >= today).sort((a, b) => a.e.date.localeCompare(b.e.date))
  if (!erster) return undefined
  const { r, e } = erster
  const teil = /(Vol\.\s*\d+|Box\s*\d+)/i.exec(r.name)?.[1]
  const disc = e.platform === 'disc' ? [r.edition ?? 'Disc', teil].filter(Boolean).join(' ') : undefined
  return { date: e.date, episode: e.episode, platform: e.platform, sender: e.sender, estimated: Boolean(e.estimated), disc }
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
