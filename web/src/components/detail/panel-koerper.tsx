import type { FranchiseMember, Release, Title } from '@shared/types.ts'
import { useLang } from '../../lib/i18n.tsx'
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
import type { usePanelSynopse } from './panel-synopse.ts'
import { KEYWORD_PREVIEW } from './hilfen.tsx'
import type { DetailPanelProps } from './panel-props.ts'

interface PanelKoerperProps extends Pick<DetailPanelProps, 'data' | 'favorites' | 'onToggleFavorite' | 'onFilterBy' | 'onOpenTitle'> {
  title: Title
  today: string
  releases: Release[]
  verbindung: NewsletterVerbindung
  /** Alles, was `usePanelAntwort` aus Titel und Terminen ableitet. */
  a: ReturnType<typeof usePanelAntwort>
  discAusgaben: ReturnType<typeof useDiscAusgaben>
  discZuerst: boolean
  plot: ReturnType<typeof plotVon>['plot']
  asZiel: string | undefined
  /** Inhaltsangabe und Aufklapp-Zustände (Handlung, Schlagworte, Genres). */
  s: ReturnType<typeof usePanelSynopse>
  reihenTeile: FranchiseMember[]
  reihenName: string
  reihe: ReturnType<typeof useReiheZustand>
  wechsel: ReturnType<typeof useReihenWechsel>
}

/** Alles unter der Bühne des Detail-Panels: Antwortkasten, Handlung, Reihe, Termine, Eckdaten, Quellen. */
export function PanelKoerper(p: PanelKoerperProps) {
  const { t, tGenre, tKeyword } = useLang()
  const { title, today, releases, favorites, verbindung, onToggleFavorite, onFilterBy, a, s } = p
  const keywords = s.allKeywords ? title.keywords : title.keywords.slice(0, KEYWORD_PREVIEW)
  return (
    <div className="relative flex flex-col gap-3 px-4 pb-8">
      {/* Antwortzeile: erster Block nach der Bühne; der Kino-Banner trägt die Auskunft, dann schweigt der Kasten (design-regeln.md, „Detail-Panel“). */}
      {title && a.kinoRelease && <KinoBanner release={a.kinoRelease} title={title} today={today} t={t as never} />}
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
        handlung={<HandlungAbschnitt plot={p.plot} t={t} plotOffen={s.plotOffen} setPlotOffen={s.setPlotOffen} />}
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
        genresOffen={s.genresOffen}
        onFilterBy={onFilterBy}
        tGenre={tGenre}
        setGenresOffen={s.setGenresOffen}
      />
      {title.hasVoices && <VoiceCast titleId={title.id} />}
      <SchlagworteAbschnitt
        title={title}
        t={t}
        keywords={keywords}
        onFilterBy={onFilterBy}
        tKeyword={tKeyword}
        setAllKeywords={s.setAllKeywords}
        allKeywords={s.allKeywords}
      />
      <AehnlicheTitel title={title} data={p.data} onOpenTitle={p.onOpenTitle} />
      <Quellenuebersicht title={title} releases={releases} asZiel={p.asZiel} />
    </div>
  )
}
