import { type Release, type ReleaseEvent } from '@shared/types.ts'
import { useLang } from '../../lib/i18n.tsx'
import { sichtbareBreite } from '../../lib/sichtbare-breite.ts'
import { useState, useRef, useEffect } from 'react'
import { merkbareTermine } from '@shared/logic.ts'
import { Tooltip } from '../ui.tsx'
import { createPortal } from 'react-dom'
import { googleCalendarUrl, wochenserie } from '@shared/ics.ts'
import { downloadIcs } from './hilfen.tsx'
import { MERKEN_ZEILE_HUELLE, MERKEN_ZEILE_KNOPF, merkenHuelleKlasse, merkenKnopfKlasse, merkenSymbolKlasse } from './merken-optik.ts'

/** Zustand und Stelle des Menüs; steht im Knopf vor jedem frühen Return. */
function useMerkenMenue() {
  const [offen, setOffen] = useState(false)
  /* Das Menü steht am `<body>` und wird gemessen: Als Kind der scrollenden Anbieterliste erzeugte es dort eine Bildlaufleiste. */
  const knopf = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)
  useEffect(() => {
    if (!offen) return
    /* Scrollt die Liste unter dem offenen Menü weg, stimmt seine Stelle nicht mehr. */
    const zu = () => setOffen(false)
    window.addEventListener('scroll', zu, true)
    window.addEventListener('resize', zu)
    return () => {
      window.removeEventListener('scroll', zu, true)
      window.removeEventListener('resize', zu)
    }
  }, [offen])
  const umschalten = () => {
    if (offen) {
      setOffen(false)
      return
    }
    const r = knopf.current?.getBoundingClientRect()
    if (r) setPos({ top: r.bottom + 4, right: Math.max(8, sichtbareBreite() - r.right) })
    setOffen(true)
  }
  return { offen, pos, knopf, umschalten, schliessen: () => setOffen(false) }
}

interface MerkenSymbolProps {
  klasse: string
}

/**
 * Gezeichnet, nicht als Zeichen: Ein 🗓-Emoji kam in der Oberflächenschrift nicht vor
 * und erschien als leeres Kästchen (gesehen am 25.08.2026 in beiden Themen).
 * Google Material Symbols „calendar_add_on" (Apache 2.0) — Daniels Wahl vom 19.09.2026.
 */
function MerkenSymbol({ klasse }: MerkenSymbolProps) {
  return (
    <svg viewBox="0 -960 960 960" className={klasse} fill="currentColor" aria-hidden="true">
      <path d="M700-200h-90q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h90v-90q0-12.75 8.68-21.38 8.67-8.62 21.5-8.62 12.82 0 21.32 8.62 8.5 8.63 8.5 21.38v90h90q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5h-90v90q0 12.75-8.68 21.37-8.67 8.63-21.5 8.63-12.82 0-21.32-8.63Q700-97.25 700-110v-90Zm-520 40q-24 0-42-18t-18-42v-540q0-24 18-42t42-18h65v-28q0-13.6 9-22.8 9-9.2 23.02-9.2t23.5 9.2Q310-861.6 310-848v28h260v-28q0-13.6 9-22.8 9-9.2 23.02-9.2t23.5 9.2Q635-861.6 635-848v28h65q24 0 42 18t18 42v269q0 12.75-8.68 21.37-8.67 8.63-21.5 8.63-12.82 0-21.32-8.63-8.5-8.62-8.5-21.37v-79H180v350h290q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H180Zm0-470h520v-130H180v130Zm0 0v-130 130Z" />
    </svg>
  )
}

interface MerkenMenueProps {
  pos: { top: number; right: number } | null
  ev: ReleaseEvent
  kuenftige: ReleaseEvent[]
  slug: string
  schliessen: () => void
}

