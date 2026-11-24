import { useContext, type ComponentProps } from 'react'
import { KalenderBereich as EchterKalender } from '../../src/components/kalender/KalenderBereich.tsx'
import { ErsatzKontext } from '../ersatz.tsx'

/** Zeigt den Ersatz des Mockups, sonst den echten Kalender (Weiche, `vite-weichen.ts`). */
export function KalenderBereich(eigenschaften: ComponentProps<typeof EchterKalender>) {
  const Ersatz = useContext(ErsatzKontext).KalenderBereich ?? EchterKalender
  return <Ersatz {...eigenschaften} />
}
