import type { ReleaseEvent } from '@shared/types.ts'
import { todayIso } from '@shared/time.ts'
import type { DatenbankEingabe } from '../lib/app-ansicht.ts'
import type { Dataset } from '../lib/data.ts'
import { toggleValue, type FilterState } from '../lib/filters.ts'
import { buildHash, type AppRoute, type ViewId } from '../lib/router.ts'
import { Header } from './Header.tsx'
import { KalenderBereich } from './kalender/KalenderBereich.tsx'
import { DatenbankBereichLazy } from './DatenbankBereichLazy.tsx'
import { DetailPanelLazy } from './DetailPanelLazy.tsx'
import { SeitenAnsichtLazy } from './SeitenAnsichtLazy.tsx'
import { WochenSkelett } from './StartGeruest.tsx'

type Navigate = (next: Partial<AppRoute>) => void

export interface KopfEingabe {
  route: AppRoute
  navigate: Navigate
  setSuche: (search: string) => void
  favorites: Set<number>
  einstellungen: () => void
}

/** Der Kopf als Element, nicht als Komponente: Eine Komponentengrenze hängt ihn neu ein und nimmt den Fokus mit (4072). */
export function appKopf(k: KopfEingabe) {
  const { route, navigate } = k
  const setView = (view: ViewId) => navigate({ view, title: undefined, disc: undefined })
  /* Das Such-Symbol im Kalender: in die Datenbank, mit leerer Suche (der Kopf setzt dort den Fokus). */
  const zurSuche = () => navigate({ view: 'datenbank', filters: { ...route.filters, search: '' }, title: undefined, disc: undefined })
  return (
    <Header
      view={route.view}
      onView={setView}
      /* Echte Adressen (Mittelklick), mit Basis-Pfad: der neue Tab startet ohne den Titel-Pfad. */
      startHref={`${import.meta.env.BASE_URL}${buildHash({ ...route, view: 'woche', date: todayIso(), title: undefined, disc: undefined })}`}
      hrefFuer={(ziel) => `${import.meta.env.BASE_URL}${buildHash({ ...route, view: ziel, title: undefined, disc: undefined })}`}
      onStart={() => {
        navigate({ view: 'woche', date: todayIso(), title: undefined, disc: undefined })
        window.dispatchEvent(new Event('ak-zu-heute'))
      }}
      suche={route.filters.search}
      setSuche={k.setSuche}
      zurSuche={zurSuche}
      favorites={k.favorites}
      einstellungen={k.einstellungen}
    />
  )
}

interface Merkliste {
  favorites: Set<number>
  hidden: Set<number>
  onToggleFavorite: (id: number) => void
  onToggleHidden: (id: number) => void
}

export interface InhaltProps extends Merkliste {
  data: Dataset
  route: AppRoute
  navigate: Navigate
  ersetze: Navigate
  setFilters: (filters: FilterState) => void
  kalenderFilters: FilterState
  kalenderNavigate: Navigate
  kalenderBereit: boolean
  events: ReleaseEvent[]
  tvAus: boolean
  setTvAus: (aus: boolean) => void
  termine: { alle: string[]; sichtbar: string[] }
  datenbank: DatenbankEingabe
}

/** Der Hauptteil: Kalender, Datenbank oder eine Seitenansicht. */
export function AppInhalt(p: InhaltProps) {
  const { route, data } = p
  const kalender = route.view === 'woche' || route.view === 'monat'
  return (
    <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 lg:px-10">
      {kalender && !p.kalenderBereit && <WochenSkelett />}
      {kalender && p.kalenderBereit && (
        <KalenderBereich
          data={data}
          route={{ ...route, filters: p.kalenderFilters }}
          navigate={p.kalenderNavigate}
          events={p.events}
          favorites={p.favorites}
          hidden={p.hidden}
          onToggleFavorite={p.onToggleFavorite}
          onToggleHidden={p.onToggleHidden}
          tvAn={!p.tvAus}
          setTvAn={(an) => p.setTvAus(!an)}
          termine={p.termine}
        />
      )}

      {route.view === 'datenbank' && (
        <DatenbankBereichLazy
          data={data}
          route={route}
          navigate={p.navigate}
          setFilters={p.setFilters}
          geladen={p.datenbank.geladen}
          titles={p.datenbank.titles}
          quelle={p.datenbank.quelle}
          grouped={p.datenbank.grouped}
          onGroupedChange={p.datenbank.onGroupedChange}
          ohneSynchro={p.datenbank.ohneSynchro}
          onOhneSynchroChange={p.datenbank.onOhneSynchroChange}
          laedt={p.datenbank.laedt}
          favorites={p.favorites}
          hidden={p.hidden}
          onToggleFavorite={p.onToggleFavorite}
          onToggleHidden={p.onToggleHidden}
        />
      )}

      <SeitenAnsichtLazy route={route} ersetze={p.ersetze} data={data} favorites={p.favorites} oeffne={(id: number) => p.navigate({ title: id })} />
    </main>
  )
}

export interface DetailProps extends Merkliste {
  data: Dataset
  route: AppRoute
  navigate: Navigate
  titleId: number
}

/** Das Detail-Panel eines geöffneten Titels. */
export function AppDetail(p: DetailProps) {
  const { route, navigate } = p
  return (
    <DetailPanelLazy
      data={p.data}
      titleId={p.titleId}
      discZuerst={route.disc}
      favorites={p.favorites}
      hidden={p.hidden}
      onToggleFavorite={p.onToggleFavorite}
      onToggleHidden={p.onToggleHidden}
      onClose={() => navigate({ title: undefined, disc: undefined })}
      onOpenTitle={(id) => navigate({ title: id, disc: undefined })}
      onFilterBy={(kind, value) => {
        const filters =
          kind === 'genre'
            ? { ...route.filters, genres: toggleValue(route.filters.genres, value) }
            : { ...route.filters, keywords: toggleValue(route.filters.keywords, value) }
        navigate({ filters, title: undefined, disc: undefined, view: 'datenbank' })
      }}
    />
  )
}
