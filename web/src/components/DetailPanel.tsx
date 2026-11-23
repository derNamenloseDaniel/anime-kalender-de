import '../lib/i18n-spaet.ts' // Texte der nachgeladenen Ansichten
import { useEffect, useMemo, useState } from 'react'
import { todayIso } from '@shared/time.ts'
import type { Dataset } from '../lib/data.ts'
import { anzeigeName } from '@shared/titles.ts'
import { loadSynopsis, type Synopsis } from '../lib/data.ts'
import { useEscape } from '../lib/escape.ts'
import { useLang } from '../lib/i18n.tsx'
import { useSeiteGesperrt } from '../lib/use-seite-gesperrt.ts'
import { usePanelTitel, useTitelwechsel } from './detail/titelwechsel.ts'
import { useNewsletterVerbindung } from '../lib/newsletterSync.ts'
import { Quellenuebersicht } from './Quellenuebersicht.tsx'
import { KEYWORD_PREVIEW } from './detail/hilfen.tsx'
import { KinoBanner } from './detail/kino.tsx'
import { VoiceCast, AehnlicheTitel } from './detail/weitere.tsx'
import { EckdatenAbschnitt } from './detail/abschnitte.tsx'
import { HandlungAbschnitt } from './detail/abschnitte.tsx'
import { TermineAbschnitt } from './detail/abschnitte.tsx'
import { ReihenListe } from './detail/reihen-liste.tsx'
import { PANEL_KENNUNG } from './detail/reihen-spur-regeln.ts'
import { AntwortBereichOderNichts } from './detail/kasten-leer.tsx'
import { UnterDerAntwort } from './detail/unter-der-antwort.tsx'
import { PanelBuehne } from './detail/buehne.tsx'
import { SchlagworteAbschnitt } from './detail/Schlagworte.tsx'
import { plotVon, eigenerAsZiel, titelGestartet } from './detail/plot.ts'
import { useErsatzHandlung } from './detail/ersatz-handlung.ts'
import { PanelLeer, PanelVersteckt } from './detail/panel-huellen.tsx'
import { PANEL_SCHLEIER } from './detail/schleier.ts'
import { useDiscAusgaben, useReihenWechsel, useTitelNachladen } from './detail/panel-laden.ts'
import { usePanelReihe } from './detail/panel-reihe-namen.ts'
import { usePanelAntwort } from './detail/panel-antwort.ts'

