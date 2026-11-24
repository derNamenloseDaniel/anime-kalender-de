/**
 * Zusicherungen zu den TOGGO-Seiten (`pipeline/lib/toggo-seiten.ts`, `pipeline/bau/13-1-toggo-seiten.ts`): jeder TOGGO-Link zeigt auf die
 * genaueste Seite, bei der Pokémon-Hauptserie je Staffel eine eigene. Erwartete Werte stehen fest hier; die Handdatei
 * `data/curated/toggo-seiten.yaml` wird mit den echten Staffelgrenzen gelesen. Aufruf: `npm run check:logic`.
 */
import { readFileSync } from 'node:fs'
import yaml from 'js-yaml'
import type { Title, WatchLink } from '../shared/types.ts'
import { loeseToggoSeiten, toggoStaffelFeld, TOGGO_SEITEN_HAND, type SeitenDaten } from './bau/13-1-toggo-seiten.ts'
import { ladeStaffelGrenzen, POKEMON_STAFFELN } from './lib/pokemon-staffeln.ts'
import { figurSegment, katalogAdresse, serieFuerFigurLink, serienFuerTitelOhneWeg, toggoAdressArt, type KatalogSerie, type SeitenHand } from './lib/toggo-seiten.ts'

let verletzt = 0
let faelle = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  faelle++
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const serie = (id: string, uname: string, titel: string, figuren: string[], frei = true): KatalogSerie => ({ id, uname, titel, figuren, frei })
const KATALOG: KatalogSerie[] = [
  serie('VSE1', 'pokemon-indigo-liga', 'Pokémon: Indigo Liga', ['pokemon']),
  serie('VSE2', 'pokemon-orange-liga', 'Pokémon: Orange Liga', ['pokemon']),
  serie('VSE3', 'pokemon-reisen-die-serie', 'Pokémon Reisen: Die Serie', ['pokemon']),
  serie('VSE4', 'pokemon-meister-reisen-die-serie', 'Pokémon Meister-Reisen: Die Serie', ['pokemon']),
  serie('VSE5', 'einal-vse5', 'Pokémon Schwarz & Weiß: Abenteuer in Einal', ['pokemon']),
  serie('VSE6', 'einall-vse6', 'Pokémon Schwarz & Weiß: Abenteuer in Einall und darüber hinaus', ['pokemon']),
  serie('VSE7', 'hotel-serie-vse7', 'Hotel Transsilvanien - Die Serie', ['hotel-transsilvanien']),
  serie('VSE8', 'die-kleine-prinzessin-vse8', 'Die Kleine Prinzessin', ['die-kleine-prinzessin-pty588']),
  serie('VSE9', 'dora-vse9', 'Dora', ['dora-pty609']),
  serie('VSE10', 'ninja-a-vse10', 'Ninjago - Aufstieg der Drachen', ['ninjago']),
  serie('VSE11', 'ninja-b-vse11', 'Ninjago - Ein Neustart', ['ninjago']),
  serie('VSE12', 'wickie-vse12', 'Wickie', ['wickie-pty1'], false),
  serie('VSE13', 'abo-staffel-vse13', 'Pokémon: Nur im Abo', ['pokemon'], false),
  serie('VSE14', 'zwei-figuren-vse14', 'Zwei Figuren', ['erste-pty1', 'zweite-pty2']),
  serie('VSE15', 'einmalig-vse15', 'Einmalig', ['einmalig-pty3']),
  serie('VSE16', 'doppelt-a-vse16', 'Doppelt', ['doppelt-pty4']),
  serie('VSE17', 'doppelt-b-vse17', 'Doppelt', ['doppelt-pty4']),
]
const HAND: SeitenHand = {
  pokemon: [
    { staffel: 1, serie: 'pokemon-indigo-liga' },
    { staffel: 2, serie: 'pokemon-orange-liga' },
    { staffel: 16, serie: 'einal-vse5', titel: [901, 902] },
    { staffel: 16, serie: 'einall-vse6', titel: [903] },
    { staffel: 23, serie: 'pokemon-reisen-die-serie' },
    { staffel: 24, serie: 'pokemon-meister-reisen-die-serie' },
    { staffel: 30, serie: 'abo-staffel-vse13' },
  ],
  titel: [
    { id: 990003, serie: 'wickie-vse12', anlegen: true, beleg: 'Fixture' },
    { id: 990020, serie: 'dora-vse9', beleg: 'Fixture ohne anlegen' },
    { id: 990022, serie: 'wickie-vse12', anlegen: true, beleg: 'Fixture, der Titel hat schon einen Weg' },
  ],
  falsch: [{ id: 990002, url: 'https://www.toggo.de/die-kleine-prinzessin-pty588', beleg: 'Fixture' }],
}
const DATEN: SeitenDaten = {
  katalog: KATALOG,
  hand: HAND,
  staffeln: new Map([
    [990010, [1, 2]],
    [990011, [23, 24]],
    [901, [15, 16]],
    [903, [16]],
    [990014, [30]],
  ]),
}
const weg = (url: string): WatchLink => ({ name: 'TOGGO', url, kind: 'stream', zugang: 'kostenlos' })
const titel = (id: number, namen: string, wege: string[]): Title => ({ id, titleEn: namen, watchLinks: wege.map(weg) }) as unknown as Title
const urls = (t: Title) => (t.watchLinks ?? []).map((w) => w.url)
const B = 'https://www.toggo.de'

