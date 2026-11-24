/**
 * Bestandsprüfer (24.11.2026, The Mighty Nein Staffel 2): Jede angekündigte weitere Staffel hat eine eigene Seite. Ein künftiges Release, dessen
 * erste Folge hinter der Folgenzahl seines Titels liegt, hängt sonst als bloßer Termin an der Seite der ersten Staffel (`staffelnOhneSeite`):
 * Seite, News-Meldung und Sprachhinweis stehen dann an der falschen Staffel.
 *
 * Ratsche: `BEKANNT` nennt die Fälle, die es noch gibt, mit Grund. Ein neuer Fall ist rot; ein Eintrag, der kein Fall mehr ist, ist ebenfalls
 * rot (er muss gestrichen werden, die Liste darf nur sinken).
 */
import { readFileSync } from 'node:fs'
import type { Release, Title } from '../shared/types.ts'
import { todayIso } from '../shared/time.ts'
import { abweichungVonBekannt, staffelnOhneSeite } from './lib/staffel-ohne-seite.ts'

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
const faelle = staffelnOhneSeite(titel, releases, todayIso())
const { neu, erledigt } = abweichungVonBekannt(faelle, BEKANNT)
for (const f of faelle.filter((x) => neu.includes(x.slug))) console.error(`FEHLER: ${f.titel} (${f.titleId}): Release ${f.slug} beginnt mit Folge ${f.ab} am ${f.am}, hinter der Folgenzahl des Titels, und hat keine eigene Staffel-Seite`)
for (const s of erledigt) console.error(`FEHLER: ${s} steht in BEKANNT, ist aber kein Fall mehr — Eintrag streichen`)
if (neu.length || erledigt.length) process.exit(1)
console.log(`check-staffel-ohne-seite-bestand: ok (${titel.length} Titel, ${releases.length} Releases, ${faelle.length} Staffeln ohne Seite, alle in BEKANNT)`)
