import { readJson, log } from '../lib/util.ts'
import { mitHandvorrang } from '../lib/tmdb-von-hand.ts'
import { type MotnDaten, LEER as MOTN_LEER } from '../lib/motn.ts'
import { werteMotnAus } from './09-5-1-motn-uebernahme.ts'
import { todayIso } from '../../shared/time.ts'
import type { AdnData } from '../lib/adn.ts'
import { type AdnArchiv, adnAdresseSchaerfen, adnFolgenAdresse, ladeAdnArchiv } from '../lib/adn-sprachen.ts'
import { type Release, type Title } from '../../shared/types.ts'
import { type EntfernterVerweis } from './grundlagen.ts'
import { entferneVerweiseMitNein, regionGesperrteWege } from './verweis-grund.ts'
import { ladeHandbelege } from '../lib/dub-confirmed.ts'
import { joynZeile, setzeJoynDeutsch } from './joyn-pauschal.ts'
import { ergaenzeErstausgabeAusWikiUndHand, uebernehmeAnisearchErstausgabe } from './09-5-0-erstausgabe.ts'
import { schaerfeAdnAdressen } from './09-5-2-adn-adressen.ts'
import { belegeAdnAusArchiv, belegeAdnUeberKatalog, stelleAdnFolgenverweiseUm } from './09-5-2-adn-belege.ts'
import { stelleRtlAdressenUm } from './09-5-3-rtl-adressen.ts'
import { type AkibapassDatei, setzeAkibapassSprache } from '../lib/akibapass-sprache.ts'

interface WeitereQuellenEingabe {
  releases: Release[]
  titles: Map<number, Title>
  schreibWurzel?: string
  adnKatalog: AdnData
  adnVerweiseErgaenzt: number
  verweiseEntfernt: EntfernterVerweis[]
}

type AdnAdressen = ReturnType<typeof schaerfeAdnAdressen>
type AdnStreamSchaerfer = (titleId: number, stream: { platform: string; url: string }) => boolean

interface WeitereQuellenErgebnis {
  adnArchiv: AdnArchiv
  adnStreamSchaerfen: AdnStreamSchaerfer
  motnBelege: number
  motnTon: Set<string>
}

function uebernehmeMotnTon({ releases, titles }: Pick<WeitereQuellenEingabe, 'releases' | 'titles'>) {
  /**
   * Deutsche Tonspuren von der Streaming Availability API — nur Netflix.
   *
   * Diese Quelle nennt je Folge die `audios`, getrennt von den `subtitles`. Für
   * Netflix ist sie die einzige maschinenlesbare Auskunft überhaupt: 532
   * Verweise standen deshalb dauerhaft auf „🇩🇪 ?", und Netflix untersagt das
   * Auslesen seiner Seiten in der robots.txt.
   *
   * **Drei Regeln, jede aus einer Messung vom 21.08.2026** (Herleitung in
   * `lib/motn.ts`):
   *
   *  1. **Nie ein `false`.** Die Quelle hinkt mindestens zwei Tage hinterher —
   *     Folge 7 von „Thunderbolt Fantasy" war am 19.08. fällig, lag am 21.08.
   *     auf Netflix in deutscher Fassung, und die API kannte sie nicht. Ihr
   *     Schweigen ist kein Nein. Gesetzt wird ausschließlich `true`.
   *  2. **Nichts aus einem laufenden Release.** Bei einer laufenden Staffel
   *     entscheidet der Verzug darüber, was die Quelle zeigt; dort bleibt es
   *     beim Crunchyroll-Abruf und bei der Handarbeit. Die Zusicherung steht
   *     unten als `laeuft`, nicht als Kommentar.
   *  3. **Nur Netflix.** Für Crunchyroll widerspricht die Quelle sich selbst,
   *     für ADN ist der Sprachcode `vde` je Folge besser — beide liegen im
   *     Haus. Prime Video und Disney+ werden geholt und ausgewiesen, aber nicht
   *     übernommen, solange die Kontrollmessung sie nicht trägt.
   */
  return werteMotnAus({
    motn: readJson<MotnDaten>('data/motn.json', MOTN_LEER),
    tmdbTitles: mitHandvorrang(readJson('data/tmdb-titles.json', {})),
    titles,
    releases,
    heute: todayIso(),
  })
}