console.log('\nTOGGO-Adressen nach Art:')
pruefe('Figurenseite mit Kennung', toggoAdressArt(`${B}/yu-gi-oh-pty647`) === 'figur')
pruefe('Sammelseite ohne Kennung (Pokémon)', toggoAdressArt(`${B}/pokemon`) === 'figur')
pruefe('Sammelseite mit Schrägstrich und Suchteil', toggoAdressArt(`${B}/pokemon/?x=1`) === 'figur')
pruefe('Serienseite unter der Figur', toggoAdressArt(`${B}/pokemon/serien/pokemon-indigo-liga`) === 'serie')
pruefe('Serienseite ohne Figur', toggoAdressArt(`${B}/serien/boruto-vse389`) === 'serie')
pruefe('Serienseite unter „sammlung“ (Daima)', toggoAdressArt(`${B}/sammlung/alle-formate/serien/dragon-ball-daima-vse446`) === 'serie')
pruefe('Film', toggoAdressArt(`${B}/pokemon/video/pokemon-1-der-film-mov23`) === 'video')
pruefe('Folge', toggoAdressArt(`${B}/yu-gi-oh-pty647/folge/ins-spiel-gezogen-vep24158`) === 'folge')
pruefe('„serien“ ohne Name danach ist keine Serienseite', toggoAdressArt(`${B}/pokemon/serien`) === 'andere')
pruefe('Startseite', toggoAdressArt(`${B}/`) === 'andere')
pruefe('figurSegment nur bei Figurenseiten', figurSegment(`${B}/pokemon`) === 'pokemon' && figurSegment(`${B}/pokemon/serien/x`) === undefined)

