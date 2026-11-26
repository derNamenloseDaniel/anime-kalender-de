import { ALLE } from '../faelle.ts'
import { mockup } from '../register.ts'
import { KalenderMitWischen } from './kalender-wischen-teile.tsx'

mockup({
  name: 'kalender-wischen',
  titel: 'Kalender-Wünsche (2): Seitlich wischen – nächste und vorige Woche',
  ausschnitt: 'ganz',
  faelle: [ALLE],
  varianten: {
    A: {
      ersatz: { KalenderBereich: KalenderMitWischen },
      notiz: 'Ein waagerechter Wisch (ab 56 px, klar flacher als steil) blättert eine Woche weiter (Wisch nach links) oder zurück (nach rechts), im Monat einen Monat. Beim Ziehen folgt der Kalender dem Finger ein Drittel mit, am Rand steht „Nächste Woche ›“. Senkrechtes Blättern bleibt unberührt. Die Pfeile im Kopf bleiben. Funktioniert auch mit der Maus (ziehen).',
    },
  },
})
