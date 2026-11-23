import { useRef, useState, type ComponentProps, type PointerEvent } from 'react'
import { addDays, addMonths } from '@shared/time.ts'
import { KalenderBereich as EchterKalender } from '../../src/components/kalender/KalenderBereich.tsx'

type Eigenschaften = ComponentProps<typeof EchterKalender>

/** Ab so viele Pixel waagerecht zählt eine Geste als Wischen; sie muss außerdem klar flacher als steil sein. */
const SCHWELLE = 56
const HALT = 24

/** Das Datum nach einem Wisch: nach links die nächste Woche (bzw. der nächste Monat), nach rechts die vorige. */
export function datumNachWisch(date: string, monat: boolean, dx: number): string {
  const vor = dx < 0 ? 1 : -1
  return monat ? addMonths(date, vor) : addDays(date, 7 * vor)
}

/** Ein Wisch zählt, wenn er weit genug und klar waagerecht war (sonst bleibt es senkrechtes Blättern). */
export function istWisch(dx: number, dy: number): boolean {
  return Math.abs(dx) >= SCHWELLE && Math.abs(dx) > 2 * Math.abs(dy)
}

function Rand({ seite, anteil, text }: { seite: 'links' | 'rechts'; anteil: number; text: string }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute top-24 z-10 rounded-full bg-ak-akzent px-3 py-1 text-t4 font-semibold text-ak-auf-akzent ${seite === 'links' ? 'left-2' : 'right-2'}`}
      style={{ opacity: anteil }}
    >
      {text}
    </span>
  )
}

/** Der echte Kalender in einer Hülle, die waagerechte Gesten (Finger, Stift, Maus) in „vorige/nächste Woche“ übersetzt; senkrechtes Blättern bleibt dem Browser (`touch-action: pan-y`). */
export function KalenderMitWischen(p: Eigenschaften) {
  const [dx, setDx] = useState(0)
  const [zieht, setZieht] = useState(false)
  const start = useRef<{ x: number; y: number } | null>(null)
  const bewegt = useRef(false)
  const monat = p.route.view === 'monat'

  const ab = (e: PointerEvent) => {
    start.current = { x: e.clientX, y: e.clientY }
    bewegt.current = false
  }
  const weiter = (e: PointerEvent) => {
    if (!start.current) return
    const x = e.clientX - start.current.x
    const y = e.clientY - start.current.y
    if (!bewegt.current && Math.abs(x) > HALT && Math.abs(x) > 2 * Math.abs(y)) {
      bewegt.current = true
      e.currentTarget.setPointerCapture(e.pointerId)
      setZieht(true)
    }
    if (bewegt.current) setDx(x)
  }
  const auf = (e: PointerEvent) => {
    const s = start.current
    start.current = null
    if (!s) return
    const x = e.clientX - s.x
    if (bewegt.current && istWisch(x, e.clientY - s.y)) p.navigate({ date: datumNachWisch(p.route.date, monat, x) })
    setDx(0)
    setZieht(false)
  }
  const anteil = Math.min(1, Math.abs(dx) / SCHWELLE)
  const wort = monat ? 'Monat' : 'Woche'

  return (
    <div
      className="relative overflow-x-clip"
      style={{ touchAction: 'pan-y' }}
      onPointerDown={ab}
      onPointerMove={weiter}
      onPointerUp={auf}
      onPointerCancel={auf}
      onClickCapture={(e) => { if (bewegt.current) { e.stopPropagation(); e.preventDefault(); bewegt.current = false } }}
      data-wischen={zieht ? 'zieht' : 'ruhig'}
    >
      {dx > 0 && <Rand seite="links" anteil={anteil} text={`‹ Vorige ${wort}`} />}
      {dx < 0 && <Rand seite="rechts" anteil={anteil} text={`Nächste ${wort} ›`} />}
      <div style={{ transform: `translateX(${dx / 3}px)`, transition: zieht ? 'none' : 'transform 160ms ease-out' }}>
        <EchterKalender {...p} />
      </div>
    </div>
  )
}
