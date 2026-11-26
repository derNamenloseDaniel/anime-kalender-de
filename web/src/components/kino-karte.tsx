import { type Dataset } from '../lib/data.ts'
import { type Translate } from '../lib/i18n.tsx'
import { coverBild } from '../lib/cover.ts'
import { type KinoFilm } from '../lib/kino-filme.ts'
import { KinoPlakette } from './news-kachel.tsx'

interface KinoKarteProps {
  film: KinoFilm
  data: Dataset
  heute: string
  oeffne: (titelId: number) => void
  /** Datum ohne Jahr, solange es das laufende ist. */
  kurz: (iso: string) => string
  t: Translate
}

/** Eine Karte des Kino-Karussells: Cover mit Plakette, darunter der Name. */
export function KinoKarte({ film: f, data, heute, oeffne, kurz, t }: KinoKarteProps): React.JSX.Element {
  const titel = data.titleById.get(f.titelId)!
  const name = titel.titleDe ?? titel.titleEn ?? titel.titleRomaji ?? ''
  const kommt = f.start >= heute
  /* Eine Einzelvorstellung (letzter Spieltag = Start) läuft „am", nicht „ab" (Your Name, CineAnime). */
  const zeile = kommt
    ? t(f.bis === f.start ? 'news.kino.am' : 'news.kino.ab', { d: kurz(f.start) })
    : f.bis
      ? t('news.kino.bis', { d: kurz(f.bis) })
      : t('news.kino.start', { d: kurz(f.start) })
  return (
    <li className="w-28 shrink-0 snap-start">
      <button
        type="button"
        onClick={() => oeffne(f.titelId)}
        className="group flex w-full flex-col gap-1 text-left"
      >
        <span className="relative block aspect-[2/3] w-full overflow-hidden rounded bg-slate-200 dark:bg-slate-800">
          {titel.coverImage && (
            <img
              {...coverBild(titel.coverImage, 150)}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          )}
          <KinoPlakette kommt={kommt} text={zeile} />
        </span>
        <span className="line-clamp-2 text-xs font-medium text-slate-800 group-hover:underline dark:text-slate-100">
          {name}
        </span>
      </button>
    </li>
  )
}
