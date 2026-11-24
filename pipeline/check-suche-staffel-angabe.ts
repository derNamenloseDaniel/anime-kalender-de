/**
 * Die Suche mit Staffelangabe (Daniel, 24.11.2026): „The Mighty Nein’ Season 2“ fand nichts, weil „season“ und „2“ im Namen des Werks
 * fehlen (die zweite Staffel ist nur ein Termin am Werk). Feste Fixtures, kein Datenbestand.
 * Aufruf: npx tsx pipeline/check-suche-staffel-angabe.ts
 */
import { ohneStaffelAngabe, sucheZweistufig } from '../web/src/lib/search.ts'

type T = { name: string }
const titel: T[] = [
  { name: 'Mighty Morphin Power Rangers' },
  { name: 'The Mighty Nein' },
  { name: 'Re:ZERO -Starting Life in Another World- Season 2' },
  { name: 'Re:ZERO -Starting Life in Another World-' },
  { name: 'Dorohedoro Season 2' },
  { name: '86 EIGHTY-SIX' },
]
const suche = (q: string): string[] => sucheZweistufig(titel, q, (t) => [t.name], (t) => [t.name]).map((t) => t.name)

let fehler = 0
function pruefe(name: string, ist: unknown, soll: unknown): void {
  const gut = JSON.stringify(ist) === JSON.stringify(soll)
  if (!gut) fehler++
  console.log(`${gut ? '✓' : '✖'} ${name}${gut ? '' : ` — ist ${JSON.stringify(ist)}, soll ${JSON.stringify(soll)}`}`)
}

pruefe('Season 2 mit typografischem Apostroph', suche('The Mighty Nein’ Season 2'), ['The Mighty Nein'])
pruefe('Season 2', suche('The Mighty Nein Season 2'), ['The Mighty Nein'])
pruefe('Staffel 2 deutsch', suche('Mighty Nein Staffel 2'), ['The Mighty Nein'])
pruefe('2. Staffel vorangestellt', suche('2. Staffel Mighty Nein'), ['The Mighty Nein'])
pruefe('2nd Season', suche('Mighty Nein 2nd Season'), ['The Mighty Nein'])
pruefe('nur das Werk', suche('The Mighty Nein’'), ['The Mighty Nein'])
pruefe('trägt ein Name die Angabe, gewinnt er', suche('Dorohedoro Season 2'), ['Dorohedoro Season 2'])
pruefe('Re:ZERO Season 2 bleibt die Staffel-Karte vorn', suche('Re:Zero Season 2')[0], 'Re:ZERO -Starting Life in Another World- Season 2')
pruefe('eine Zahl ohne Staffelwort bleibt Pflicht', suche('Mighty 2'), [])
pruefe('nur die Angabe: nichts zu streichen', ohneStaffelAngabe('Season 2'), undefined)
pruefe('Angabe wird gestrichen', ohneStaffelAngabe('The Mighty Nein’ Season 2'), 'the mighty nein')
pruefe('ohne Angabe: undefined', ohneStaffelAngabe('Mighty Nein'), undefined)
pruefe('Season ohne Zahl bleibt', ohneStaffelAngabe('Mighty Nein Season'), undefined)

console.log(`${fehler ? '✖' : '✓'} Suche mit Staffelangabe: ${fehler} Fehler`)
process.exit(fehler ? 1 : 0)
