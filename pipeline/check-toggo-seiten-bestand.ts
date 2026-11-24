/**
 * Bestandsprüfer: jeder TOGGO-Link im gebauten Bestand (`public/data/titles.json`, `cartoons.json`) zeigt auf die genaueste Seite, und kein
 * Titel, den TOGGO führt, bleibt ohne Link. Gerechnet wird mit der Bauregel selbst (`loeseToggoSeiten`) auf einer Kopie des Bestands: was sie noch
 * ändern würde, ist eine Abweichung. Rot: mehr Abweichungen als `tools/toggo-seiten-stand.json` (die Zahl darf nur sinken), eine Figurenseite ohne Serie,
 * die nicht in `OHNE_SERIE` steht, ein Titel aus `data/toggo.json` ohne Link, ein leerer Katalog. `⚠ WARNUNG`: solange der Stand über 0 liegt
 * (Zeit zwischen Merge und erstem Bestandsbau). Liest relativ zum Arbeitsordner; Prozesstest `check-toggo-seiten-bestand-lauf.ts`.
 */
import { existsSync, readFileSync } from 'node:fs'
import type { Title } from '../shared/types.ts'
import { bestandWarnzeile } from './lib/bestand-warnzeile.ts'
import { melde } from './lib/quarantaene.ts'
import { ladeToggoSeiten, loeseToggoSeiten } from './bau/13-1-toggo-seiten.ts'
import { istToggoAdresse, laufzeitPasst, pokemonSeiten, serienName, type SerienMasse } from './lib/toggo-seiten.ts'

/** Figurenseiten, zu denen TOGGO keine Serie führt (Katalog-Stand 24.11.2026): bleiben, wie sie sind. */
export const OHNE_SERIE: Record<number, string> = {
  [-76205]: 'Trolls: die Figur „trolls“ hat keine Serie im Katalog',
  [-84387]: 'Disney Junior Music Nursery Rhymes: JustWatch nennt die Figur „toggolino-und-seine-freunde“, eine Serie dazu gibt es nicht',
  [-47480]: 'Die Tom und Jerry Show: die Figur „tom-und-jerry“ hat keine Serie im Katalog',
  [-38693]: 'LEGO Ninjago: Meister des Spinjitzu: 15 Ninjago-Serien, keine trägt den Namen des Titels (Sammeltitel über viele Staffeln)',
}
/* Titel ohne Link, die `data/toggo.json` einer Serie zuordnet, stehen mit Beleg unter `falsch` in `data/curated/toggo-seiten.yaml`. */

const lies = <T>(pfad: string): T | undefined => (existsSync(pfad) ? (JSON.parse(readFileSync(pfad, 'utf8')) as T) : undefined)
const alsListe = (d: unknown): Title[] => (Array.isArray(d) ? d : ((d as { titles?: Title[] } | undefined)?.titles ?? [])) as Title[]
const toggoUrls = (t: Title): string[] => (t.watchLinks ?? []).filter((w) => istToggoAdresse(w.url)).map((w) => w.url)

const anime = alsListe(lies('public/data/titles.json'))
const cartoons = alsListe(lies('public/data/cartoons.json'))
const daten = ladeToggoSeiten()
const stand = lies<{ falsch: number; fehlend: number }>('tools/toggo-seiten-stand.json') ?? { falsch: 0, fehlend: 0 }
const toggoDatei = lies<{ titel?: Record<string, unknown>; masse?: Record<string, SerienMasse> }>('data/toggo.json')
const toggoTitel = Object.keys(toggoDatei?.titel ?? {}).map(Number)
const OHNE_LINK = new Set(daten.hand.falsch.map((f) => f.id))
/** Adresse und Zugang jedes TOGGO-Wegs: beides soll der Bau schon richtig geliefert haben. */
const wegeStand = (t: Title): string => JSON.stringify((t.watchLinks ?? []).filter((w) => istToggoAdresse(w.url)).map((w) => [w.url, w.zugang]))

