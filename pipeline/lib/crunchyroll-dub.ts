/**
 * Was Crunchyrolls Serienseiten über die deutsche Tonspur verraten — und wie
 * weit man dem trauen darf.
 *
 * **Der Grundsatz, der alles andere bestimmt:** Crunchyrolls Staffeleinteilung
 * wird *nicht* übernommen. Sie ist hier ausschließlich Beleg für die Tonspur.
 * Daniel am 12.08.2026: „bau darauf achten nicht crunchyrolls fehler
 * nachzubauen" — es gibt dort Folgendoppelungen, mehrfache Wähler-Einträge zur
 * selben Staffel, und Blöcke, die zwei unserer Staffeln zusammenfassen. Die
 * saubere Einteilung liefern Netflix und Prime Video, und unsere eigene kommt
 * von AniList. Die bleibt maßgeblich.
 *
 * Daraus folgt die Reihenfolge der Fälle unten: Erst wird versucht, **ohne**
 * jede Zuordnung auszukommen. Nur wenn das nicht geht, wird gerechnet — und
 * wenn die Rechnung nicht exakt aufgeht, bleibt der Eintrag ungeklärt.
 */
import type { Title } from '../../shared/types.ts'
import { vollstaendigDeutsch } from './crunchyroll-vollstaendig.ts'
import { serienMitDeutsch } from './cr-dub-katalog.ts'

/**
 * Eine Folge, für die die Content-API eine deutsche Fassung führt.
 *
 * `verfuegbarAb` ist das `premium_available_date` **des deutschen Objekts**,
 * nicht das der Folge in der Staffelliste. Der Unterschied ist der ganze Punkt:
 * `/seasons/<id>/episodes` liefert immer die Episoden der Originalstaffel, und
 * deren Datumsfelder gehören zur japanischen Ausstrahlung. Für „Mushoku Tensei"
 * Staffel 3 stand dort der 04.07.2026 — die deutschen Folgen erschienen am
 * 19.08.2026.
 *
 * Das Feld wird derzeit von nichts ausgewertet. Es steht hier, weil es
 * ohnehin über die Leitung geht, sobald die deutsche Kennung gelesen wird, und
 * weil es ein **belegter deutscher Termin mit Uhrzeit** ist — die Terminlogik
 * daran anzuschließen ist eine eigene Aufgabe.
 */
export interface CrDeutscheFolge {
  /** Folgennummer, wie Crunchyroll sie führt. Fehlt bei Filmen und Specials. */
  nummer?: number
  /**
   * **Laufende Nummer im Block** (`sequence_number`, 17.09.2026). Crunchyroll
   * beginnt die Folgennummer in einem Block gelegentlich neu: „Captain Tsubasa
   * 2018" führt die Serie von 2018 (1–52) und „Junior Youth" (Nummern 1–39,
   * laufend 53–91) unter einer Kennung. Nur die laufende Nummer sagt, dass die
   * deutschen Folgen hinter dem Ende unserer 52-Folgen-Serie liegen.
   */
  laufend?: number
  /** Kennung der deutschen Fassung (`…DEDE`). */
  guid: string
  /** `premium_available_date` der deutschen Fassung, ISO in UTC. */
  verfuegbarAb?: string
}

export interface CrStaffel {
  name: string
  /** Verschiedene Folgennummern — nicht die Zahl der Kacheln. */
  folgen: number
  kacheln: number
  deutsch: number
  fremd: number
  /** Crunchyrolls Staffelkennung. Nur über die Content-API zu haben. */
  staffelId?: string
  /**
   * Führt die Staffel selbst eine `de-DE`-Fassung in `versions`?
   *
   * Das ist die Angabe eine Ebene über den Folgen und **nicht** dasselbe wie
   * `deutsch === folgen`: Eine laufende Staffel trägt die deutsche Fassung,
   * lange bevor alle ihre Folgen sie haben.
   */
  deutscheFassung?: boolean
  /** Je deutscher Folge die Kennung und der belegte deutsche Termin. */
  deutscheFolgen?: CrDeutscheFolge[]
}

export interface CrSerie {
  url: string
  /** Crunchyrolls Serienkennung, etwa `GRDV0019R`. Der Schlüssel zur API. */
  seriesId?: string
  /**
   * Woher die Angaben stammen.
   *
   * `'api'` ist der Regelweg über die Content-API. `'seitenanzeige'` ist die
   * Rückfallebene, die die gerenderte Serienseite liest — langsam, gröber und
   * von Crunchyrolls Übersetzungen abhängig. Das Feld steht hier, damit ein
   * späterer Vergleich weiß, was er vergleicht; alte Einträge tragen es nicht.
   */
  quelle?: 'api' | 'seitenanzeige'
  /**
   * Aus welchem **Länderkatalog** die Angaben stammen — `de`, `us`, oder gar nicht.
   *
   * Das entscheidende Feld dieser Datei, seit es zwei Stände gibt. Crunchyroll
   * leitet die Region aus der IP des Abrufs ab; GitHub-Runner stehen in den
   * USA, und aus US-Sicht trägt „Fairy Tail" durchgehend `ja-JP, en-US`,
   * während in Deutschland 277 Folgen deutsch sind. Ein
   * fehlendes `de-DE` aus dem US-Katalog belegt deshalb **nichts** — aus dem
   * deutschen belegt es das Gegenteil.
   *
   * `undefined` heißt „Region nicht belegt" und wird behandelt wie `us`: Alle
   * Einträge aus den Läufen bis zum 21.08.2026 tragen es nicht, und sie sind
   * ausnahmslos US (1.655 geprüfte Folgen mit `eligible_region: "US"`).
   */
  katalog?: string
  /**
   * Ein Staffelname nennt die deutsche Fassung, `versions` kennt sie nicht.
   *
   * Kein Grund, etwas nicht zu übernehmen — `versions` entscheidet. Das Feld
   * ist die Buchführung darüber, wie oft die Kontrolle danebenliegt; sähe man
   * hier ein Muster, wäre der Denkfehler unserer, nicht Crunchyrolls.
   *
   * Die Gegenrichtung steht bewusst **nicht** hier drin: Dass kein Block
   * „(German Dub)" heißt, ist bei neueren Titeln der Regelfall (dort heißen
   * alle neun Sprachblöcke gleich) und sagt über die Tonspur nichts.
   */
  namensWiderspruch?: string
  /**
   * `undefined` heißt **nicht gesehen**, nicht „kein Deutsch".
   *
   * Bis zum 20.08.2026 war das Feld ein schlichtes `boolean`, und jede Seite,
   * auf der die Audio-Zeile fehlte, wurde als `false` verbucht — ein
   * Fehlschlag als Befund. Der Unterschied ist an den Zahlen abzulesen: Von 767
   * Nicht-Funden hatten **202** überhaupt keine Audio-Zeile, und die alte
   * Slug-Adressform kam nur auf 12 Prozent Erfolg gegenüber 39 Prozent bei
   * `/series/<id>/` — dieselbe Seite, nur einmal vor und einmal nach der
   * Weiterleitung gelesen (Daniels Verdacht, 20.08.2026, und er stimmte).
   *
   * Deshalb drei Zustände statt zwei: `true` belegt, `false` belegt das
   * Gegenteil, `undefined` sagt „wir haben es nicht gesehen".
   */
  deutschImAngebot?: boolean
  /**
   * Crunchyroll sagt selbst, dass es die Serie nicht mehr gibt.
   *
   * Auf der Seite steht dann ein Banner: „Leider sind die Videos dieser Serie
   * nicht mehr verfügbar." Bis zum 21.08.2026 hat der Abruf daraus nichts
   * gemacht — er wartete zwanzig Sekunden auf eine Audio-Zeile, die es nie
   * geben würde, und meldete „keine Audio-Zeile gefunden". Eine Nicht-Antwort,
   * obwohl die Seite eine klare Antwort gibt (Daniel, 21.08.2026, an
   * „Dragon Ball" gezeigt).
   *
   * Das ist `available: false` und nicht `dub: false`: Es gibt dort kein
   * Angebot, nicht ein Angebot ohne deutsche Fassung.
   */
  nichtVerfuegbar?: boolean
  staffeln?: CrStaffel[]
  geprueftAm: string
  fehler?: string
}