console.log('\nSerie zum Figurenlink:')
const name = (n: string) => [n]
pruefe('gleicher Name unter derselben Figur', serieFuerFigurLink(`${B}/hotel-transsilvanien`, 1, name('Hotel Transsilvanien: Die Serie'), KATALOG, [])?.id === 'VSE7')
pruefe('eine einzige Serie der Figur genügt nicht (Prinzessin Sara)', serieFuerFigurLink(`${B}/die-kleine-prinzessin-pty588`, 2, name('Die kleine Prinzessin Sara'), KATALOG, []) === undefined)
pruefe('Name gleich, Figur nicht: keine Serie', serieFuerFigurLink(`${B}/wo-anders`, 1, name('Dora'), KATALOG, []) === undefined)
pruefe('zwei Serien einer Figur, eine gleichnamig', serieFuerFigurLink(`${B}/ninjago`, 3, name('Ninjago: Ein Neustart'), KATALOG, [])?.id === 'VSE11')
pruefe('zwei Serien einer Figur, keine gleichnamig: keine Zuordnung', serieFuerFigurLink(`${B}/ninjago`, 3, name('LEGO Ninjago: Meister des Spinjitzu'), KATALOG, []) === undefined)
pruefe('Handeintrag gilt vor dem Namen', serieFuerFigurLink(`${B}/ninjago`, 3, name('Ninjago: Ein Neustart'), KATALOG, [{ id: 3, serie: 'ninja-a-vse10', beleg: 'x' }])?.id === 'VSE10')
pruefe('Serienseite ist keine Figurenseite: nichts zu lösen', serieFuerFigurLink(`${B}/ninjago/serien/x`, 3, name('Ninjago: Ein Neustart'), KATALOG, []) === undefined)
pruefe('Adresse nennt die Figur des Links', katalogAdresse(KATALOG[6]!, 'hotel-transsilvanien') === `${B}/hotel-transsilvanien/serien/hotel-serie-vse7`)
pruefe('Adresse: die zweite Figur der Serie, wenn der Link sie nennt', katalogAdresse(KATALOG[13]!, 'zweite-pty2') === `${B}/zweite-pty2/serien/zwei-figuren-vse14`)
pruefe('Adresse: ohne Figur im Link die erste der Serie', katalogAdresse(KATALOG[13]!) === `${B}/erste-pty1/serien/zwei-figuren-vse14`)
pruefe('Adresse: eine Figur, die die Serie nicht führt, gilt nicht', katalogAdresse(KATALOG[13]!, 'fremde') === `${B}/erste-pty1/serien/zwei-figuren-vse14`)

console.log('\nPokémon: eine Seite je Staffel:')
const pokemon = titel(990010, 'Pokémon (Fixture)', [`${B}/pokemon`])
const reisen = titel(990011, 'Reisen (Fixture)', [`${B}/pokemon/serien/pokemon-meister-reisen-die-serie`])
const film = titel(990012, 'Film (Fixture)', [`${B}/pokemon/video/pokemon-1-der-film-mov23`])
const neuPokemon = titel(901, 'Staffel 15/16 (Fixture)', [])
const einall = titel(903, 'Einall (Fixture)', [`${B}/pokemon`])
const e = loeseToggoSeiten([pokemon, reisen, film, neuPokemon, einall], DATEN)
pruefe('Sammelseite → Serienseite der ersten Staffel', urls(pokemon)[0] === `${B}/pokemon/serien/pokemon-indigo-liga`, urls(pokemon))
pruefe('der Titel behält genau einen Weg', urls(pokemon).length === 1)
pruefe('Reisen zeigt auf Staffel 23, nicht auf Meister-Reisen (24)', urls(reisen)[0] === `${B}/pokemon/serien/pokemon-reisen-die-serie`, urls(reisen))
pruefe('Film bleibt', urls(film)[0] === `${B}/pokemon/video/pokemon-1-der-film-mov23`)
pruefe('Staffelnummer 15 ohne Serie in der Handliste: Staffel 16 des Titels (nur 901/902) bekommt Einal', urls(neuPokemon)[0] === `${B}/pokemon/serien/einal-vse5`, urls(neuPokemon))
pruefe('Titel ohne Weg bekommt den Weg (frei)', neuPokemon.watchLinks?.[0]?.zugang === 'kostenlos')
pruefe('Staffel 16 mit zwei Serien: 903 bekommt die zweite', urls(einall)[0] === `${B}/pokemon/serien/einall-vse6`, urls(einall))
pruefe('Zähler: 3 Adressen ersetzt, 1 Weg angelegt', e.ersetzt === 3 && e.angelegt === 1, e)
const nurAbo = titel(990014, 'Nur im Abo (Fixture)', [])
pruefe('erste Serie ohne freies Fenster: kein neuer Weg für einen Titel ohne Weg', loeseToggoSeiten([nurAbo], DATEN).angelegt === 0 && urls(nurAbo).length === 0, nurAbo.watchLinks)
const nurAboMitWeg = titel(990014, 'Nur im Abo mit Weg (Fixture)', [`${B}/pokemon`])
loeseToggoSeiten([nurAboMitWeg], DATEN)
pruefe('erste Serie ohne freies Fenster: ein vorhandener Weg wird trotzdem gelöst', urls(nurAboMitWeg)[0] === `${B}/pokemon/serien/abo-staffel-vse13`, urls(nurAboMitWeg))
const nochmal = loeseToggoSeiten([pokemon, reisen, film, neuPokemon, einall], DATEN)
pruefe('zweiter Lauf ändert nichts', nochmal.ersetzt === 0 && nochmal.angelegt === 0 && urls(neuPokemon).length === 1, nochmal)
pruefe('Detaildatei: tg je Staffel', JSON.stringify(toggoStaffelFeld(DATEN, 990010)) === `{"tg":[[1,"${B}/pokemon/serien/pokemon-indigo-liga"],[2,"${B}/pokemon/serien/pokemon-orange-liga"]]}`, toggoStaffelFeld(DATEN, 990010))
pruefe('Detaildatei: Titel ohne Staffelseiten bleibt ohne tg', Object.keys(toggoStaffelFeld(DATEN, 990012)).length === 0)

