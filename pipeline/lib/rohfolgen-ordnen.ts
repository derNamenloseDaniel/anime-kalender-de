/**
 * Der zweite Teil des Zuordners aus `fetch-rohfolgen.ts` (ausgelagert, Inhalt und Reihenfolge unverändert): Ist der Titel einer
 * Adresse gefunden (`rohfolgen-titelwahl.ts`), legt `bearbeiteGruppe` ihre Folgen auf unsere — oder lässt sie mit Grund offen.
 * Das Ergebnis je Adresse kommt als Rückgabe; Sammeln, Zählen und Schreiben bleiben beim Aufrufer.
 */
import { staffelRiegel } from './staffel-riegel.ts'
import { belegtDurchStaffel } from './netflix-staffeln.ts'
import { anbieterFolgeAus } from './folgen-datum.ts'
import type { Offen, Zaehler, Zugeordnet } from './rohfolgen-abschluss.ts'
import { istReihenkopf, seiteDer, type Rohfolge } from './rohfolgen-zeile.ts'
import { offenOhneTitel, waehleTitel, type TitelKontext, type TitelWahl } from './rohfolgen-titelwahl.ts'
import type { AnbieterFolge } from '../../shared/folgen-zuordnung.ts'
import { entscheideZuordnung, probeGeschwister, type AnkerErgebnis } from '../../shared/folgen-anker.ts'
import type { Title } from '../../shared/types.ts'

export interface ZuordnerKontext extends TitelKontext {
  /** Alle Anker eines Titels: aniSearch, dann TMDB (`shared/folgen-anker.ts`). */
  listenFuer: (t: Title) => AnkerErgebnis
}

/** Was eine Adresse ergibt; Sammeln, Zählen und Schreiben macht der Aufrufer. */
export interface GruppenErgebnis {
  offen?: Offen
  /** Der Eintrag für `prime-zugeordnet.json`. */
  zugeordnet?: Zugeordnet
  /** Die Rohfolgen-Kennungen, die verwertet wurden — sie werden danach abgehakt. */
  erledigt: number[]
  /** Der Titel wurde allein über seine Folgentitel gefunden. */
  ueberFolgentitel: boolean
  uebersprungenStaffel: boolean
  ohneFolgenzuordnung: boolean
}

const ergebnis = (teil: Partial<GruppenErgebnis>): GruppenErgebnis => ({
  erledigt: [],
  ueberFolgentitel: false,
  uebersprungenStaffel: false,
  ohneFolgenzuordnung: false,
  ...teil,
})

interface Gruppe {
  schluessel: string
  liste: Rohfolge[]
  titel: Title
  titelwahl: TitelWahl
  anbieter: AnbieterFolge[]
  ak: AnkerErgebnis
}

/** Alles, was die Adressen eines Laufs ergeben haben, in der Reihenfolge der Adressen. */
export interface Sammlung {
  zugeordnet: Record<string, Zugeordnet>
  offen: Offen[]
  erledigt: number[]
  zaehler: Zaehler
}

/** Jede Adresse bearbeiten und die Ergebnisse sammeln. */
export function bearbeiteAlle(gruppen: Iterable<[string, Rohfolge[]]>, ctx: ZuordnerKontext): Sammlung {
  const sammlung: Sammlung = {
    zugeordnet: {},
    offen: [],
    erledigt: [],
    zaehler: { ueberFolgentitel: 0, uebersprungenStaffel: 0, ohneFolgenzuordnung: 0 },
  }
  for (const [schluessel, liste] of gruppen) {
    /*
      Der Schlüssel trägt seit dem 30.08.2026 die Ausgabe mit (`url#asin`) —
      gesucht und gespeichert wird aber unter der Adresse selbst. Sie steht in
      jeder Zeile der Gruppe, alle tragen dieselbe.
    */
    const e = bearbeiteGruppe(schluessel, liste, ctx)
    if (e.ueberFolgentitel) sammlung.zaehler.ueberFolgentitel++
    if (e.uebersprungenStaffel) sammlung.zaehler.uebersprungenStaffel++
    if (e.offen) sammlung.offen.push(e.offen)
    if (e.zugeordnet) sammlung.zugeordnet[schluessel] = e.zugeordnet
    for (const id of e.erledigt) sammlung.erledigt.push(id)
    if (e.ohneFolgenzuordnung) sammlung.zaehler.ohneFolgenzuordnung++
  }
  return sammlung
}

