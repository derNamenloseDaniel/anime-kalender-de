/**
 * Bestandsprüfer: die Staffeln von Pokémon Horizonte (`data/curated/horizonte-staffeln.yaml`) gegen die gesammelten Quellen —
 * de.wikipedia (`data/wikipedia-folgen.json`, Spalte „Folge in der Staffel“) und TOGGO (`data/toggo.json`) — und ihre Wirkung im
 * gebauten Bestand. Seit F157 (24.11.2026) ist die Serie **ein** Titel, jede Staffel ein Abschnitt: kein Titel und kein Termin im Raum der
 * Staffel-Titel (7 bis unter 8 Mio.), die Detaildatei trägt `s` und `sn` wie die Yaml, die Kopfzählung reicht bis zur letzten belegten Folge
 * (offene Staffel mit Kennzeichen), und jedes `staffelFolge` eines Termins passt zu seiner durchlaufenden Folge. Rot: eine abgeschlossene
 * Staffel zählt in einer Quelle anders, der Bestand weicht ab, oder ein Fernsehtermin ohne Staffel hätte einen eindeutigen Folgentitel
 * (`data/tv-programm.json`). `⚠ WARNUNG` (im Lauf-Log sichtbar): eine Quelle führt eine neue Staffel oder den Titel nicht; übrige
 * Fernsehtermine ohne Staffel. Liest relativ zum Arbeitsordner; Prozesstest `check-horizonte-staffeln-bestand-lauf.ts`.
 */
import { existsSync, readFileSync } from 'node:fs'
import { istStaffelTitel } from '../shared/staffel-titel.ts'
import { staffelUndFolge } from '../shared/staffel-folge.ts'
import {
  HORIZONTE_STAFFELN,
  abweichungenZurQuelle,
  folgenJeStaffelAusSt,
  hoechsteJeStaffel,
  ladeStaffelGrenzen,
  letzteFolgen,
  staffelListen,
  staffelNamen,
  type StaffelGrenzen,
} from './lib/pokemon-staffeln.ts'
import { bestandWarnzeile } from './lib/bestand-warnzeile.ts'
import type { ReleaseEvent } from '../shared/types.ts'
import type { TvSendung } from './fetch-tv-programm.ts'
import type { WikiListen } from './lib/tv-termine.ts'
import { schreibeTvStaffelFolgen } from './bau/staffel-folge-tv.ts'
import { melde } from './lib/quarantaene.ts'

type Termin = { titleId: number; platform: string; episode?: number; staffelFolge?: [number, number] }
const lies = <T>(pfad: string): T | undefined => (existsSync(pfad) ? (JSON.parse(readFileSync(pfad, 'utf8')) as T) : undefined)
const liste = <T>(roh: T[] | Record<string, T[]> | undefined, schluessel: string): T[] => (Array.isArray(roh) ? roh : (roh?.[schluessel] ?? []))
const wiki = lies<{ titel: Record<string, { folgen: { st?: number }[] }> }>('data/wikipedia-folgen.json')?.titel ?? {}
const toggo = lies<{ titel: Record<string, { folgen: { staffel: number; folge: number }[] }> }>('data/toggo.json')?.titel ?? {}
const sendungen = Object.values(lies<{ sendungen?: Record<string, TvSendung> }>('data/tv-programm.json')?.sendungen ?? {})
const zaehlung = lies<Record<string, [number, number, 1?]>>('public/data/folgen/zaehlung.json') ?? {}
const titel = liste(lies<{ id: number }[] | Record<string, { id: number }[]>>('public/data/titles.json'), 'titles')
const termine = liste(lies<Termin[] | Record<string, Termin[]>>('public/data/events.json'), 'events')

let fehler = 0
function fehlt(id: number, text: string): void {
  fehler++
  melde(id, 'horizonte-staffeln', text)
  console.error(`FEHLER: ${id}: ${text}`)
}

/** Kein Staffel-Titel mehr im Bestand (F157): weder als Titel noch als Termin. */
function keineStaffelTitel(): void {
  for (const t of titel.filter((x) => istStaffelTitel(x.id))) fehlt(t.id, 'Titel im Raum der Staffel-Titel: die Serie ist ein Titel, jede Staffel ein Abschnitt (F157)')
  for (const id of new Set(termine.filter((e) => istStaffelTitel(e.titleId)).map((e) => e.titleId))) fehlt(id, 'Termin an einem Staffel-Titel')
}

