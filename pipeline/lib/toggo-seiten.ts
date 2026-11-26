/**
 * **Jeder TOGGO-Link zeigt auf die genaueste Seite** (24.11.2026, Auftrag Dirigent).
 *
 * JustWatch und aniSearch kennen nur die Figurenseite (`toggo.de/pokemon`, `/ninjago`, `/yu-gi-oh-pty647`): bei Pokémon eine Sammelseite für
 * 25 Staffeln, bei Cartoons immer. Die Serienseite (`…/<figur>/serien/<u_name>`) liefert der Katalog der TOGGO-Schnittstelle (`data/toggo.json`,
 * Schlüssel `katalog`, geholt von `pipeline/fetch-toggo.ts`). Hier steht nur die Rechnung daraus, rein und ohne Dateizugriff; der Bau liest
 * die Dateien (`pipeline/bau/13-1-toggo-seiten.ts`).
 */
import { namensKern } from '../fetch-tv-programm.ts'
import { toIsoDate } from '../../shared/time.ts'
import { serienAdresse, type ToggoSerie } from './toggo-serien.ts'

/**
 * Frei = mindestens ein kostenloses Fenster (`fvod_*`, `catchup_*`), das am Berliner Datum `heute` noch nicht zu Ende ist;
 * `enden` sind Unix-Sekunden, `null`/fehlend = kein Fenster.
 */
export const istFrei = (enden: (number | null | undefined)[], heute: string): boolean =>
  enden.some((ende) => Boolean(ende) && toIsoDate(new Date(ende! * 1000)) >= heute)

/** Maße einer Serie aus ihren Folgen (`fetch-toggo.ts`): Folgenzahl, mittlere Länge in Minuten, Staffelzahl. */
export type SerienMasse = { folgen: number; minuten: number; staffeln: number }

/** Folgenzahl, mittlere Länge (Median von `run_length`, Sekunden → Minuten) und Staffelzahl aus den Folgen einer Serie. */
export function serienMasse(folgen: { season_no?: number; run_length?: number }[]): SerienMasse {
  const laengen = folgen.map((f) => f.run_length ?? 0).filter((l) => l > 0).sort((a, b) => a - b)
  const mitte = laengen[Math.floor(laengen.length / 2)] ?? 0
  return { folgen: folgen.length, minuten: Math.round(mitte / 60), staffeln: new Set(folgen.map((f) => f.season_no ?? 1)).size }
}

/**
 * Passt die Laufzeit der TOGGO-Serie zu der des Titels (Faktor 0,6 bis 1,65)? Fehlt eine Seite, gilt es als passend (nicht beurteilbar).
 * Anlass: Wickie 1974 (25 min) gegen TOGGOs CGI-Serie von 2014 (12 min), beide mit 78 Folgen.
 */
export const laufzeitPasst = (titelMinuten: number | undefined, serieMinuten: number | undefined): boolean => {
  if (!titelMinuten || !serieMinuten) return true
  const faktor = serieMinuten / titelMinuten
  return faktor >= 0.6 && faktor <= 1.65
}