export interface CrDubData {
  scrapedAt: string
  serien: CrSerie[]
}

/** Was wir über einen unserer Einträge auf Crunchyroll sagen können. */
export interface Urteil {
  titleId: number
  dub: boolean
  /** Woran es liegt — landet als Notiz in der Prüfliste und im Commit. */
  grund: string
}

/**
 * Beurteilt die Einträge, die auf **eine** Crunchyroll-Adresse zeigen.
 *
 * Drei Fälle, streng nach abnehmender Sicherheit:
 *
 * 1. **Kein einziger Block enthält eine deutsche Folge.** Die Audio-Zeile führt
 *    Deutsch, die Folgenliste aber nicht — das kommt vor, wenn Deutsch nur an
 *    einem Trailer hängt oder an einer Folge, die inzwischen weg ist.
 * 2. **Jeder Block ist vollständig deutsch.** Dann ist jeder unserer Einträge
 *    deutsch, egal wie die Blöcke geschnitten sind — ohne jede Zuordnung.
 * 3. **Gemischt.** Erst hier wird gerechnet, und nur mit exakt aufgehenden
 *    Summen (dieselbe Regel wie bei ADN). Geht sie nicht auf, bleibt alles
 *    offen. Lieber ein Fragezeichen als eine falsche Zahl.
 *
 * ## Warum „keine deutsche Tonspur auf der Seite" **kein** Fall mehr ist
 *
 * Bis zum 15.08.2026 bekam jede Adresse ohne „Deutsch" in der Audio-Zeile ein `dub: false` — „es werde
 * ja nur widerlegt, nie behauptet". **Falsch:** Crunchyroll zeigt nicht allen dasselbe (nicht
 * angemeldet, angemeldet ohne Abo, mit Abo sind drei Ansichten, Daniel 15.08.2026). Unser Scraper sieht
 * als Gast nicht, *was es gibt*, sondern *was ein Gast darf*. Der Lauf vom 12./13.08.2026 fand auf nur
 * 151 von 917 Seiten Deutsch und führte „Frieren" als Seite ohne Tonspur.
 *
 * Ein `false` kommt deshalb nur aus der **Folgenliste** (Fall 1 und 3), aus dem **deutschen Katalog** —
 * seit dem 22.08.2026 liest der Abruf über ein Zugangspaket von einer deutschen Leitung
 * (`lib/crunchyroll-api.ts`), ein fehlendes `de-DE` ist dort eine Aussage — oder von einem Menschen aus
 * `data/dub-confirmed.yaml`. Das gilt **ausschließlich** für `katalog === 'de'`; alles andere bleibt bei
 * der Vorsichtsregel, auch wenn es „bestimmt deutsch gemeint" ist. Die Trennlinie ist der Beleg.
 */
/**
 * **Serie ohne deutsches Angebot** — die Auskunft „Nein", mit zwei Ausnahmen.
 *
 * (1) Aus dem US-Katalog wird hier nie ein Nein (dort fehlt `de-DE` auch bei Serien, die in
 * Deutschland vollständig synchronisiert vorliegen). (2) Führt die **Serien-Tonspurliste** des
 * deutschen Katalogs `de-DE`, gibt es die deutsche Fassung — nur in einer anderen Staffel
 * (`…DEDE` statt `…JAJP`; 29.09.2026 an „Dragon Ball Z: Resurrection 'F'", siehe `cr-dub-katalog.ts`).
 */
function ohneDeutschesAngebot(serie: CrSerie, unsere: Title[], bloecke: number): Urteil[] {
  if (serie.katalog !== 'de') return []
  if (serie.seriesId && serienMitDeutsch().has(serie.seriesId)) {
    return unsere.map((t) => ({ titleId: t.id, dub: true, grund: 'Serien-Tonspurliste des deutschen Katalogs führt de-DE' }))
  }
  return unsere.map((t) => ({
    titleId: t.id,
    dub: false,
    grund: `deutscher Katalog führt in ${bloecke} Blöcken keine deutsche Fassung`,
  }))
}

