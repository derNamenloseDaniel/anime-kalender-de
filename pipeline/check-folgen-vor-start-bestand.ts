/**
 * Bestandsprüfer (26.11.2026, The Mighty Nein): Ein Titel, dessen früheste Release hinter Folge 1 beginnt (innerhalb seiner Folgenzahl), braucht
 * für die Folgen davor einen Beleg (`dubRanges`); sonst zählt der Kasten 0 erschienene Folgen (`pipeline/lib/folgen-vor-start.ts`).
 * Liest die ausgelieferten Titel (Kern und Cartoons) und `releases.json`; ein Fund trägt die Titelmarke, der Bestandsbau stellt nur ihn zurück.
 * Grenze: Erkannt wird nur ein Termin mit `firstEpisodeNumber` an einem Titel mit bekannter `episodes`-Zahl (26.11.2026: 0 Funde).
 */
import { readFileSync } from 'node:fs'
import type { Release, Title } from '../shared/types.ts'
import { todayIso } from '../shared/time.ts'
import { davorOhneBeleg } from './lib/folgen-vor-start.ts'
import { melde } from './lib/quarantaene.ts'

const lies = <T>(datei: string): T[] => JSON.parse(readFileSync(`public/data/${datei}`, 'utf8')) as T[]

const kern = lies<Title>('titles-core.json')
const releases = lies<Release>('releases.json')
const titel = [...kern, ...lies<Title>('cartoons.json').filter((c) => !kern.some((k) => k.id === c.id))]
if (!kern.length || !releases.length) {
  console.error(`FEHLER: ${kern.length} Titel, ${releases.length} Releases gelesen`)
  process.exit(1)
}
const faelle = davorOhneBeleg(titel, releases, todayIso())
for (const f of faelle) {
  console.error(`${f.titel}: Folgen ${f.fehlen.join(', ')} liegen vor dem ersten Termin ohne Beleg`)
  melde(f.titleId, 'folgen-vor-start', `Folgen ${f.fehlen[0]}–${f.fehlen[f.fehlen.length - 1]} vor dem ersten Termin ohne Beleg`)
}
if (faelle.length) process.exit(1)
console.log(`check-folgen-vor-start-bestand: ok (${titel.length} Titel, ${releases.length} Releases, 0 Titel mit unbelegten Folgen vor dem ersten Termin)`)
