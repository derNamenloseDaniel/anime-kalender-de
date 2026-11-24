import { useContext, type ComponentProps } from 'react'
import { KastenPillen as EchteKastenPillen } from '../../src/components/detail/antwort-kasten-teile.tsx'
import { ErsatzKontext } from '../ersatz.tsx'

export { KastenWegeHinweis } from '../../src/components/detail/antwort-kasten-teile.tsx'

/** Zeigt den Ersatz des Mockups, sonst die echten Wege-Pillen samt Bereichsüberschriften (Weiche, `vite-weichen.ts`). */
export function KastenPillen(eigenschaften: ComponentProps<typeof EchteKastenPillen>) {
  const Ersatz = useContext(ErsatzKontext).KastenPillen ?? EchteKastenPillen
  return <Ersatz {...eigenschaften} />
}