/**
 * Weniger Einträge als Blöcke: der Reihenweg ist versperrt (Gun Gale Online: die
 * Summe ging am falschen Block auf, 21.08.2026), aber nicht jede Auskunft ist verloren.
 *
 * Gilt die Folgenzahl eines Eintrags **nur** für vollständig deutsche Blöcke, ist
 * gleichgültig, welcher gemeint ist (KONOSUBA `10/10 10/10 2/2 1/1 0/13`, 89 Serien
 * am 22.08.2026). Verlangt: (1) sie trifft einen vollständig deutschen Block, (2) kein
 * nicht durchgehend deutscher Block trägt dieselbe Zahl. Ein `dub: false` entsteht hier
 * nie — eine Zahl nur an undeutschen Blöcken hieße bloß, dass wir den deutschen nicht sehen.
 *
 * Jeder Eintrag steht für sich (seit 23.08.2026; Food Wars: die mehrdeutige Dreizehn
 * darf das Urteil der Zwölf nicht kosten).
 */
function urteileOhneReihenfolge(staffeln: CrStaffel[], unsere: Title[]): Urteil[] {
  // Crunchyroll zählt Specials mit: `12/13` ist zwölf deutsche Folgen plus ein Special
  // ohne Synchro (Food Wars Staffel 4, 23.08.2026). Die deutsche Zahl gilt nur bei Rest ≤ 2.
  const deutscheGroessen = new Set<number>()
  for (const s of staffeln) {
    if (s.folgen <= 0 || s.deutsch <= 0) continue
    if (s.deutsch === s.folgen) deutscheGroessen.add(s.folgen)
    else if (s.folgen - s.deutsch <= 2) deutscheGroessen.add(s.deutsch)
  }
  // Verdächtig ist die volle Zahl jedes nicht durchgehend deutschen Blocks: `12/13` blockiert die Dreizehn.
  const verdaechtig = new Set(
    staffeln.filter((s) => s.folgen > 0 && s.deutsch < s.folgen).map((s) => s.folgen),
  )
  const eindeutig: Urteil[] = []
  for (const t of unsere) {
    const n = t.episodes ?? 0
    if (!n || !deutscheGroessen.has(n) || verdaechtig.has(n)) continue
    eindeutig.push({
      titleId: t.id,
      dub: true,
      grund: `${n} Folgen treffen nur vollständig deutsche Blöcke`,
    })
  }
  return eindeutig
}

/**
 * Sammelt Einträge ab `zeiger`, bis eine der beiden gültigen Summen des Blocks erreicht ist.
 *
 * Nicht allein auf `block.folgen` zulaufen: Food Wars Staffel 4 hat dreizehn Einträge, zwölf
 * deutsch — unsere Zwölf-Folgen-Staffel wäre sonst nie ein Treffer (23.08.2026).
 */
function sammleBisSumme(block: CrStaffel, sortiert: Title[], zeiger: number): { summe: number; laenge: number } {
  let summe = 0
  let laenge = 0
  while (
    zeiger + laenge < sortiert.length &&
    summe < block.folgen &&
    !(block.deutsch > 0 && block.deutsch < block.folgen && summe === block.deutsch)
  ) {
    summe += sortiert[zeiger + laenge].episodes ?? 0
    laenge++
  }
  return { summe, laenge }
}

/**
 * Passt die Summe auf den Block? Zwei gültige Summen, weil `block.folgen` Specials, PVs und
 * Behind-the-Scenes mitzählt (Food Wars S4 13/12, Free! S1 14 mit zwei PV; Daniel 23.08.2026).
 * `deutsch` zählt nur bei kleinem Rest (≤ 2); sonst läge die Grenze wieder im Ungewissen.
 */
function summePasst(block: CrStaffel, summe: number): { passt: boolean; ueberDeutsch: boolean } {
  const rest = block.folgen - block.deutsch
  const ueberDeutsch = block.deutsch > 0 && summe === block.deutsch && rest > 0 && rest <= 2
  return { passt: summe === block.folgen || ueberDeutsch, ueberDeutsch }
}

/**
 * Legt unsere Einträge der Reihe nach an die Blöcke an; Summen müssen **exakt** aufgehen.
 *
 * Geht ein Block nicht auf, ist die **ganze Reihe** hinfällig (`return []`, kein `continue`):
 * Fruits Basket führt dort „(2019)" 0/25, „Staffel 2" 25/25, „The Final Season" 13/13, uns fehlt
 * Staffel 1 — die Reihe legte unsere zweite Staffel an den ersten Block und lieferte `dub: false`
 * für eine deutsche Staffel. Bleiben Einträge übrig, war die Reihe zu kurz: dann gilt nichts.
 * Teilweise deutsche Blöcke bleiben ohne Urteil.
 */
function urteileNachReihenfolge(staffeln: CrStaffel[], unsere: Title[]): Urteil[] {
  const sortiert = unsere.slice().sort((a, b) => (a.jpYear ?? 0) - (b.jpYear ?? 0) || a.id - b.id)
  const urteile: Urteil[] = []
  let zeiger = 0
  for (const block of staffeln) {
    if (zeiger >= sortiert.length) break
    const { summe, laenge } = sammleBisSumme(block, sortiert, zeiger)
    const { passt, ueberDeutsch } = summePasst(block, summe)
    if (!passt || laenge === 0) return []
    // `ueberDeutsch`: unsere Einträge decken genau die deutschen Folgen, der kleine Rest sind Specials ohne Synchro.
    const gruppe = sortiert.slice(zeiger, zeiger + laenge)
    if (block.deutsch === block.folgen || ueberDeutsch) {
      for (const t of gruppe) urteile.push({ titleId: t.id, dub: true, grund: `„${block.name}" vollständig deutsch` })
    } else if (block.deutsch === 0) {
      for (const t of gruppe) urteile.push({ titleId: t.id, dub: false, grund: `„${block.name}" ohne deutsche Folge` })
    }
    zeiger += laenge
  }
  if (zeiger < sortiert.length) return []
  return urteile
}

