/**
 * Folgenlisten der Staffel-Titel (`staffel-titel.ts`): Gebaut wird über den Sammeltitel vor dem Schnitt, denn nur seine Wege, Releases und
 * Quellen (aniSearch, Wikipedia) decken alle Staffeln; beim Schreiben teilt `teileFolgenDatei` die Datei je Staffel.
 */
import type { Release, Title } from '../../shared/types.ts'
import { teileFolgenDatei, type FolgenDatei, type Zaehlung } from '../lib/staffel-folgen.ts'
import { writeJson } from '../lib/util.ts'
import type { StaffelSammel } from './staffel-titel.ts'

/** Titel und Releases, wie die Folgenlisten sie sehen: statt der Staffel-Titel ihr Sammeltitel vor dem Schnitt. */
export function sammelSicht(titel: Title[], releases: Release[], sammel: StaffelSammel[]): { titel: Title[]; releases: Release[] } {
  if (!sammel.length) return { titel, releases }
  const staffelIds = new Set(sammel.flatMap((s) => s.plan.staffeln.map((z) => z.kennung)))
  return {
    titel: [...titel.filter((t) => !staffelIds.has(t.id)), ...sammel.map((s) => s.titel)],
    releases: [...releases.filter((r) => !staffelIds.has(r.titleId)), ...sammel.flatMap((s) => s.releases)],
  }
}

/** Schreibt die Datei eines Titels; die eines Sammeltitels geteilt je Staffel (Riegel: keine Zeile außerhalb aller Staffeln). */
export function schreibeFolgenEintrag(
  ordner: string,
  id: number,
  datei: FolgenDatei,
  z: Zaehlung,
  sammel: StaffelSammel | undefined,
  ziel: { index: number[]; zaehlung: Record<number, Zaehlung> },
): void {
  if (!sammel) {
    ziel.zaehlung[id] = z
    writeJson(`${ordner}/${id}.json`, datei)
    ziel.index.push(id)
    return
  }
  const teil = teileFolgenDatei(datei, sammel.plan)
  if (teil.verloren) throw new Error(`Staffel-Titel ${sammel.plan.titel}: ${teil.verloren} Folgen der Liste in keiner Staffel`)
  for (const [k, d] of teil.dateien) {
    writeJson(`${ordner}/${k}.json`, d)
    ziel.index.push(k)
  }
  for (const [k, zk] of teil.zaehlung) ziel.zaehlung[k] = zk
}