console.log('\nCartoons und Titel ohne Weg:')
const cartoons = [
  titel(990001, 'Hotel Transsilvanien: Die Serie', [`${B}/hotel-transsilvanien`]),
  titel(990002, 'Die kleine Prinzessin Sara', [`${B}/die-kleine-prinzessin-pty588`]),
  titel(990003, 'Wickie', []),
  titel(990004, 'Dora', []),
  titel(990005, 'Dora', []),
  titel(990006, 'Ninjago: Aufstieg der Drachen', []),
  titel(990007, 'Ninjago', [`${B}/ninjago`]),
]
const c = loeseToggoSeiten(cartoons, DATEN, true)
pruefe('Name gleich: Serienseite', urls(cartoons[0]!)[0] === `${B}/hotel-transsilvanien/serien/hotel-serie-vse7`, urls(cartoons[0]!))
pruefe('falsche Adresse (Handliste) wird entfernt, kein Ersatz', urls(cartoons[1]!).length === 0, urls(cartoons[1]!))
pruefe('Handeintrag „anlegen“ legt den Weg an, im Abo nicht „kostenlos“', urls(cartoons[2]!)[0] === `${B}/wickie-pty1/serien/wickie-vse12` && cartoons[2]!.watchLinks![0]!.zugang === 'abo', cartoons[2]!.watchLinks)
pruefe('zwei Titel gleichen Namens: kein automatischer Weg', urls(cartoons[3]!).length === 0 && urls(cartoons[4]!).length === 0)
pruefe('Serie mit eindeutigem Namen: automatischer Weg bei „automatisch“', urls(cartoons[5]!)[0] === `${B}/ninjago/serien/ninja-a-vse10`, urls(cartoons[5]!))
pruefe('Sammelseite ohne passende Serie bleibt, steht in „offen“', urls(cartoons[6]!)[0] === `${B}/ninjago` && c.offen.length === 1, c)
const mitSerienLink = [titel(990008, 'Hat schon die Serienseite', [`${B}/ninjago/serien/ninja-b-vse11`]), titel(990009, 'Hat einen Film', [`${B}/pokemon/video/film-mov1`])]
const s = loeseToggoSeiten(mitSerienLink, DATEN, true)
pruefe('Serienseite und Film bleiben unberührt und stehen nicht in „offen“', s.ersetzt === 0 && s.offen.length === 0 && urls(mitSerienLink[0]!)[0] === `${B}/ninjago/serien/ninja-b-vse11`, s)
const weitere = [
  titel(990020, 'Dora ohne Weg, Handeintrag ohne „anlegen“', []),
  titel(990022, 'Wickie mit Weg', [`${B}/serien/wickie-schon-da-vse12`]),
  titel(990023, 'Einmalig', [`${B}/einmalig-pty3/serien/einmalig-vse15`]),
  titel(990024, 'Doppelt', []),
  titel(990025, 'Hotel Transsilvanien', []),
]
loeseToggoSeiten(weitere, DATEN, true)
pruefe('Handeintrag ohne „anlegen“ legt keinen Weg an', urls(weitere[0]!).length === 0, urls(weitere[0]!))
pruefe('Handeintrag „anlegen“ bei einem Titel mit Weg: kein zweiter Weg', urls(weitere[1]!).length === 1, urls(weitere[1]!))
pruefe('Titel mit Weg bekommt nicht zusätzlich die gleichnamige Serie', urls(weitere[2]!).length === 1, urls(weitere[2]!))
pruefe('zwei Serien gleichen Namens: kein automatischer Weg', urls(weitere[3]!).length === 0, urls(weitere[3]!))
pruefe('Titel ohne „Die Serie“ trifft „… - Die Serie“', urls(weitere[4]!)[0] === `${B}/hotel-transsilvanien/serien/hotel-serie-vse7`, urls(weitere[4]!))
pruefe('Titel mit „Die Serie“ trifft die Serie ohne den Zusatz', serieFuerFigurLink(`${B}/erste-pty1`, 1, ['Zwei Figuren: Die Serie'], KATALOG, [])?.id === 'VSE14')
pruefe('zwei gleichnamige Serien einer Figur: keine Zuordnung über den Namen', serieFuerFigurLink(`${B}/doppelt-pty4`, 1, ['Doppelt'], KATALOG, []) === undefined)
const beide = [{ id: 1, namen: ['Einmalig'] }, { id: 2, namen: ['Wickie'] }]
const nurEins = serienFuerTitelOhneWeg(beide, new Set([1]), KATALOG, [{ id: 2, serie: 'wickie-vse12', anlegen: true, beleg: 'x' }], true)
pruefe('Serie nur für Titel ohne Weg: Handeintrag und Name beachten die Liste', nurEins.size === 1 && nurEins.get(1)?.id === 'VSE15', [...nurEins.keys()])
const nurHand = serienFuerTitelOhneWeg(beide, new Set([2]), KATALOG, [{ id: 2, serie: 'wickie-vse12', anlegen: true, beleg: 'x' }], false)
pruefe('ohne „automatisch“ nur der Handeintrag, und nur für Titel ohne Weg', nurHand.size === 1 && nurHand.get(2)?.id === 'VSE12' && serienFuerTitelOhneWeg(beide, new Set([1]), KATALOG, [{ id: 2, serie: 'wickie-vse12', anlegen: true, beleg: 'x' }], false).size === 0)
const ohneAuto = [titel(990005, 'Dora', []), titel(990006, 'Ninjago: Aufstieg der Drachen', [])]
pruefe('ohne „automatisch“ (Anime) legt nur die Handliste Wege an', loeseToggoSeiten(ohneAuto, DATEN, false).angelegt === 0)

