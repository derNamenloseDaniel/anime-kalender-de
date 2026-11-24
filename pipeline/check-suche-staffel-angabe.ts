/**
 * Die Suche mit Staffelangabe (Daniel, 24.11.2026): „The Mighty Nein’ Season 2“ fand nichts, weil „season“ und „2“ im Namen des Werks
 * fehlen (die zweite Staffel ist nur ein Termin am Werk). Feste Fixtures, kein Datenbestand.
 * Aufruf: npx tsx pipeline/check-suche-staffel-angabe.ts
 */
import { ohneStaffelAngabe, sucheMitFundstellen, sucheZweistufig } from '../web/src/lib/search.ts'

type T = { name: string }
const titel: T[] = [
  { name: 'Mighty Morphin Power Rangers' },
  { name: 'The Mighty Nein' },
  { name: 'Re:ZERO -Starting Life in Another World- Season 2' },
  { name: 'Re:ZERO -Starting Life in Another World-' },
  { name: 'Dorohedoro' },
  { name: 'Dorohedoro Season 2' },
  { name: '86 EIGHTY-SIX' },
  { name: 'Attack on Titan' },
  { name: 'Dr. Stone' },
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
pruefe('alle Wörter mitten im Namen zählen als Titeltreffer des vollen Begriffs', suche('Season 2 Dorohedoro'), ['Dorohedoro Season 2'])
pruefe('ohne Angabe genügt ein Treffer mit allen Wörtern mitten im Namen', suche('Nein Mighty Season 2'), ['The Mighty Nein'])
/* Der sichtbare Name läuft durch beide Stufen: P trägt den Treffer im sichtbaren Namen, Q in einem Synonym — P steht vorn, obwohl Q zuerst kommt. */
const paar = [
  { sicht: 'Anderer Name', namen: ['Anderer Name', 'Mighty Nein Alpha'] },
  { sicht: 'Mighty Nein Zeta', namen: ['Mighty Nein Zeta'] },
]
for (const q of ['Mighty Nein', 'Mighty Nein Season 2']) {
  const r = sucheMitFundstellen(paar, q, (t) => t.namen.map((text) => ({ art: 'titel' as const, text })), (t) => t.namen, (t) => t.sicht)
  pruefe(`sichtbarer Name zählt (${q})`, r.map((x) => x.item.sicht), ['Mighty Nein Zeta', 'Anderer Name'])
}
pruefe('Re:ZERO Season 2 bleibt die Staffel-Karte vorn', suche('Re:Zero Season 2')[0], 'Re:ZERO -Starting Life in Another World- Season 2')
pruefe('eine Zahl ohne Staffelwort bleibt Pflicht', suche('Mighty 2'), [])
pruefe('nur die Angabe: nichts zu streichen', ohneStaffelAngabe('Season 2'), undefined)
pruefe('Angabe wird gestrichen', ohneStaffelAngabe('The Mighty Nein’ Season 2'), 'the mighty nein')
pruefe('ohne Angabe: undefined', ohneStaffelAngabe('Mighty Nein'), undefined)
/* Gewolltes Verhalten: der Rückfall zeigt das Werk auch für eine Staffel, die es (noch) nicht gibt. */
pruefe('Staffel ohne Termin: Werk statt nichts (Attack on Titan Season 9)', suche('Attack on Titan Season 9'), ['Attack on Titan'])
pruefe('Staffel ohne Termin: Werk statt nichts (Dr. Stone Season 4)', suche('Dr. Stone Season 4'), ['Dr. Stone'])
/* Eine Jahreszahl ist keine Staffelnummer (Zahl höchstens zweistellig). */
pruefe('Season 2024 ist keine Staffelangabe', ohneStaffelAngabe('Mighty Nein Season 2024'), undefined)
pruefe('Season 2024 findet das Werk nicht', suche('The Mighty Nein Season 2024'), [])
pruefe('Season ohne Zahl bleibt', ohneStaffelAngabe('Mighty Nein Season'), undefined)

console.log(`${fehler ? '✖' : '✓'} Suche mit Staffelangabe: ${fehler} Fehler`)
process.exit(fehler ? 1 : 0)