const vorher = new Map([...anime, ...cartoons].map((t) => [t.id, wegeStand(t)]))
const kopieAnime = structuredClone(anime)
const kopieCartoons = structuredClone(cartoons)
const offen = [...loeseToggoSeiten(kopieAnime, daten, false).offen, ...loeseToggoSeiten(kopieCartoons, daten, true).offen]
const nachher = [...kopieAnime, ...kopieCartoons]
const abweichend = nachher.filter((t) => vorher.get(t.id) !== wegeStand(t))
/* Falsch: ein bestehender Link, den der Bau ändert. Fehlend: ein Titel ohne Link; „fest“ sind die Pokémon-Staffeln und die Handliste, die der Katalog nicht kippt. */
const falsch = abweichend.filter((t) => vorher.get(t.id) !== '[]')
const fehlend = abweichend.filter((t) => vorher.get(t.id) === '[]')
const fest = new Set([...daten.staffeln.keys(), ...daten.hand.titel.filter((h) => h.anlegen).map((h) => h.id)])
/* `tg`: die Detaildatei jedes Pokémon-Titels führt die Staffelseiten, je Staffel mit Serie eine. */
const ohneTg = anime.filter((t) => {
  const soll = pokemonSeiten(t.id, daten.staffeln.get(t.id) ?? [], daten.katalog, daten.hand.pokemon).length
  const datei = soll ? lies<{ tg?: unknown[] }>(`public/data/folgen/${t.id}.json`) : undefined
  return datei !== undefined && (datei.tg?.length ?? 0) !== soll
})
const festFehlend = [...fehlend.filter((t) => fest.has(t.id)), ...ohneTg.filter((t) => !fehlend.some((f) => f.id === t.id))]
const katalogFehlend = fehlend.filter((t) => !fest.has(t.id))
/* Laufzeit und Folgen: Titel mit TOGGO-Serienlink gegen die Maße der Serie (Kennung der Serie über den Katalog), unabhängig von `loeseToggoSeiten`. */
const serienIds = new Map(daten.katalog.map((s) => [s.uname, s.id]))
const unpassend = anime.filter((t) => {
  const masse = (t.watchLinks ?? []).map((w) => toggoDatei?.masse?.[serienIds.get(serienName(w.url) ?? '') ?? '']).find(Boolean)
  return masse !== undefined && !laufzeitPasst(t.runtimeMin, masse.minuten)
})

let fehler = 0
const rot = (text: string) => {
  fehler++
  console.error(`FEHLER: ${text}`)
}
const ids = (liste: Title[]) => liste.map((t) => t.id)
const markiere = (liste: Title[], grund: string) => liste.forEach((t) => melde(t.id, 'toggo-seiten', grund))
if (!anime.length || !cartoons.length) rot(`Bestand nicht gelesen (${anime.length} Titel, ${cartoons.length} Cartoons)`)
if (daten.katalog.length < 100) rot(`TOGGO-Katalog in data/toggo.json hat ${daten.katalog.length} Serien (erwartet über 100)`)
if (falsch.length > stand.falsch) {
  markiere(falsch, 'TOGGO-Link nicht auf der genauesten Seite')
  rot(`${falsch.length} Titel mit einem TOGGO-Link, den der Bau noch ändert (Figurenseite, falsche Staffel, falscher Titel), Stand ${stand.falsch}, nur sinken: ${ids(falsch).join(', ')}`)
}
if (festFehlend.length > stand.fehlend) {
  markiere(festFehlend, 'TOGGO-Link fehlt')
  rot(`${festFehlend.length} Pokémon-Staffeltitel oder Handeinträge ohne TOGGO-Link, Stand ${stand.fehlend}, nur sinken: ${ids(festFehlend).join(', ')}`)
}
if (unpassend.length) {
  markiere(unpassend, 'TOGGO-Serie hat eine andere Laufzeit als der Titel')
  rot(`${unpassend.length} Titel mit einer TOGGO-Serie anderer Laufzeit (Faktor außerhalb 0,6 bis 1,65), Fehlzuordnung (unter „falsch“ in data/curated/toggo-seiten.yaml eintragen): ${ids(unpassend).join(', ')}`)
}
/* Katalog und Namen verschieben sich von selbst (neue Serie bei TOGGO): nur Warnung, sonst stünde jeder Sammler-Pull-Request still. */
if (katalogFehlend.length) console.log(bestandWarnzeile('TOGGO-Seiten', 'Titel ohne TOGGO-Link, den der Bau nach dem Katalog anlegt', ids(katalogFehlend)))
const ohneSerie = offen.map((o) => Number(o.split(' ')[0])).filter((id) => !OHNE_SERIE[id])
if (ohneSerie.length) console.log(bestandWarnzeile('TOGGO-Seiten', 'Figurenseiten ohne Serie im Katalog (nicht in OHNE_SERIE)', ohneSerie))
const ohneLink = toggoTitel.filter((id) => !OHNE_LINK.has(id) &&nachher.some((t) => t.id === id && !toggoUrls(t).length))
if (ohneLink.length) console.log(bestandWarnzeile('TOGGO-Seiten', 'Titel, die TOGGO führt (data/toggo.json), ohne TOGGO-Link', ohneLink))
console.log(`TOGGO-Seiten: ${anime.length} Titel und ${cartoons.length} Cartoons, Katalog ${daten.katalog.length} Serien, falsch ${falsch.length} (Stand ${stand.falsch}), fest fehlend ${festFehlend.length} (Stand ${stand.fehlend}), Katalog fehlend ${katalogFehlend.length}, ohne Serie ${offen.length}`)
process.exit(fehler ? 1 : 0)