function setzeJoynPauschal(titles: Map<number, Title>): void {
  /**
   * **Joyn ist ein deutscher Anbieter — dort läuft nichts auf Japanisch.**
   *
   * Daniel am 02.09.2026: „join titel immer als deutsch markieren. deutscher
   * anbieter, da ist immer alles deutsch." Der Kasten zeigte davor „🇩🇪 ?" mit
   * dem Vermerk „Der Anbieter macht dazu keine öffentliche Angabe" — richtig
   * über die Auskunftslage, falsch über die Sache.
   *
   * Das ist kein Raten: Joyn gehört zu ProSiebenSat.1 und führt sein Programm
   * für ein deutschsprachiges Publikum. Was dort im Katalog steht, ist
   * synchronisiert; ein OmU-Angebot gibt es nicht. Die Aussage stammt aus
   * derselben Quelle wie jede Zeile in `dub-confirmed.yaml` — von jemandem, der
   * nachgesehen hat.
   *
   * **Ein von Hand geprüfter Eintrag schlägt das trotzdem.** Die Bedingung
   * `dub === undefined` sorgt dafür: Wo jemand etwas anderes festgestellt hat,
   * bleibt es stehen.
   */
  const joynJa = setzeJoynDeutsch(titles.values())
  if (joynZeile(titles.values(), joynJa)) log(joynZeile(titles.values(), joynJa))
}

/**
 * **Dieselbe Schärfung noch einmal, für alles, was später dazukommt.**
 *
 * Die Runde oben läuft, bevor `build.ts` ganz unten die Anbieter aus
 * aniSearch ergänzt. Ein ADN-Verweis, der dort entsteht, wird von ihr nie
 * berührt — er behält seine Slug-Adresse, `beurteileAdnVerweis` findet
 * nichts im Archiv, und der Verweis bleibt bei „🇩🇪 ?".
 *
 * Gemessen am 07.09.2026: **sieben** solche Verweise, darunter sechs, deren
 * Kennung seit dem 06.09. in `data/adn-adressen.yaml` steht — die Datei war
 * gepflegt und wirkungslos. Das ist derselbe Fehlgriff wie beim Handbeleg
 * einen Tag zuvor: **Wer unten ergänzt, muss unten auch schärfen und
 * beurteilen.**
 */
function baueAdnStreamSchaerfer({ ausRelease, adnAdressen, katalogKennung, adnStaffeln, adnArchiv }: AdnAdressen & { adnArchiv: AdnArchiv }): AdnStreamSchaerfer {
  return (titleId, stream) => {
    if (stream.platform !== 'adn') return false
    const ausSlug = ausRelease.get(titleId) ?? undefined
    const kennung = adnAdressen[titleId] ?? katalogKennung.get(titleId) ?? ausSlug?.show
    /* Der Release-Slug zuerst — er stammt aus der laufenden Zuordnung; die Datei
       ist für die Titel, zu denen es kein Release gibt. */
    const staffel = ausSlug?.staffel ?? adnStaffeln[titleId]
    const neu = adnFolgenAdresse(stream.url, adnArchiv) ?? adnAdresseSchaerfen(stream.url, { kennung, staffel })
    if (!neu) return false
    stream.url = neu
    return true
  }
}

