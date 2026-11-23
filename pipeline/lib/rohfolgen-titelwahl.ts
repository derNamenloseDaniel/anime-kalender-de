/**
 * Welcher unserer Titel gehört zu einer gemeldeten Adresse? Der erste Teil des Zuordners aus `fetch-rohfolgen.ts`
 * (ausgelagert, Inhalt und Reihenfolge der Stufen unverändert): Kennung, Bestandsadresse, Suchadresse, Name, Folgentitel.
 * Daten kommen als Parameter und gehen als Rückgabe; geteilte Zustände gibt es nicht.
 */
import { warn } from './util.ts'
import { restTitel } from './rohfolgen-cartoons.ts'
import { titelSchluessel, type Rohfolge, type TmdbEintrag } from './rohfolgen-zeile.ts'
import { folgenKern, type AsFolgeRoh } from '../../shared/folgen-zuordnung.ts'
import type { Offen } from './rohfolgen-abschluss.ts'
import type { Title } from '../../shared/types.ts'

/** Welcher Titel führt welche Folgentitel (Kerne), einmal je Lauf gebaut. */
export interface FolgenKarten {
  /** aniSearch und TMDB zusammen. */
  jeTitel: Map<number, Set<string>>
  /** Dieselben Folgentitel aus aniSearch allein — der Schiedsrichter bei Gleichstand. */
  nurAniSearch: Map<number, Set<string>>
}

export interface TitelKontext {
  titles: Title[]
  suchZuTitel: Map<string, Set<number>>
  karten: FolgenKarten
}

/** Ergebnis der Titelwahl einer Adresse. */
export interface TitelWahl {
  treffer: Title[]
  /** Kam der Treffer aus dem Bestand selbst — Kennung oder hinterlegte Adresse? */
  ausBestand: boolean
  /**
   * Hat der **Name** genau getroffen (nicht nur als Anfang)? Entscheidet
   * weiter unten, ob ein Beleg ohne Folgenzuordnung tragfähig ist.
   */
  nameGenau: boolean
  /** Der Titel wurde allein über seine Folgentitel gefunden. */
  ueberFolgentitel: boolean
}

/*
  Jede Suchadresse, die aus einem unserer Titel entstehen kann — mit allen
  Einträgen, auf die sie passt. Eine Adresse mit mehr als einem Eintrag wird
  unten nicht verwendet.
*/
export function baueSuchZuTitel(titles: Title[]): Map<string, Set<number>> {
  const suchZuTitel = new Map<string, Set<number>>()
  for (const t of titles) {
    for (const name of [t.titleDe, t.titleEn, t.titleRomaji]) {
      if (!name) continue
      const u = `https://www.amazon.de/s?k=${encodeURIComponent(name)}&i=instant-video`
      const da = suchZuTitel.get(u) ?? new Set<number>()
      da.add(t.id)
      suchZuTitel.set(u, da)
    }
  }
  return suchZuTitel
}

/*
  **Welcher Titel führt welche Folgentitel — der Anker für den letzten Fall.**

  Gebaut aus beiden Quellen: aniSearch (deutsche Folgentitel, wie unser
  Bestand aufgeteilt) und TMDB (dieselben aus zweiter Hand). Ein Titel, dessen
  Folgen die gemeldeten treffen, ist der gesuchte — ganz ohne eine Angabe des
  Anbieters.

  Gebaut wird die Karte einmal, nicht je Adresse: 510 aniSearch-Titel und 808
  von TMDB, zusammen rund 17.000 Folgentitel.

  **Dieselben Folgentitel aus aniSearch allein — der Schiedsrichter bei Gleichstand.**

  TMDB führt Staffeln regelmäßig unter **einer** Serie und hängt alle Folgen
  daran; aniSearch legt je Staffel einen eigenen Artikel an. Wo zwei unserer
  Titel denselben Namen tragen, trifft die TMDB-Liste deshalb beide gleich gut,
  und der Gleichstand ist unauflösbar.

  Gemessen am 02.09.2026 an „Legend of the Galactic Heroes: Die Neue These" —
  zwei Einträge mit demselben deutschen und englischen Namen, unterschieden nur
  im Romaji (Kaikou gegen Seiran), den Prime nicht führt:

  | Titel | aniSearch trifft „In ewiger Nacht" | TMDB trifft |
  |---|---|---|
  | 20628 (Kaikou) | **ja** | ja |
  | 100780 (Seiran) | nein | ja |

  Die feinere Quelle entscheidet also, und sie hat recht: Die Folge steht in
  aniSearch-Artikel 10688, der zu 20628 gehört.
*/
export function baueFolgenKarten(
  titles: Title[],
  asKennung: Record<string, { anisearchId?: number }>,
  asFolgen: Record<string, { folgen: AsFolgeRoh[] }>,
  tmdbFolgen: Record<string, TmdbEintrag>,
): FolgenKarten {
  const jeTitel = new Map<number, Set<string>>()
  const nurAniSearch = new Map<number, Set<string>>()
  for (const t of titles) {
    const menge = new Set<string>()
    const nurAs = new Set<string>()
    const asId = asKennung[String(t.id)]?.anisearchId
    for (const f of asId ? (asFolgen[String(asId)]?.folgen ?? []) : []) {
      for (const name of [f.de, f.en]) {
        const k = folgenKern(name)
        if (k && k.length >= 5) {
          menge.add(k)
          nurAs.add(k)
        }
      }
    }
    for (const f of tmdbFolgen[String(t.id)]?.folgen ?? []) {
      const k = folgenKern(f.titel)
      if (k && k.length >= 5) menge.add(k)
    }
    if (menge.size) jeTitel.set(t.id, menge)
    if (nurAs.size) nurAniSearch.set(t.id, nurAs)
  }
  return { jeTitel, nurAniSearch }
}

