import type { Dispatch, SetStateAction } from 'react'
import type { FranchiseMember, Release, Title } from '@shared/types.ts'
import type { Dataset } from '../../lib/data.ts'
import type { Translate } from '../../lib/i18n.tsx'
import type { NewsletterVerbindung } from '../../lib/newsletterSync.ts'
import { Quellenuebersicht } from '../Quellenuebersicht.tsx'
import { KinoBanner } from './kino.tsx'
import { VoiceCast, AehnlicheTitel } from './weitere.tsx'
import { EckdatenAbschnitt, HandlungAbschnitt, TermineAbschnitt } from './abschnitte.tsx'
import { ReihenListe } from './reihen-liste.tsx'
import { AntwortBereichOderNichts } from './kasten-leer.tsx'
import { UnterDerAntwort } from './unter-der-antwort.tsx'
import { SchlagworteAbschnitt } from './Schlagworte.tsx'
import type { plotVon } from './plot.ts'
import type { usePanelAntwort } from './panel-antwort.ts'
import type { useReiheZustand } from './panel-reihe-zustand.ts'
import type { useReihenWechsel, useDiscAusgaben } from './panel-laden.ts'

interface PanelKoerperProps {
  data: Dataset
  title: Title
  today: string
  t: Translate
  tGenre: (name: string) => string
  tKeyword: (name: string) => string
  releases: Release[]
  verbindung: NewsletterVerbindung
  favorites: Set<number>
  onToggleFavorite: (id: number) => void
  onFilterBy: (kind: 'genre' | 'keyword', value: string) => void
  onOpenTitle: (id: number) => void
  /** Alles, was `usePanelAntwort` aus Titel und Terminen ableitet. */
  a: ReturnType<typeof usePanelAntwort>
  discAusgaben: ReturnType<typeof useDiscAusgaben>
  discZuerst: boolean
  plot: ReturnType<typeof plotVon>['plot']
  asZiel: string | undefined
  keywords: string[]
  plotOffen: boolean
  setPlotOffen: Dispatch<SetStateAction<boolean>>
  allKeywords: boolean
  setAllKeywords: Dispatch<SetStateAction<boolean>>
  genresOffen: boolean
  setGenresOffen: Dispatch<SetStateAction<boolean>>
  reihenTeile: FranchiseMember[]
  reihenName: string
  reihe: ReturnType<typeof useReiheZustand>
  wechsel: ReturnType<typeof useReihenWechsel>
}

/** Alles unter der Bühne des Detail-Panels: Antwortkasten, Handlung, Reihe, Termine, Eckdaten, Quellen. */
export function PanelKoerper(p: PanelKoerperProps) {
  const { title, t, today, releases, favorites, verbindung, onToggleFavorite, onFilterBy, a } = p
  return (
    <div className="relative flex flex-col gap-3 px-4 pb-8">
      {/* Die Antwortzeile: erster Block nach der Bühne, immer dieselben vier Zeilen (Gründe: design-regeln.md, „Detail-Panel“). */}
      {title && a.kinoRelease && (
        <KinoBanner release={a.kinoRelease} title={title} today={today} t={t as never} />
      )}
      {/* Der Banner trägt die Auskunft, dann schweigt der Kasten (17.09.2026). */}
      <AntwortBereichOderNichts
        antwort={a.antwort}
        sortiertNachZugang={a.sortiertNachZugang}
        streamReleases={a.streamReleases}
        terminReleases={a.terminReleases}
        title={title}
        t={t}
        today={today}
        wegeHinweis={a.wegeHinweis}
        tvVorbei={a.tvVorbei}
        kastenNotiz={a.kastenNotiz}
        folgenLuecke={a.folgenLuecke}
        verbindung={verbindung}
        favorites={favorites}
        onToggleFavorite={onToggleFavorite}
        folgenAngabeFuer={a.folgenAngabeFuer}
        dubZeilen={a.dubZeilen}
        releaseJePlattform={a.releaseJePlattform}
        releases={releases}
        discAusgaben={p.discAusgaben}
        discReleases={a.discReleases}
        discZuerst={p.discZuerst}
      />
      <UnterDerAntwort
        data={p.data}
        title={title}
        favorites={favorites}
        handlung={<HandlungAbschnitt plot={p.plot} t={t} plotOffen={p.plotOffen} setPlotOffen={p.setPlotOffen} />}
        reihe={
          <ReihenListe
            reihenTeile={p.reihenTeile}
            t={t}
            reihenName={p.reihenName}
            title={title}
            favorites={favorites}
            wechselt={p.wechsel.wechselt}
            wechsleZu={p.wechsel.wechsleZu}
            reiheOhneOffen={p.reihe.reiheOhneOffen}
            reihenSchluessel={p.reihe.reihenSchluessel}
            reiheSuche={p.reihe.reiheSuche}
            setReiheOhneOffen={p.reihe.setReiheOhneOffen}
            setReiheSuche={p.reihe.setReiheSuche}
          />
        }
      />
      {/* Reihenfolge der Abschnitte und ihre Gründe (Bedingungsblöcke sichtbar schließen, Termine nur bei Bevorstehendem): design-regeln.md, „Detail-Panel“. */}
      <TermineAbschnitt releases={releases} title={title} />

      <EckdatenAbschnitt
        title={title}
        t={t}
        genresOffen={p.genresOffen}
        onFilterBy={onFilterBy}
        tGenre={p.tGenre}
        setGenresOffen={p.setGenresOffen}
      />

      {title.hasVoices && <VoiceCast titleId={title.id} />}

      <SchlagworteAbschnitt
        title={title}
        t={t}
        keywords={p.keywords}
        onFilterBy={onFilterBy}
        tKeyword={p.tKeyword}
        setAllKeywords={p.setAllKeywords}
        allKeywords={p.allKeywords}
      />

      <AehnlicheTitel title={title} data={p.data} onOpenTitle={p.onOpenTitle} />
      <Quellenuebersicht title={title} releases={releases} asZiel={p.asZiel} />
    </div>
  )
}