/** Die zwei Wege (Google, Kalenderdatei), am `<body>` verankert. */
function MerkenMenue({ pos, ev, kuenftige, slug, schliessen }: MerkenMenueProps) {
  const { t } = useLang()
  return createPortal(
    <>
      {/* Ein Klick daneben schließt — sonst bliebe das Menü am Rand des
          Bildschirms stehen, während darunter weitergeklickt wird. */}
      <span
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          schliessen()
        }}
        className="fixed inset-0 z-40"
      />
      <span
        style={pos ? { top: pos.top, right: pos.right } : { left: -9999, top: 0 }}
        className="fixed z-50 flex w-max flex-col overflow-hidden rounded-lg border border-slate-200 bg-white text-t4 shadow-lg dark:border-white/10 dark:bg-[#141b2d]"
      >
        <a
          href={googleCalendarUrl(ev, {}, wochenserie(kuenftige))}
          target="_blank"
          rel="noreferrer noopener"
          onClick={(e) => {
            e.stopPropagation()
            schliessen()
          }}
          className="px-3 py-2 text-left hover:bg-ak-flaeche-2"
        >
          {t(wochenserie(kuenftige).anzahl > 1 ? 'detail.merkenGoogleSerie' : 'detail.merkenGoogle')}
        </a>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            /* Alle künftigen Folgen, nicht nur die nächste — genau
               dafür lädt jemand eine Kalenderdatei statt einen
               Einzeltermin einzutragen. */
            downloadIcs(kuenftige, slug)
            schliessen()
          }}
          className="cursor-pointer px-3 py-2 text-left hover:bg-ak-flaeche-2"
        >
          {t('detail.merkenIcs')}
        </button>
      </span>
    </>,
    document.body,
  )
}

interface MerkenKnopfProps {
  release?: Release
  today: string
  /**
   * Mit Farbe: Eckknopf unten rechts an der Pille, Rand und Symbol in der Markenfarbe
   * (Daniel, 19.09.2026, Entwurf A2). Ohne: rund in der Zeile (Kino-Banner).
   */
  farbe?: string
  /** In einer Anbieterzeile: größerer Knopf, ohne Rand und Eckplatz. */
  zeile?: boolean
}

/**
 * **„Merken" — ein Symbol, ein Wort, zwei Wege dahinter.**
 *
 * Steht in jeder Pille, die einen künftigen Termin trägt: an der Release-Pille
 * einer Disc ebenso wie an der Anbieter-Pille einer laufenden Serie. Steht
 * nichts mehr aus, erscheint er nicht — ein Kalendereintrag für etwas Heutiges
 * oder Vergangenes ist kein Angebot, sondern ein Fehlgriff (30.09.2026).
 */
export function MerkenKnopf({ release, today, farbe, zeile }: MerkenKnopfProps) {
  const { t } = useLang()
  const menue = useMerkenMenue()
  /* Nur was noch aussteht: heute ist kein Zukunftstermin mehr. */
  const kuenftige = release ? merkbareTermine(release, today) : []
  const ev = kuenftige[0]
  if (!ev || !release) return null
  return (
      <span className={zeile ? MERKEN_ZEILE_HUELLE : merkenHuelleKlasse(Boolean(farbe))}>
        <Tooltip text={t('detail.merkenTitel')} seite="oben">
        <button
          type="button"
          ref={menue.knopf}
          /**
           * **Der Knopf sitzt in einem Verweis — der Klick darf ihn nicht auslösen.**
           *
           * Die Pille ist ein `<a>` auf die Anbieterseite, und „Merken" steht
           * darin. Ohne diese beiden Zeilen führte jeder Klick auf den Knopf zu
           * Crunchyroll, und das Menü öffnete sich erst auf der Rückkehr.
           */
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            menue.umschalten()
          }}
          aria-expanded={menue.offen}
          /* Nur das Symbol, rund (Daniel, 19.09.2026, Entwurf K3) — ~24 px statt ~80 px, gut tippbar. */
          aria-label={t('detail.merkenTitel')}
          className={zeile ? MERKEN_ZEILE_KNOPF : merkenKnopfKlasse(Boolean(farbe))}
          style={farbe ? { color: farbe, boxShadow: `0 0 0 1px ${farbe}` } : undefined}
        >
          <MerkenSymbol klasse={zeile ? 'size-5' : merkenSymbolKlasse(Boolean(farbe))} />
        </button>
        </Tooltip>
        {menue.offen && <MerkenMenue pos={menue.pos} ev={ev} kuenftige={kuenftige} slug={release.slug} schliessen={menue.schliessen} />}
      </span>
  )
}
