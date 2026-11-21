/**
 * Regel „Offene Staffel → kein „N von N““ (Daniel, 21.11.2026: Pokémon Horizonte zeigte „137 von 137 Folgen auf Deutsch“, obwohl
 * Staffel 4 gerade mit Folge 1 anlief, und der Kalender „Neu bei RTL+“ ohne Folge). Prüft den Kopftext (`deFolgenZahlText`), das
 * Kennzeichen „Staffel offen“ aus den Staffelgrenzen und den Termin eines Stapels mit einer einzigen Folge.
 * Lehre: Eine Vollständigkeitsangabe („N von N“) braucht eine belegte Gesamtzahl; die Zahl eines Teilstapels oder einer laufenden
 * Staffel ist keine. Aufruf: npx tsx pipeline/check-folgenzahl-offen.ts (läuft in `check:logic`).
 */
import type { Release } from '../shared/types.ts'
import { expandEvents } from '../shared/logic.ts'
import { deFolgenZahlText } from '../web/src/components/detail/antwort-regeln.ts'
import { anbieterUndFolge } from '../web/src/components/kalender/Marken.tsx'
import { HORIZONTE_STAFFELN, POKEMON_STAFFELN, ladeStaffelGrenzen, offeneStaffeln } from './lib/pokemon-staffeln.ts'

let verletzt = 0
let gezaehlt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  gezaehlt++
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const T = (k: string, v?: Record<string, string | number>) => `${k}:${JSON.stringify(v)}`
const OHNE_VON = (n: number) => `detail.dubKopf:{"n":${n}}`
const MIT_VON = (raus: number, gesamt: number) => `antwort.teilweiseZahl:{"raus":${raus},"gesamt":${gesamt}}`
const rel = (schedule: Partial<Release['schedule']>, releaseType: Release['releaseType'] = 'batch'): Release =>
  ({ slug: 'p-900400', titleId: 900400, name: 'Probe', platform: 'rtlplus', releaseType, schedule: { firstEpisodeDate: '2026-11-20', ...schedule } }) as Release

/* Kopftext: der echte Horizonte-Fall und die Grenzen der Regel. */
const s4 = rel({ firstEpisodeNumber: 137, episodeCount: 1 })
pruefe('Horizonte: Staffel 4 offen → „137 Folgen auf Deutsch“ ohne „von“', deFolgenZahlText([137, 137, 1], [s4], T) === OHNE_VON(137), deFolgenZahlText([137, 137, 1], [s4], T))
pruefe('Offen schlägt auch einen Release, der bis M reicht', deFolgenZahlText([24, 24, 1], [rel({ episodeCount: 24 })], T) === OHNE_VON(24))
pruefe('Teilstapel 101–122 belegt keine 128 (Beyblade X)', deFolgenZahlText([128, 123], [rel({ firstEpisodeNumber: 101, episodeCount: 22 })], T) === OHNE_VON(123))
pruefe('Grenze: Release endet bei M − 1 → ohne „von“', deFolgenZahlText([12, 3], [rel({ episodeCount: 11 })], T) === OHNE_VON(3))
pruefe('Grenze: Release endet genau bei M → „3 von 12“', deFolgenZahlText([12, 3], [rel({ episodeCount: 12 })], T) === MIT_VON(3, 12))
pruefe('Fortsetzungsstapel 13–24 reicht bis 24 → „20 von 24“', deFolgenZahlText([24, 20], [rel({ firstEpisodeNumber: 13, episodeCount: 12 })], T) === MIT_VON(20, 24))
pruefe('Abgeschlossen und belegt: „12 von 12“ bleibt', deFolgenZahlText([12, 12], [rel({ episodeCount: 12 })], T) === MIT_VON(12, 12))
pruefe('Angenommene Zahl bis M zählt nicht', deFolgenZahlText([12, 3], [rel({ episodeCount: 12, episodeCountAssumed: true })], T) === OHNE_VON(3))

/* Kennzeichen aus den echten Staffeldateien: Horizonte offen, die Hauptserie nicht. */
const offen = offeneStaffeln(ladeStaffelGrenzen(HORIZONTE_STAFFELN, POKEMON_STAFFELN))
pruefe('offeneStaffeln: genau Horizonte (158871)', [...offen].join() === '158871', [...offen])
pruefe('offeneStaffeln: geschlossene letzte Staffel trägt kein Kennzeichen', offeneStaffeln([{ anilistId: 1, staffeln: [{ nr: 1, von: 1, bis: 3, folgen: 3 }] }]).size === 0)

/* Kalender: ein Stapel mit genau einer Folge und Nummer ist die Folge, keine Staffel. */
const [e137] = expandEvents(s4)
pruefe('Stapel mit einer Folge 137: Termin trägt Folge 137, keine Gesamtzahl', e137?.episode === 137 && e137.episodeCount === undefined, e137)
pruefe('Karte zeigt „RTL+ · Folge 137“', anbieterUndFolge(e137!, T) === 'RTL+ · kal.folge:{"n":137}', anbieterUndFolge(e137!, T))
const [ohneNr] = expandEvents(rel({ episodeCount: 1 }))
pruefe('Gegenfall ohne Folgennummer: bleibt „1 Folge“ ohne Nummer', ohneNr?.episode === undefined && ohneNr?.episodeCount === 1, ohneNr)
const [ganz] = expandEvents(rel({ firstEpisodeNumber: 13, episodeCount: 12 }))
pruefe('Gegenfall Stapel 13–24: zwölf Folgen, keine Einzelnummer', ganz?.episode === undefined && ganz?.episodeCount === 12, ganz)
const [film] = expandEvents(rel({ firstEpisodeNumber: 1, episodeCount: 1 }, 'movie'))
pruefe('Gegenfall Film mit Nummer 1: keine Folgennummer', film?.episode === undefined, film)

if (verletzt) {
  console.error(`${verletzt} von ${gezaehlt} Zusicherung(en) verletzt.`)
  process.exit(1)
}
console.log(`check-folgenzahl-offen: ${gezaehlt} Zusicherungen erfüllt (Kopftext, Kennzeichen offen, Stapel mit einer Folge)`)
