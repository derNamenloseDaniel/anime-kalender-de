import { useEffect, useState, type RefObject } from 'react'
import { pfeilLageVon, sprungVon, type PfeilLage } from './staffel-pfeile.ts'

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
 * Kleiner Pfeil im seitlichen Innenabstand der Box neben der Reiterleiste. Der Pfeil sitzt 16 px am Rand; der Knopf selbst ist 44 px
 * breit und ragt mittig je 14 px nach innen (über den Rand der Leiste) und außen, damit die Panel-Messung das Tippziel am Element sieht. Der Pfeil steht nur, wenn in seiner
 * Richtung weitere Reiter liegen: Der Rand des ersten bzw. letzten Reiters wird so nie abgefangen.
 */
export function ReiterPfeil({ richtung, weitere, beiKlick }: { richtung: 'links' | 'rechts'; weitere: boolean; beiKlick: () => void }) {
  if (!weitere) return null
  const seite = richtung === 'links' ? '-left-3.5' : '-right-3.5'
  return (
    <button
      type="button"
      aria-label={BESCHRIFTUNG[richtung]}
      data-pfeil={richtung}
      onClick={beiKlick}
      className={`absolute inset-y-0 z-20 grid min-h-11 w-11 place-items-center text-ak-text cursor-pointer ${seite}`}
    >
      <svg aria-hidden="true" viewBox="0 0 10 16" className="h-4 w-2.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={richtung === 'links' ? 'M8 2 2 8l6 6' : 'M2 2l6 6-6 6'} />
      </svg>
    </button>
  )
}