function belegeAdnAusGedaechtnis({ titles, schreibWurzel }: Pick<WeitereQuellenEingabe, 'titles' | 'schreibWurzel'>): AdnArchiv {
  /**
   * Was ADN uns längst gesagt hat — nachgelesen im eigenen Archiv.
   *
   * ADN nennt je Folge die Sprachen (`vde` = deutsche Synchro, `vostde` =
   * Untertitel), und die Rohantworten liegen seit dem 11.08.2026 unter
   * `data/adn-raw/`. Ein `dub: true` entstand daraus bisher aber nur auf einem
   * Umweg: über einen **Release**. Wo kein Termin herauskam — Katalogtitel,
   * Filme, OVAs —, blieb der Verweis bei „🇩🇪 ?", obwohl die Auskunft im Haus lag
   * (am 21.08.2026 bei 63 von 161 ADN-Verweisen).
   *
   * Wie eng ausgewertet wird und warum das keine menschliche Prüfung ersetzt,
   * steht in `lib/adn-sprachen.ts`. Hier zählt nur die Reihenfolge: Der Block
   * läuft **nach** `dub-confirmed.yaml` und rührt nur an, was noch `undefined`
   * ist. Ein Beispiel dafür, warum das nicht anders geht, ist KILL BLUE — der
   * Verweis trägt `dub: true` aus einer Anime2You-Meldung über eine Synchro ab
   * dem 24.08.2026, während das Archiv vom 21.08. zu Recht zwölf Folgen ohne
   * `vde` führt. Beide Angaben stimmen; die jüngere gewinnt.
   */
  // Das Gedächtnis schreibt nur der Bau; Checks geben eine Kulisse als `schreibWurzel` vor.
  const adnArchiv = ladeAdnArchiv({ pflegen: true, schreibWurzel })
  stelleAdnFolgenverweiseUm({ titles, adnArchiv })
  belegeAdnAusArchiv({ adnArchiv, titles })

  belegeAdnUeberKatalog({ titles })
  return adnArchiv
}

function entferneVerweiseOhneDeutsch({ titles, verweiseEntfernt }: Pick<WeitereQuellenEingabe, 'titles' | 'verweiseEntfernt'>): void {
  /**
   * Anbieter ohne deutsche Synchro fliegen ganz raus.
   *
   * Bis zum 15.08.2026 blieben sie stehen und trugen ein rotes „🇩🇪 ✕" — die
   * Begründung war, die Auskunft „dort nur Originalton" sei ja brauchbar. Für
   * diese Seite ist sie es nicht: Sie beantwortet **eine** Frage, und zwar wo
   * ein Anime auf Deutsch zu sehen ist. Daniel am 15.08.2026: „wir
   * interessieren uns als app nur für deutsche synchros, keine anderen
   * synchron sprachen".
   *
   * Betroffen sind nur Verweise mit einem **belegten** Nein — aus
   * `dub-confirmed.yaml` oder aus der Folgenliste einer Serienseite. Ein
   * unbeantwortetes `undefined` bleibt selbstverständlich stehen; das ist der
   * Normalfall und heißt „wir wissen es nicht", nicht „dort gibt es keine".
   */
  let ohneDeutsch = 0
  const regionGesperrt = regionGesperrteWege(ladeHandbelege())
  for (const title of titles.values()) {
    ohneDeutsch += entferneVerweiseMitNein(title, verweiseEntfernt, regionGesperrt)
    // `watchLinks` tragen keine Sprachangabe — sie sind Shops und Nischendienste,
    // zu denen niemand die Tonspur belegt. Sie bleiben unangetastet.
  }
  if (ohneDeutsch) log(`${ohneDeutsch} Verweise ohne deutsche Synchro entfernt`)
}

export function werteWeitereQuellenAus({ releases, titles, adnKatalog, adnVerweiseErgaenzt, verweiseEntfernt, schreibWurzel }: WeitereQuellenEingabe): WeitereQuellenErgebnis {
  uebernehmeAnisearchErstausgabe({ releases, titles })
  ergaenzeErstausgabeAusWikiUndHand({ titles })
  const { motnBelege, motnTon } = uebernehmeMotnTon({ releases, titles })
  setzeJoynPauschal(titles)
  const adnAdressen = schaerfeAdnAdressen({ adnKatalog, releases, titles, adnVerweiseErgaenzt })
  stelleRtlAdressenUm({ titles })
  const adnArchiv = belegeAdnAusGedaechtnis({ titles, schreibWurzel })
  const adnStreamSchaerfen = baueAdnStreamSchaerfer({ ...adnAdressen, adnArchiv })
  entferneVerweiseOhneDeutsch({ titles, verweiseEntfernt })
  const akibapass = setzeAkibapassSprache(titles.values(), readJson<AkibapassDatei>('data/akibapass-sprache.json', { seiten: {} }))
  if (akibapass) log(`${akibapass} Akibapass-Wege: Deutsch aus der Produktseite belegt`)
  return { adnArchiv, adnStreamSchaerfen, motnBelege, motnTon }
}
