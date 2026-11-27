import type { StaffelNummer } from '@shared/titles.ts'
import { staffelKurz, zeilenZusatz } from './reihen-regeln.ts'

/** Name einer Zeile der Reihenliste: „Staffel 4 · War of the Three Titans", ohne Nummer der gekürzte Name. */
export function ZeilenName({ nr, rest, voll, kurz, unterschied }: { nr: StaffelNummer | undefined; rest: string; voll: string; kurz: string; unterschied?: string }) {
  if (!nr) return <>{kurz}</>
  const zusatz = zeilenZusatz(nr, rest, voll, unterschied)
  return (
    <>
      <b className="font-semibold">{staffelKurz(nr)}</b>
      {zusatz ? ' · ' : ''}
      {/* Der Folgenbereich bricht als Ganzes um, nie mitten in „Folge 12–25“ (Karte 120 px breit). */}
      {zusatz && zusatz === unterschied ? <span className="whitespace-nowrap">{zusatz}</span> : zusatz}
    </>
  )
}