export function beurteile(serie: CrSerie, unsere: Title[]): Urteil[] {
  if (!unsere.length) return []

  const staffeln = serie.staffeln ?? []
  if (!staffeln.length) return []

  if (!serie.deutschImAngebot) return ohneDeutschesAngebot(serie, unsere, staffeln.length)

  const gesamtDeutsch = staffeln.reduce((n, s) => n + s.deutsch, 0)
  if (gesamtDeutsch === 0) {
    return unsere.map((t) => ({
      titleId: t.id,
      dub: false,
      grund: 'keine einzige Folge mit deutscher Tonspur',
    }))
  }

  const vollstaendig = staffeln.every((s) => s.folgen > 0 && s.deutsch === s.folgen)
  if (vollstaendig) return vollstaendigDeutsch(serie, staffeln, unsere)

  // Gemischter Fall. Die Reihe muss vorne anfangen: mit weniger Einträgen als Blöcken wird nicht der Reihe nach gerechnet.
  if (unsere.length < staffeln.length) return urteileOhneReihenfolge(staffeln, unsere)
  return urteileNachReihenfolge(staffeln, unsere)
}

/**
 * **Ein Block, der ganz deutsch ist, deckt eine oder mehrere unserer Staffeln.**
 *
 * `beurteileJeBlock` deckt Einzelserien, OVA-Blöcke und Filme mit eigenem
 * Block ab — nicht aber **mehrere Staffeln unter einem Block**.
 *
 * `beurteileNachFolgennummern` verlangt, dass Crunchyroll über die ganze Reihe
 * **durchzählt** — bei Golden Kamuy tut es das (12+12+12+13+13 = 62). Bei
 * Dr. Stone nicht: Dort beginnt **jeder Block bei 1**, und die Sperre gegen
 * überlappende Nummern greift zu Recht.
 *
 * Genau das macht die Zuordnung aber einfacher, nicht schwerer. Gemessen am
 * 29.08.2026:
 *
 *     Dr. STONE                    folgen 24  deutsch 24  fremd 0   Nummern 1..24
 *     Dr. STONE Staffel 2          folgen 11  deutsch 11  fremd 0   Nummern 1..11
 *     Dr. STONE Special Episode    folgen  1  deutsch  1  fremd 0   Nummern 1..1
 *     Dr. STONE Season 3           folgen 22  deutsch 22  fremd 0   Nummern 1..22
 *     Dr. STONE SCIENCE FUTURE     folgen 37  deutsch 37  fremd 0   Nummern 1..37
 *
 * Unsere acht Einträge dazu, nach Jahr: 24, 11, 1, 11, 11, 12, 12, 13. Die
 * Blöcke nehmen sie der Reihe nach auf, und es geht **exakt** auf:
 * 24 | 11 | 1 | 11+11 | 12+12+13. „Season 3" ist bei uns „New World" und „New
 * World Cour 2", „SCIENCE FUTURE" sind drei Cours — Crunchyroll bündelt, wir
 * trennen.
 *
 * **Drei Sperren, und jede ist nötig:**
 *
 * 1. **Nur restlos deutsche Blöcke** (`fremd === 0`, `deutsch === folgen`). Ein
 *    gemischter Block sagt nichts über eine einzelne unserer Staffeln — das ist
 *    eine Frage für `dubRanges`.
 * 2. **Nummern lückenlos ab 1.** Sonst zählt der Block anders, als wir annehmen.
 * 3. **Exakt aufgehen oder gar nichts.** Bleibt am Ende ein Eintrag übrig, wird
 *    die ganze Serie nicht beurteilt: Eine Zuordnung, die um eine Staffel
 *    verrutscht, behauptet Deutsch für etwas, das keiner geprüft hat.
 *
 * Die Reihenfolge ist der Anker — Crunchyroll liefert die Blöcke chronologisch,
 * und unsere Einträge werden nach Jahr sortiert. Namen taugen dafür nicht:
 * „Season 3" heißt bei uns „New World".
 */
export function beurteileBlockketten(serie: CrSerie, unsere: Title[]): Urteil[] {
  if (!unsere.length) return []
  if (serie.katalog !== 'de' || !serie.deutschImAngebot) return []

  /* Nur Blöcke, die restlos deutsch sind — in der Reihenfolge der Quelle. */
  const bloecke: { name: string; anzahl: number }[] = []
  for (const st of serie.staffeln ?? []) {
    const dt = (st.deutscheFolgen ?? [])
      .map((f) => f.nummer)
      .filter((n): n is number => typeof n === 'number' && Number.isFinite(n))
      .sort((a, b) => a - b)
    if (!dt.length) continue
    if ((st.fremd ?? 0) > 0) return []
    if (typeof st.folgen === 'number' && st.folgen !== dt.length) return []
    if (dt[0] !== 1 || dt[dt.length - 1] !== dt.length) return []
    bloecke.push({ name: st.name ?? '', anzahl: dt.length })
  }
  if (bloecke.length < 2) return []

  const sortiert = unsere.slice().sort((a, b) => (a.jpYear ?? 0) - (b.jpYear ?? 0) || a.id - b.id)
  if (sortiert.some((t) => !t.episodes)) return []

  const urteile: Urteil[] = []
  let i = 0
  for (const block of bloecke) {
    let summe = 0
    const gedeckt: Title[] = []
    while (i < sortiert.length && summe < block.anzahl) {
      summe += sortiert[i]!.episodes ?? 0
      gedeckt.push(sortiert[i]!)
      i++
    }
    if (summe !== block.anzahl) return []
    for (const t of gedeckt) {
      urteile.push({
        titleId: t.id,
        dub: true,
        grund:
          gedeckt.length > 1
            ? `Block "${block.name}" ist mit ${block.anzahl} Folgen restlos deutsch und deckt ${gedeckt.length} unserer Einträge`
            : `Block "${block.name}" ist mit ${block.anzahl} Folgen restlos deutsch`,
      })
    }
  }
  if (i !== sortiert.length) return []
  return urteile
}


