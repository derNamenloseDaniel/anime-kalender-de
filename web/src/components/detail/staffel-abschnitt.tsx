import type { ReactNode } from 'react'
import type { Reiter } from './staffel-reiter-liste.ts'
import { ABSCHNITT_FARBE, ReiterZeile } from './staffel-reiter.tsx'

/**
 * **Staffel-Reiter im Folgenbereich** (F157, Daniel 24.11.2026, Mockup Variante A): Reiter oben an einer Box, die Box zeigt den
 * gewählten Abschnitt (Kopfzeile mit Folgenzahl, Lage, Synchro) und darunter seine aufklappbare Folgenliste (`kinder`).
 */
export function StaffelAbschnitt({ reiter, aktiv, kennung, beiWahl, zeile, kinder }: {
  reiter: Reiter[]
  aktiv: number
  kennung: string
  beiWahl: (i: number) => void
  zeile: string
  kinder: ReactNode
}) {
  return (
    <div className="pt-1">
      <ReiterZeile reiter={reiter} aktiv={aktiv} kennung={kennung} beiWahl={beiWahl} />
      <div role="tabpanel" id={`${kennung}-abschnitt`} aria-labelledby={`${kennung}-reiter-${reiter[aktiv]?.nr}`} data-staffel-abschnitt className={`rounded-xl border px-3 py-2 ${ABSCHNITT_FARBE}`}>
        <p className="text-ak-leise">{zeile}</p>
        {kinder}
      </div>
    </div>
  )
}
