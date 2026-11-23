import type { ComponentProps } from 'react'
import type { KastenPillen } from '../../src/components/detail/antwort-kasten-teile.tsx'
import { mockup } from '../register.ts'
import { BereichePillen } from './kalender-wuensche-bereiche-teile.tsx'

type Eigenschaften = ComponentProps<typeof KastenPillen>
const GefuellteBereiche = (p: Eigenschaften) => <BereichePillen stil="A" {...p} />
const BereicheMitStreifen = (p: Eigenschaften) => <BereichePillen stil="B" {...p} />

mockup({
  name: 'kalender-wuensche-bereiche',
  titel: 'Kalender-Wünsche (1): Bereiche mit eigener Farbe – Prime unter Kauf/Leihe',
  ausschnitt: 'detailpanel',
  faelle: ['chihiro', 'akira'],
  varianten: {
    A: {
      ersatz: { KastenPillen: GefuellteBereiche },
      notiz: 'Jeder Bereich eine Fläche in seiner Farbe (Kostenlos grün, Abo blau, Kauf/Leihe bernstein, TV türkis), Überschrift größer und fett, Unterzeile „Kostet extra – auch bei Prime Video“. Chihiro: Netflix im Abo, Prime nur Kauf/Leihe. Akira: Joyn im Abo, Prime und YouTube Kauf/Leihe.',
    },
    B: {
      ersatz: { KastenPillen: BereicheMitStreifen },
      notiz: 'Ruhigere Fassung: nur ein Farbstreifen links, größere Überschrift, bei Kauf/Leihe das Kennzeichen „kostet extra“ neben dem Wort.',
    },
  },
})