/**
 * Der Titel einer Adresse: Kennung, Bestand, Suchadresse, Name, zuletzt die Folgentitel. Zwei oder null Treffer
 * heißen: nicht entschieden — der Aufrufer legt die Adresse dann offen ab (`offenOhneTitel`).
 */
export function waehleTitel(liste: Rohfolge[], ctx: TitelKontext): TitelWahl {
  const { titles, suchZuTitel } = ctx
  const url = liste[0]!.url
  /*
    **Die gemeldete Kennung entscheidet, nicht die Adresse.**

    Bis zum 28.08.2026 lief die Zuordnung ueber `titles.streams.url`. Ein
    Titel ohne Verweis steht dort nicht — und genau die stehen in der
    Pruefliste. Gemessen: 1 von 67 Adressen zugeordnet, 66-mal „kein Titel
    zu dieser Adresse".

    Seit Migration 018 traegt jede Rohfolge `titel_id`. Die Adresse bleibt
    als Rueckfall fuer alles, was vorher gemeldet wurde.
  */
  const gemeldeteId = liste.find((f) => Number.isFinite(f.titel_id))?.titel_id ?? null
  const echteId = korrigiereKennung(liste, url, gemeldeteId, titles)
  const treffer = echteId
    ? titles.filter((t) => t.id === echteId)
    : titles.filter((t) => (t.streams ?? []).some((s) => s.url === url || s.seite === url)) ||
      []
  const ausBestand = treffer.length === 1
  /*
    **Eine Suchadresse trägt ihre Herkunft im Suchbegriff — sie stammt von uns.**

    `tools/extension-offene-amazon.mjs` baut sie als
    `amazon.de/s?k=${encodeURIComponent(unserTitel)}&i=instant-video`. Die
    Rückrichtung ist damit kein Namensabgleich, sondern das Umkehren einer
    Kodierung: Wer denselben Ausdruck über alle unsere Titel legt, findet
    genau den einen, aus dem die Adresse entstand.

    **Der Ertrag ist der Grund, warum es das gibt.** Am 29.08.2026 lagen 95
    Adressen mit **5.435 gemeldeten Folgen** unzugeordnet — Daniels Arbeit von
    Tagen. 79 davon sind Suchadressen, und **alle 79** lösen sich hierüber
    auf: 4.398 Folgen.

    **Mehrdeutige bleiben offen.** 69 der 6.461 möglichen Adressen führen auf
    mehr als einen Eintrag — „Appleseed" gibt es als Film von 1988 und als
    Serie, „Gantz" zweimal. Dort entscheidet nicht die Adresse, sondern nur
    eine Meldung mit Kennung; ein Ratespiel wäre schlimmer als ein offener
    Fall.
  */
  if (!treffer.length && suchZuTitel.has(url)) {
    const ids = suchZuTitel.get(url)!
    if (ids.size === 1) treffer.push(titles.find((t) => t.id === [...ids][0])!)
  }
  let nameGenau = false
  if (!treffer.length) {
    const ausName = titelAusName(liste, titles)
    if (ausName) {
      treffer.push(ausName.titel)
      nameGenau = ausName.genau
    }
  }
  let ueberFolgentitel = false
  if (treffer.length !== 1) {
    const gefunden = titelAusFolgentiteln(liste, treffer, ctx)
    if (gefunden) {
      treffer.length = 0
      treffer.push(gefunden)
      ueberFolgentitel = true
    }
  }
  return { treffer, ausBestand, nameGenau, ueberFolgentitel }
}

