import { bereicheKurz } from '@shared/dub-grenze.ts'
import { translate } from '../../lib/i18n.tsx'
import { staffelLageMitGrund, type LageGrund, type StaffelLage } from '@shared/logic.ts'
import { staffelTeile } from '@shared/staffel-folge.ts'
import type { Release } from '@shared/types.ts'
import type { StaffelAbschnitt } from './folgen-staffeln.ts'

/** Ein Reiter (F157): die Staffel, ihre Beschriftung (nur die Nummer), ihre Lage für die Marke und, wo belegt, ihr Name. */
export interface Reiter {
  nr: number
  label: string
  lage: StaffelLage
  /** Der Termin, der die Marke auslöst (Tooltip). */
  grund?: LageGrund
  name?: string
  /** Ungekürzter Name aus `sn` für den Tooltip; die Kurzform `name` steht in der Box. */
  voll?: string
}

/**
 * Staffelnamen ohne das, was das Panel schon zeigt: den allen Namen gemeinsamen Serienteil bis „: “ und „Staffel N – “ der eigenen Nummer.
 * Der Rest ist ein wörtliches Stück des Namens aus `sn` (`data/curated/*-staffeln.yaml`); Staffeln ohne Eintrag bleiben ohne Namen.
 */
export function kurzeStaffelNamen(sn: Record<string, string> | undefined): Map<number, string> {
  const namen = Object.entries(sn ?? {})
  const erster = namen[0]?.[1] ?? ''
  const ende = erster.indexOf(': ')
  const serie = ende > 0 ? erster.slice(0, ende + 2) : ''
  const gemeinsam = namen.length > 1 && serie !== '' && namen.every(([, n]) => n.startsWith(serie) && n.length > serie.length)
  return new Map(namen.map(([nr, n]) => {
    const ohneSerie = gemeinsam ? n.slice(serie.length) : n
    const vorsatz = `Staffel ${nr} – `
    return [Number(nr), ohneSerie.startsWith(vorsatz) && ohneSerie.length > vorsatz.length ? ohneSerie.slice(vorsatz.length) : ohneSerie]
  }))
}

/** Je Staffel der Detaildatei (`s`) ein Reiter; unter zwei Staffeln keiner, dann bleibt der Folgenbereich wie er war. */
export function reiterVon(abschnitte: StaffelAbschnitt[], releases: Release[], today: string, sn?: Record<string, string>): Reiter[] {
  if (abschnitte.length < 2) return []
  const namen = kurzeStaffelNamen(sn)
  return abschnitte.map((a) => ({ nr: a.nr, label: String(a.nr), ...staffelLageMitGrund(a.von, a.offen ? undefined : a.bis, a.deutsch > 0, releases, today), name: namen.get(a.nr), voll: sn?.[String(a.nr)] }))
}

/** Ohne Wahl des Besuchers: die laufende Staffel, sonst die letzte mit deutscher Folge, sonst die erste. */
export function startReiter(reiter: Reiter[], abschnitte: StaffelAbschnitt[]): number {
  // Laufen zwei (Nachholtermin in alter Staffel), gewinnt die erste: so beginnt der Besucher dort, wo er zuerst nachholen kann.
  const laufend = reiter.findIndex((r) => r.lage === 'laeuft')
  if (laufend >= 0) return laufend
  return Math.max(0, abschnitte.findLastIndex((a) => a.deutsch > 0))
}

/** Deutsche Folgen eines Abschnitts als Bereiche in durchlaufender Zählung (dieselbe Flagge wie die Folgenzeilen). */
function deutscheBereiche(a: StaffelAbschnitt, istDeutsch: (nr: number) => boolean): [number, number][] {
  const bereiche: [number, number][] = []
  for (const [nr] of a.folgen) {
    if (!istDeutsch(nr)) continue
    const letzter = bereiche[bereiche.length - 1]
    if (letzter && letzter[1] === nr - 1) letzter[1] = nr
    else bereiche.push([nr, nr])
  }
  return bereiche
}

/** Synchro der Staffel in Staffelzählung: „alle auf Deutsch“, „Deutsch: Fg. 1–20“; ohne deutsche Folge nichts. */
function synchroText(a: StaffelAbschnitt, istDeutsch: (nr: number) => boolean): string | undefined {
  const zeile: [number, number] | [number, number, number] = a.offen ? [a.nr, a.von] : [a.nr, a.von, a.bis]
  const teil = staffelTeile([zeile], deutscheBereiche(a, istDeutsch))?.[0]
  if (!teil) return undefined
  return 'staffeln' in teil ? 'alle auf Deutsch' : `Deutsch: Fg. ${bereicheKurz(teil.folgen.map(([from, to]) => ({ from, to })))}`
}

const LAGE_TEXT: Record<StaffelLage, string | undefined> = { laeuft: 'läuft', kommt: 'kommt', ruht: undefined }

/** Kopfzeile des Abschnitts: „Folge 46–89 · 44 Folgen · alle auf Deutsch“, die offene Staffel „ab Folge 137 · läuft · Deutsch: Fg. 1“. */
export function abschnittZeile(a: StaffelAbschnitt, lage: StaffelLage, istDeutsch: (nr: number) => boolean): string {
  const umfang = a.offen ? `ab Folge ${a.von}` : `Folge ${a.von}–${a.bis} · ${translate('kal.folgen', { n: a.folgen.length })}`
  return [umfang, LAGE_TEXT[lage], synchroText(a, istDeutsch)].filter(Boolean).join(' · ')
}