/**
 * Zuordnung über die **durchgezählten Folgennummern** statt über Blockgrößen.
 *
 * ## Daniels Vorschlag (23.08.2026)
 *
 * „die zuordnung müsste man episodenspezifisch machen … wenn staffel trennung
 * eigentlich bei ep 12 zu ep 13 wäre, und crunchy einfach durchzählt, dann
 * wissen wir ja trotzdem das 13 eig staffel 2 folge 1 ist. also um ganz sicher
 * zu sein, sollten wir echte episoden immer durchzählen, und erst dann
 * versuchen sie in die muster zu gießen."
 *
 * Und zur Frage, wessen Staffelschnitt gilt: **unserer.** Cover, Titel, Jahr,
 * Folgenzahl und Sprecher kommen von AniList und aniSearch; käme die
 * Staffelabgrenzung von Crunchyroll, stünden zwei Wahrheiten in einer Zeile.
 * Crunchyroll liefert hier die Tonspur, nicht die Struktur.
 *
 * ## Warum das den Golden-Kamuy-Fall löst
 *
 * Dort führt Crunchyroll **einen** Block „Golden Kamuy" mit 49 Folgen — das
 * sind unsere Staffeln 1 bis 4. Über Blockgrößen ist da nichts zuzuordnen:
 * keine unserer Staffeln hat 49 Folgen. Über die Nummern schon, denn
 * Crunchyroll zählt hier durch:
 *
 * ```
 * Crunchyroll : Block 1 → Folgen 1–49 deutsch,  Final Season → 50–62 deutsch
 * wir         : 12 + 12 + 12 + 13 + 13 = 62     → 1–12, 13–24, 25–36, 37–49, 50–62
 * ```
 *
 * ## Die drei Sperren, ohne die es gefährlich wäre
 *
 * 1. **Nur bei durchlaufender Nummerierung.** Bei KONOSUBA beginnt jeder Block
 *    wieder bei 1 (`1…10`, `1…10`) — dort sagt eine Nummer nichts über die
 *    Staffel, und dieser Weg greift nicht. Gemessen am 23.08.2026: 36 Serien
 *    zählen durch, 162 blockweise.
 * 2. **Die Summe muss exakt aufgehen.** Unsere Folgenzahlen zusammen müssen der
 *    höchsten Folgennummer entsprechen. Fehlt uns eine Staffel, verschiebt sich
 *    sonst alles — genau der Fruits-Basket-Fehler, bei dem unser „2nd Season"
 *    an Crunchyrolls Staffel 1 geriet und ein falsches `dub: false` bekam.
 * 3. **Nur ganz oder gar nicht.** Eine Staffel, deren Nummern teils deutsch und
 *    teils nicht sind, bleibt ohne Urteil: Wo genau die Grenze liegt, ist eine
 *    Frage für `dubRanges`, nicht für ein Ja/Nein.
 */
export function beurteileNachFolgennummern(serie: CrSerie, unsere: Title[]): Urteil[] {
  if (!unsere.length) return []
  if (serie.katalog !== 'de' || !serie.deutschImAngebot) return []

  const bloecke = (serie.staffeln ?? []).filter((s) => (s.deutscheFolgen ?? []).length)
  if (bloecke.length < 2) return []

  const bereiche = bloecke.map((s) => {
    const n = (s.deutscheFolgen ?? [])
      .map((f) => f.nummer)
      .filter((x): x is number => typeof x === 'number' && Number.isFinite(x))
    return { von: Math.min(...n), bis: Math.max(...n), anzahl: n.length }
  })
  if (bereiche.some((b) => !Number.isFinite(b.von) || !Number.isFinite(b.bis))) return []

  // Sperre 1: Überlappen sich zwei Blöcke, zählt Crunchyroll je Block neu.
  const sortiertNachNummer = bereiche.slice().sort((a, b) => a.von - b.von)
  for (let i = 1; i < sortiertNachNummer.length; i++) {
    if (sortiertNachNummer[i].von <= sortiertNachNummer[i - 1].bis) return []
  }

  const deutscheNummern = new Set<number>()
  for (const s of bloecke) {
    for (const f of s.deutscheFolgen ?? []) {
      if (typeof f.nummer === 'number' && Number.isFinite(f.nummer)) deutscheNummern.add(f.nummer)
    }
  }

  const hoechste = Math.max(...bereiche.map((b) => b.bis))
  const sortiert = unsere.slice().sort((a, b) => (a.jpYear ?? 0) - (b.jpYear ?? 0) || a.id - b.id)
  const summe = sortiert.reduce((n, t) => n + (t.episodes ?? 0), 0)

  // Sperre 2: Die Reihe muss vollständig sein.
  if (!summe || summe !== hoechste) return []

  const urteile: Urteil[] = []
  let gelesen = 0
  for (const t of sortiert) {
    const anzahl = t.episodes ?? 0
    if (!anzahl) return []
    const von = gelesen + 1
    const bis = gelesen + anzahl
    gelesen = bis
    let deutsch = 0
    for (let n = von; n <= bis; n++) if (deutscheNummern.has(n)) deutsch++
    // Sperre 3: nur eindeutige Staffeln.
    if (deutsch === anzahl) {
      urteile.push({ titleId: t.id, dub: true, grund: `Folgen ${von}–${bis} bei Crunchyroll durchgehend deutsch` })
    } else if (deutsch === 0) {
      urteile.push({ titleId: t.id, dub: false, grund: `Folgen ${von}–${bis} bei Crunchyroll ohne deutsche Fassung` })
    }
  }
  return urteile
}

/**
 * Dritte Stufe: **je Titel der passende Block**, statt einer Gesamtrechnung.
 *
 * `beurteile()` verlangt, dass unsere Einträge die Blöcke einer Serie
 * vollständig decken — und lässt bei der kleinsten Abweichung alles fallen.
 * Das ist bei `dub: false` genau richtig, bei `dub: true` aber zu streng:
 * Gemessen am 26.08.2026 an 60 Titeln, deren deutsche Fassung in den Daten
 * belegt ist und trotzdem kein Urteil bekam.
 *
 * Vier der Fälle, alle mit demselben Muster:
 *
 * | Unser Titel | Block | warum es scheiterte |
 * |---|---|---|
 * | One-Punch Man (12) | „Season 1": 12 F, 12 deutsch | ein vierter Block mit 1 Folge ging nicht auf |
 * | PSYCHO-PASS 2 (11) | „PSYCHO-PASS 2": 11 F, 11 deutsch | „Extended Edition" hat auch 11 Folgen |
 * | Durarara!! (24) | „Durarara (German Dub)": 25 F, 25 deutsch | 24 ≠ 25 |
 * | High School DxD HERO (13) | „Hero": 13 F, 12 deutsch | 12 ≠ 13 |
 *
 * **Der Denkfehler war die Frage.** Für `dub: true` lautet sie nicht „decken
 * unsere Staffeln diese Blöcke exakt ab", sondern „gibt es diese Serie auf
 * Deutsch". Dafür genügt ein Block, der zum Titel gehört und deutsche Folgen
 * führt. Ob er 24 oder 25 davon hat, ändert an der Antwort nichts.
 *
 * **Für `dub: false` bleibt es bei der strengen Regel.** Diese Stufe setzt
 * ausschließlich `true` — ein fehlendes Deutsch ist hier kein Befund, sondern
 * eine offene Frage, und die beantwortet `beurteile()` mit seiner Vorsicht.
 *
 * Zugeordnet wird über den **Namen**, und zwar über Gleichheit: Ein Block
 * gehört zu einem Titel, wenn beide Namen nach dem Kürzen übereinstimmen.
 * Passen zwei Blöcke, wird nichts gesetzt — dann ist die Zuordnung
 * mehrdeutig, und geraten wird nicht.
 */