console.log('\nHandliste und Staffeln der echten Dateien:')
const hand = yaml.load(readFileSync(TOGGO_SEITEN_HAND, 'utf8'), { json: false }) as SeitenHand
const grenzen = ladeStaffelGrenzen(POKEMON_STAFFELN)
const staffeln = new Set(grenzen.flatMap((g) => g.staffeln.map((s) => s.nr)))
pruefe('Staffel 1–25 der Hauptserie haben je mindestens eine Seite', [...staffeln].every((nr) => hand.pokemon.some((h) => h.staffel === nr)), [...staffeln].filter((nr) => !hand.pokemon.some((h) => h.staffel === nr)))
pruefe('es sind genau 25 Staffeln', staffeln.size === 25, staffeln.size)
pruefe('Staffel 16 hat zwei Serien, beide mit Titelliste', hand.pokemon.filter((h) => h.staffel === 16).length === 2 && hand.pokemon.filter((h) => h.staffel === 16).every((h) => h.titel?.length))
pruefe('jeder Handeintrag nennt seinen Beleg', hand.titel.every((h) => h.beleg.length > 20) && hand.falsch.every((f) => f.beleg.length > 20))
pruefe('keine Kennung doppelt in „titel“', new Set(hand.titel.map((h) => h.id)).size === hand.titel.length)

console.log(verletzt ? `\n${verletzt} von ${faelle} Zusicherungen zu den TOGGO-Seiten verletzt.` : `\nTOGGO-Seiten: ${faelle} Zusicherungen halten.`)
process.exit(verletzt ? 1 : 0)
