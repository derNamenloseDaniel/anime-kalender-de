import { type NewsEintrag } from '@shared/types.ts'
import { todayIso, addDays } from '@shared/time.ts'
import { useLang } from '../lib/i18n.tsx'
import { datumKurz } from '../lib/news-text.ts'
import { teileGleichmelder } from '../lib/news-gruppen.ts'
import { type Verlaeufe } from '../lib/news-verlauf.ts'
import { schluesselVon } from '../lib/use-news-aufklappen.ts'
import { ARTEN, NewsEintragInhalt } from './news-eintrag.tsx'

interface NewsTagProps {
  tag: string
  alle: NewsEintrag[]
  offen: Set<string>
  gleichOffen: boolean
  schalteGleich: () => void
  umschalten: (e: NewsEintrag) => void
  oeffne: (titelId: number) => void
  verlaeufe: Verlaeufe
}

/** Ein Tag der News-Liste: Überschrift, Zeilen, Knopf für die Gleichmelder. */
export function NewsTag({ tag, alle, offen, gleichOffen, schalteGleich, umschalten, oeffne, verlaeufe }: NewsTagProps): React.JSX.Element {
  const { t } = useLang()
  const { normal, gleich } = teileGleichmelder(alle)
  const liste = gleichOffen ? [...normal, ...gleich] : normal
  const tagName = (iso: string): string =>
    iso === todayIso() ? `${datumKurz(iso)} · ${t('news.heute')}` : iso === addDays(todayIso(), -1) ? `${datumKurz(iso)} · ${t('news.gestern')}` : datumKurz(iso)

  return (
    <div className="mb-4">
      <h3 className="sticky top-0 z-10 bg-slate-50/90 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 backdrop-blur dark:bg-slate-950/90 dark:text-slate-400">
        {tagName(tag)}
      </h3>
      {/*
        **Drei Zeilen je Eintrag, zwei Einträge nebeneinander** (Daniel,
        15.09.2026, mit Bild: „platz reicht kaum für diese news zeile - news
        3-zeilig machen. dann sollten auch 2 news nebeneinander passen").
        Titel, Teil und Kurzform standen in einer Zeile, und der Teil
        („Mononoke – The Movie: Chapter III – Der Fluch der Schlange")
        drückte den Titel zusammen. Jetzt hat jede Angabe ihre Zeile, die Chips
        stehen neben der Kurzform.
      */}
      <ul className="mt-1 grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        {liste.map((e) => {
          const sortiert = [...e.meldungen].sort((a, b) => ARTEN.indexOf(a.art) - ARTEN.indexOf(b.art))
          /* Ein Chip je Art, mit Zähler erst ab zwei — „Disc 1" sagt nichts. */
          const arten = ARTEN.map((a) => [a, sortiert.filter((m) => m.art === a).length] as const).filter(
            ([, n]) => n > 0,
          )
          return (
            <li key={schluesselVon(e)} className="min-w-0 border-b border-slate-100 dark:border-slate-800/70">
              <NewsEintragInhalt
                umschalten={umschalten}
                e={e}
                auf={offen.has(schluesselVon(e))}
                erste={sortiert[0]!}
                t={t}
                arten={arten}
                sortiert={sortiert}
                oeffne={oeffne}
                verlaeufe={verlaeufe}
              />
            </li>
          )
        })}
      </ul>
      {gleich.length > 0 && (
        <button
          type="button"
          aria-expanded={gleichOffen}
          onClick={schalteGleich}
          className="mt-1 w-full rounded-lg border border-dashed border-slate-300 py-1.5 text-xs text-slate-600 transition hover:bg-ak-flaeche-2 dark:border-slate-700 dark:text-slate-300"
        >
          {gleichOffen ? t('news.gleichZu') : t('news.gleich', { n: gleich.length })}
        </button>
      )}
    </div>
  )
}