export function DetailPanel({
  data,
  titleId,
  discZuerst = false,
  favorites,
  hidden,
  onToggleFavorite,
  onToggleHidden,
  onClose,
  onFilterBy,
  onOpenTitle,
}: {
  data: Dataset
  titleId: number
  /** Über einen Disc-Termin geöffnet: Der Stream/Disc-Umschalter startet auf „Disc". */
  discZuerst?: boolean
  favorites: Set<number>
  hidden: Set<number>
  onToggleFavorite: (id: number) => void
  onToggleHidden: (id: number) => void
  onClose: () => void
  onFilterBy: (kind: 'genre' | 'keyword', value: string) => void
  onOpenTitle: (id: number) => void
}) {
  const { t, tGenre, tKeyword } = useLang()
  const verbindung = useNewsletterVerbindung()
  const today = todayIso()
  const { title, mitTermin } = usePanelTitel(data, titleId)
  useTitelwechsel(titleId, title, mitTermin)
  /**
   * Der leere Rückfall braucht ein `useMemo`, sonst ist er bei jedem Durchlauf
   * ein neues Array — und jeder Hook, der `releases` als Abhängigkeit führt,
   * rechnet dann bei jedem Render neu, statt sich das Ergebnis zu merken.
   */
  const releases = useMemo(() => data.releasesByTitle.get(titleId) ?? [], [data, titleId])
  const [synopsis, setSynopsis] = useState<Synopsis | undefined>()
  const [allKeywords, setAllKeywords] = useState(false)
  /** Die ersten drei Genres reichen fuer die Frage "ist das meins?". */
  const [genresOffen, setGenresOffen] = useState(false)
  const [plotOffen, setPlotOffen] = useState(false)
  const discAusgaben = useDiscAusgaben(titleId)

  useEffect(() => {
    let alive = true
    setSynopsis(undefined)
    /* Cartoons (negative Kennung) tragen ihre Beschreibung im Titel — für sie gibt es keine Gruppendatei (16.09.2026). */
    if (titleId < 0) {
      setSynopsis(title?.synopsis ? { de: title.synopsis } : undefined)
    } else {
      loadSynopsis(titleId)
        .then((s) => {
          if (alive) setSynopsis(s)
        })
        .catch(() => {})
    }
    setAllKeywords(false)
    setPlotOffen(false)
    return () => {
      alive = false
    }
  }, [titleId, title?.synopsis])

  useEscape(true, () => onClose())
  /* Das Panel liegt über der Seite: sie bleibt dahinter stehen (Daniel, 11.10.2026). */
  useSeiteGesperrt(true)

  const { reihenTeile, eigenerTeil, reihenName, kopfName, teilName } = usePanelReihe(title, data)

  /**
   * Das Banner des Titels — oder geliehen von einem Teil der Reihe, der eines hat.
   *
   * Ohne den Rückfall verschwindet der Kopf beim Umschalten auf ein Special und
   * kommt beim Zurückschalten wieder; das Panel springt dabei um 112 Pixel.
   */
  /**
   * Das Bild der Bühne — seit dem 24.08.2026 das **Cover**, nicht das Banner.
   *
   * Gemessen: Alle 2.762 Titel haben ein `coverImage`, aber nur 2.111 ein
   * `bannerImage`. Bei 651 Titeln stand oben deshalb ein leerer Farbverlauf.
   * Das Cover trägt außerdem das, was ein Zuschauer wiedererkennt — es ist das
   * Bild, das auch auf einer Hülle stünde.
   *
   * Der frühere Rückfall „Banner von einem Reihenteil leihen" entfällt: Er war
   * nötig, weil der Kopf beim Umschalten auf ein Special um 112 Pixel sprang.
   * Mit dem Cover tritt der Fall nicht mehr ein.
   */
  /* Kein Rückfall auf das Cover eines anderen Reihenteils (04.11.2026): Kachel, Titelseite und Vorschaubild zeigen nur das eigene Cover; ein fremdes Plakat belegt nichts. */
  const buehnenBild: string | undefined = title?.coverImage

  /*
    Vorher stand hier eine Zählung nach Position, mit dieser Begründung — sie
    gilt weiter, die Rechnung steht jetzt in `staffelBeschriftungen()`:

      **Die erste Staffel heißt „Staffel 1", nicht gar nichts.**

      Daniel am 02.09.2026 an „Die Tagebücher der Apothekerin": „es fehlt
      ‚1. staffel'". Bei Staffel 2 stand die Angabe da, bei Staffel 1 nichts —
      wer aus der Übersicht kam, wusste nicht, welchen der beiden Einträge er
      geöffnet hatte.

      Der Grund ist der Abzug oben: Die erste Staffel heißt im Datensatz meist
      genau wie die Reihe („Die Tagebücher der Apothekerin"), die zweite trägt
      ihren Zusatz mit. Nach dem Abzug bleibt bei der ersten nichts übrig.

      **Die Nummer wird gezählt, nicht geraten:** Position dieses Eintrags unter
      den **Staffeln** der Reihe, chronologisch nach japanischer Ausstrahlung —
      dieselbe Sortierung, aus der auch der Reihenname stammt. Filme, OVAs und
      Specials zählen nicht mit; sie sind keine Staffeln und tragen ihren
      Unterschied ohnehin im Namen.

      Hat die Reihe nur eine Staffel, gibt es nichts zu unterscheiden, und die
      Zeile bleibt weg wie bisher.
  */

  /*
    **Lange Reihen brauchen Suche und einen Aufklapper** (die Reiter wichen am 20.10.2026 den Zeilen je Gruppe) (Daniel, 17.09.2026, Pokémon
    mit 112 Teilen: „sehr schwer dort für nutzer gesuchte titel der reihe zu finden").
    Der Zustand gilt je Reihe und fällt beim Wechsel der Reihe zurück.
  */
  const reihenSchluessel = reihenTeile[0]?.id ?? 0
  const [reiheSuche, setReiheSuche] = useState<{ reihe: number; text: string }>({ reihe: 0, text: '' })
  const [reiheOhneOffen, setReiheOhneOffen] = useState<number | null>(null)

  const holt = useTitelNachladen(data, titleId)

  const {
    sortiertNachZugang, discReleases, releaseJePlattform, kinoRelease, terminReleases, streamReleases, dubZeilen,
    folgenAngabeFuer, antwort, wegeHinweis, tvVorbei, kastenNotiz, folgenLuecke, folgenImKasten,
  } = usePanelAntwort({ title, releases, today, synopsis, favorites, verbindung, t })

  const { wechselt, wechsleZu } = useReihenWechsel(data, titleId, onOpenTitle)

  const ersatz = useErsatzHandlung({ titleId, title, synopsis, reihenTeile })

  if (!title) return <PanelLeer holt={holt} t={t} onClose={onClose} />
  if (hidden.has(title.id)) return <PanelVersteckt title={title} t={t} onClose={onClose} onToggleHidden={onToggleHidden} />


  // Handlung auf Deutsch; fehlt sie, lieber den englischen Text mit Hinweis
  // zeigen als gar keinen.
  //
  // Der englische Rückfall bleibt bewusst, obwohl die Oberfläche seit dem
  // 10.08.2026 einsprachig ist: Er stammt nicht aus einer Übersetzung der
  // Seite, sondern aus der Quelle. Für rund 700 der 2.750 Titel gibt es

  // nirgends eine deutsche Inhaltsangabe — dort wäre die Alternative eine
  // leere Fläche.
  const { plot } = plotVon({ synopsis, anilistId: title.al, ersatz, erschienen: titelGestartet(title, today) })
  const asZiel = eigenerAsZiel(plot, synopsis?.asUrl)
  const keywords = allKeywords ? title.keywords : title.keywords.slice(0, KEYWORD_PREVIEW)

  return (
    <>
      <div className={PANEL_SCHLEIER} onClick={onClose} aria-hidden="true" />
      <div
        /*
          Von `max-w-md` (28 rem) auf `max-w-lg` (32 rem) — vier Rem mehr.

          Der Gewinn ist kein Selbstzweck: Die Terminzeilen tragen jetzt Datum,
          Ausgabe und Aktion **nebeneinander**. Bei 28 rem brach die Aktion in
          eine eigene Zeile um, und aus einer Zeile je Ausgabe wurden zwei —
          genau die Platzverschwendung, die verschwinden sollte. Auf schmalen
          Schirmen greift weiterhin `w-full`, dort ändert sich nichts.
        */
        className="animate-slide-in text-t3 fixed inset-y-0 right-0 z-40 flex w-full max-w-lg flex-col overflow-y-auto pointer-fine:overscroll-contain border-l border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0d1220]"
        role="dialog"
        data-panel={PANEL_KENNUNG}
        aria-label={anzeigeName(title)}
      >
        {/* Kopf (Bild, Name, Knöpfe) steht in `detail/buehne.tsx`; der Kasten beginnt darunter. */}
        <PanelBuehne
          reihenName={kopfName}
          teilName={teilName}
          reihenTeile={reihenTeile}
          buehnenBild={buehnenBild}
          grossBild={synopsis?.cg}
          title={title}
          onToggleHidden={onToggleHidden}
          favorites={favorites}
          onToggleFavorite={onToggleFavorite}
          onClose={onClose}
          t={t}
          folgenImKasten={folgenImKasten}
          eigenerTeil={eigenerTeil}
          kinoRelease={kinoRelease}
          asZiel={asZiel}
        />
        <div className="relative flex flex-col gap-3 px-4 pb-8">
          {/*
            Die Antwortzeile — der erste Block nach der Bühne.

            Sie beantwortet in einem Satz, wonach jemand das Panel öffnet.
            Vier Fälle, immer dieselben vier Zeilen: Überschrift, Nebenzeile,
            Balken, Zählzeile. Die Gleichheit ist kein Schönheitswunsch —
            ungleich hohe Kästen ließen beim Wechseln des Reihenteils alles
            darunter springen.
          */}
          {title && kinoRelease && (
            <KinoBanner release={kinoRelease} title={title} today={today} t={t as never} />
          )}
          {/*
            **Der Banner trägt die Auskunft — dann schweigt der Kasten** (17.09.2026).
            Über „Ab 24.11.2026 im Kino" stand „Noch keine deutsche Fassung · Kein deutscher
            Anbieter führt ihn bisher": zwei Sätze, die einander widersprechen. Wo es außer
            dem Kinostart nichts zu sagen gibt, bleibt es beim Banner.
          */}
          <AntwortBereichOderNichts
            antwort={antwort}
            sortiertNachZugang={sortiertNachZugang}
            streamReleases={streamReleases}
            terminReleases={terminReleases}
            title={title}
            t={t}
            today={today}
            wegeHinweis={wegeHinweis}
            tvVorbei={tvVorbei}
            kastenNotiz={kastenNotiz}
            folgenLuecke={folgenLuecke}
            verbindung={verbindung}
            favorites={favorites}
            onToggleFavorite={onToggleFavorite}
            folgenAngabeFuer={folgenAngabeFuer}
            dubZeilen={dubZeilen}
            releaseJePlattform={releaseJePlattform}
            releases={releases}
            discAusgaben={discAusgaben}
            discReleases={discReleases}
            discZuerst={discZuerst}
          />
          <UnterDerAntwort
            data={data}
            title={title}
            favorites={favorites}
            handlung={<HandlungAbschnitt plot={plot} t={t} plotOffen={plotOffen} setPlotOffen={setPlotOffen} />}
            reihe={
            <ReihenListe
              reihenTeile={reihenTeile}
              t={t}
              reihenName={reihenName}
              title={title}
              favorites={favorites}
              wechselt={wechselt}
              wechsleZu={wechsleZu}
              reiheOhneOffen={reiheOhneOffen}
              reihenSchluessel={reihenSchluessel}
              reiheSuche={reiheSuche}
              setReiheOhneOffen={setReiheOhneOffen}
              setReiheSuche={setReiheSuche}
            />
            }
          />
          {/*
            „Wo läuft es" steht seit dem 24.08.2026 **vor** den Terminen.

            Der Block lag bis dahin unter Terminen und Handlung. Dabei ist das
            grüne „DE ✓" die wertvollste Angabe der Seite — der Kalender
            existiert, um genau diese Frage zu beantworten. JustWatch baut die
            ganze Detailseite darum herum: Anbieter groß, klickbar, zuerst.

            Verschoben wurden beide Fassungen, die mit Anbietern und die
            Fehlanzeige — sonst stünde je nach Datenlage mal das eine, mal das
            andere an anderer Stelle.
          */}
          {/*
            **Drei Reihen Pillen statt einer Liste voller Zeilen.**

            Jeder Weg nahm bisher die volle Breite ein; bei vier Anbietern waren
            das vier Zeilen, und darunter kamen dieselben Anbieter noch einmal
            als Terminbloecke. Daniel am 25.08.2026: "die einträge müssen extrem
            viel weniger platz einnehmen ... sie müssen pills sein die anklickbar
            sind."

            Die Reihen trennen, was ein Besucher wirklich unterscheidet:
            **ansehen**, **kaufen**, **vorbestellen**. Die dritte Reihe gibt es,
            damit "vorbestellen" einmal ueber der Reihe steht statt in jeder
            Pille — und damit ein Termin, den es noch nicht gibt, nicht neben
            einem verfuegbaren Angebot steht.
          */}

          {/*
            **Dieser Block endet hier — und bis zum 25.08.2026 tat er das nicht.**

            Der Umbau vom 24.08.2026 („Reihen-Umschalter zieht nach unten") hat
            das schließende `</div>)}` an seiner alten Stelle stehen lassen, gut
            zweihundert Zeilen weiter unten. Damit hingen **das Reihen-Karussell
            und sämtliche Release-Termine** an der Bedingung „kein Anbieter
            bekannt": Wer einen Stream hatte, sah beides nicht mehr.

            Live gemessen am 25.08.2026 an drei Titeln — Dan Da Dan, Clevatess,
            Sakamoto Days. Bei allen dreien fehlte „Release-Termine für deutsche
            Synchro" vollständig, also genau die Auskunft, für die es diese Seite
            gibt. Aufgefallen ist es an einer Nebenwirkung: Daniel klickte im
            Karussell eines Kinofilms auf einen Teil mit Disney+-Verweis, und das
            Karussell verschwand.

            **JSX verschluckt so etwas lautlos.** Der Baum bleibt gültig, `tsc`
            und ESLint sehen kein Problem, und der Unterschied zeigt sich nur an
            Titeln, die die Bedingung nicht erfüllen. Ein Bedingungsblock, der
            mehr als eine Handvoll Zeilen umfasst, gehört deshalb sichtbar
            geschlossen — und wer einen Abschnitt verschiebt, prüft danach einen
            Fall, der **in den anderen Zweig** fällt.
          */}

          {/*
            **Der Terminblock steht nur, wenn es noch etwas zu terminieren gibt.**

            Daniel am 03.09.2026: „release termine bereich nur anzeigen, wenn es
            zukünftige termine für diesen titel gibt." Bei einer Reihe, die
            2024 zu Ende lief, beantwortet eine Überschrift „RELEASE-TERMINE FÜR
            DEUTSCHE SYNCHRO" keine Frage mehr — sie kündigt etwas an, das
            längst vorbei ist, und schiebt die Handlung nach unten.

            **Ein Disc-Termin zählt hier mit**, anders als im Kopf: Wer vorbestellen
            kann, hat sehr wohl einen Termin vor sich. Der Kopf beantwortet die
            Frage „wann kann ich es sehen", dieser Block die Frage „was steht
            noch an".
          */}
          <TermineAbschnitt releases={releases} title={title} />

          {/*
            Die Angaben zum Werk selbst — Genres, Bewertung, Studio.

            Sie standen bis zum 24.08.2026 direkt unter dem Titel, vor allem
            anderen. Dabei beantworten sie eine Frage, die sich erst **nach**
            der eigentlichen stellt: „ist das überhaupt meins?" kommt nach „wann
            kommt es und wo läuft es".

            Offen bleibt, was oft gebraucht wird — die ersten drei Genres, die
            Bewertung, das Studio. Ein Aufklapp-Bereich, der vier verschiedene
            Dinge verspricht („Details, Genres, Bewertung, Quellen"), wird
            seltener geöffnet als drei sichtbare Zeilen. Weggeklappt sind nur
            die übrigen Genres.
          */}
          <EckdatenAbschnitt
            title={title}
            t={t}
            genresOffen={genresOffen}
            onFilterBy={onFilterBy}
            tGenre={tGenre}
            setGenresOffen={setGenresOffen}
          />

          {title.hasVoices && <VoiceCast titleId={title.id} />}

          <SchlagworteAbschnitt
            title={title}
            t={t}
            keywords={keywords}
            onFilterBy={onFilterBy}
            tKeyword={tKeyword}
            setAllKeywords={setAllKeywords}
            allKeywords={allKeywords}
          />

          {/*
            **Die Quellen stehen gesammelt unten, nicht an jedem Bereich.**

            Hier stand bis zum 29.08.2026 eine Zeile „Metadaten von AniList ·
            MAL 12345 · Beleg ≥4" — richtig, aber unvollständig: Sie nannte
            eine Quelle von sechs und war nicht klickbar.
          */}
          <AehnlicheTitel title={title} data={data} onOpenTitle={onOpenTitle} />
          <Quellenuebersicht title={title} releases={releases} asZiel={asZiel} />
        </div>
      </div>
    </>
  )
}
