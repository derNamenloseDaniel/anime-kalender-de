import '../lib/i18n-spaet.ts' // Texte der nachgeladenen Ansichten
import { useMemo, useState } from 'react'
import { todayIso } from '@shared/time.ts'
import type { Dataset } from '../lib/data.ts'
import { anzeigeName } from '@shared/titles.ts'
import { useEscape } from '../lib/escape.ts'
import { useLang } from '../lib/i18n.tsx'
import { useSeiteGesperrt } from '../lib/use-seite-gesperrt.ts'
import { usePanelTitel, useTitelwechsel } from './detail/titelwechsel.ts'
import { useNewsletterVerbindung } from '../lib/newsletterSync.ts'
import { KEYWORD_PREVIEW } from './detail/hilfen.tsx'
import { PANEL_KENNUNG } from './detail/reihen-spur-regeln.ts'
import { PanelBuehne } from './detail/buehne.tsx'
import { plotVon, eigenerAsZiel, titelGestartet } from './detail/plot.ts'
import { useErsatzHandlung } from './detail/ersatz-handlung.ts'
import { PanelLeer, PanelVersteckt } from './detail/panel-huellen.tsx'
import { PANEL_SCHLEIER } from './detail/schleier.ts'
import { useDiscAusgaben, useReihenWechsel, useTitelNachladen } from './detail/panel-laden.ts'
import { usePanelReihe } from './detail/panel-reihe-namen.ts'
import { usePanelAntwort } from './detail/panel-antwort.ts'
import { usePanelSynopse } from './detail/panel-synopse.ts'
import { useReiheZustand } from './detail/panel-reihe-zustand.ts'
import { PanelKoerper } from './detail/panel-koerper.tsx'

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
  /** Die ersten drei Genres reichen fuer die Frage "ist das meins?". */
  const [genresOffen, setGenresOffen] = useState(false)
  const discAusgaben = useDiscAusgaben(titleId)
  const { synopsis, allKeywords, setAllKeywords, plotOffen, setPlotOffen } = usePanelSynopse(titleId, title)

  useEscape(true, () => onClose())
  /* Das Panel liegt über der Seite: sie bleibt dahinter stehen (Daniel, 11.10.2026). */
  useSeiteGesperrt(true)

  const { reihenTeile, eigenerTeil, reihenName, kopfName, teilName } = usePanelReihe(title, data)

  /* Das Bild der Bühne ist das Cover, nicht das Banner (24.08.2026: alle 2.762 Titel haben ein Cover, nur 2.111 ein Banner). Kein Rückfall auf das Cover eines anderen Reihenteils (04.11.2026): ein fremdes Plakat belegt nichts. */
  const buehnenBild: string | undefined = title?.coverImage

  const reihe = useReiheZustand(reihenTeile)
  const holt = useTitelNachladen(data, titleId)
  const a = usePanelAntwort({ title, releases, today, synopsis, favorites, verbindung, t })
  const wechsel = useReihenWechsel(data, titleId, onOpenTitle)
  const ersatz = useErsatzHandlung({ titleId, title, synopsis, reihenTeile })

  if (!title) return <PanelLeer holt={holt} t={t} onClose={onClose} />
  if (hidden.has(title.id)) return <PanelVersteckt title={title} t={t} onClose={onClose} onToggleHidden={onToggleHidden} />

  // Handlung auf Deutsch; fehlt sie, lieber den englischen Text mit Hinweis
  // zeigen als gar keinen. Der englische Rückfall bleibt bewusst, obwohl die
  // Oberfläche seit dem 10.08.2026 einsprachig ist: Er stammt aus der Quelle,
  // nicht aus einer Übersetzung der Seite. Für rund 700 der 2.750 Titel gibt es
  // nirgends eine deutsche Inhaltsangabe — dort wäre die Alternative eine leere Fläche.
  const { plot } = plotVon({ synopsis, anilistId: title.al, ersatz, erschienen: titelGestartet(title, today) })
  const asZiel = eigenerAsZiel(plot, synopsis?.asUrl)
  const keywords = allKeywords ? title.keywords : title.keywords.slice(0, KEYWORD_PREVIEW)

  return (
    <>
      <div className={PANEL_SCHLEIER} onClick={onClose} aria-hidden="true" />
      <div
        /* Breite `max-w-lg` (32 rem): Terminzeilen tragen Datum, Ausgabe und Aktion nebeneinander; auf schmalen Schirmen gilt `w-full`. */
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
          folgenImKasten={a.folgenImKasten}
          eigenerTeil={eigenerTeil}
          kinoRelease={a.kinoRelease}
          asZiel={asZiel}
        />
        <PanelKoerper
          data={data}
          title={title}
          today={today}
          t={t}
          tGenre={tGenre}
          tKeyword={tKeyword}
          releases={releases}
          verbindung={verbindung}
          favorites={favorites}
          onToggleFavorite={onToggleFavorite}
          onFilterBy={onFilterBy}
          onOpenTitle={onOpenTitle}
          a={a}
          discAusgaben={discAusgaben}
          discZuerst={discZuerst}
          plot={plot}
          asZiel={asZiel}
          keywords={keywords}
          plotOffen={plotOffen}
          setPlotOffen={setPlotOffen}
          allKeywords={allKeywords}
          setAllKeywords={setAllKeywords}
          genresOffen={genresOffen}
          setGenresOffen={setGenresOffen}
          reihenTeile={reihenTeile}
          reihenName={reihenName}
          reihe={reihe}
          wechsel={wechsel}
        />
      </div>
    </>
  )
}
