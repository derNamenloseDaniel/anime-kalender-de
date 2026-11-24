/**
 * Zusicherung: Tragen zwei Karten der Hauptserie dieselbe Beschriftung („Staffel 16" bei Pokémon: drei japanische Teile einer deutschen Staffel),
 * nennt jede den Namensabschnitt, der sie unterscheidet. Ohne Dublette bleibt alles unverändert. Regel: `reihen-doppelt.ts`.
 *
 * Aufruf: npm run check:logic (steckt darin) oder `tsx pipeline/check-reihen-doppelt.ts`
 */
import type { FranchiseMember } from '../shared/types.ts'
import { staffelStaende } from '../shared/titles.ts'
import { doppelteZusaetze, doppelteZusaetzeDerReihe, istPlatzhalter, letzterAbschnitt, ueberlappendeZusaetze, type FolgenText } from '../web/src/components/detail/reihen-doppelt.ts'
import { zeilenZusatz } from '../web/src/components/detail/reihen-regeln.ts'
import { geteilteInGrenzen } from './lib/pokemon-staffeln.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const teil = (id: number, name: string, jpYear: number, staffelQuelle?: number, staffelBis?: number) =>
  ({ id, name, format: 'TV', jpYear, jpStart: `${jpYear}-01-01`, staffelQuelle, staffelBis }) as unknown as FranchiseMember
const text: FolgenText = (staffel, von, bis, mitStaffel) => `${mitStaffel ? `S${staffel} ` : ''}Folge ${von}–${bis}`
const zusaetze = (reihe: FranchiseMember[], name: string) => {
  const nummern = staffelStaende(reihe, name)
  return doppelteZusaetzeDerReihe(reihe, name, new Map(), nummern, text)
}

console.log('\nAbschnitt:')
pruefe('„… Staffel 2 - Episode N" ist ein Platzhalter und sagt nichts', letzterAbschnitt('Pokémon: Schwarz & Weiß Staffel 2 - Episode N') === '')
pruefe('Platzhalter: „Episode 7", „Die Serie", „The Series"', istPlatzhalter('Episode 7') && istPlatzhalter('Die Serie') && istPlatzhalter('The Series'))
pruefe('Ein echter Untertitel ist kein Platzhalter', !istPlatzhalter('Abenteuer in Einall und darüber hinaus'))
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
  pruefe('Teil „Episode N" ist ein Platzhalter: ohne Folgenbereich kein Zusatz, nichts erfunden', !z.has(17115) && !z.has(17873), [...z])
  pruefe('Staffel 15–16 und Staffel 1 bleiben unverändert', !z.has(14093) && !z.has(1), [...z])
}

console.log('\nPokémon (überlappende Bereiche, Staffel 15 und 25):')
{
  const mitFolgen = (m: FranchiseMember, staffelFolgen: [number, number, number][]) => ({ ...m, staffelFolgen }) as FranchiseMember
  const reihe = [
    teil(1, 'Pokémon', 1997, 1),
    mitFolgen(teil(9107, 'Pokémon: Schwarz & Weiß', 2010, 14, 15), [[15, 1, 36]]),
    mitFolgen(teil(14093, 'Pokémon: Schwarz & Weiß Staffel 2', 2012, 15, 16), [[15, 37, 49], [16, 1, 11]]),
    mitFolgen(teil(17115, 'Pokémon: Schwarz & Weiß Staffel 2 - Episode N', 2013, 16), [[16, 12, 25]]),
    mitFolgen(teil(17873, 'Pokémon: Schwarz & Weiß - Abenteuer in Einall und darüber hinaus', 2013, 16), [[16, 26, 45]]),
    mitFolgen(teil(112153, 'Pokémon Reisen: Die Serie', 2019, 23, 25), [[25, 1, 46]]),
    mitFolgen(teil(158870, 'Pokémon: Abenteuer eines Pokémon-Meisters', 2023, 25), [[25, 47, 57]]),
  ]
  const z = zusaetze(reihe, 'Pokémon')
  pruefe('Staffel 14–15 nennt seine Folgen der Staffel 15', z.get(9107) === 'S15 Folge 1–36', [...z])
  pruefe('Staffel 15–16 nennt seine Folgen der Staffel 15', z.get(14093) === 'S15 Folge 37–49', [...z])
  pruefe('Staffel 16: der Folgenbereich geht vor dem Namensabschnitt', z.get(17115) === 'Folge 12–25' && z.get(17873) === 'Folge 26–45', [...z])
  pruefe('Staffel 23–25 nennt „S25", Staffel 25 allein nur die Folgen', z.get(112153) === 'S25 Folge 1–46' && z.get(158870) === 'Folge 47–57', [...z])
  pruefe('Staffel 1 bleibt unverändert', !z.has(1), [...z])
  const ohne = zusaetze(reihe.map((m) => ({ ...m, staffelFolgen: undefined }) as FranchiseMember), 'Pokémon')
  pruefe('Ohne belegten Folgenbereich (und ohne Namensabschnitt) kein erfundener Zusatz', !ohne.has(9107) && !ohne.has(14093), [...ohne])
}

