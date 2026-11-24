import { useEffect, useState, type RefObject } from 'react'
import { pfeilLageVon, pfeilZustandVon, sprungVon, type PfeilLage, type PfeilModus } from './staffel-pfeile.ts'

/** Lage der Pfeile der Reiterzeile; folgt Rollen und Größenänderung. */
export function usePfeilLage(zeile: RefObject<HTMLElement | null>, anzahl: number): PfeilLage {
  const [lage, setLage] = useState<PfeilLage>({ links: false, rechts: false })
  useEffect(() => {
    const el = zeile.current
    if (!el) return
    const messe = () => {
      const neu = pfeilLageVon(el.scrollLeft, el.scrollWidth, el.clientWidth)
      setLage((alt) => (alt.links === neu.links && alt.rechts === neu.rechts ? alt : neu))
    }
    messe()
    el.addEventListener('scroll', messe, { passive: true })
    const beobachter = new ResizeObserver(messe)
    beobachter.observe(el)
    return () => {
      el.removeEventListener('scroll', messe)
      beobachter.disconnect()
    }
  }, [zeile, anzahl])
  return lage
}

const BESCHRIFTUNG = { links: 'Vorherige Staffeln', rechts: 'Weitere Staffeln' } as const

/** Rollt um höchstens die sichtbare Leistenbreite; ohne Bewegungswunsch des Besuchers weich. */
export function rolleUm(zeile: HTMLElement | null, richtung: 'links' | 'rechts'): void {
  if (!zeile) return
  const ruhig = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  zeile.scrollBy({ left: sprungVon(richtung, zeile.clientWidth), behavior: ruhig ? 'auto' : 'smooth' })
}

/**
 * Kleiner Pfeil im seitlichen Innenabstand der Box neben der Reiterleiste. Die Box ist nur 16 px breit; die Trefferfläche (44 × 44)
 * reicht per `::after` über den Rand der Leiste. Ein deaktivierter Pfeil nimmt keine Treffer an, so bleibt der Reiter darunter bedienbar.
 */
export function ReiterPfeil({ richtung, modus, weitere, beiKlick }: { richtung: 'links' | 'rechts'; modus: PfeilModus; weitere: boolean; beiKlick: () => void }) {
  const { sichtbar, aktiv } = pfeilZustandVon(modus, weitere)
  if (!sichtbar) return null
  const seite = richtung === 'links' ? 'left-0 after:left-0' : 'right-0 after:right-0'
  return (
    <button
      type="button"
      aria-label={BESCHRIFTUNG[richtung]}
      aria-disabled={!aktiv}
      data-pfeil={richtung}
      onClick={aktiv ? beiKlick : undefined}
      className={`absolute inset-y-0 z-20 grid w-4 place-items-center text-ak-text after:absolute after:top-1/2 after:h-11 after:w-11 after:-translate-y-1/2 after:content-[''] ${seite} ${aktiv ? 'cursor-pointer' : 'pointer-events-none opacity-30'}`}
    >
      <svg aria-hidden="true" viewBox="0 0 10 16" className="h-4 w-2.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={richtung === 'links' ? 'M8 2 2 8l6 6' : 'M2 2l6 6-6 6'} />
      </svg>
    </button>
  )
}
