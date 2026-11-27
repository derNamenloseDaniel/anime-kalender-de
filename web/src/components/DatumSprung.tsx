import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { weekdayIndex } from '@shared/time.ts'
import { Tooltip } from './ui.tsx'
import { MonatsRaster, SprungFuss, SprungKopf, TageRaster } from './datum-sprung-teile.tsx'
import { useSprungZustand, type SprungTermine } from './datum-sprung-zustand.ts'

const zelle =
  'flex cursor-pointer flex-col items-center justify-center rounded-lg py-1.5 text-xs transition disabled:cursor-default disabled:opacity-45'

const kopfKnopf =
  'cursor-pointer rounded-md px-2 py-1 text-sm transition hover:bg-ak-flaeche-2 disabled:cursor-default disabled:opacity-45'

type Zustand = ReturnType<typeof useSprungZustand>

function SprungInhalt({ z, date }: { z: Zustand; date: string }) {
  const { monat, jahr, monatKey, heute } = z
  if (monat === null) {
    return (
      <div className="grid grid-cols-3 gap-1">
        <MonatsRaster
          monatKey={monatKey}
          jeMonat={z.jeMonat}
          date={date}
          monatErlaubt={z.monatErlaubt}
          setMonat={z.setMonat}
          zelle={zelle}
          heute={heute}
        />
      </div>
    )
  }
  const erster = `${monatKey(monat)}-01`
  const tage = new Date(jahr, monat + 1, 0).getDate()
  const versatz = weekdayIndex(erster)
  return (
    <div className="grid grid-cols-7 gap-0.5 text-center">
      <TageRaster
        versatz={versatz}
        tage={tage}
        monatKey={monatKey}
        monat={monat}
        jeTag={z.jeTag}
        von={z.von}
        bis={z.bis}
        springe={z.springe}
        t={z.t}
        date={date}
        heute={heute}
      />
    </div>
  )
}

function SprungDialog({ z, date }: { z: Zustand; date: string }): ReactNode {
  const { t, pos, setOffen } = z
  if (!pos) return null
  return createPortal(
    <>
      <span className="fixed inset-0 z-40" onClick={() => setOffen(false)} />
      <div
        role="dialog"
        aria-label={t('sprung.oeffnen')}
        className="fixed z-50 w-[280px] overflow-y-auto rounded-2xl border border-ak-rand bg-ak-flaeche p-3 text-ak-text shadow-xl"
        style={{ top: pos.top, bottom: pos.bottom, left: pos.left, maxHeight: pos.maxHoehe }}
      >
        <div className="mb-2 flex items-center justify-between">
          <SprungKopf
            monat={z.monat}
            kopfKnopf={kopfKnopf}
            jahr={z.jahr}
            minJahr={Number(z.von.slice(0, 4))}
            setJahr={z.setJahr}
            t={t}
            maxJahr={Number(z.bis.slice(0, 4))}
            setMonat={z.setMonat}
            springe={z.springe}
            monatKey={z.monatKey}
          />
        </div>
        <SprungInhalt z={z} date={date} />
        <div className="mt-3 flex items-center justify-between gap-1 border-t border-ak-linie pt-2 text-[11px]">
          <SprungFuss kopfKnopf={kopfKnopf} springe={z.springe} von={z.von} t={t} heute={z.heute} bis={z.bis} />
        </div>
      </div>
    </>,
    document.body,
  )
}

function SprungKnopf({ z }: { z: Zustand }) {
  const { t, offen, oeffnen, knopf } = z
  return (
    <Tooltip text={t('sprung.oeffnen')} seite="oben" eigenerFokus>
      <button
        type="button"
        ref={knopf}
        onClick={oeffnen}
        aria-expanded={offen}
        aria-label={t('sprung.oeffnen')}
        className="flex size-11 cursor-pointer items-center justify-center rounded-full border border-ak-rand bg-ak-flaeche text-ak-text transition hover:border-ak-leise"
      >
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M8 3v4M16 3v4M3 10h18" />
        </svg>
      </button>
    </Tooltip>
  )
}

/**
 * **Sprung zu einem Datum**.
 *
 * Zwei Stufen: erst Jahr und Monat, dann der Tag. Jeder Monat trägt die Zahl
 * seiner Termine, damit man sieht, wo etwas los ist. Der Bereich reicht vom
 * frühesten bis zum spätesten Termin im Bestand — außerhalb gibt es nichts zu
 * sehen, also ist dort nichts wählbar.
 */
export function DatumSprung({
  date,
  termine,
  onDate,
}: {
  date: string
  termine: SprungTermine
  onDate: (d: string) => void
}) {
  const z = useSprungZustand(date, termine, onDate)
  return (
    <>
      <SprungKnopf z={z} />
      {z.offen && <SprungDialog z={z} date={date} />}
    </>
  )
}
