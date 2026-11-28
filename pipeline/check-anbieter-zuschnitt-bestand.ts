/**
 * Bestandsteil von `check-anbieter-zuschnitt.ts` (Konzept Staffelzuschnitt, Schritt 2): Jeder Eintrag in `data/curated/anbieter-zuschnitt.yaml` geht
 * gegen die aktuelle `data/anbieter-staffeln.json` und `public/data` noch auf (Drift ⇒ rot mit Titel), jede Netflix-Staffel, die mehrere unserer
 * Titel lückenlos füllt, hat einen Eintrag oder steht mit Grund in `ABWEICHUNGEN_ERLAUBT` (nur sinkend), und `franchises.json` trägt `anbieterStaffel`
 * genau an den Gliedern der Einträge. Liest `public/data` und gehört deshalb in `check:bestand`.
 */
import { readFileSync } from 'node:fs'
import type { FranchiseMember } from '../shared/franchise-typ.ts'
import type { Title } from '../shared/types.ts'
import { ladeZuschnitt } from './bau/anbieter-zuschnitt.ts'
import { markiereZuschnitt, zuschnittGruppen } from './lib/anbieter-zuschnitt.ts'
import type { StaffelListen } from './lib/netflix-staffeln.ts'
import { melde } from './lib/quarantaene.ts'

/**
 * Netflix-Staffeln der Klasse ohne Eintrag, `Kennung:Staffel` → Grund. Höchstens so viele wie heute (28.11.2026: 8); jede Zeile, die nicht mehr
 * zur Klasse gehört, muss hier gestrichen werden.
 */
export const ABWEICHUNGEN_ERLAUBT: Record<string, string> = {
  '80179831:2': 'JoJo Stardust Crusaders: unsere Zählung nennt die zwei Glieder Staffel 2 und 3, Netflix eine; die Reihennummer ist nicht eindeutig',
  '81186864:1': 'Pokémon Concierge: die Pokémon-Reihe zählt ihre Staffeln eigen, die Glieder tragen keine Reihennummer',
  '80090673:1': 'Baki: Netflix zählt OVA/Special im Staffelmenü mit, außerhalb der abgenommenen Klasse (Konzept Abschnitt 1)',
  '80090673:2': 'Baki: wie 80090673:1',
  '80090673:3': 'Baki: wie 80090673:1',
  '80090673:4': 'Baki: wie 80090673:1',
  '81046193:3': 'Special vor zwei TV-Staffeln im Netflix-Staffelmenü, außerhalb der abgenommenen Klasse',
  '81186100:1': 'Serie mit angehängtem Special im Netflix-Staffelmenü, außerhalb der abgenommenen Klasse',
}
const HOECHSTENS_ERLAUBT = 8

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const lies = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T
const roh = lies<Record<string, FranchiseMember[]>>('public/data/franchises.json')
const titel = lies<Title[]>('public/data/titles.json')
const listen = lies<StaffelListen>('data/anbieter-staffeln.json')
const eintraege = ladeZuschnitt()

console.log('\nJeder Eintrag geht gegen Netflix\' aktuelle Staffelliste auf:')
{
  const frisch = JSON.parse(JSON.stringify(roh), (k, v) => (k === 'anbieterStaffel' ? undefined : v)) as Record<string, FranchiseMember[]>
  const erg = markiereZuschnitt(frisch, eintraege, listen, titel)
  for (const a of erg.abweichungen) {
    const e = eintraege.find((x) => x.url === a.url && x.staffel === a.staffel)
    for (const id of e?.glieder ?? []) melde(id, 'anbieter-zuschnitt-bestand', `Zuschnitt geht nicht mehr auf: ${a.grund}`)
  }
  pruefe(`${eintraege.length} Einträge, alle aufgegangen`, erg.abweichungen.length === 0, erg.abweichungen)

  const erwartet = new Map(Object.values(frisch).flat().filter((m) => m.anbieterStaffel).map((m) => [m.id, JSON.stringify(m.anbieterStaffel)]))
  const ausgeliefert = new Map(Object.values(roh).flat().filter((m) => m.anbieterStaffel).map((m) => [m.id, JSON.stringify(m.anbieterStaffel)]))
  const fehlt = [...erwartet].filter(([id, w]) => ausgeliefert.get(id) !== w).map(([id]) => id)
  if (fehlt.length) console.log(`  ⚠ WARNUNG Zuschnitt: franchises.json trägt anbieterStaffel nicht (oder anders) an ${fehlt.length} Gliedern — der nächste Bestandsbau schreibt es`)
  const zuviel = [...ausgeliefert.keys()].filter((id) => !erwartet.has(id))
  pruefe('franchises.json trägt anbieterStaffel an keinem Titel ohne Eintrag', zuviel.length === 0, zuviel)
}

console.log('\nJede Netflix-Staffel der Klasse hat einen Eintrag oder einen Grund:')
{
  const klasse = zuschnittGruppen(listen, titel)
  const mitEintrag = new Set(eintraege.map((e) => `${/\/(\d+)$/.exec(e.url)![1]}:${e.staffel}`))
  const offen = klasse.map((g) => `${g.kennung}:${g.staffel}`).filter((k) => !mitEintrag.has(k) && !(k in ABWEICHUNGEN_ERLAUBT))
  pruefe(`${klasse.length} Netflix-Staffeln der Klasse (${klasse.filter((g) => mitEintrag.has(`${g.kennung}:${g.staffel}`)).length} mit Eintrag)`, offen.length === 0, offen)
  const veraltet = Object.keys(ABWEICHUNGEN_ERLAUBT).filter((k) => !klasse.some((g) => `${g.kennung}:${g.staffel}` === k) || mitEintrag.has(k))
  pruefe('Jede erlaubte Abweichung gehört noch zur Klasse und hat keinen Eintrag (sonst streichen)', veraltet.length === 0, veraltet)
  pruefe(`Erlaubte Abweichungen nur sinkend (höchstens ${HOECHSTENS_ERLAUBT}, heute ${Object.keys(ABWEICHUNGEN_ERLAUBT).length})`, Object.keys(ABWEICHUNGEN_ERLAUBT).length <= HOECHSTENS_ERLAUBT)
}

if (verletzt) {
  console.error(`\n${verletzt} Zusicherung(en) verletzt.`)
  console.log(`VERSTÖSSE: ${verletzt}`)
  process.exit(1)
}
console.log('VERSTÖSSE: 0')
