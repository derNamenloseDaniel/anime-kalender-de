import { bereicheKurz } from '@shared/dub-grenze.ts'
import { staffelLage, type StaffelLage } from '@shared/logic.ts'
import { staffelTeile } from '@shared/staffel-folge.ts'
import type { Release } from '@shared/types.ts'
import type { StaffelAbschnitt } from './folgen-staffeln.ts'

/** Ein Reiter (F157): die Staffel, ihre Beschriftung (nur die Nummer) und ihre Lage für die Marke. */
export interface Reiter {
  nr: number
  label: string
  lage: StaffelLage
}

/** Je Staffel der Detaildatei (`s`) ein Reiter; unter zwei Staffeln keiner, dann bleibt der Folgenbereich wie er war. */
export function reiterVon(abschnitte: StaffelAbschnitt[], releases: Release[], today: string): Reiter[] {
  if (abschnitte.length < 2) return []
  return abschnitte.map((a) => ({ nr: a.nr, label: String(a.nr), lage: staffelLage(a.von, a.offen ? undefined : a.bis, a.deutsch > 0, releases, today) }))
}

/** Ohne Wahl des Besuchers: die laufende Staffel, sonst die letzte mit deutscher Folge, sonst die erste. */
export function startReiter(reiter: Reiter[], abschnitte: StaffelAbschnitt[]): number {
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
  const umfang = a.offen ? `ab Folge ${a.von}` : `Folge ${a.von}–${a.bis} · ${a.folgen.length} Folgen`
  return [umfang, LAGE_TEXT[lage], synchroText(a, istDeutsch)].filter(Boolean).join(' · ')
}