/**
 * **Liegen alle deutschen Folgen hinter dem Ende unseres Titels?**
 *
 * Dann gehören sie einem späteren Teil, den Crunchyroll unter derselben
 * Kennung führt (Captain Tsubasa 2018: deutsch sind laufend 53–91, unsere Serie
 * hat 52 Folgen). Gemessen am 17.09.2026 über 248 Serien mit genau einem Titel
 * an der Adresse: genau dieser eine Fall. Ohne laufende Nummern keine Aussage.
 */
export function deutscheFolgenNachDemEnde(
  bloecke: { deutscheFolgen?: CrDeutscheFolge[] }[],
  folgen: number | undefined,
): boolean {
  if (!folgen) return false
  const laufend = bloecke.flatMap((b) => (b.deutscheFolgen ?? []).map((f) => f.laufend))
  if (!laufend.length || laufend.some((x) => typeof x !== 'number')) return false
  return Math.min(...(laufend as number[])) > folgen
}

/**
 * **Ein Kapitel ist eine Folge im Block der Filmreihe** (17.09.2026).
 *
 * Crunchyroll führt „Princess Principal: Crown Handler" als **einen** Block mit
 * vier Folgen („Crown Handler I" bis „IV"), unser Bestand vier Filme „… -
 * Chapter 1" bis „4". Deutsch sind nur I und II. Zugeordnet wird, wenn der Name
 * ohne „Chapter N" genau einen Block der Serie benennt und N in dessen
 * Folgenzahl liegt. Gemessen über den Bestand: genau diese vier Filme. Ein Nein
 * nur aus dem deutschen Katalog; sonst `undefined`.
 */
export function kapitelImBlock(serie: CrSerie, title: Title): boolean | undefined {
  if (!['MOVIE', 'OVA', 'SPECIAL', 'ONA'].includes(title.format ?? '')) return undefined
  const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  for (const name of [title.titleRomaji, title.titleEn, title.titleDe]) {
    /*
      Hinter der Nummer darf ein Untertitel stehen: AniList führt Kapitel 1 als
      „Princess Principal: Crown Handler - Chapter 1: BUSY EASY MONEY", Kapitel 2 ohne.
      Das alte Muster verlangte die Nummer am Ende, Kapitel 1 blieb dadurch ohne Urteil,
      obwohl Crunchyroll dort de-DE führt (18.09.2026).
    */
    const m = /^(.*?)[\s:–-]*(?:chapter|kapitel|part|teil)\s*(\d+)(?:\s*[:：–-].*)?\s*$/i.exec(name ?? '')
    if (!m) continue
    const bloecke = (serie.staffeln ?? []).filter((b) => norm(b.name ?? '') === norm(m[1]!))
    const nr = Number(m[2])
    if (bloecke.length !== 1 || nr < 1 || nr > bloecke[0]!.folgen) continue
    const deutsch = (bloecke[0]!.deutscheFolgen ?? []).some((f) => f.nummer === nr)
    return deutsch || serie.katalog === 'de' ? deutsch : undefined
  }
  return undefined
}

/**
 * **Ein Block, den unser Titel und sein zweiter Teil zusammen füllen.**
 *
 * „Sword Art Online Alicization War of Underworld" führt bei Crunchyroll 23 deutsche Folgen.
 * Bei uns sind das zwei Einträge: War of Underworld (12) und dessen Teil 2 (11). Keiner der
 * anderen Wege fand Teil 2 — der Name des Blocks trifft nur den ersten, eine Blockkette
 * scheitert an der Adresse (dort liegt auch „Alicization" mit 25 Folgen, von denen 24 deutsch
 * sind, und die Kette bricht bei jedem unvollständigen Block ab). Teil 2 stand deshalb ohne
 * Sprachurteil als Crunchyroll-Aufgabe in der Statusanzeige, obwohl es dort keinen Melder gibt.
 *
 * **Die Regel ist bewusst eng.** Eine bloße Summe zweier aufeinanderfolgender Titel trifft im
 * Bestand 271 Blöcke, und fast alle davon zufällig — ein Film plus eine Serie ergeben auch 13.
 * Gefordert sind deshalb vier Dinge zugleich:
 *
 * 1. Der Block ist **restlos deutsch** und zählt von 1 durch.
 * 2. Genau **ein** Titel der Adresse trägt den Namen des Blocks.
 * 3. Genau **ein weiterer** Titel derselben Adresse trägt denselben Namen mit Zusatz —
 *    „… – Teil 2", „… Cour 2", „… OVAs".
 * 4. Beide zusammen ergeben **exakt** die Folgenzahl des Blocks.
 *
 * Gemessen am 23.09.2026 über den ganzen Bestand: acht Treffer, kein Widerspruch. Sieben davon
 * hatten bereits über andere Wege ein „deutsch" — die Regel bestätigt sie also, statt Neues zu
 * behaupten (Haikyu!! To the Top, Dead Mount Death Play, Ancient Magus' Bride Staffel 2, Space
 * Dandy, Kokoro Connect, Interviews mit Monster-Mädchen, Chunibyo Heart Throb). Der achte ist
 * der Fall, um den es geht.
 */
