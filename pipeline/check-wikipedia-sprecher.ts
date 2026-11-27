/**
 * Sprechertabellen aus de.wikipedia (Vorstufe, `pipeline/lib/wikipedia-sprecher.ts`): die 68 abgerufenen Abschnitte
 * „Synchronisation“ unter `pipeline/fixtures/wikipedia-sprecher/` (Stand 22.11.2026 und 26.11.2026) und Kleinstfälle für jede Weiche
 * des Parsers (Kopf mit rowspan/colspan, <br>, <small>, Strich als „kein Sprecher“, Verweise, Vorlagen, Links, keine deutsche Spalte).
 * Dazu die Handliste Seite → Titel. Kein Netzabruf. Aufruf: `npm run check:logic`.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'
import { liesSprechertabelle, type SprecherZeile } from './lib/wikipedia-sprecher.ts'

let fehler = 0
function pruefe(name: string, ok: boolean, ist?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  fehler++
  console.error(`  ✖ ${name}${ist === undefined ? '' : ` — gefunden: ${JSON.stringify(ist)}`}`)
}

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..')
const fixture = (name: string): string => readFileSync(join(REPO, 'pipeline', 'fixtures', 'wikipedia-sprecher', `${name}.wikitext`), 'utf8')
const kurz = (z: SprecherZeile | undefined): string => (z ? `${z.rolle}=${z.deutsch.map((d) => `${d.sprecher}[${d.zusatz ?? ''}]`).join('+')}` : '–')
const zeile = (z: SprecherZeile[], rolle: string): SprecherZeile | undefined => z.find((x) => x.rolle === rolle)

console.log('Yū Yū Hakusho (einspaltig deutsch, Verweis mit Vorlage im Kopf)')
const yy = liesSprechertabelle(fixture('yu-yu-hakusho'))
pruefe('deutsche Spalte, 7 Rollen', yy.deutscheSpalte && yy.zeilen.length === 7, yy.zeilen.length)
pruefe('Urameshi: Link mit Klammerzusatz → Anzeigename', kurz(zeile(yy.zeilen, 'Yūsuke Urameshi')) === 'Yūsuke Urameshi=Tobias Müller[]', kurz(zeile(yy.zeilen, 'Yūsuke Urameshi')))
pruefe('Hiei und Botan', kurz(yy.zeilen[0]) === 'Hiei Jaganshi=Hannes Maurer[]' && kurz(zeile(yy.zeilen, 'Botan')) === 'Botan=Cathlen Gawlich[]', yy.zeilen.map(kurz))
pruefe('japanische Sprecher stehen nicht darin', !JSON.stringify(yy.zeilen).includes('Hiyama'))

console.log('Baki (zweizeiliger Kopf, zwei deutsche Spalten je Fassung)')
const baki = liesSprechertabelle(fixture('baki'))
pruefe('9 Rollen', baki.deutscheSpalte && baki.zeilen.length === 9, baki.zeilen.length)
pruefe('Baki Hanma: beide Fassungen mit Spaltenzusatz', kurz(zeile(baki.zeilen, 'Baki Hanma')) === 'Baki Hanma=Linus Kraus[1. Serie (2001)]+Karim El Kammouchi[2. Serie (2018)]', kurz(zeile(baki.zeilen, 'Baki Hanma')))
pruefe('Emi Akezawa: Strich in der 2. Serie → nur eine Stimme', kurz(zeile(baki.zeilen, 'Emi Akezawa')) === 'Emi Akezawa=Sabina Godec[1. Serie (2001)]', kurz(zeile(baki.zeilen, 'Emi Akezawa')))
pruefe('Biscuit Oliva: Strich in der 1. Serie → nur die 2.', kurz(zeile(baki.zeilen, 'Biscuit Oliva')) === 'Biscuit Oliva=Jo Vossenkuhl[2. Serie (2018)]', kurz(zeile(baki.zeilen, 'Biscuit Oliva')))
pruefe('Yūjirō: zusätzlich in japanischer Spalte genannter Name ist nicht deutsch', !JSON.stringify(baki.zeilen).includes('Ōtsuka') && !JSON.stringify(baki.zeilen).includes('Kikuchi'))

console.log('Ron Kamonohashi (nur japanische Sprecher)')
const ron = liesSprechertabelle(fixture('ron-kamonohashi'))
pruefe('keine deutsche Spalte, keine Zeilen', !ron.deutscheSpalte && ron.zeilen.length === 0, ron)

console.log('Ranma ½ (Fließtext vor der Tabelle, <br> und <small>)')
const ranma = liesSprechertabelle(fixture('ranma'))
pruefe('18 Rollen', ranma.deutscheSpalte && ranma.zeilen.length === 18, ranma.zeilen.length)
pruefe('Ranma ♂: zwei Stimmen mit Fassung aus <small>', kurz(zeile(ranma.zeilen, 'Ranma Saotome (♂)')) === 'Ranma Saotome (♂)=Clemens Ostermann[alte Serie u. Filme]+Florian Knorn[neue Serie]', kurz(zeile(ranma.zeilen, 'Ranma Saotome (♂)')))
pruefe('Ranma ♀: eine Stimme ohne Zusatz', kurz(zeile(ranma.zeilen, 'Ranma Saotome (♀)')) === 'Ranma Saotome (♀)=Angela Wiederhut[]', kurz(zeile(ranma.zeilen, 'Ranma Saotome (♀)')))
pruefe('Cologne: drei Stimmen', zeile(ranma.zeilen, 'Cologne')?.deutsch.map((d) => `${d.sprecher}[${d.zusatz}]`).join('+') === 'Ingeborg Lapsien[alte Serie]+Gisela Fritsch[Filme]+Marion Hartmann[neue Serie]', kurz(zeile(ranma.zeilen, 'Cologne')))
pruefe('Ukyō: Zusatz „Filme und neue Serie“', zeile(ranma.zeilen, 'Ukyō Kuonji')?.deutsch[1]?.zusatz === 'Filme und neue Serie', kurz(zeile(ranma.zeilen, 'Ukyō Kuonji')))
pruefe('Fließtext vor der Tabelle wird nicht zur Rolle', !ranma.zeilen.some((z) => z.rolle.includes('Synchronstudio') || z.rolle.includes('Laske')))

console.log('Kleinstfälle')
const tab = (kopf: string, ...zeilen: string[]): string => `{| class="wikitable"\n${kopf}\n${zeilen.map((z) => `|-\n${z}`).join('\n')}\n|}`
const einfach = liesSprechertabelle(tab('! Rolle !! Japanisch !! Deutsch', '| A || [[X]] || [[P|Anna]]', '| B || Y || Berta<ref name="q">{{Vorlage|a=b}}</ref>', '| C || Z || {{Vorlage|a=b}}'))
pruefe('Link, Verweis und Vorlage; Zeile ohne Sprecher entfällt', einfach.zeilen.map(kurz).join(';') === 'A=Anna[];B=Berta[]', einfach.zeilen.map(kurz))
const zwei = liesSprechertabelle(tab('! Rolle !! Deutsch (Serie) !! Deutsch (Film)', '| A || Anna || —', '| B || – || Berta', '| C || - || '))
pruefe('Striche und leere Zellen sind kein Sprecher; zwei deutsche Spalten ohne Unterkopf', zwei.zeilen.map(kurz).join(';') === 'A=Anna[];B=Berta[]', zwei.zeilen.map(kurz))
const zweiKopf = liesSprechertabelle('{| class="wikitable"\n! rowspan="2"| Rolle !! colspan="2"| Deutsch\n|-\n! Alt !! Neu\n|-\n| A || Anna || Anja\n|}')
pruefe('rowspan/colspan: Rolle bleibt Spalte 0, Unterköpfe werden Zusatz', zweiKopf.zeilen.map(kurz).join(';') === 'A=Anna[Alt]+Anja[Neu]', zweiKopf.zeilen.map(kurz))
const zweiKopfSpalte = liesSprechertabelle('{| class="wikitable"\n! rowspan="2"| Rolle !! colspan="2"| Japanisch !! rowspan="2"| Deutsch\n|-\n! Alt !! Neu\n|-\n| A || Ja || Jo || Anna\n|}')
pruefe('rowspan in späterer Spalte verschiebt die Zeile der Unterköpfe', zweiKopfSpalte.zeilen.map(kurz).join(';') === 'A=Anna[]', zweiKopfSpalte.zeilen.map(kurz))
const zeilenKopf = liesSprechertabelle(tab('!Rolle\n!Japanisch', '|A\n|B'))
pruefe('Tabelle mit Kopfzellen je Zeile, ohne Deutsch', !zeilenKopf.deutscheSpalte, zeilenKopf)
const mehrere = liesSprechertabelle(`{| class="wikitable"\n! Rolle !! Japanisch\n|-\n| A || B\n|}\n\n${tab('! Rolle !! Deutscher Sprecher', '| A || Anna')}`)
pruefe('erste Tabelle ohne Deutsch wird übersprungen, die zweite gelesen', mehrere.deutscheSpalte && mehrere.zeilen.map(kurz).join(';') === 'A=Anna[]', mehrere)
pruefe('Kommentar im Wikitext ignoriert', liesSprechertabelle(`<!-- {| ! Deutsch -->\n${tab('! Rolle !! Deutsch', '| A || Anna')}`).zeilen.length === 1)
pruefe('leere Eingabe', !liesSprechertabelle('').deutscheSpalte)
const lesen = (wikitext: string): string => liesSprechertabelle(wikitext).zeilen.map(kurz).join(';')
pruefe('Tags, Kommentar, leerer Verweis, nbsp und einfacher Link in Rolle und Sprecher', lesen(tab('! Rolle !! Deutsch', '| <span style="x">[[Rolle A]]</span> || <span>Anna</span><!-- k -->&nbsp;Maria<ref name="a" />')) === 'Rolle A=Anna Maria[]', lesen(tab('! Rolle !! Deutsch', '| <span style="x">[[Rolle A]]</span> || <span>Anna</span><!-- k -->&nbsp;Maria<ref name="a" />')))
pruefe('Überschrift der Tabelle (|+) steht vor dem Kopf, mehrzeilige Zelle wird angehängt', lesen('{| class="wikitable"\n|+ Titel\n! Rolle !! Deutsch\n|-\n| A || Anna\nund Anja\n|}') === 'A=Anna und Anja[]')
pruefe('Kopfzelle mit rowspan und colspan: beide Spalten werden in der Folgezeile übersprungen', lesen('{| class="wikitable"\n! rowspan="2" colspan="2"| Rolle !! Japanisch !! Deutsch\n|-\n! Jap !! Alt\n|-\n| A || x || J || Anna\n|}') === 'A=Anna[Alt]')
pruefe('rowspan 2 gilt nur für eine Folgezeile', lesen('{| class="wikitable"\n! rowspan="2"| Rolle !! Deutsch\n|-\n! Zeitraum\n|-\n! Alt\n|-\n| A || Anna\n|}') === 'A=Anna[Zeitraum]')
pruefe('rowspan 3: der letzte Unterkopf zählt', lesen('{| class="wikitable"\n! rowspan="3"| Rolle !! Deutsch\n|-\n! Zeitraum\n|-\n! Alt\n|-\n| A || Anna\n|}') === 'A=Anna[Alt]')
pruefe('rowspan in der Kopfzelle hinter der kürzeren Folgezeile endet nach einer Zeile', lesen('{| class="wikitable"\n! Rolle !! rowspan="2"| Deutsch\n|-\n! Sub\n|-\n! a !! b\n|-\n| A || Anna\n|}') === 'A=Anna[b]')
pruefe('Spaltenzusatz und <small> werden mit Komma verbunden', lesen('{| class="wikitable"\n! rowspan="2"| Rolle !! Deutsch\n|-\n! Alt\n|-\n| A || Anna <small>(Film)</small>\n|}') === 'A=Anna[Alt, Film]')

console.log('Kopfzellen: Abkürzungen, Fettdruck, Fortsetzungszeile mit ||')
pruefe('„Deu. Synchronsprecher“ (Made in Abyss) zählt als deutsche Spalte', lesen('{| class="wikitable"\n!Rolle\n!Jap. Synchronsprecher\n!Deu. Synchronsprecher\n|-\n|Riko\n|Ja\n|Anna\n|}') === 'Riko=Anna[]')
pruefe('„dt. Stimme“ unter „Anime“ (Mob Psycho 100) zählt, Bühnenstück und Realserie nicht', lesen('{| class="wikitable"\n! rowspan="2"| Rolle || colspan="2"| Anime || colspan="2"| Darsteller\n|-\n! jap. Stimme || dt. Stimme || Bühnenstück || Realserie\n|-\n| A || Ja || Anna || Bü || Re\n|}') === 'A=Anna[]')
pruefe('Kopfzelle in Fettdruck („\'\'\'Deutsche Stimme\'\'\'“) auf Fortsetzungszeile mit ||', lesen('{| class="wikitable" \n! Rolle || Japanische Stimme\n  || \'\'\'Deutsche Stimme\'\'\'\n|-\n| A || Ja\n| Anna\n|}') === 'A=Anna[]')
pruefe('Fortsetzungszeile mit !! in der Kopfzeile und zwei Zellen in einer Datenzeile', lesen('{| class="wikitable"\n! Rolle\n  !! Japanisch !! Deutsch\n|-\n| A\n  || Ja || Anna\n|}') === 'A=Anna[]')

console.log('Handliste')
type Eintrag = { seite: string; fixture: string; titel: { id: number; fassung?: string; unsicher?: string }[] }
const liste = yaml.load(readFileSync(join(REPO, 'data', 'wikipedia-sprecher-seiten.yaml'), 'utf8')) as Eintrag[]
pruefe('68 Seiten, jede einmal, jede mit eigener Fixture-Datei', liste.length === 68 && new Set(liste.map((e) => e.seite)).size === 68 && new Set(liste.map((e) => e.fixture)).size === 68, liste.length)
pruefe('die vier ersten Seiten wie auf der Wikipedia', liste.slice(0, 4).map((e) => e.seite).join('|') === 'Yū Yū Hakusho|Grappler Baki|Meisterdetektiv Ron Kamonohashi|Ranma ½', liste.map((e) => e.seite))
pruefe('jede Fixture-Datei liegt vor und liefert Zeilen oder (Ron) keine deutsche Spalte', liste.every((e) => liesSprechertabelle(fixture(e.fixture.replace(/\.wikitext$/, ''))).deutscheSpalte === (e.seite !== 'Meisterdetektiv Ron Kamonohashi')))
pruefe('jedes Ziel hat eine Kennung', liste.every((e) => e.titel.length > 0 && e.titel.every((t) => Number.isInteger(t.id))))
const ziele = liste.flatMap((e) => e.titel)
pruefe('Kennungen eindeutig über die Liste, 116 Ziele (darf nur steigen)', new Set(ziele.map((t) => t.id)).size === ziele.length && ziele.length >= 116, ziele.length)
pruefe('jeder Eintrag mit `unsicher` nennt einen Grund, 15 Ziele ohne (Tabelle nennt den Titel selbst)', ziele.every((t) => t.unsicher === undefined || (typeof t.unsicher === 'string' && t.unsicher.length > 5)) && ziele.filter((t) => !t.unsicher).length === 15, ziele.filter((t) => !t.unsicher).length)
const ranmaFassungen = liste[3]!.titel.map((t) => t.fassung)
pruefe('Fassung jedes Ziels kommt in der Tabelle vor', liste.every((e) => e.titel.every((t) => !t.fassung || liesSprechertabelle(fixture(e.fixture.replace(/\.wikitext$/, ''))).zeilen.some((z) => z.deutsch.some((d) => d.zusatz?.includes(t.fassung!))))) && ranmaFassungen.length === 3)

if (fehler) {
  console.error(`\n${fehler} Prüfung(en) fehlgeschlagen`)
  process.exit(1)
}
console.log('\nWikipedia-Sprecher: 68 Fixtures, 68 Seiten in der Handliste, alle Prüfungen ok')
