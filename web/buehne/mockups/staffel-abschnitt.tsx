import { mockup } from '../register.ts'
import { HandlungDerStaffel, KastenMitReitern, KopfMitStaffelCover } from './staffel-abschnitt-teile.tsx'

mockup({
  name: 'staffel-abschnitt',
  titel: 'Staffel-Reiter über der Staffelbox (F157) – Beispiel mit 25 Staffeln',
  ausschnitt: 'detailpanel',
  faelle: ['pokemon-horizonte'],
  varianten: {
    A: {
      ersatz: { PanelBuehne: KopfMitStaffelCover, AntwortKasten: KastenMitReitern, HandlungAbschnitt: HandlungDerStaffel },
      // Die echte Folgenkarte zählt die ganze Serie (122); unter einem Staffelreiter wäre das falsch.
      stil: '[data-folgen-karte] { display: none; }',
      notiz: 'Der Staffelabschnitt entfällt. Über der roten Box steht links „Staffeln“, daneben je Staffel ein Reiter mit nur der Nummer (1 bis 25, wischbar). Die laufende Staffel 22 ist orange gefüllt und beim Öffnen gewählt. Der Reiter tauscht Box, Cover und Handlung. Alle Staffeldaten sind ausgedacht (Mockup); die Serie im Kopf ist nur Kulisse.',
    },
  },
})
