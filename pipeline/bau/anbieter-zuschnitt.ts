import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import yaml from 'js-yaml'
import type { FranchiseMember } from '../../shared/franchise-typ.ts'
import type { Title } from '../../shared/types.ts'
import { markiereZuschnitt, type ZuschnittEintrag } from '../lib/anbieter-zuschnitt.ts'
import type { StaffelListen } from '../lib/netflix-staffeln.ts'
import { ROOT, log, readJson, warn } from '../lib/util.ts'

export const ZUSCHNITT_DATEI = 'data/anbieter-zuschnitt.yaml'

/** Die Handeinträge; ohne Netflix-Adresse, Staffel, Glieder, Quelle oder Datum bricht der Bau ab, fehlt die Datei, gibt es keine. */
export function ladeZuschnitt(datei = resolve(ROOT, ZUSCHNITT_DATEI)): ZuschnittEintrag[] {
  const liste = existsSync(datei) ? ((yaml.load(readFileSync(datei, 'utf8')) as ZuschnittEintrag[] | null) ?? []) : []
  const kaputt = liste.find(
    (e) => !/netflix\.com\/title\/\d+$/.test(e.url ?? '') || !Number.isInteger(e.staffel) || !Array.isArray(e.glieder) || !e.glieder.every(Number.isInteger) || !e.quelle || !/^\d{4}-\d{2}-\d{2}$/.test(typeof e.datum === 'string' ? e.datum : ''),
  )
  if (kaputt) throw new Error(`${ZUSCHNITT_DATEI}: Eintrag ohne Netflix-Adresse, Staffel, Glieder, Quelle oder Datum (${JSON.stringify(kaputt)})`)
  return liste
}

/**
 * Setzt `FranchiseMember.anbieterStaffel` aus `data/anbieter-zuschnitt.yaml`. Ein Eintrag, der gegen Netflix' Staffelliste nicht
 * aufgeht (Folgenzahl, Position, Reihennummer), setzt nichts und steht als Warnung im Protokoll; die Zahl steht immer darin.
 */
export function markiereAnbieterStaffeln(reihen: Record<number, FranchiseMember[]>, titles: Iterable<Title>): Record<number, FranchiseMember[]> {
  const eintraege = ladeZuschnitt()
  const { gesetzt, abweichungen } = markiereZuschnitt(reihen, eintraege, readJson<StaffelListen>('data/anbieter-staffeln.json', {}), [...titles])
  for (const a of abweichungen) warn(`${ZUSCHNITT_DATEI}: ${a.url} Staffel ${a.staffel} ohne Zuschnitt — ${a.grund}`)
  log(`Anbieter-Zuschnitt: ${gesetzt} von ${eintraege.length} Einträgen gesetzt, ${abweichungen.length} Abweichungen`)
  return reihen
}
