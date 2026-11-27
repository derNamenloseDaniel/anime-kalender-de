import { KastenMitFolgenKarte } from './kasten-folgen.tsx'
import { FolgenMitNachlegern, nachlegerZeilen } from './nachleger-zeilen.tsx'
import { deutscheBereicheDerWege } from './stream-bereiche.ts'
import { synchroBelegt } from '@shared/titles.ts'
import type { StreamLink, Release, Title, DiscAusgabe } from '@shared/types.ts'
import { legendeDerZeilen, zeilenGruppen } from './legende-zeilen.ts'
import type { TvZuletzt } from '../../lib/tv-zuletzt.ts'
import { tvVorbeiGruppen } from './tv-vorbei.tsx'
import type { Translate } from '../../lib/i18n.tsx'
import type { NewsletterVerbindung } from '../../lib/newsletterSync.ts'
import { type berechneAntwort } from './antwort-berechnen.ts'
import { terminPillen, streamZeilen, discZeilen } from './wege-zeilen.tsx'
import { angebotSeitZeileVon } from './kasten-hinweise.ts'
import { KinoZuletzt } from './kino-zuletzt.tsx'
import type { sortiereNachZugang } from './wege-sortieren.ts'
import { ankuendigungOhneTermin } from '@shared/ankuendigung.ts'
import { ohneAnkuendigungsWeg, TerminOffenKarte } from './termin-offen-karte.tsx'
import { useStaffelGrenzen } from './folgen-bereich.tsx'

/** Ankündigung ohne Termin und die deutschen Staffelgrenzen (Anbieterzeilen in Staffeln) des Titels. */
function useAngabenDesTitels(title: Title, art: Parameters<typeof ankuendigungOhneTermin>[1]) {
  return { ankuendigung: ankuendigungOhneTermin(title, art), staffeln: useStaffelGrenzen(title.id) }
}

/** Zuordnung Termin-Kennung → Pillen-Gruppe (Abo/TV) für die Kopfzeilen-Pillen. */
function pillenGruppenVon(sortiert: ReturnType<typeof sortiereNachZugang>, title: Title, releases: Release[], terminReleases: Release[], tvVorbei: TvZuletzt[]) {
  return new Map([
    ...zeilenGruppen(sortiert, title, releases),
    ...terminReleases.map((r) => [r.slug, r.platform === 'tv' ? 'tv' : 'abo'] as const),
    ...tvVorbeiGruppen(tvVorbei),
  ])
}

interface KastenHinweisProps {
  folgenLuecke: string | null
  title: Title
  antwort: ReturnType<typeof berechneAntwort>
  verbindung: NewsletterVerbindung
  favorites: Set<number>
  t: Translate
}

function KastenHinweis({ folgenLuecke, title, antwort, verbindung, favorites, t }: KastenHinweisProps) {
  if (folgenLuecke) {
    return (
      <p className="mt-1 text-t4 text-ak-leise">
        {t(/^\d+$/.test(folgenLuecke) ? 'detail.folgeOhneAnbieter' : 'detail.folgenOhneAnbieter', { bereich: folgenLuecke })}
      </p>
    )
  }
  // Beim Kinofilm sagt der Kino-Hinweis darunter dasselbe.
  if (title.ohneSynchro && antwort?.art !== 'kino') {
    return (
      <>
        <p className="mt-2 text-t4 text-ak-warnung-text">
          {verbindung.verbunden
            ? t('detail.noDubWatchConnected', { mail: verbindung.mail ?? '' })
            : t('detail.noDubWatchOpen')}
        </p>
        {favorites.has(title.id) && (
          <p className="mt-1 text-t4 font-semibold text-ak-favorit-text">
            {t('detail.noDubWatched')}
          </p>
        )}
      </>
    )
  }
  return <KinoZuletzt titleId={title.id} antwort={antwort} t={t} />
}