/** Eine Adresse (die Folgen einer Gruppe) einem Titel und seinen Folgen zuordnen. */
export function bearbeiteGruppe(schluessel: string, liste: Rohfolge[], ctx: ZuordnerKontext): GruppenErgebnis {
  const titelwahl = waehleTitel(liste, ctx)
  if (titelwahl.treffer.length !== 1) return ergebnis({ offen: offenOhneTitel(liste, titelwahl.treffer) })
  const titel = titelwahl.treffer[0]!
  /*
    **Anker suchen: aniSearch, dann TMDB.**

    Bei aniSearch ist die Zuordnung eine Zeile — der Eintrag entspricht unserem
    Titel, seine Folgen sind unsere Folgen. Bei TMDB muss erst die richtige
    Staffel gefunden werden, und genau dort ging es schief: Am 28.08.2026 ließ
    sich **1 von 67** Adressen zuordnen.
  */
  const ak = ctx.listenFuer(titel)
  const anbieter: AnbieterFolge[] = liste.map(anbieterFolgeAus)
  const gruppe: Gruppe = { schluessel, liste, titel, titelwahl, anbieter, ak }
  const ergebnisGruppe = ordneZu(gruppe, ctx)
  return { ...ergebnisGruppe, ueberFolgentitel: titelwahl.ueberFolgentitel }
}

function ordneZu(g: Gruppe, ctx: ZuordnerKontext): GruppenErgebnis {
  const { liste, titel, anbieter, ak } = g
  /**
   * **Eine Meldung, die ihre Staffel nennt, gehört nicht an den Reihenkopf.**
   *
   * Daniel am 07.09.2026 an „Date a Live": Er hat alle fünf Staffeln über
   * eine Prime-Seite gemeldet, und **drei** verschiedene Adressen landeten
   * unter Titel 15583 — Staffel 1:
   *
   *     B0DML22FHP  „laut Adresse Staffel 2"  → 15583
   *     B0C7LZCS5H  „laut Adresse Staffel 1"  → 15583
   *     B0DMB2MKZX  „laut Adresse Staffel 3"  → 15583
   *
   * Der Grund ist die Zuordnung über den Namen: Amazon nennt jede Staffel
   * schlicht „Date a Live", und der beste Namenstreffer ist der Reihenkopf.
   * Staffel 1 bekam dadurch die Adresse von Staffel 2 und mit ihr ein
   * `dub: true`, das nie für sie belegt war.
   *
   * Die Meldung **weiß** es besser — die Erweiterung liest die Staffel aus
   * der Adresse (`?ref_=atv_dp_season_select_sN`) und schickt sie mit. Ab
   * Staffel 2 wird ein Reihenkopf-Treffer deshalb verworfen: Lieber keine
   * Zuordnung als eine falsche, denn eine falsche erzeugt eine Sprachaussage
   * über den falschen Titel. Ausnahme: die zweite Hälfte eines Einzeltitels
   * (`staffelRiegel`, mindestens zwei Folgentreffer jenseits der Seitenlänge).
   *
   * **Nur ab Staffel 2**, und nur wenn unser Titel wirklich der Kopf ist:
   * Bei einer einteiligen Reihe ist „Staffel 1" die einzige, und dort ist
   * der Kopf richtig.
   */
  const gemeldeteStaffel = liste[0]?.staffel_nr ?? null
  if (staffelRiegel(liste[0]!.url, gemeldeteStaffel, istReihenkopf(titel, ctx.titles), titel, anbieter, ak.listen)) {
    return ergebnis({ uebersprungenStaffel: true })
  }
  /*
    **Ein einziger Eintrag ist nichts zuzuordnen — er ist der Titel.**

    Prime führt „Halo Legends" als **einen Film**: die neun Kurzfilme, die
    unser Bestand als neun Folgen kennt, zu einem Stück zusammengeschnitten.
    Es gibt dort keine Folge 1, der man unsere Folge 1
    gegenüberstellen könnte, und die Suche nach einer TMDB-Staffel mit neun
    Folgen musste scheitern.

    **Die Frage, die dieses Projekt stellt, ist trotzdem beantwortet:** Läuft
    der Titel dort auf Deutsch? Der eine Eintrag nennt seine Tonspuren, und
    welche unserer Folgen gemeint ist, spielt für die Antwort keine Rolle.

    Der Beleg wird deshalb ohne Folgennummer abgelegt (`unsere: null`) — er
    gilt dem Titel, nicht einer Folge. Das ist die ehrliche Form: Eine erfundene
    „Folge 1" wäre eine Behauptung über etwas, das die Seite nicht sagt.

    **Nur bei genau einem Eintrag.** Zwei oder mehr heißen, dass Prime die
    Sache aufteilt — dann ist die Zuordnung wieder die richtige Frage. 36 der
    101 offenen Adressen tragen genau einen.
  */
  if (liste.length === 1) {
    return ergebnis({
      zugeordnet: {
        titleId: titel.id,
        plattform: liste[0]!.plattform ?? 'primevideo',
        seite: seiteDer(liste),
        asin: liste[0]!.asin ?? null,
        folgen: [{ unsere: null, sprachen: JSON.parse(liste[0]!.sprachen ?? '[]') as string[] }],
      },
      erledigt: [liste[0]!.id],
    })
  }
  return ordneFolgenZu(g, gemeldeteStaffel, ctx)
}

