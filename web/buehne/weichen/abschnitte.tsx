import { useContext, type ComponentProps } from 'react'
import { HandlungAbschnitt as EchteHandlung } from '../../src/components/detail/abschnitte.tsx'
import { ErsatzKontext } from '../ersatz.tsx'

export { EckdatenAbschnitt, TermineAbschnitt } from '../../src/components/detail/abschnitte.tsx'

/** Zeigt den Ersatz des Mockups, sonst die echte Handlung-Karte (Weiche, `vite-weichen.ts`). */
export function HandlungAbschnitt(eigenschaften: ComponentProps<typeof EchteHandlung>) {
  const Ersatz = useContext(ErsatzKontext).HandlungAbschnitt ?? EchteHandlung
  return <Ersatz {...eigenschaften} />
}
