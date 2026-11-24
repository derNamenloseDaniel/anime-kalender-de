import { mockup } from '../register.ts'

/** Entschieden (F157, 24.11.2026): Variante A. Seit dem Bau ist sie die echte Komponente (`web/src/components/detail/staffel-abschnitt.tsx`), das Mockup zeigt sie ohne Ersatz und dient als Bildvergleich. */
mockup({
  name: 'staffel-abschnitt',
  titel: 'Staffel-Reiter an der Abschnittsbox (F157), nur echte Daten',
  ausschnitt: 'detailpanel',
  faelle: ['pokemon-sammeltitel', 'pokemon-reisen', 'pokemon-horizonte'],
  zeiten: { '24.11. 10:00': '2026-11-24T10:00:00+01:00' },
  varianten: {
    A: {
      ersatz: {},
      notiz: 'Im Folgenbereich steht je Staffel der Detaildatei (`s`) ein Reiter mit ihrer Nummer, ab zwei Staffeln. Der gewählte Reiter hat die Farbe der Box und geht ohne Kante in sie über; die Box nennt Folgen, Lage und Synchro der Staffel und klappt ihre Folgen auf. '
        + 'Ein Reiter wählt nur den Abschnitt, er wechselt nie den Titel. Ohne Wahl steht er auf der laufenden Staffel, sonst auf der letzten mit deutscher Folge. Pfeile stehen nur, wenn in ihrer Richtung weitere Reiter liegen; kein Scrollbalken. '
        + 'Pokémon (Staffel 1–5): fünf Reiter; Pokémon Reisen: drei (23–25). Pokémon Horizonte: vier Reiter; seine Detaildatei trägt die Staffelnamen (`sn`), die Box nennt den Namen der gewählten Staffel ohne Serienteil und „Staffel N –“, der Reiter trägt ihn als zugänglichen Namen.',
    },
  },
})
