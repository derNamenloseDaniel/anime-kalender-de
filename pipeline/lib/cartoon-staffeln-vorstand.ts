import type { Title } from '../../shared/types.ts'
import { readJson } from './util.ts'
import { abgaengeOhneGrund, leseVorstandJson } from './vorstand-abgang.ts'

/** Ein Stand der Cartoons: Ausgabe (`cartoons.json`) und die Staffel-Prüfliste, die der Bau dazu schreibt (`bau/cartoon-staffeln.ts`). */
export interface CartoonStand {
  cartoons: Title[]
  liste: { titleId: number }[]
}

const CARTOONS = 'public/data/cartoons.json'
const gelistet = (s: CartoonStand): string[] => s.liste.map((p) => String(p.titleId))
const mit = (s: CartoonStand, bedingung: (t: Title) => boolean): string[] => s.cartoons.filter(bedingung).map((t) => String(t.id))
const hatStaffeln = (t: Title): boolean => (t.staffeln?.length ?? 0) > 0
/** Verteilt wird nur über mindestens zwei Staffeln (`bau/cartoon-wege.ts`). */
const verteilbar = (t: Title): boolean => (t.staffeln?.length ?? 0) >= 2
const verteilt = (t: Title): boolean => t.streams.some((s) => s.teilBereich)

/** Cartoons, die im Vorstand Staffeln hatten oder auf der Prüfliste standen und jetzt keins von beiden, obwohl es den Titel noch gibt. */
export function staffelnAbgaenge(vorher: CartoonStand, jetzt: CartoonStand): string[] {
  const da = new Set(jetzt.cartoons.map((t) => String(t.id)))
  const gefuehrt = (s: CartoonStand) => [...gelistet(s), ...mit(s, hatStaffeln)]
  return abgaengeOhneGrund(gefuehrt(vorher), new Set(gefuehrt(jetzt)), (k) => !da.has(k))
}

/**
 * Cartoons, deren Wege im Vorstand je Staffel verteilt waren oder die auf der Prüfliste standen und jetzt keins von beiden, obwohl
 * der Titel noch mindestens zwei Staffeln führt (sonst gibt es nichts zu verteilen; den Staffel-Verlust selbst meldet `staffelnAbgaenge`).
 */
export function wegeAbgaenge(vorher: CartoonStand, jetzt: CartoonStand): string[] {
  const moeglich = new Set(mit(jetzt, verteilbar))
  const gefuehrt = (s: CartoonStand) => [...gelistet(s), ...mit(s, verteilt)]
  return abgaengeOhneGrund(gefuehrt(vorher), new Set(gefuehrt(jetzt)), (k) => !moeglich.has(k))
}

/** Die Wache am echten Bestand: Fehlerzeilen gegen den Vorstand `ref`; ein nicht lesbarer Vorstand ist selbst ein Fehler. */
export function cartoonsGegenVorstand(art: 'staffeln' | 'wege', liste: string, ref: string): string[] {
  let vorher: CartoonStand
  try {
    vorher = { cartoons: leseVorstandJson<Title[]>(CARTOONS, ref) ?? [], liste: leseVorstandJson<{ titleId: number }[]>(liste, ref) ?? [] }
  } catch (e) {
    return [`Vorstand ${ref} nicht lesbar: ${(e as Error).message.split('\n')[0]}`]
  }
  const jetzt = { cartoons: readJson<Title[]>(CARTOONS, []), liste: readJson<{ titleId: number }[]>(liste, []) }
  const weg = art === 'staffeln' ? staffelnAbgaenge(vorher, jetzt) : wegeAbgaenge(vorher, jetzt)
  const was = art === 'staffeln' ? 'Staffeln' : 'verteilte Wege'
  return weg.length ? [`${weg.length} Cartoon(s) hatten im Vorstand ${ref} ${was} oder einen Prüflisten-Eintrag und jetzt keins von beiden: ${weg.slice(0, 10).join(', ')}`] : []
}