/** Wie viele der Fernsehtermine ohne Staffel der Bau eindeutig zuordnen würde (dieselbe Regel, an Kopien): mehr als null heißt, er tat es nicht. */
function zuordenbarOhneStaffel(g: StaffelGrenzen, ohne: Termin[]): number {
  const kopien = ohne.map((e) => ({ ...e })) as unknown as ReleaseEvent[]
  return schreibeTvStaffelFolgen(kopien, { grenzen: [g], sendungen, wiki: wiki as unknown as WikiListen }).mit
}

/** Detaildatei, Kopfzählung und Termine des einen Titels gegen die Yaml. */
function einTitel(g: StaffelGrenzen): void {
  const id = g.anilistId
  const s = staffelListen([g]).get(id)!
  const datei = lies<{ s?: unknown; sn?: unknown }>(`public/data/folgen/${id}.json`)
  if (!datei) return fehlt(id, `Detaildatei public/data/folgen/${id}.json fehlt`)
  if (JSON.stringify(datei.s) !== JSON.stringify(s)) fehlt(id, `Detaildatei: s ${JSON.stringify(datei.s)}, die Yaml sagt ${JSON.stringify(s)}`)
  const sn = staffelNamen([g]).get(id)
  if (JSON.stringify(datei.sn) !== JSON.stringify(sn)) fehlt(id, `Detaildatei: sn ${JSON.stringify(datei.sn)}, die Yaml sagt ${JSON.stringify(sn)}`)
  const offen = g.staffeln.at(-1)!.offen === true
  const kopf = zaehlung[id]
  const belegt = letzteFolgen([g]).get(id)!
  if ((kopf?.[0] ?? 0) < belegt) fehlt(id, `Kopfzählung ${kopf?.[0]} Folgen, belegt sind ${belegt}`)
  if (offen !== (kopf?.[2] === 1)) fehlt(id, `Kopfzählung ${offen ? 'ohne' : 'mit'} Kennzeichen „Staffel offen“, die Datei sagt ${offen ? 'offen' : 'abgeschlossen'}`)
  const eigene = termine.filter((e) => e.titleId === id)
  for (const e of eigene.filter((x) => x.staffelFolge && x.episode !== undefined)) {
    const soll = staffelUndFolge(s, e.episode!)
    if (JSON.stringify(soll) !== JSON.stringify(e.staffelFolge)) fehlt(id, `Termin Folge ${e.episode}: staffelFolge ${JSON.stringify(e.staffelFolge)}, die Grenzen sagen ${JSON.stringify(soll)}`)
  }
  const ohneListe = eigene.filter((e) => e.platform === 'tv' && !e.staffelFolge)
  const zuordenbar = zuordenbarOhneStaffel(g, ohneListe)
  if (zuordenbar) fehlt(id, `${zuordenbar} Fernsehtermine ohne staffelFolge, obwohl ihr Folgentitel eindeutig einer Staffel gehört (Verdrahtung in rolleTermineAus?)`)
  const ohne = ohneListe.length - zuordenbar
  if (ohne) console.log(bestandWarnzeile('Horizonte-Staffeln: Fernsehtermine', `ohne Staffel (${ohne} Termine, kein eindeutiger Folgentitel)`, [id]))
}

if (!titel.length || !termine.length) {
  console.error(`FEHLER: ${titel.length} Titel, ${termine.length} Termine gelesen (public/data/titles.json, events.json)`)
  process.exit(1)
}
keineStaffelTitel()
for (const g of ladeStaffelGrenzen(HORIZONTE_STAFFELN)) {
  const id = g.anilistId
  const quellen: [string, (number | undefined)[] | undefined][] = [
    ['de.wikipedia', wiki[id] && folgenJeStaffelAusSt(wiki[id].folgen)],
    ['TOGGO', toggo[id] && hoechsteJeStaffel(toggo[id].folgen)],
  ]
  for (const [name, je] of quellen) {
    if (!je) {
      console.log(bestandWarnzeile(`Horizonte-Staffeln: ${name}`, 'Titel ohne Folgenliste, Staffeln ungeprüft', [id]))
      continue
    }
    const { fehler: f, hinweise } = abweichungenZurQuelle(g, je, name)
    for (const text of f) fehlt(id, text)
    for (const text of hinweise) console.log(bestandWarnzeile(`Horizonte-Staffeln: ${text}`, 'Titel', [id]))
  }
  einTitel(g)
}
if (fehler) process.exit(1)
console.log(`check-horizonte-staffeln-bestand: ok (${titel.length} Titel, ${termine.length} Termine gelesen)`)