console.log('\nKarten mit „Teil N" unterscheiden sich schon:')
{
  const nummern = new Map([
    [1, { staffel: 2, teil: 1, von: 2, eigenerName: false }],
    [2, { staffel: 2, teil: 2, von: 2, eigenerName: false }],
  ])
  const teile = [
    { id: 1, rest: '2', voll: 'R Staffel 2 - Teil 1', folgen: [[2, 1, 6]] as [number, number, number][] },
    { id: 2, rest: '2', voll: 'R Staffel 2 - Teil 2', folgen: [[2, 7, 12]] as [number, number, number][] },
  ]
  const z = ueberlappendeZusaetze(teile, nummern, new Map(), text)
  pruefe('Zwei Teile derselben Staffel bekommen keinen Zusatz', z.size === 0, [...z])
}

console.log('\nStaffelfolgen aus den Staffelgrenzen:')
{
  const abschnitt = (nr: number, von: number, bis?: number, offen?: true) => ({ nr, von, bis, folgen: bis === undefined ? undefined : bis - von + 1, offen })
  const g = geteilteInGrenzen([
    { anilistId: 1, staffeln: [abschnitt(1, 1, 10)] },
    { anilistId: 2, staffeln: [abschnitt(1, 1, 5), abschnitt(2, 6, undefined, true)] },
    { anilistId: 3, staffeln: [abschnitt(2, 1, undefined, true)] },
  ])
  pruefe('Zählung innerhalb der Staffel; offene Staffel in zwei Titeln hat keinen Bereich (nichts erfunden)', JSON.stringify([...g]) === '[[1,[[1,1,10]]],[2,[[1,11,15]]]]', JSON.stringify([...g]))
}

console.log('\nOhne Überlappung unverändert:')
{
  const reihe = [teil(1, 'Reihe', 2000, 1), teil(2, 'Reihe Staffel 2', 2001, 2, 3), teil(3, 'Reihe Staffel 4', 2002, 4), teil(4, 'Reihe Staffel 5', 2003, 5)]
  const mitFolge = reihe.map((m) => ({ ...m, staffelFolgen: [[2, 1, 12]] }) as unknown as FranchiseMember)
  pruefe('Angrenzende Bereiche („Staffel 2–3", „Staffel 4") bekommen keinen Zusatz', zusaetze(mitFolge, 'Reihe').size === 0, [...zusaetze(mitFolge, 'Reihe')])
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
  const gleich = doppelteZusaetze([{ id: 1, rest: 'X', voll: 'R - Teil' }, { id: 2, rest: 'Y', voll: 'R - Teil' }], nummern, text)
  pruefe('Gleiche Abschnitte unterscheiden nichts', gleich.size === 0, [...gleich])
  const fehlt = doppelteZusaetze([{ id: 1, rest: 'X', voll: 'R Staffel 3' }, { id: 2, rest: 'Y', voll: 'R - Zwei' }], nummern, text)
  pruefe('Fehlt einer Karte der Abschnitt, bleibt die Gruppe wie sie ist', fehlt.size === 0, [...fehlt])
}

if (verletzt) {
  console.error(`\n${verletzt} Zusicherung(en) verletzt.`)
  process.exit(1)
}
console.log('\nAlles gut.')