export function beurteileTeilblock(serie: CrSerie, unsere: Title[]): Urteil[] {
  if (serie.katalog !== 'de' || unsere.length < 2) return []
  const kurz = (t: string | undefined | null): string =>
    (t ?? '')
      .toLowerCase()
      .replace(/\((german dub|dt\. opening|deutscher dub)\)/g, '')
      .replace(/[^a-z0-9]/g, '')
  const namen = (t: Title): string[] => [t.titleRomaji, t.titleEn, t.titleDe].filter(Boolean).map((n) => kurz(n))

  const raus: Urteil[] = []
  for (const block of serie.staffeln ?? []) {
    const dt = (block.deutscheFolgen ?? [])
      .map((f) => f.nummer)
      .filter((n): n is number => typeof n === 'number' && Number.isFinite(n))
      .sort((a, b) => a - b)
    if (!dt.length || (block.fremd ?? 0) > 0) continue
    if (typeof block.folgen === 'number' && block.folgen !== dt.length) continue
    if (dt[0] !== 1 || dt[dt.length - 1] !== dt.length) continue

    const bn = kurz(block.name)
    /* Ein kurzer Blockname („OVAs", „Season 1") trifft zu viele — dafür gibt es andere Wege. */
    if (bn.length < 8) continue

    const kopf = unsere.filter((t) => namen(t).includes(bn))
    if (kopf.length !== 1) continue
    const erster = kopf[0]!
    const weitere = unsere.filter((t) => t !== erster && namen(t).some((n) => n.startsWith(bn) && n.length > bn.length))
    if (weitere.length !== 1) continue
    const zweiter = weitere[0]!
    if (!erster.episodes || !zweiter.episodes) continue
    if (erster.episodes + zweiter.episodes !== dt.length) continue

    for (const t of [erster, zweiter]) {
      raus.push({
        titleId: t.id,
        dub: true,
        grund: `Block „${block.name}" ist mit ${dt.length} Folgen restlos deutsch und deckt ${erster.episodes} + ${zweiter.episodes} unserer Folgen`,
      })
    }
  }
  return raus
}

/*
  Gekürzt wird auf Kleinbuchstaben und Ziffern. „PSYCHO-PASS 3: First
  Inspector" und „PSYCHO-PASS 3 FIRST INSPECTOR" sind danach dasselbe; die
  Zusätze „(German Dub)" und „(Dt. Opening)" fallen weg, weil sie über die
  Tonspur reden, nicht über den Titel.
*/
const kurzBlock = (t: string | undefined | null) =>
  (t ?? '')
    .toLowerCase()
    .replace(/\((german dub|dt\. opening|deutscher dub)\)/g, '')
    .replace(/[^a-z0-9]/g, '')

function urteilEinzigeSerie(bloecke: CrStaffel[], unsere: Title[]): Urteil[] | null {
  /**
   * **Eine einzelne Serie an der Adresse braucht keinen Namensvergleich.**
   *
   * Ist genau **ein** Titel offen und ist er eine Serie, dann gehören ihm die
   * deutschen Folgen dieser Adresse — welcher Block sie führt, ändert daran
   * nichts. Gemessen am 27.08.2026 an den Fällen, die der Namensvergleich
   * liegen ließ:
   *
   * | Unser Titel | Blöcke | warum der Name nicht half |
   * |---|---|---|
   * | Durarara!! (24) | „Durarara (German Dub)": 25 deutsch | Zusatz im Namen |
   * | One-Punch Man (12) | „Season 1": 12 deutsch | Block heißt nur „Season 1" |
   * | Sound! Euphonium (13) | „Sound! Euphonium": 14 deutsch | 13 ≠ 14 |
   *
   * **Specials und Filme sind ausgenommen**, und das ist der Kern der Regel:
   * Sie stehen in keinem der Blöcke. „Fairy Tail: Phoenix Priestess" ist ein
   * Film an einer Adresse, deren Blöcke 175 deutsche Serienfolgen führen — der
   * Film selbst könnte trotzdem untertitelt sein. „Sword Art Online EXTRA
   * EDITION" genauso.
   *
   * Bleiben mehrere Titel offen, entscheidet weiterhin der Name: Bei „Free!"
   * hängen vier Specials an einer Adresse, und nur einer der Blöcke führt
   * Deutsch.
   */
  const serien = unsere.filter((t) => t.format === 'TV' || t.format === 'ONA')
  if (serien.length === 1 && unsere.length === 1) {
    const deutscher = bloecke.find((b) => (b.deutscheFolgen?.length ?? b.deutsch ?? 0) > 0)
    if (deutscher && !deutscheFolgenNachDemEnde(bloecke, serien[0]!.episodes)) {
      return [
        {
          titleId: serien[0]!.id,
          dub: true,
          grund: `einzige Serie an dieser Adresse; Block „${deutscher.name}" führt deutsche Folgen`,
        },
      ]
    }
  }
  return null
}

function urteileSonderblock(bloecke: CrStaffel[], unsere: Title[]): Urteil[] {
  const raus: Urteil[] = []

  /*
    **Ein OVA-Block gehört den OVAs — wenn die Summe exakt aufgeht.**

    Crunchyroll führt Sonderfolgen in einem eigenen Block „OVAs" oder
    „Specials". Der Namensabgleich weiter unten findet ihn nie: Unser Titel
    heißt „Mob Psycho 100 Reigen: Der Unbekannte Typ mit Kräften", der Block
    schlicht „OVAs".

    Zugeordnet wird deshalb über die **Folgenzahl**, und zwar mit derselben
    Strenge wie bei den ADN-Staffelblöcken: Ergeben unsere OVA- und
    Special-Titel an dieser Adresse zusammen exakt die Folgenzahl des Blocks,
    ist die Zuordnung eindeutig. Geht sie nicht auf, bleibt der Block lieber
    unzugeordnet, als einen fremden Titel mitzubringen.

    Gemessen am 28.08.2026: vier Titel in zwei Reihen (Dragon Maid, Mob Psycho
    100), jeweils zwei OVAs à einer Folge gegen einen Block mit zwei Folgen,
    beide deutsch.

    **Serien bleiben außen vor.** Ein TV-Titel darf nie über einen OVA-Block
    beurteilt werden — das wäre genau die Vererbung, die der Kommentar weiter
    unten als Fehler beschreibt.
  */
  const sonderTitel = unsere.filter((t) => t.format === 'OVA' || t.format === 'SPECIAL')
  if (sonderTitel.length) {
    const sonderBlock = bloecke.find((b) => /^s*(ovas?|specials?)s*$/i.test((b.name ?? '').trim()))
    const summe = sonderTitel.reduce((n, t) => n + (t.episodes ?? 0), 0)
    const deutsch = sonderBlock ? (sonderBlock.deutscheFolgen?.length ?? sonderBlock.deutsch ?? 0) : 0
    if (sonderBlock && summe > 0 && summe === (sonderBlock.folgen ?? -1) && deutsch > 0) {
      for (const t of sonderTitel) {
        raus.push({
          titleId: t.id,
          dub: true,
          grund: `Block „${sonderBlock.name}" mit ${sonderBlock.folgen} Folgen, ${deutsch} deutsch; unsere Sonderfolgen ergeben zusammen genau diese Zahl`,
        })
      }
    }
  }
  return raus
}