export function AntwortBereich({ antwort, sortiertNachZugang, ohneSprachbeleg, streamReleases, terminReleases, title, t, today, wegeHinweis, tvVorbei, kastenNotiz, folgenLuecke, verbindung, favorites, onToggleFavorite, folgenAngabeFuer, dubZeilen, releaseJePlattform, releases, discAusgaben, discReleases, discZuerst }: {
  antwort: ReturnType<typeof berechneAntwort>
  sortiertNachZugang: ReturnType<typeof sortiereNachZugang>
  /** Die Sprachaussage des Kopfs, nach allen Wegen des Titels (auch den ausgeblendeten) bestimmt. */
  ohneSprachbeleg: boolean | 'anbieter' | undefined
  streamReleases: Release[]
  /** Alle Termine mit Anbieter/Sender, auch die, deren Anbieter schon als Link da ist. */
  terminReleases: Release[]
  title: Title
  t: Translate
  today: string
  wegeHinweis: string | undefined
  tvVorbei: TvZuletzt[]
  kastenNotiz: Release | undefined
  folgenLuecke: string | null
  verbindung: NewsletterVerbindung
  favorites: Set<number>
  onToggleFavorite: (id: number) => void
  folgenAngabeFuer: (s: { platform?: string; url?: string; nurFolge?: number; dubRanges?: StreamLink['dubRanges']; dub?: boolean; fenster?: StreamLink['fenster']; } | undefined) => string
  dubZeilen: (s: { dubRanges?: StreamLink['dubRanges']; }) => string[]
  releaseJePlattform: Map<string, Release>
  releases: Release[]
  discAusgaben: DiscAusgabe[]
  discReleases: Release[]
  /** Über einen Disc-Termin geöffnet — der Umschalter startet auf „Disc". */
  discZuerst?: boolean
}) {
  const { ankuendigung, staffeln } = useAngabenDesTitels(title, antwort?.art)
  return (
    <>
      {antwort && (
        <KastenMitFolgenKarte
          karte={ankuendigung && <TerminOffenKarte title={title} ankuendigung={ankuendigung} gemerkt={favorites.has(title.id)} onToggleFavorite={onToggleFavorite} verbindung={verbindung} t={t} />}
          pillenGruppen={pillenGruppenVon(sortiertNachZugang, title, releases, terminReleases, tvVorbei)}
          antwort={antwort}
          releases={releases}
          ohneSprachbeleg={ohneSprachbeleg}
          legende={legendeDerZeilen({ sortiert: sortiertNachZugang, title, releases, folgenAngabeFuer, t })}
          terminPillen={terminPillen(terminReleases, title, releases, today, folgenAngabeFuer)}
          title={title}
          t={t}
          today={today}
          wegeHinweis={wegeHinweis}
          notiz={kastenNotiz?.hinweis}
          nachleger={nachlegerZeilen(antwort, releases, today)}
          folgen={<FolgenMitNachlegern titleId={title.id} wege={deutscheBereicheDerWege(title)} antwort={antwort} releases={releases} today={today} laufzeitImKopf={Boolean(title.runtimeMin)} serieBelegt={synchroBelegt(title)} />}
          schnitt={kastenNotiz?.schnitt}
          angebotSeit={angebotSeitZeileVon(title, t)}
          hinweis={<KastenHinweis folgenLuecke={folgenLuecke} title={title} antwort={antwort} verbindung={verbindung} favorites={favorites} t={t} />}
          stream={streamZeilen({ sortiertNachZugang: ohneAnkuendigungsWeg(sortiertNachZugang, ankuendigung), title, t, today, folgenAngabeFuer, dubZeilen, releaseJePlattform, streamReleases, releases, tvVorbei, staffeln })}
          disc={discZeilen({ sortiertNachZugang, title, t, today, folgenAngabeFuer, discAusgaben, discReleases })}
          discZuerst={discZuerst}
          key={discZuerst ? 'disc' : 'stream'}
        />
      )}
    </>
  )
}