/** Die Adresse bleibt offen: kein oder mehr als ein Titel. `mitKennung` sagt, ob die Meldung eine Kennung brachte. */
export function offenOhneTitel(liste: Rohfolge[], treffer: Title[]): Offen {
  return {
    url: liste[0]!.url,
    titel: restTitel(liste),
    grund: treffer.length ? `${treffer.length} Titel teilen diese Adresse` : 'kein Titel zu dieser Adresse',
    folgen: liste.length,
    /*
      **Ob die Meldung überhaupt eine Kennung mitbrachte.**

      Ohne sie kann die Zuordnung nur über die Adresse gehen, und die kennt
      unser Bestand oft nicht — dann ist „nicht zugeordnet" kein Fehler,
      sondern die Folge einer alten Meldung. Vom 28. bis 31.08.2026 kamen
      alle 795 Rohfolgen so an (`titelId` lag in der Prüfliste eine Ebene
      zu tief). Die Zusicherung in `check-logic.ts` unterscheidet daran,
      ob eine Null Anlass zur Sorge ist.
    */
    mitKennung: liste.some((f) => f.titel_id != null),
  }
}

/*
  **Die gemeldete Kennung ist ein Vorschlag — die Folgendaten überstimmen ihn.**

  Amazon tauscht beim Wechsel über das Auswahlfeld den Quelltext nicht aus
  (siehe `CLAUDE.md`). Die Adresse wandert zur neuen Staffel, die
  Folgenliste bleibt die der alten — und die Meldung trägt dann die
  Kennung des **Auftrags** über Folgen, die zu einem anderen Teil gehören.

  Gemessen am 04.09.2026 an „Takagi-san": Die Meldung zeigt auf 107068
  (Staffel 2, 2019), ihre zwölf Folgen tragen die Termine 08.01. bis
  26.03.2018 — Staffel 1 (99468). Daniel hat es an der Seite bestätigt und
  den Weg vorgegeben: „falsche staffel kennung bug kennen wir von früheren
  extension versionen, ähnliche verweise entsprechend datum der episoden
  auflösen."

  **Vier Bedingungen, und alle vier müssen halten** — sonst wäre es Raten:

  1. Die Rohfolgen nennen überhaupt ein Jahr (Prime schreibt „8. Jan. 2018").
  2. Der gemeldete Titel hat ein **anderes** Erstausstrahlungsjahr.
  3. In **derselben Reihe** gibt es genau **einen** Teil mit diesem Jahr.
  4. Er hat dieselbe Folgenzahl wie die Meldung.

  Trifft eine nicht zu, bleibt die gemeldete Kennung stehen. Ein zweiter
  Kandidat, ein fehlendes Jahr oder eine abweichende Folgenzahl heißt: Wir
  wissen es nicht, und `ordneZu` lässt die Adresse dann offen — das ist die
  richtige Seite zum Irren.
*/
function korrigiereKennung(liste: Rohfolge[], url: string, gemeldeteId: number | null, titles: Title[]): number | null {
  const jahreDerFolgen = new Set(
    liste
      .map((f) => /\b(?:19|20)\d{2}\b/.exec(f.erschienen ?? '')?.[0])
      .filter((j): j is string => Boolean(j))
      .map(Number),
  )
  let echteId = gemeldeteId
  const gemeldeterTitel = gemeldeteId ? titles.find((t) => t.id === gemeldeteId) : undefined
  if (gemeldeterTitel?.franchiseId && jahreDerFolgen.size === 1 && gemeldeterTitel.jpYear !== [...jahreDerFolgen][0]) {
    const jahr = [...jahreDerFolgen][0]
    const geschwister = titles.filter(
      (t) =>
        t.franchiseId === gemeldeterTitel.franchiseId &&
        t.id !== gemeldeterTitel.id &&
        t.jpYear === jahr &&
        t.episodes === liste.length,
    )
    if (geschwister.length === 1) {
      echteId = geschwister[0]!.id
      warn(
        `${url}: gemeldet als ${gemeldeteId} (${gemeldeterTitel.jpYear}), ` +
          `Folgen tragen ${jahr} — zugeordnet zu ${echteId} (${geschwister[0]!.titleDe ?? geschwister[0]!.titleRomaji})`,
      )
    }
  }
  return echteId
}