/** Der Name der Serienseite am Ende einer Adresse (`…/serien/<name>`), sonst nichts. */
export const serienName = (url: string): string | undefined => /\/serien\/([^/?#]+)/.exec(url)?.[1]

/** `frei`: die Serie hat ein kostenloses Fenster (`fvod_*` oder `catchup_*`); sonst gibt es sie nur im Abo. */
export type KatalogSerie = ToggoSerie & { frei: boolean }

/** `staffel`: deutsche Staffel = `season_no` der TOGGO-Folgen; `titel`: nur für diese Kennungen (Staffel 16 hat zwei Serien). */
export type PokemonSeite = { staffel: number; serie: string; titel?: number[]; beleg?: string }
/** `anlegen`: der Titel hat noch keinen TOGGO-Weg, die Serie gehört nach `beleg` trotzdem zu ihm. */
export type TitelSeite = { id: number; serie: string; beleg: string; anlegen?: true }
/** `falsch`: eine Adresse, die ein Anbieter-Abgleich dem falschen Titel gegeben hat. */
export type FalscheAdresse = { id: number; url: string; beleg: string }
export type SeitenHand = { pokemon: PokemonSeite[]; titel: TitelSeite[]; falsch: FalscheAdresse[] }

export type AdressArt = 'serie' | 'video' | 'folge' | 'figur' | 'andere'

/**
 * Was eine TOGGO-Adresse ist, nach ihren Pfadsegmenten: `…/serien/<x>` Serienseite (auch `sammlung/alle-formate/serien/<x>`), `…/video/<x>` ein
 * Film, `…/folge/<x>` eine Folge, ein einzelnes Segment eine Figurenseite, alles andere (Startseite, Übersicht) „andere“.
 */
export function toggoAdressArt(url: string): AdressArt {
  const pfad = /^https?:\/\/(?:www\.)?toggo\.de(\/[^?#]*)?/i.exec(url)?.[1] ?? ''
  const teile = pfad.split('/').filter(Boolean)
  const nach = (wort: string) => {
    const i = teile.indexOf(wort)
    return i >= 0 && Boolean(teile[i + 1])
  }
  if (nach('serien')) return 'serie'
  if (nach('video')) return 'video'
  if (nach('folge')) return 'folge'
  return teile.length === 1 ? 'figur' : 'andere'
}

export const istToggoAdresse = (url: string): boolean => /^https?:\/\/(?:www\.)?toggo\.de(?:[/?#]|$)/i.test(url)

/** Das einzelne Segment einer Figurenseite (`pokemon`, `yu-gi-oh-pty647`), sonst nichts. */
export const figurSegment = (url: string): string | undefined =>
  toggoAdressArt(url) === 'figur' ? /^https?:\/\/(?:www\.)?toggo\.de\/([^/?#]+)/i.exec(url)?.[1]?.toLowerCase() : undefined

/** `kostenlos`, wenn die Serie ein freies Fenster hat, sonst `abo`: ein umgeschriebener Link bekommt den Zugang der Serie, nicht den aus JustWatch. */
export const zugangDerSerie = (s: KatalogSerie): 'kostenlos' | 'abo' => (s.frei ? 'kostenlos' : 'abo')

export const katalogAdresse = (s: KatalogSerie, figur?: string): string => serienAdresse(figur && s.figuren.includes(figur) ? figur : s.figuren[0], s)

const nachUname = (katalog: KatalogSerie[], uname: string) => katalog.find((s) => s.uname === uname)

/**
 * Die Serie, die zu einem Figurenlink und den Namen des Titels gehört: Handeintrag (`TitelSeite`) zuerst, sonst die einzige Serie der Figur
 * mit gleichem Namen. Zwei Treffer oder keiner: keine Zuordnung. Eine einzige Serie der Figur genügt nicht (die Figur der „Kleinen Prinzessin“
 * gehört nicht zur Anime-Serie „Prinzessin Sara“).
 */
export function serieFuerFigurLink(
  url: string,
  id: number,
  namen: (string | undefined)[],
  katalog: KatalogSerie[],
  hand: TitelSeite[],
): KatalogSerie | undefined {
  const figur = figurSegment(url)
  if (!figur) return undefined
  const von = hand.find((h) => h.id === id)
  if (von) return nachUname(katalog, von.serie)
  const kerne = new Set(namen.filter(Boolean).map(serienKern))
  const treffer = katalog.filter((s) => s.figuren.includes(figur) && kerne.has(serienKern(s.titel)))
  return treffer.length === 1 ? treffer[0] : undefined
}

/** Namenskern ohne „: Die Serie“ am Ende (bei TOGGO „Hotel Transsilvanien - Die Serie“, bei uns „…: Die Serie“). */
const serienKern = (n: string | undefined): string => namensKern(n).replace(/ die serie$/, '')

/**
 * Serien für Titel ohne TOGGO-Weg (`ohneWeg`): die Handliste (`anlegen`), bei `automatisch` zusätzlich jede Serie, deren Name genau einem
 * Titel von `titel` (allen, nicht nur denen ohne Weg) gleicht und die allein so heißt — zwei gleich heißende Titel oder Serien ordnen nichts zu.
 */
export function serienFuerTitelOhneWeg(
  titel: { id: number; namen: (string | undefined)[] }[],
  ohneWeg: ReadonlySet<number>,
  katalog: KatalogSerie[],
  hand: TitelSeite[],
  automatisch: boolean,
): Map<number, KatalogSerie> {
  const aus = new Map<number, KatalogSerie>()
  for (const h of hand) {
    const s = h.anlegen && ohneWeg.has(h.id) ? nachUname(katalog, h.serie) : undefined
    if (s) aus.set(h.id, s)
  }
  if (!automatisch) return aus
  const jeKern = new Map<string, number[]>()
  for (const t of titel) for (const k of new Set(t.namen.filter(Boolean).map(serienKern))) if (k.length >= 4) jeKern.set(k, [...(jeKern.get(k) ?? []), t.id])
  for (const s of katalog) {
    const ids = jeKern.get(serienKern(s.titel)) ?? []
    const serienGleichenNamens = katalog.filter((x) => serienKern(x.titel) === serienKern(s.titel)).length
    if (ids.length === 1 && serienGleichenNamens === 1 && ohneWeg.has(ids[0]!) && !aus.has(ids[0]!)) aus.set(ids[0]!, s)
  }
  return aus
}

/** Die TOGGO-Serien der deutschen Staffeln eines Pokémon-Titels, in Staffelreihenfolge; eine fehlende Serie im Katalog fehlt auch hier. */
export function pokemonSeiten(id: number, staffeln: number[], katalog: KatalogSerie[], hand: PokemonSeite[]): { staffel: number; serie: KatalogSerie }[] {
  const aus: { staffel: number; serie: KatalogSerie }[] = []
  for (const nr of staffeln) {
    for (const h of hand) {
      if (h.staffel !== nr || (h.titel && !h.titel.includes(id))) continue
      const s = nachUname(katalog, h.serie)
      if (s) aus.push({ staffel: nr, serie: s })
    }
  }
  return aus
}

/** `[[Staffel, Adresse], …]` für die Detaildatei (`tg`); leer, wenn der Titel keine Staffelseiten hat. */
export function staffelAdressen(seiten: { staffel: number; serie: KatalogSerie }[]): [number, string][] {
  return seiten.map((s): [number, string] => [s.staffel, katalogAdresse(s.serie)])
}
