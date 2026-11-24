import { useEffect, useMemo, useRef, useState } from 'react'
import { useUeberlaeuft } from '../lib/use-ueberlaeuft.ts'
import { type NewsArt, type NewsEintrag } from '@shared/types.ts'
import { feedUrl, loadNews, type Dataset } from '../lib/data.ts'
import { useLang } from '../lib/i18n.tsx'
import { ohneAusgeblendete } from '../lib/ecchi.ts'
import { coverBild } from '../lib/cover.ts'
import { datumKurz } from '../lib/news-text.ts'
import { todayIso, addDays } from '@shared/time.ts'
import { KinoPlakette } from './news-kachel.tsx'
import { PatchnotesKnopf } from './PatchnotesKnopf.tsx'
import { AELTERE_SCHRITT_TAGE } from '../lib/news-gruppen.ts'
import { NewsFilterKnoepfe } from './news-eintrag.tsx'
import { NewsTag } from './news-tag.tsx'
import { useNewsListe } from '../lib/use-news-liste.ts'
import { useNewsAufklappen } from '../lib/use-news-aufklappen.ts'
import { Ladeplatz } from './Ladeplatz.tsx'


/*
  **Wie lange ein Film zurück noch mitläuft.** Ohne belegten letzten Spieltag
  (`cinemaUntil`, aus dem Kinoprogramm) wissen wir nicht, ob er noch läuft. Vier
  Wochen nach dem Start deckt die übliche Auswertung ab; die Karte nennt dann den
  Start, nicht „läuft noch".
*/
const KINO_RUECKBLICK_TAGE = 28

/**
 * **Karussell für Kinofilme, die gerade laufen oder bald starten** (Daniel,
 * 17.09.2026: „füg oben bei news ein karussel hinzu für aktuell laufende und
 * kommende kinofilme").
 *
 * Quelle sind die Kino-Releases des Datensatzes. Laufende stehen vorn, dann die
 * kommenden nach Starttermin. Eine Karte öffnet das Detail-Panel.
 */
export function KinoKarussell({
  data,
  oeffne,
}: {
  data: Dataset
  oeffne: (titelId: number) => void
}): React.JSX.Element | null {
  const { t } = useLang()
  const leiste = useRef<HTMLUListElement>(null); const ueberlaeuft = useUeberlaeuft(leiste, data)
  const heute = todayIso()
  const filme = useMemo(() => {
    const ab = addDays(heute, -KINO_RUECKBLICK_TAGE)
    const jeTitel = new Map<number, { titelId: number; start: string; bis?: string }>()
    for (const r of data.releases) {
      if (r.platform !== 'kino') continue
      const start = r.schedule?.firstEpisodeDate
      if (!start) continue
      if (r.cinemaUntil ? r.cinemaUntil < heute : start < ab) continue
      const bisher = jeTitel.get(r.titleId)
      /* Mehrere Kinotermine eines Titels: ein laufender vor einem kommenden, sonst der nähere. */
      if (bisher) {
        const lief = bisher.start < heute
        const laeuft = start < heute
        const besser = laeuft !== lief ? laeuft : laeuft ? start > bisher.start : start < bisher.start
        if (!besser) continue
      }
      jeTitel.set(r.titleId, { titelId: r.titleId, start, bis: r.cinemaUntil })
    }
    const laufend = [...jeTitel.values()].filter((f) => f.start < heute).sort((a, b) => b.start.localeCompare(a.start))
    const kommend = [...jeTitel.values()].filter((f) => f.start >= heute).sort((a, b) => a.start.localeCompare(b.start))
    return ohneAusgeblendete([...laufend, ...kommend].filter((f) => data.titleById.has(f.titelId)), data.titleById)
  }, [data, heute])

  if (!filme.length) return null

  const blaettern = (richtung: 1 | -1) => {
    const el = leiste.current
    if (el) el.scrollBy({ left: richtung * el.clientWidth * 0.8, behavior: 'smooth' })
  }
  /* Ohne Jahr, solange es das laufende ist — „ab 26.01." im Januar 2027 wäre sonst mehrdeutig. */
  const kurz = (iso: string) => (iso.slice(0, 4) === heute.slice(0, 4) ? datumKurz(iso).slice(0, 6) : datumKurz(iso))

  return (
    <div className="mb-4">
      <div className="mb-1.5 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ak-leise">
          {t('news.kino.titel')}
        </h2>
        <div className={ueberlaeuft ? 'hidden gap-1 sm:flex' : 'hidden'}>
          <button
            type="button"
            onClick={() => blaettern(-1)}
            aria-label={t('news.kino.zurueck')}
            className="rounded border border-slate-300 px-2 text-sm text-slate-600 hover:bg-ak-flaeche-2 dark:border-slate-600 dark:text-slate-300"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => blaettern(1)}
            aria-label={t('news.kino.weiter')}
            className="rounded border border-slate-300 px-2 text-sm text-slate-600 hover:bg-ak-flaeche-2 dark:border-slate-600 dark:text-slate-300"
          >
            ›
          </button>
        </div>
      </div>
      <ul ref={leiste} data-kino="" className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">
        {filme.map((f) => {
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
            <li key={f.titelId} className="w-28 shrink-0 snap-start">
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
        })}
      </ul>
    </div>
  )
}