function urteileFilme(serie: CrSerie, bloecke: CrStaffel[], unsere: Title[], bisher: Urteil[]): Urteil[] {
  const raus: Urteil[] = []

  /*
    **Ein Film mit eigenem Block wird über ihn beurteilt — auch verneinend.**

    Die Verneinung weiter oben gilt der ganzen Serie: „deutscher Katalog führt in
    N Blöcken keine deutsche Fassung". Ein Film an einer Serienadresse fällt
    durch, sobald irgendein Block der Reihe Deutsch führt — bei „Rascal Does Not
    Dream of a Sister Venturing Out" ist die Serie deutsch, der Film nicht.

    Trägt der Film einen **gleichnamigen** Block und stammt die Auskunft aus dem
    **deutschen** Katalog, ist das derselbe Beleggrad wie bei der Serie: Der
    Katalog kennt den Block und nennt keine deutsche Fassung.

    Zwei Bedingungen halten das eng: der Namenstreffer muss exakt sein (nach der
    Kürzung), und `katalog === 'de'` — aus dem US-Katalog wird nie ein Nein,
    das ist die Regel seit dem 22.08.2026.
  */
  if (serie.katalog === 'de') {
    for (const film of unsere.filter((t) => t.format === 'MOVIE')) {
      if (bisher.some((u) => u.titleId === film.id) || raus.some((u) => u.titleId === film.id)) continue
      const namen = [film.titleRomaji, film.titleEn, film.titleDe].map(kurzBlock).filter((n) => n.length >= 4)
      const eigener = bloecke.filter((b) => namen.includes(kurzBlock(b.name)))
      if (eigener.length !== 1) continue
      const block = eigener[0]!
      const deutsch = block.deutscheFolgen?.length ?? block.deutsch ?? 0
      if (deutsch > 0) continue
      raus.push({
        titleId: film.id,
        dub: false,
        grund: `eigener Block „${block.name}" im deutschen Katalog, ${block.folgen} Folgen, keine davon deutsch`,
      })
    }
  }
  return raus
}

function urteilNachName(serie: CrSerie, bloecke: CrStaffel[], titel: Title): Urteil | null {
  const namen = [titel.titleRomaji, titel.titleEn, titel.titleDe].map(kurzBlock).filter((n) => n.length >= 4)
  if (!namen.length) return null

  /*
    **Nur exakte Gleichheit — ein Präfix reicht nicht.** Sonst erbte jedes
    Special das Urteil seiner Hauptserie („Sword Art Online EXTRA EDITION" den
    Block „Sword Art Online"); es ist ein eigenes Werk mit eigener Tonspur-Frage.
    Was sich im Zusatz unterscheidet, fällt heraus — die richtige Seite zum Irren.
  */
  const treffer = bloecke.filter((b) => {
    const bn = kurzBlock(b.name)
    if (bn.length < 4) return false
    return namen.some((n) => bn === n)
  })
  if (!treffer.length) return null
  /* Passen zwei Blöcke gleich gut, ist die Zuordnung mehrdeutig. */
  if (treffer.length > 1) return null
  const block = treffer[0]!
  const deutsch = block.deutscheFolgen?.length ?? block.deutsch ?? 0
  /* Auch über den Namen nicht, wenn die deutschen Folgen hinter unserem Ende liegen (Captain Tsubasa). */
  if (deutsch > 0 && deutscheFolgenNachDemEnde([block], titel.episodes)) return null
  if (deutsch > 0) {
    return {
      titleId: titel.id,
      dub: true,
      grund: `Block „${block.name}“: ${deutsch} deutsche Folgen, ueber den Namen zugeordnet`,
    }
  }
  /**
   * **Und der gleichnamige Block ohne deutsche Folge belegt das Nein.**
   *
   * Freigegeben von Daniel am 30.08.2026 (Beispiele „Fruits Basket", „Bofuri").
   * Gleicher Beleggrad wie bei `beurteile()`: Der **deutsche** Katalog kennt
   * den Block und führt keine deutsche Fassung. Bedingungen:
   *
   * - `katalog === 'de'` — aus dem US-Katalog belegt ein fehlendes `de-DE` nichts.
   * - Name exakt gleich (oben geprüft).
   * - **Folgenzahl exakt gleich**: ein gleichnamiger Block kann eine andere
   *   Ausgabe derselben Serie sein; dann wird nichts behauptet.
   *
   * Ein Nein entfernt den Verweis, deshalb die strengste Prüfung des Laufs.
   */
  if (serie.katalog !== 'de') return null
  if (!titel.episodes || !block.folgen || titel.episodes !== block.folgen) return null
  return {
    titleId: titel.id,
    dub: false,
    grund:
      `Block „${block.name}“ im deutschen Katalog: ${block.folgen} Folgen wie unser Eintrag, ` +
      `keine davon deutsch`,
  }
}

export function beurteileJeBlock(serie: CrSerie, unsere: Title[]): Urteil[] {
  const bloecke = serie.staffeln ?? []
  if (!bloecke.length) return []

  const einzige = urteilEinzigeSerie(bloecke, unsere)
  if (einzige) return einzige

  const raus: Urteil[] = urteileSonderblock(bloecke, unsere)
  raus.push(...urteileFilme(serie, bloecke, unsere, raus))

  for (const titel of unsere) {
    /* Wer schon über den Sonderblock beurteilt ist, wird nicht zweimal gewertet. */
    if (raus.some((u) => u.titleId === titel.id)) continue
    const urteil = urteilNachName(serie, bloecke, titel)
    if (urteil) raus.push(urteil)
  }
  return raus
}

