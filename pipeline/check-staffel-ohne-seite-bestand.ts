/**
 * Bestandsprüfer (24.11.2026, The Mighty Nein Staffel 2): Jede angekündigte weitere Staffel hat eine eigene Seite. Ein künftiges Release, dessen
 * erste Folge hinter der Folgenzahl seines Titels liegt, hängt sonst als bloßer Termin an der Seite der ersten Staffel (`staffelnOhneSeite`):
 * Seite, News-Meldung und Sprachhinweis stehen dann an der falschen Staffel.
 *
 * Grenze: Erkannt wird nur ein Release mit `schedule.firstEpisodeNumber` an einem Titel mit bekannter `episodes`-Zahl; eine weitere Staffel
 * ohne Folgennummer bleibt unsichtbar (24.11.2026: 0 Fälle).
 *
 * Ratsche: `BEKANNT` nennt die Fälle, die es noch gibt, mit Grund. Ein neuer Fall ist rot; ein Eintrag, der kein Fall mehr ist, ist ebenfalls
 * rot (er muss gestrichen werden, die Liste darf nur sinken).
 */
import { readFileSync } from 'node:fs'
import type { Release, Title } from '../shared/types.ts'
import { todayIso } from '../shared/time.ts'
import { abweichungVonBekannt, bestandUrteil, staffelnOhneSeite } from './lib/staffel-ohne-seite.ts'
import { melde } from './lib/quarantaene.ts'
import { ladeStaffelGrenzen } from './lib/pokemon-staffeln.ts'

/** Release-Slug → Grund. Cartoons kommen aus `cartoons.json`, der Staffel-Schnitt (`pipeline/bau/staffel-titel.ts`) sieht nur die Titel-Map der Anime. */
const BEKANNT: ReadonlyMap<string, string> = new Map([
  ['the-mighty-nein-s2-primevideo', 'Cartoon (TMDB -219080): Staffel-Schnitt für Cartoons fehlt, Staffel 2 hängt an der Seite von Staffel 1 (Auftrag offen, 24.11.2026)'],
])

const lies = <T>(datei: string, schluessel: string): T[] => {
  const roh = JSON.parse(readFileSync(`public/data/${datei}`, 'utf8')) as T[] | Record<string, T[]>
  return Array.isArray(roh) ? roh : (roh[schluessel] ?? [])
}

const titel = lies<Title>('titles-core.json', 'titles')
const releases = lies<Release>('releases.json', 'releases')
if (!titel.length || !releases.length) {
  console.error(`FEHLER: ${titel.length} Titel, ${releases.length} Releases gelesen`)
  process.exit(1)
}
const faelle = staffelnOhneSeite(titel, releases, todayIso(), new Set(ladeStaffelGrenzen().map((g) => g.anilistId)))
const { rot, meldungen } = bestandUrteil(faelle, BEKANNT)
for (const m of meldungen) console.error(m)
// Titelmarke: der Bestandsbau stellt nur die betroffenen Titel zurück statt den ganzen Bau zu sperren.
const { neu } = abweichungVonBekannt(faelle, BEKANNT)
for (const f of faelle.filter((f) => neu.includes(f.slug))) melde(f.titleId, 'staffel-ohne-seite', `Release ${f.slug} ohne eigene Staffel-Seite`)
if (rot) process.exit(1)
console.log(`check-staffel-ohne-seite-bestand: ok (${titel.length} Titel, ${releases.length} Releases, ${faelle.length} Staffeln ohne Seite, alle in BEKANNT)`)
