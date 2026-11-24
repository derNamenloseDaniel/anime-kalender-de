/**
 * Zusicherung: Tragen zwei Karten der Hauptserie dieselbe Beschriftung („Staffel 16" bei Pokémon: drei japanische Teile einer deutschen Staffel),
 * nennt jede den Namensabschnitt, der sie unterscheidet. Ohne Dublette bleibt alles unverändert. Regel: `reihen-doppelt.ts`.
 *
 * Aufruf: npm run check:logic (steckt darin) oder `tsx pipeline/check-reihen-doppelt.ts`
 */
import type { FranchiseMember } from '../shared/types.ts'
import { staffelStaende } from '../shared/titles.ts'
import { doppelteZusaetze, doppelteZusaetzeDerReihe, letzterAbschnitt } from '../web/src/components/detail/reihen-doppelt.ts'
import { zeilenZusatz } from '../web/src/components/detail/reihen-regeln.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const teil = (id: number, name: string, jpYear: number, staffelQuelle?: number, staffelBis?: number) =>
  ({ id, name, format: 'TV', jpYear, jpStart: `${jpYear}-01-01`, staffelQuelle, staffelBis }) as unknown as FranchiseMember
const zusaetze = (reihe: FranchiseMember[], name: string) => {
  const nummern = staffelStaende(reihe, name)
  return doppelteZusaetzeDerReihe(reihe, name, new Map(), nummern)
}

console.log('\nAbschnitt:')
pruefe('„… Staffel 2 - Episode N" → „Episode N"', letzterAbschnitt('Pokémon: Schwarz & Weiß Staffel 2 - Episode N') === 'Episode N')
pruefe('Deutscher Untertitel nach „ - "', letzterAbschnitt('Pokémon: Schwarz & Weiß - Abenteuer in Einall und darüber hinaus') === 'Abenteuer in Einall und darüber hinaus')
pruefe('Nur eine Staffelangabe sagt nichts', letzterAbschnitt('Pokémon: Schwarz & Weiß Staffel 2') === '')

console.log('\nPokémon (Staffel 16 in zwei japanischen Teilen):')
{
  const reihe = [
    teil(1, 'Pokémon', 1997, 1),
    teil(14093, 'Pokémon: Schwarz & Weiß Staffel 2', 2012, 15, 16),
    teil(17115, 'Pokémon: Schwarz & Weiß Staffel 2 - Episode N', 2013, 16),
    teil(17873, 'Pokémon: Schwarz & Weiß - Abenteuer in Einall und darüber hinaus', 2013, 16),
  ]
  const z = zusaetze(reihe, 'Pokémon')
  pruefe('Teil „Episode N" nennt seinen Abschnitt', z.get(17115) === 'Episode N', [...z])
  pruefe('Teil „Abenteuer in Einall" nennt seinen Abschnitt', z.get(17873) === 'Abenteuer in Einall und darüber hinaus', [...z])
  pruefe('Staffel 15–16 und Staffel 1 bleiben unverändert', !z.has(14093) && !z.has(1), [...z])
}

console.log('\nOhne Dublette unverändert:')
{
  const reihe = [teil(1, 'Reihe', 2000, 1), teil(2, 'Reihe Staffel 2', 2001, 2), teil(3, 'Reihe Staffel 3', 2002, 3)]
  pruefe('Keine gleiche Beschriftung, keine Zusätze', zusaetze(reihe, 'Reihe').size === 0)
  pruefe('Ohne unterschied bleibt der Zusatz wie zuvor', zeilenZusatz({ staffel: 2, eigenerName: false }, '2', 'Y 2') === '')
}

console.log('\nNichts erfinden:')
{
  const nummern = new Map([
    [1, { staffel: 3, von: 4, eigenerName: false }],
    [2, { staffel: 3, von: 4, eigenerName: false }],
  ])
  const gleich = doppelteZusaetze([{ id: 1, rest: 'X', voll: 'R - Teil' }, { id: 2, rest: 'Y', voll: 'R - Teil' }], nummern)
  pruefe('Gleiche Abschnitte unterscheiden nichts', gleich.size === 0, [...gleich])
  const fehlt = doppelteZusaetze([{ id: 1, rest: 'X', voll: 'R Staffel 3' }, { id: 2, rest: 'Y', voll: 'R - Zwei' }], nummern)
  pruefe('Fehlt einer Karte der Abschnitt, bleibt die Gruppe wie sie ist', fehlt.size === 0, [...fehlt])
}

if (verletzt) {
  console.error(`\n${verletzt} Zusicherung(en) verletzt.`)
  process.exit(1)
}
console.log('\nAlles gut.')
