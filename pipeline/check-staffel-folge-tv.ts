/**
 * Zusicherung (F157, 24.11.2026): **Fernsehtermine bekommen `staffelFolge` nur über den eindeutigen Folgentitel** (`pipeline/bau/staffel-folge-tv.ts`).
 * Kulisse mit drei Staffeln und drei Sendungen; dazu am echten Stand (`data/wikipedia-folgen.json`, `data/tv-programm.json`, Horizonte-Yaml):
 * jede gesehene Horizonte-Sendung mit Wikipedia-Treffer bekommt Staffel und Folge, die zu ihrer Position in der Liste passt. Läuft in `check:logic`.
 */
import { readFileSync } from 'node:fs'
import type { ReleaseEvent } from '../shared/types.ts'
import type { TvSendung } from './fetch-tv-programm.ts'
import { ladeTvStaffelEingaben, schreibeTvStaffelFolgen } from './bau/staffel-folge-tv.ts'
import type { StaffelGrenzen } from './lib/pokemon-staffeln.ts'
import type { WikiListen } from './lib/tv-termine.ts'

let faelle = 0
let fehler = 0
function pruefe(name: string, ok: boolean, ...info: unknown[]): void {
  faelle++
  if (ok) return
  fehler++
  console.log(`✖ ${name}`, ...info.map((x) => JSON.stringify(x)))
}

const ID = 900571
const grenzen: StaffelGrenzen[] = [{ anilistId: ID, staffeln: [{ nr: 1, von: 1, bis: 2, folgen: 2 }, { nr: 2, von: 3, bis: 4, folgen: 2 }, { nr: 3, von: 5, offen: true }]}]
const wiki: WikiListen = {
  [ID]: { seite: 'x', folgen: [{ nr: 1, st: 1, dt: 'Anfang' }, { nr: 2, st: 2, dt: 'Mitte' }, { nr: 3, st: 1, dt: 'Neuer Kurs' }, { nr: 4, st: 2, dt: 'Doppelt' }, { nr: 5, st: 1, dt: 'Doppelt' }] } as never,
}
const sendung = (start: string, folge: string, titleId = ID): TvSendung => ({ titleId, titel: 'T', folge, sender: 'Super RTL', start: `${start}:00+01:00`, ende: `${start}:30+01:00`, gesehenAm: start.slice(0, 10) }) as TvSendung
const sendungen = [sendung('2026-11-02T16:00', 'Neuer Kurs'), sendung('2026-11-03T16:00', 'Doppelt'), sendung('2026-11-04T16:00', 'Anfang'), sendung('2026-11-05T16:00', 'Mitte')]
const ev = (date: string, o: Partial<ReleaseEvent> = {}): ReleaseEvent =>
  ({ id: `r@${date}`, releaseSlug: 'r', titleId: ID, date, time: '16:00', platform: 'tv', sender: 'Super RTL', releaseType: 'weekly', name: 'T', ...o }) as ReleaseEvent

const events = [
  ev('2026-11-02', { episode: 3 }), // Treffer Staffel 2 Folge 1 = 3
  ev('2026-11-03', { episode: 4 }), // Folgentitel doppelt: kein Treffer
  ev('2026-11-04', { episode: 2 }), // Treffer Staffel 1 Folge 1, Nummer 2 widerspricht
  ev('2026-11-05'), // Treffer ohne Nummer: Staffel 1 Folge 2
  ev('2026-11-06', { episode: 1 }), // keine Sendung an diesem Platz
  ev('2026-11-02', { episode: 3, titleId: 900572 }), // fremder Titel
  ev('2026-11-02', { episode: 3, platform: 'crunchyroll' }), // kein Fernsehen
]
const z = schreibeTvStaffelFolgen(events, { grenzen, sendungen, wiki })
const sf = events.map((e) => (e.staffelFolge ? e.staffelFolge.join('/') : '-')).join(' ')
pruefe('Treffer mit passender Nummer, ohne Nummer; doppelt, Widerspruch, ohne Sendung, fremd und Nicht-TV ohne Staffel', sf === '2/1 - - 1/2 - - -', sf)
pruefe('Zählung: 2 mit, 2 ohne Treffer, 1 Widerspruch', JSON.stringify(z) === '{"mit":2,"ohneTreffer":2,"widerspruch":1}', z)
pruefe('episode bleibt durchlaufend (wird nicht umgeschrieben)', events[0]!.episode === 3 && events[2]!.episode === 2 && events[3]!.episode === undefined)

/*
  Am echten Stand: jede Sendung von Horizonte wird ein Termin; wer Staffel und Folge bekommt, liegt an seiner Stelle der Wikipedia-Liste
  (Yaml-Grenzen). Ohne Treffer ist hier kein Fehler (ein Sammler-PR bringt neue Sendungen), das zählt der Bau als Warnung.
*/
const lies = <T>(datei: string): T => JSON.parse(readFileSync(new URL(`../${datei}`, import.meta.url), 'utf8')) as T
const echt = {
  grenzen: ladeTvStaffelEingaben().grenzen,
  sendungen: Object.values(lies<{ sendungen: Record<string, TvSendung> }>('data/tv-programm.json').sendungen),
  wiki: lies<{ titel: WikiListen }>('data/wikipedia-folgen.json').titel,
}
const h = echt.grenzen.find((g) => g.anilistId === 158871)
const liste = echt.wiki['158871']?.folgen ?? []
const termine = echt.sendungen
  .filter((s) => s.titleId === 158871)
  .map((s, i) => ev(s.start.slice(0, 10), { id: `e${i}`, titleId: 158871, time: s.start.slice(11, 16), sender: s.sender }))
const ze = schreibeTvStaffelFolgen(termine, echt)
pruefe('echter Stand: Sendungen und Treffer gelesen', termine.length > 0 && ze.mit > 0, termine.length, ze)
let falsch = 0
for (const t of termine.filter((x) => x.staffelFolge)) {
  const [nr, folge] = t.staffelFolge!
  const s = h?.staffeln.find((x) => x.nr === nr)
  const w = s ? liste[s.von - 2 + folge] : undefined
  if (!w || w.st !== folge) falsch++
}
pruefe('echter Stand: jede Staffel/Folge liegt an ihrer Stelle der Wikipedia-Liste (Zählung „Folge in der Staffel“)', falsch === 0, falsch)

console.log(`check-staffel-folge-tv: ${faelle} Fälle, ${fehler} Fehler (echter Stand: ${ze.mit} von ${termine.length} Sendungen mit Staffel)`)
process.exit(fehler ? 1 : 0)
