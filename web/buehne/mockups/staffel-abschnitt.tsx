import type { ComponentProps } from 'react'
import { PanelBuehne } from '../../src/components/detail/buehne.tsx'
import { mockup } from '../register.ts'
import { StaffelAbschnitt } from './staffel-abschnitt-teile.tsx'

/** Variante A: der echte Kopf (Bild, Name, Merken), darunter der Abschnitt mit allen Staffeln der Serie. */
function KopfMitStaffeln(eigenschaften: ComponentProps<typeof PanelBuehne>) {
  return (
    <>
      <PanelBuehne {...eigenschaften} />
      <StaffelAbschnitt />
    </>
  )
}

mockup({
  name: 'staffel-abschnitt',
  titel: 'Staffeln als Abschnitt der Serie (F157) – Pokémon Horizonte',
  ausschnitt: 'detailpanel',
  faelle: ['pokemon-horizonte'],
  varianten: {
    A: {
      ersatz: { PanelBuehne: KopfMitStaffeln },
      notiz: 'Eine Seite für Horizonte: Kopf einmal, darunter vier Staffeln mit Namen, Folgenzahl, Status, Synchro und Anbietern; die laufende Staffel 4 ist aufgeklappt. Merken gilt für die ganze Serie. Staffeldaten aus horizonte-staffeln.yaml (Stand 23.11.), nicht aus dem Fall.',
    },
  },
})