/*
  **Und wo die Adresse nichts trifft, spricht der gemeldete Name.**

  Am 01.09.2026 lagen 795 Rohfolgen auf 50 Adressen unzugeordnet, alle mit
  „kein Titel zu dieser Adresse". Gemessen an zweien davon: Sie gehören zu
  „Card Captor Sakura", und der Titel steht im Bestand — nur unter einer
  **anderen** Prime-Adresse. Prime führt je Staffel eine eigene, unser
  Bestand kennt eine.

  Der Name ist hier ein **Vorschlag**, kein Beleg, und das ist vertretbar:
  Was danach kommt, prüft ihn. `ordneZu` legt die gemeldeten Folgen über
  Folgentitel und Erstausstrahlung; ein Namensvorschlag, dessen Folgen nicht
  passen, fällt dort durch und bleibt offen. Das ist der Unterschied zu
  `fetch-pruefungen.ts`, wo ein Namenstreffer direkt ein Urteil setzen
  würde — dort bleibt er deshalb ein Vorschlag für die Handarbeit.

  **Nur bei genau einem Treffer.** „Cardcaptor Sakura" gibt es fünfmal im
  Bestand (Serie, zwei Filme, ein Special, „Clear Card Arc"); ohne die
  Eindeutigkeit wäre das ein Ratespiel.
*/
function titelAusName(liste: Rohfolge[], titles: Title[]): { titel: Title; genau: boolean } | null {
  const name = liste.find((f) => f.serientitel)?.serientitel ?? null
  if (!name) return null
  /*
    **Was hinter einem Gedankenstrich steht, ist Daniels Notiz — nicht der Name.**

    Gemeldet am 01.09.2026: „My First Girlfriend Is a Gal — Kauftitel
    (FSK 16, mit OVA)". Der Zusatz sagt, **welche** Ausgabe er geöffnet
    hat; unser Bestand führt den Titel ohne ihn. Beide Stufen unten
    prüfen, ob ein Bestandstitel mit dem gemeldeten Namen **beginnt** —
    und scheitern hier, weil die Meldung die längere Seite ist.

    Der Schnitt am Gedankenstrich ist deshalb sicher, weil er in echten
    Titeln nicht vorkommt: **null** der 2.767 Einträge führen ein „ — "
    in einem ihrer drei Namen (gemessen 05.09.2026). Beim Bindestrich
    wäre er es nicht — 448 tun es, und „Kuroko's Basketball - Winter Cup
    Highlights Movie 1" würde zur Serie geschnitten, zu der es nicht
    gehört.
  */
  const k = titelSchluessel(name.split(' — ')[0]!)
  const passt = (t: Title, genau: boolean) =>
    [t.titleDe, t.titleEn, t.titleRomaji].some((x) => {
      if (!x) return false
      const y = titelSchluessel(x)
      return genau ? y === k : y.startsWith(k)
    })
  /*
    **Erst genau, dann als Anfang — und nie beides gemischt.**

    Prime nennt die Serie „Das Dschungelbuch", unser Bestand „Das
    Dschungelbuch: Die Serie"; 26 Folgen lagen deshalb unzugeordnet. Ein
    Bestandstitel, der mit dem gemeldeten Namen **beginnt**, ist ein
    brauchbarer Vorschlag — einer, der ihn irgendwo enthält, wäre es
    nicht: „Gantz" steckt in jedem „Gantz:O".

    Die Stufen bleiben getrennt: Gibt es einen genauen Treffer, gewinnt
    er, auch wenn drei Titel mit demselben Namen anfangen.
  */
  const genau = titles.filter((t) => passt(t, true))
  const kandidaten = genau.length ? genau : titles.filter((t) => passt(t, false))
  return kandidaten.length === 1 ? { titel: kandidaten[0]!, genau: genau.length === 1 } : null
}

