import { adressKern, dubKey, adressGleich, type DubCheck } from '../lib/dub-confirmed.ts'
import { readJson, log } from '../lib/util.ts'
import { type JwAngebot, gtiAus, amazonGtiWahl } from '../lib/amazon-gti.ts'
import { stripAffiliate } from '../../shared/mappings.ts'
import { type StreamLink, type Title } from '../../shared/types.ts'
import { type AnisearchEintrag } from './01-quellen.ts'

interface AusgabenEingabe {
  alleChecks: DubCheck[]
  titles: Map<number, Title>
  tmdbMehrdeutig: Set<string>
  anisearch: Record<string, AnisearchEintrag>
  lautPruefungTot: (url: string) => boolean
  checksJePlattform: Map<string, DubCheck[]>
}

type Ausgabe = NonNullable<Title['ausgabenOhneDe']>[number]

const kanalName = (text: string): string | undefined => {
  const treffer =
    /Abos:[^—]*?\b(crunchyroll|aniverse|animedigital)de\b/i.exec(text)?.[1] ??
    /\b(Crunchyroll|Aniverse|ADN)[ -](?:Amazon Channel|Kanal)/i.exec(text)?.[1]
  if (!treffer) return undefined
  const k = treffer.toLowerCase()
  return k === 'crunchyroll' ? 'Crunchyroll' : k === 'aniverse' ? 'Aniverse' : 'ADN'
}

/*
  **Eine Adresse, die bei zwei Titeln belegt ist, gehört keinem sicher.**

  Der erste Bau zeigte bei „Date a Live II" die Kanal-Seite `B0CJJF26WZ` —
  die trägt laut Daniels Beleg Staffel 4 und 5. Die Meldung war damals an
  mehrere Titel der Reihe verteilt worden. Eine durchgestrichene Pille zu
  einer fremden Staffel wäre eine falsche Auskunft; lieber keine.
*/
function titelJeAdresseBilden(alleChecks: DubCheck[]): Map<string, Set<number>> {
  const titelJeAdresse = new Map<string, Set<number>>()
  for (const c of alleChecks) {
    if (!c.url) continue
    const k = adressKern(c.url)
    const menge = titelJeAdresse.get(k) ?? new Set<number>()
    menge.add(c.anilistId)
    titelJeAdresse.set(k, menge)
  }
  return titelJeAdresse
}

/* Eine gti, die JustWatch bei mehreren Titeln führt, gehört keinem sicher (gemessen: 15). */
function gtiTitelBilden(jwAngebote: Record<string, { angebote?: JwAngebot[] }>): Map<string, Set<string>> {
  const gtiTitel = new Map<string, Set<string>>()
  for (const [id, e] of Object.entries(jwAngebote))
    for (const a of e.angebote ?? []) {
      const g = gtiAus(a.url)
      if (g) gtiTitel.set(g, (gtiTitel.get(g) ?? new Set()).add(id))
    }
  return gtiTitel
}

function primeNeinBilden(): Set<number | undefined> {
  return new Set(
    (readJson<{ verweise?: { titleId?: number; plattform?: string; grund?: string }[] }>('data/verweise-entfernt.json', {})
      .verweise ?? [])
      .filter((v) => v.plattform === 'primevideo' && /^belegtes Nein/.test(v.grund ?? ''))
      .map((v) => v.titleId),
  )
}

/**
 * Genau ein Prime-Weg: auf JustWatchs Adresse umstellen, aber nur belegt.
 * `null` heißt: kein Umstellen, nichts zu zählen.
 */
function stelleUmWennBelegt(
  s: StreamLink,
  angebote: JwAngebot[],
  gtiBelegt: Record<string, string>,
): 'umgestellt' | 'unbelegt' | null {
  const wahl = amazonGtiWahl(angebote, s.dub)
  if (!wahl || /\/s\?/.test(s.url)) return null
  /*
    **Nur belegt** (Daniel, 17.09.2026, nach Pokémon Weiß → Schwarz): Umgestellt wird
    erst, wenn die Erweiterung auf genau dieser Amazon-Seite dieselbe gti abgelesen hat.
    `data/amazon-gti-belegt.json` führt ASIN → gti aus den Meldungen.
  */
  if (gtiBelegt[adressKern(s.url)] !== wahl.gti) return 'unbelegt'
  s.seite = s.url
  s.url = wahl.url
  return 'umgestellt'
}

