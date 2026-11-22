/**
 * Zusicherung: **nach dem Schnitt in Staffel-Titel finden Auslieferung und TOGGO ihre Quelldaten unter dem Sammeltitel** (`lesekennung`,
 * `toggoFolgenDerStaffel`, `pruefeToggoVerteilung`). Ohne das hätten Staffel 1–3 keine Handlung, keine Sprecher und keine TOGGO-Fenster, und die
 * Basis-Staffel trüge die TOGGO-Fenster aller Staffeln (Bau-Vergleich 22.11.2026). Verdrahtung am Quelltext. Läuft in `check:logic`.
 */
import { readFileSync } from 'node:fs'
import { lesekennung } from '../shared/staffel-titel.ts'
import { pruefeToggoVerteilung, toggoFolgenDerStaffel } from './lib/staffel-titel.ts'
import { fehlendes } from './bau/luecken-titel.ts'

let fehler = 0
let faelle = 0
function pruefe(name: string, ok: boolean, info = ''): void {
  faelle++
  if (ok) return
  fehler++
  console.error(`✖ ${name}${info ? ` — ${info}` : ''}`)
}

pruefe('Staffel liest unter dem Sammeltitel', lesekennung({ id: 7000002, staffelTitel: { sammel: 158871 } }) === 158871)
pruefe('Basis-Staffel liest unter der eigenen Kennung', lesekennung({ id: 158871, staffelTitel: { sammel: 158871 } }) === 158871)
pruefe('gewöhnlicher Titel liest unter der eigenen Kennung', lesekennung({ id: 20 }) === 20)

const f = (staffel: number, folge: number) => ({ staffel, folge, ab: '2026-01-01T00:00', bis: '2026-12-31T23:59' })
const folgen = [f(1, 1), f(1, 2), f(2, 1), f(3, 1), f(4, 1)]
const je = (nr: number) => toggoFolgenDerStaffel(folgen, { staffelTitel: { sammel: 158871, nr } }).map((x) => `${x.staffel}/${x.folge}`).join(',')
pruefe('TOGGO: Staffel 1 bekommt nur ihre Folgen', je(1) === '1/1,1/2', je(1))
pruefe('TOGGO: Staffel 2 bekommt nur ihre Folgen', je(2) === '2/1', je(2))
pruefe('TOGGO: Basis-Staffel (4) bekommt nur Staffel 4', je(4) === '4/1', je(4))
pruefe('TOGGO: Staffel ohne Folgen bekommt keine', je(9) === '')
pruefe('TOGGO: gewöhnlicher Titel behält alle Folgen', toggoFolgenDerStaffel(folgen, {}).length === folgen.length)

const wirft = (vorhanden: number, verteilt: number): boolean => {
  try {
    pruefeToggoVerteilung(158871, vorhanden, verteilt)
    return false
  } catch {
    return true
  }
}
pruefe('Riegel: gleiche Zahl geht durch', !wirft(5, 5))
pruefe('Riegel: verlorene Folge bricht ab', wirft(5, 4))
pruefe('Riegel: doppelt verteilte Folge bricht ab', wirft(5, 6))

const ohneMal = (ueber: object) => fehlendes({ id: 7000001, titleDe: 'T', jpYear: 2023, coverImage: 'c', ...ueber }, undefined, undefined)
pruefe('Lücken: Staffel-Titel ohne MAL-Kennung ist keine Lücke (MAL liegt an der Basis)', ohneMal({ staffelTitel: { sammel: 158871 } }) === '')
pruefe('Lücken: gewöhnlicher Titel ohne MAL-Kennung bleibt eine Lücke', ohneMal({}) === 'm')

const quelle = (datei: string): string => readFileSync(new URL(datei, import.meta.url), 'utf8')
const auslieferung = quelle('./bau/13-2-auslieferung.ts')
pruefe('13-2: Handlung, aniSearch, TMDB, Sprecher, Trailer unter der Lesekennung', ['anisearch[q]', 'tmdbTitles[q]', 'kennungen.get(q)', 'mitStimmen.has(q)', 'annKennungen[String(q)]', 'trailer[String(q)]'].every((s) => auslieferung.includes(s)))
pruefe('13-4: Synonyme und AniList-Start unter der Lesekennung', ['anisearch[lesekennung(t)]', 'jpStartAnzeige.get(lesekennung(t))'].every((s) => quelle('./bau/13-4-zusatzdateien.ts').includes(s)))
const toggo = quelle('./bau/13-1-toggo-fenster.ts')
pruefe('13-1: TOGGO nach Lesekennung, je Staffel gefiltert, mit Riegel', ['toggo[String(lesekennung(t))]', 'toggoFolgenDerStaffel(roh, t)', 'pruefeToggoVerteilung(sammel'].every((s) => toggo.includes(s)))

console.log(`check-staffel-lesekennung: ${faelle} Fälle, ${fehler} Fehler`)
process.exit(fehler ? 1 : 0)