function ordneFolgenZu(g: Gruppe, gemeldeteStaffel: number | null, ctx: ZuordnerKontext): GruppenErgebnis {
  const { schluessel, liste, titel, titelwahl, anbieter, ak } = g
  /*
    **Welche Folge gemeint ist, bleibt offen — welche Sprache, nicht.**

    Prime vergibt bei Kauftiteln eigene Folgennamen und setzt bei allen
    dasselbe Datum. Gemessen am 05.09.2026 an „My First Girlfriend Is a
    Gal": elf Folgen, alle „12. Juli 2017", Namen wie „1. Mein erstes Mal
    mit einer Gal" — aniSearch führt dieselbe Staffel als „Der erste
    Kniefall", 12.07. bis 13.09. Weder über den Namen noch über das Datum
    ist da etwas zuzuordnen, und das ist kein Fehler: Es sind schlicht
    andere Texte.

    Die Frage dieses Projekts hängt nicht daran. Elf Zeilen, jede mit
    `["Deutsch"]` — dass es die Serie dort auf Deutsch gibt, steht damit
    fest. Der Beleg wird deshalb wie beim Einzeleintrag oben ohne
    Folgennummer abgelegt: Er gilt dem Titel.

    **Zwei Bedingungen, sonst bleibt es offen (oder die Geschwister-Probe greift):**

    1. Der Titel muss über die **Kennung, die Adresse oder einen genauen
       Namenstreffer** gefunden worden sein. Ein Namensanfang oder ein
       Vorschlag aus den Folgentiteln reicht nicht — bei denen ist die
       Folgenprüfung die einzige Gegenprobe, und die ist hier gerade
       durchgefallen.
    2. **Alle** Zeilen müssen dieselben Tonspuren nennen. Sagen sie
       Verschiedenes, ist die Auskunft folgenweise — und dann fehlt sie,
       solange die Folgen nicht zuzuordnen sind.
  */
  const { ausBestand, nameGenau } = titelwahl
  const sprachen = new Set(liste.map((f) => f.sprachen ?? '[]'))
  const belastbar = (ausBestand || nameGenau) && sprachen.size === 1
  const ohneKopf = (t: Title) => gemeldeteStaffel !== null && gemeldeteStaffel > 1 && istReihenkopf(t, ctx.titles)
  const probe = () => probeGeschwister(anbieter, titel, ctx.titles, (t) => ctx.listenFuer(t).listen, ohneKopf)
  const wahl = belegtDurchStaffel(schluessel, belastbar, entscheideZuordnung(anbieter, titel, ak, belastbar, probe))
  if (wahl.art === 'offen') {
    return ergebnis({ offen: { url: liste[0]!.url, titel: titel.titleDe ?? titel.titleEn ?? null, grund: wahl.grund, folgen: liste.length } })
  }
  if (wahl.art === 'titel') {
    return ergebnis({
      zugeordnet: {
        titleId: titel.id,
        plattform: liste[0]!.plattform ?? 'primevideo',
        seite: seiteDer(liste),
        asin: liste.find((f) => f.asin)?.asin ?? null,
        folgen: [{ unsere: null, sprachen: JSON.parse([...sprachen][0]!) as string[] }],
      },
      erledigt: liste.map((f) => f.id),
      ohneFolgenzuordnung: true,
    })
  }
  const treffend = wahl.paare.filter((p) => p.unsere !== null)
  /*
    **Abgehakt wird die ganze Adresse, nicht nur die getroffenen Zeilen.**

    Was von dieser Seite nicht zugeordnet werden konnte, wird es beim nächsten
    Lauf auch nicht — die Anker sind dieselben. Es offen zu lassen hieße, die
    Zeilen für immer erneut zu holen; ihr Inhalt steht ohnehin im Archiv der
    Meldung. Kommt später ein Anker dazu, ist die Meldung neu zu holen, und
    das ist ein Klick.
  */
  return ergebnis({
    zugeordnet: {
      titleId: wahl.ziel.id,
      plattform: liste[0]!.plattform ?? 'primevideo',
      seite: seiteDer(liste),
      /* Alle Zeilen einer Adresse stammen von derselben Seite — die erste genügt. */
      asin: liste.find((f) => f.asin)?.asin ?? null,
      folgen: treffend.map((p) => ({
        unsere: p.unsere!,
        sprachen: JSON.parse(liste[p.index]!.sprachen ?? '[]') as string[],
      })),
    },
    erledigt: liste.map((f) => f.id),
  })
}