/**
 * Tote Amazon-Adresse eines Titels ohne Prime-Weg ersetzen. Gibt zurück, ob ein Weg entstand.
 *
 * Abgeschaltet am 17.09.2026, 19:05 (`ERSATZ_TOTER_AMAZON_LINKS`): Daniels Gegenprobe von drei
 * ersetzten Links: „Pokémon: Der Film – Weiß" führte auf den Schwester-Film „Schwarz".
 * JustWatch führt den richtigen Film, aber sein Amazon-Angebot trägt die gti des anderen.
 * Ohne alte Seite zum Abgleich fällt das nicht auf; 1 von 3 ist zu viel.
 */
function belebeToteWiederEin(
  title: Title,
  angebote: JwAngebot[],
  e: Pick<AusgabenEingabe, 'anisearch' | 'lautPruefungTot' | 'checksJePlattform'>,
  primeNein: Set<number | undefined>,
): boolean {
  /*
    Tote Amazon-Adresse: ein geführter Abgang (dort gab es Deutsch) oder eine
    aniSearch-Adresse, die die Linkprüfung als tot kennt — die legt der Bau gar
    nicht erst an. Gemessen am 17.09.2026: 158 Titel ohne Prime-Weg mit toter
    aniSearch-Adresse, 27 davon mit genau einer gti bei JustWatch.
  */
  const abgang = (title.entfernteStreams ?? []).filter((a) => a.platform === 'primevideo')
  const toteAnisearch = (e.anisearch[String(title.id)]?.streams ?? [])
    .map((x) => x.url && stripAffiliate(x.url))
    .filter((u): u is string => Boolean(u && /amazon\.de\/(?:dp|gp\/video\/detail)\//.test(u) && e.lautPruefungTot(u)))
  const alteSeite = abgang.length === 1 ? abgang[0]!.url : abgang.length ? undefined : toteAnisearch[0]
  if (!alteSeite) return false
  /* Ein Handbeleg ohne Adresse („bei Prime nicht zu finden") gilt der ganzen Plattform und schlägt JustWatch. */
  const handNein = (e.checksJePlattform.get(dubKey(title.id, 'primevideo')) ?? []).some(
    (c) => !c.url && (c.available === false || c.dub === false),
  )
  if (handNein) return false
  /* Ein belegtes Nein bei Prime (Gedächtnis der entfernten Verweise) gilt auch hier. */
  if (primeNein.has(title.id)) return false
  const wahl = amazonGtiWahl(angebote, abgang[0]?.dub)
  if (!wahl) return false
  /*
    Ohne geführten Abgang gab es nie ein Urteil. Dann nur eine Ausgabe, für die
    JustWatch deutschen Ton nennt — sonst entstünde ein Weg ohne Deutsch (Afro
    Samurai, Black Cat, A Silent Voice).
  */
  if (!abgang.length && !wahl.audio.includes('de')) return false
  const art = angebote.find((a) => a.url?.includes(wahl.gti))?.art
  title.streams.push({
    platform: 'primevideo',
    url: wahl.url,
    seite: alteSeite,
    ...(art ? { zugang: art === 'FLATRATE' ? 'abo' : art === 'FREE' || art === 'ADS' ? 'kostenlos' : 'kauf' } : {}),
  } as StreamLink)
  return true
}

/**
 * **Prime-Verweise zeigen auf JustWatchs gti-Adresse** (Daniel, 17.09.2026, nach dem
 * PoC in `docs/poc-justwatch-amazon.md`: 8 von 8 lebenden Seiten tragen JustWatchs
 * gti, die tote Afro-Samurai-Seite fand ihren Ersatz über die Weiterleitung).
 *
 * Erst hier, am Ende: Bis hierher rechnet der Bau mit der ASIN, an der Handbelege,
 * Gedächtnis und Prüfliste hängen. Die ASIN bleibt als `seite` erhalten. Nur wo
 * JustWatch genau eine gti kennt und der Titel genau einen Prime-Weg hat
 * (`amazonGtiWahl`). Ein Titel ohne lebenden Prime-Weg bekommt seinen Abgang
 * zurück, mit der gti-Adresse und ohne Sprachurteil — Amazon hat ihn neu angelegt.
 */
function stelleAufGtiBrueckeUm(e: AusgabenEingabe): void {
  const jwAngebote = readJson<Record<string, { angebote?: JwAngebot[] }>>('data/justwatch-audio.json', {})
  const ERSATZ_TOTER_AMAZON_LINKS = false
  const gtiBelegt = readJson<Record<string, string>>('data/amazon-gti-belegt.json', {})
  let unbelegt = 0
  const gtiTitel = gtiTitelBilden(jwAngebote)
  const geteilt = (angebote: JwAngebot[]) => angebote.some((a) => (gtiTitel.get(gtiAus(a.url) ?? '')?.size ?? 0) > 1)
  const primeNein = primeNeinBilden()
  let umgestellt = 0
  let wiederbelebt = 0
  for (const title of e.titles.values()) {
    if (e.tmdbMehrdeutig.has(String(title.id))) continue
    const angebote = jwAngebote[String(title.id)]?.angebote ?? []
    if (!angebote.length || geteilt(angebote)) continue
    const prime = title.streams.filter((s) => s.platform === 'primevideo')
    if (prime.length === 1) {
      const ergebnis = stelleUmWennBelegt(prime[0]!, angebote, gtiBelegt)
      if (ergebnis === 'unbelegt') unbelegt++
      if (ergebnis === 'umgestellt') umgestellt++
      continue
    }
    if (prime.length) continue
    if (!ERSATZ_TOTER_AMAZON_LINKS) continue
    if (belebeToteWiederEin(title, angebote, e, primeNein)) wiederbelebt++
  }
  if (umgestellt || wiederbelebt)
    log(`gti-Brücke: ${umgestellt} Prime-Verweise auf JustWatchs Adresse umgestellt, ${wiederbelebt} tote über sie ersetzt`)
  if (unbelegt) log(`gti-Brücke: ${unbelegt} Prime-Verweise warten auf eine abgelesene gti`)
}

/** Ausgaben ohne Deutsch neben einer mit Deutsch, je Plattform mit Ja; zählt Mehrdeutiges mit. */
function sammleAusgabenOhneDe(
  title: Title,
  e: Pick<AusgabenEingabe, 'alleChecks' | 'checksJePlattform'>,
  titelJeAdresse: Map<string, Set<number>>,
): { ausgaben: Ausgabe[]; mehrdeutig: number } {
  let mehrdeutig = 0
  const ausgaben: Ausgabe[] = []
  for (const plattform of new Set(title.streams.filter((s) => s.dub === true).map((s) => s.platform))) { // dub-lesart: irgendwie – jeder Weg mit Ja zählt (Menge/Weiche), auch ein abgeleiteter
    const beurteilt = new Set<string>()
    for (const c of e.checksJePlattform.get(dubKey(title.id, plattform)) ?? []) {
      if (!c.url || beurteilt.has(adressKern(c.url))) continue
      beurteilt.add(adressKern(c.url))
      if (c.dub !== false) continue
      if (title.streams.some((s) => adressGleich(s.url, c.url) || adressGleich(s.seite, c.url))) continue
      if ((titelJeAdresse.get(adressKern(c.url))?.size ?? 0) > 1) {
        mehrdeutig++
        continue
      }
      const texte = e.alleChecks
        .filter((x) => x.anilistId === title.id && x.platform === plattform && adressGleich(x.url, c.url))
        .map((x) => `${x.note ?? ''} ${(x as { zweiteQuelle?: string }).zweiteQuelle ?? ''}`)
        .join(' ')
      const kanal = kanalName(texte)
      ausgaben.push({
        platform: plattform,
        url: c.url,
        ...(kanal ? { kanal } : {}),
        ...(/Deutsch nur als Untertitel/i.test(texte) ? { untertitelDe: true } : {}),
        ...(c.checkedAt ? { geprueftAm: c.checkedAt } : {}),
      })
    }
  }
  return { ausgaben, mehrdeutig }
}

/**
 * **Ein Bezugsweg über denselben Kanal ist dieselbe Ausgabe.**
 *
 * Digimon trug nach dem ersten Bau zusätzlich die Pille „Amazon Prime
 * (Crunchyroll) · 54 Fg." auf `B0CHHGC263` — ungestrichen, direkt neben der
 * durchgestrichenen Crunchyroll-Kanal-Ausgabe. Die zweite Quelle des Neins
 * ist JustWatchs Angebot „Crunchyroll Amazon Channel", und das gilt dem
 * Kanal, nicht einer einzelnen Kennung.
 */
function entferneKanalDoppelte(title: Title, ausgaben: Ausgabe[]): void {
  for (const a of [...ausgaben]) {
    if (!a.kanal || a.platform !== 'primevideo') continue
    const kanalMuster = new RegExp(`\\(${a.kanal}\\)`, 'i')
    const gleicherKanal = (title.watchLinks ?? []).filter(
      (w) => w.kind === 'stream' && /amazon\./.test(w.url) && kanalMuster.test(w.name ?? ''),
    )
    /*
      Die Pille steht schon da — eine zweite Kennung desselben Kanals wäre
      dieselbe Auskunft zweimal (erster Bau: zwei gestrichene
      „Crunchyroll-Kanal"-Pillen bei Digimon). Der Weg verschwindet nur.
    */
    if (gleicherKanal.length) title.watchLinks = (title.watchLinks ?? []).filter((w) => !gleicherKanal.includes(w))
  }
}

/**
 * **Ein Abgang gilt nur, solange der Anbieter keinen gültigen Weg trägt.**
 *
 * So steht es seit dem 01.09.2026 an der Stelle, die `entfernteStreams`
 * füllt. Dort ist der Stand aber ein früherer: Die zweite Ausgabe mit
 * Deutsch kommt erst über die Belege dazu, und Digimon zeigte danach neben
 * der deutschen Prime-Pille eine graue „Prime Video — nicht mehr abrufbar"
 * (`B00SZC9B9G`, weg seit 20.08.2026). Hier am Ende gilt die Regel für den
 * fertigen Stand. Gibt die Zahl entfernter Abgänge zurück.
 */
function entferneUeberholteAbgaenge(title: Title): number {
  if (!title.entfernteStreams?.length) return 0
  const vorherWeg = title.entfernteStreams.length
  title.entfernteStreams = title.entfernteStreams.filter((a) => !title.streams.some((s) => s.platform === a.platform))
  const entfernt = vorherWeg - title.entfernteStreams.length
  if (!title.entfernteStreams.length) delete title.entfernteStreams
  return entfernt
}

/**
 * **Zwei Ausgaben derselben Staffel: die ohne Deutsch bleibt als Auskunft stehen.**
 *
 * Ein belegtes Nein entfernt den Verweis (15.08.2026), und dabei bleibt es.
 * Gibt es beim selben Anbieter aber **auch** eine Ausgabe mit deutschem Ton,
 * findet ein Besucher dort beide und weiß nicht, welche gemeint ist — Digimon
 * bei Prime: „In Prime enthalten" mit Synchro, der Crunchyroll-Kanal nur mit
 * Untertiteln. Daniel am 14.09.2026: „wenn beides legit ist, dann sollten wir
 * diese erkenntnis offen kommunizieren".
 *
 * Gelesen wird aus den Belegen, nicht aus den entfernten Verweisen: Ob die
 * Kanal-Adresse in diesem Lauf überhaupt als Verweis ankam, hängt an den
 * Sammelquellen; das Nein im Beleg steht fest. Je Adresse zählt der jüngste
 * Beleg — ein späteres Ja nimmt die Ausgabe wieder heraus.
 *
 * Im selben Zug fällt dieselbe Seite unter zwei Schreibweisen weg (`/dp/` und
 * `/gp/video/detail/`, Date a Live V trug beide als zwei Pillen).
 */
export function fuehreAusgabenZusammen(e: AusgabenEingabe) {
  const titelJeAdresse = titelJeAdresseBilden(e.alleChecks)
  stelleAufGtiBrueckeUm(e)
  let doppelt = 0
  let ausgabenOhneDe = 0
  let mehrdeutig = 0
  let abgaengeUeberholt = 0
  for (const title of e.titles.values()) {
    const gesehen = new Set<string>()
    const vorher = title.streams.length
    title.streams = title.streams.filter((s) => {
      const k = `${s.platform}|${adressKern(s.url)}`
      if (gesehen.has(k)) return false
      gesehen.add(k)
      return true
    })
    doppelt += vorher - title.streams.length

    const gesammelt = sammleAusgabenOhneDe(title, e, titelJeAdresse)
    mehrdeutig += gesammelt.mehrdeutig
    entferneKanalDoppelte(title, gesammelt.ausgaben)
    if (gesammelt.ausgaben.length) {
      title.ausgabenOhneDe = gesammelt.ausgaben
      ausgabenOhneDe += gesammelt.ausgaben.length
    }
    abgaengeUeberholt += entferneUeberholteAbgaenge(title)
  }
  if (doppelt) log(`${doppelt} doppelte Verweise (dieselbe Seite, andere Schreibweise) zusammengelegt`)
  if (ausgabenOhneDe) log(`${ausgabenOhneDe} Ausgaben ohne deutschen Ton neben einer mit Deutsch angezeigt`)
  if (mehrdeutig) log(`${mehrdeutig} Ausgaben ohne Deutsch übersprungen: Adresse bei mehreren Titeln belegt`)
  if (abgaengeUeberholt) log(`${abgaengeUeberholt} Abgänge entfernt, deren Anbieter wieder einen gültigen Weg trägt`)
}