/*
  **Und wenn nicht einmal ein Name da ist, sprechen die Folgentitel selbst.**

  Bei 16 Adressen mit 198 Folgen steht in der Meldung kein Serienname,
  sondern der Titel der **Folge**: „Kyogre in der Falle!", „Ein beschwingter
  Kampf!". Über die Adresse und den Namen ist damit nichts zu holen.

  Über die Folgentitel schon — und genau das ist der Anker, den Daniel am
  01.09.2026 gemeint hat: „einzeln episoden korrekt aus gesammeltem zustand
  rauspicken und korrekt zuordnen … anhand von verlaesslichen sicheren
  quellen wie zB anisearch."

  `data/anisearch-folgen.json` führt je Titel die deutschen Folgentitel,
  `data/tmdb-folgen.json` dieselben aus zweiter Quelle. Wer dort nachsieht,
  welcher Titel diese Folgen führt, hat die Zuordnung — ohne eine einzige
  Angabe des Anbieters.

  **Die Schwelle ist hoch, und sie muss es sein.** Ein einzelner Folgentitel
  kann zufällig doppelt vorkommen („Der Anfang", „Abschied"); erst wenn
  **mindestens drei** und **mehr als die Hälfte** der gemeldeten Folgen
  denselben Titel treffen, ist es eine Auskunft. Und nur, wenn kein zweiter
  Titel gleich viele trifft.

  **Und derselbe Griff entscheidet, wo zwei Titel eine Adresse teilen.**

  Prime führt „Golden Kamuy" Staffel 1 und 2 unter einer Adresse, beide mit
  zwölf Folgen — die Adresse allein sagt nicht, welche gemeint ist, und ohne
  Entscheidung blieben zwölf Folgen liegen. Die Folgentitel sagen es.

  Der Unterschied zum Fall darüber ist nur die Ausgangsmenge: dort **alle**
  Titel, hier die beiden Kandidaten. Die Schwelle bleibt dieselbe.
*/
function titelAusFolgentiteln(liste: Rohfolge[], treffer: Title[], ctx: TitelKontext): Title | null {
  const kerne = liste.map((f) => folgenKern(f.titel)).filter((x) => x && x.length >= 5)
  if (kerne.length < 3) return null
  const { jeTitel } = ctx.karten
  const menge = treffer.length ? treffer.map((t) => t.id) : [...jeTitel.keys()]
  const punkte = new Map<number, number>()
  for (const id of menge) {
    const folgen = jeTitel.get(id)
    if (!folgen) continue
    let n = 0
    for (const k of kerne) if (folgen.has(k)) n++
    if (n >= 3 && n > kerne.length / 2) punkte.set(id, n)
  }
  const sieger = eindeutigerSieger(kerne, punkte, ctx.karten)
  return sieger === null ? null : (ctx.titles.find((t) => t.id === sieger) ?? null)
}

/*
  **Bei Gleichstand gewinnt der spezifischere Eintrag.**

  „Pokémon" (die Reihe) und „Pokémon: Die TV-Serie — Sonne & Mond" (die
  Staffel) treffen dieselben zwölf Folgentitel, denn der Reihen-Eintrag
  führt alle Folgen aller Staffeln. Ein Gleichstand ist hier also der
  Normalfall, kein Zweifelsfall — und die Staffel ist die richtige
  Antwort.

  Entschieden wird über die **Menge**, die ein Titel insgesamt führt:
  „Sonne & Mond" kennt 146 Folgentitel, „Pokémon" über tausend. Wer
  dieselben Folgen mit weniger Ballast führt, meint sie genauer.

  Bleibt es auch dann gleich — zwei Titel mit derselben Trefferzahl und
  derselben Menge —, ist es ein echter Zweifelsfall und bleibt offen.

  **Bei Punktgleichstand entscheidet zuerst aniSearch, dann die Menge.**

  Treffen zwei Titel gleich viele Folgentitel, liegt das meist an TMDB:
  Es hängt alle Folgen einer Reihe an jede Staffel. aniSearch trennt sie —
  wer dort trifft und der andere nicht, ist gemeint. Erst wenn auch das
  keinen Unterschied macht, entscheidet die Menge (der spezifischere
  Eintrag führt weniger Folgentitel insgesamt).
*/
function eindeutigerSieger(kerne: string[], punkte: Map<number, number>, karten: FolgenKarten): number | null {
  const asPunkte = (id: number) => {
    const f = karten.nurAniSearch.get(id)
    if (!f) return 0
    let n = 0
    for (const k of kerne) if (f.has(k)) n++
    return n
  }
  const sortiert = [...punkte.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1]
    const as = asPunkte(b[0]) - asPunkte(a[0])
    if (as !== 0) return as
    return (karten.jeTitel.get(a[0])?.size ?? 0) - (karten.jeTitel.get(b[0])?.size ?? 0)
  })
  const eindeutig =
    sortiert.length === 1 ||
    (sortiert.length > 1 &&
      (sortiert[0]![1] > sortiert[1]![1] ||
        asPunkte(sortiert[0]![0]) > asPunkte(sortiert[1]![0]) ||
        (karten.jeTitel.get(sortiert[0]![0])?.size ?? 0) < (karten.jeTitel.get(sortiert[1]![0])?.size ?? 0)))
  return eindeutig ? sortiert[0]![0] : null
}