/**
 * **Was sich getan hat — ein Anime, ein Tag, eine Zeile.**
 *
 * Daniel am 12.09.2026: „pro tag max 1 eintrag je anime - alle infos zu diesem
 * anime (neue folgen, disc release, ankündigung zu weiteren folgen/staffeln,
 * etc.) müssen unter diesem anime gebündelt aufgelistet sein. und die übersicht
 * muss noch kompakter, damit man nicht so viel scrollen muss. interaktion für
 * mehr details, pills oder sonstige darstellungsweise für übersicht."
 *
 * ## Woher der Aufbau kommt
 *
 * Zehn Listen dieser Art gemessen (Zeilenhöhe und Schriftgrößen im Browser
 * abgelesen, nicht geschätzt): Sentry 119 px, Discourse 88 px, LiveChart
 * 80–92 px, GitHub 64–71 px, Wikipedias erweiterte Letzte Änderungen 22 px.
 * Zwei Befunde tragen diesen Entwurf:
 *
 * 1. **Keine dieser Listen mischt beliebig viele Ereignisarten in eine Zeile.**
 *    Wer feste Arten hat, nimmt Spalten (Sentry: Events/Users; Discourse:
 *    Antworten/Aufrufe); wer wechselnde hat, nimmt Chips. Unsere Arten
 *    schwanken je Tag — also Chips.
 * 2. **Der Zähler ist der Aufklapper** (Wikipedia „3 Änderungen", incident.io
 *    „6 components ⌄"). Aufgeklappt wird **inline**: Der Kontext bleibt stehen,
 *    die Scrollposition auch, und auf einem Touchgerät braucht es keinen
 *    Hover-Zustand, den es dort nicht gibt.
 *
 * Übernommen ist deshalb Sentrys Zeilenaufbau (Bild, zwei Textgrößen, Chips
 * rechts) mit Wikipedias Aufklapper. Gegenüber der ersten Fassung — eine Zeile
 * je Meldung, 58 px — kostet ein Titel mit drei Meldungen an einem Tag jetzt
 * eine Zeile statt drei.
 *
 * **Die Sätze entstehen hier und nicht im Bau**, sonst stünde die deutsche
 * Fassung fest in einer Datei. Kurz in der Übersicht, ausführlich beim
 * Aufklappen: Die Übersicht beantwortet „ist etwas passiert", das Detail
 * „was genau".
 */
export function NewsView({ data, oeffne }: { data: Dataset; oeffne: (titelId: number) => void }): React.JSX.Element {
  const { t } = useLang()
  const [meldungen, setMeldungen] = useState<NewsEintrag[] | null>(null)
  const [filter, setFilter] = useState<NewsArt | null>(null)
  /*
    **Vorn stehen die letzten 14 Tage, Älteres auf Knopfdruck** (Daniel,
    15.09.2026: „news seite auf letzte 14 tage beschränken und für ältere news
    einen button ‚ältere News' anbieten"). Die Filterzähler zählen, was gerade
    gezeigt wird — sonst stünde „Disc 12" über einer Liste mit drei.
  */
  const [aeltereTage, setAeltereTage] = useState(0)
  const [gleichOffen, setGleichOffen] = useState<Set<string>>(new Set())
  const grenze = addDays(todayIso(), -14 - aeltereTage)

  useEffect(() => {
    let abgebrochen = false
    void loadNews().then((liste) => {
      if (!abgebrochen) setMeldungen(liste)
    })
    return () => {
      abgebrochen = true
    }
  }, [])

  const { verlaeufe, jeArt, tage, aeltereGibtEs } = useNewsListe(data, meldungen, grenze, filter)
  const { offen, umschalten } = useNewsAufklappen(oeffne)

  return (
    <section className="mx-auto w-full max-w-5xl px-3 py-4">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          {t('news.titel')} <span className="text-xs font-normal text-ak-leise">· {t('news.seit', { datum: datumKurz(grenze) })}</span>
        </h1>
        <a href={feedUrl('news.xml')} className="ak-tz text-xs text-ak-leise underline-offset-2 hover:underline" title={t('news.rssHint')}>
          RSS
        </a>
      </div>
      <PatchnotesKnopf stand={data.meta.patchnotesStand} />
      <KinoKarussell data={data} oeffne={oeffne} />

      {/* Filterleiste: nur Arten, die wirklich vorkommen (ein leerer Filter ist eine Sackgasse). py-2.5 fängt die 44-px-Trefferfläche (.ak-tz::after) ein, sonst scrollt die Leiste senkrecht; auf dem Handy eine rollbare Reihe statt vier Zeilen Chips. */}
      {meldungen && meldungen.length > 0 && (
        <div className="-mx-3 -mt-2.5 mb-0.5 flex gap-1 overflow-x-auto px-3 py-2.5 max-sm:pr-8 max-sm:[mask-image:linear-gradient(to_right,#000_calc(100%-32px),transparent)] [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          <NewsFilterKnoepfe setFilter={setFilter} filter={filter} t={t} jeArt={jeArt} />
        </div>
      )}

      {!meldungen && <Ladeplatz />}
      {meldungen && !tage.length && <p className="text-sm text-ak-leise">{t('news.leer')}</p>}

      {tage.map(([tag, alle]) => (
        <NewsTag
          key={tag}
          tag={tag}
          alle={alle}
          offen={offen}
          gleichOffen={gleichOffen.has(tag)}
          schalteGleich={() => setGleichOffen((alt) => { const neu = new Set(alt); if (!neu.delete(tag)) neu.add(tag); return neu })}
          umschalten={umschalten}
          oeffne={oeffne}
          verlaeufe={verlaeufe}
        />
      ))}

      {aeltereGibtEs && (
        <button
          type="button"
          onClick={() => setAeltereTage((n) => n + AELTERE_SCHRITT_TAGE)}
          className="mt-1 w-full rounded-lg border border-slate-200 py-2 text-sm text-slate-600 transition hover:bg-ak-flaeche-2 dark:border-slate-700 dark:text-slate-300"
        >
          {t('news.aeltere', { datum: datumKurz(addDays(grenze, -AELTERE_SCHRITT_TAGE)) })}
        </button>
      )}
    </section>
  )
}
