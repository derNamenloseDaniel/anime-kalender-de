/**
 * Bestandsprüfer: die Staffeln von Pokémon Horizonte (`data/curated/horizonte-staffeln.yaml`) gegen die gesammelten Quellen —
 * de.wikipedia (`data/wikipedia-folgen.json`, Spalte „Folge in der Staffel“) und TOGGO (`data/toggo.json`) — und ihre Wirkung im
 * gebauten Bestand (je Staffel eigene Detaildatei und Kopfzählung unter ihrer Kennung, die offene Staffel mit Kennzeichen). Rot: eine abgeschlossene Staffel zählt in einer
 * Quelle anders, Detaildatei oder Kopf passen nicht. `⚠ WARNUNG` (im Lauf-Log sichtbar): eine Quelle führt eine neue Staffel oder den
 * Titel nicht. Liest relativ zum Arbeitsordner; Prozesstest `check-horizonte-staffeln-bestand-lauf.ts`.
 */
import { existsSync, readFileSync } from 'node:fs'
import { HORIZONTE_STAFFELN, abweichungenZurQuelle, folgenJeStaffelAusSt, hoechsteJeStaffel, ladeStaffelGrenzen, letzteFolgen, type StaffelGrenzen } from './lib/pokemon-staffeln.ts'
import { bestandWarnzeile } from './lib/bestand-warnzeile.ts'
import { melde } from './lib/quarantaene.ts'

const lies = <T>(pfad: string): T | undefined => (existsSync(pfad) ? (JSON.parse(readFileSync(pfad, 'utf8')) as T) : undefined)
const wiki = lies<{ titel: Record<string, { folgen: { st?: number }[] }> }>('data/wikipedia-folgen.json')?.titel ?? {}
const toggo = lies<{ titel: Record<string, { folgen: { staffel: number; folge: number }[] }> }>('data/toggo.json')?.titel ?? {}
const zaehlung = lies<Record<string, [number, number, 1?]>>('public/data/folgen/zaehlung.json') ?? {}

let fehler = 0
function fehlt(id: number, text: string): void {
  fehler++
  melde(id, 'horizonte-staffeln', text)
  console.error(`FEHLER: ${id}: ${text}`)
}

/**
 * Die Yaml teilt den Titel (`basis`, Phase Staffel-Titel): je Staffel eigene Detaildatei (außer der offenen Basis-Staffel, die noch keine Folgenliste führt) und
 * Kopfzählung unter der Kennung der Staffel; die offene Staffel trägt das Kennzeichen „Staffel offen“.
 */
function geteilt(g: StaffelGrenzen): void {
  for (const s of g.staffeln) {
    const kennung = s.kennung ?? g.anilistId
    const offen = s.offen === true
    if (!offen && !lies(`public/data/folgen/${kennung}.json`)) fehlt(kennung, `Detaildatei public/data/folgen/${kennung}.json fehlt`)
    const belegt = offen ? letzteFolgen([g]).get(g.anilistId)! - s.von + 1 : s.bis! - s.von + 1
    const kopf = zaehlung[kennung]
    if ((kopf?.[0] ?? 0) < belegt) fehlt(kennung, `Kopfzählung ${kopf?.[0]} Folgen, belegt sind ${belegt}`)
    if (offen !== (kopf?.[2] === 1)) fehlt(kennung, `Kopfzählung ${offen ? 'ohne' : 'mit'} Kennzeichen „Staffel offen“, die Datei sagt ${offen ? 'offen' : 'abgeschlossen'}`)
  }
}

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
  geteilt(g)
}
if (fehler) process.exit(1)
console.log('check-horizonte-staffeln-bestand: ok')
