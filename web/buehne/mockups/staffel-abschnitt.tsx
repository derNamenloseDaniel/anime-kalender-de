import { mockup } from '../register.ts'

/**
 * Entschieden (F157, 24.11.2026): Variante A, freigegebenes Bild am Commit 47f7bda363. Seit dem Bau sind beide Reiter echte
 * Komponenten: die Reihen-Reiter am Antwortkasten (`web/src/components/detail/reihen-reiter.tsx`) und die Staffel-Reiter im
 * Folgenbereich (`staffel-abschnitt.tsx`); das Mockup zeigt sie ohne Ersatz und dient als Bildvergleich.
 */
mockup({
  name: 'staffel-abschnitt',
  titel: 'Staffel-Reiter an der roten Box und im Folgenbereich (F157)',
  ausschnitt: 'detailpanel',
  faelle: ['pokemon-sammeltitel', 'pokemon-reisen', 'pokemon-horizonte'],
  /* Stichtag 24.11.2026: Staffel 4 der Horizonte läuft seit 20.11.; zur Uhr der Bühne (11.10.) wäre sie „angekündigt“. */
  zeiten: { '24.11. 10:00': '2026-11-24T10:00:00+01:00' },
  varianten: {
    A: {
      ersatz: {},
      notiz: 'An der roten Box: Karteikarten-Reiter für die Staffeln der Reihe sitzen oben am Antwortkasten. Der gewählte Reiter hat die Farbe der Box und geht ohne Kante in sie über; er trägt oben einen Akzentstrich, alle anderen sind ruhig grau. Ein Reiter öffnet die Staffel als eigenen Titel (wie ein Klick in der Reihenliste). Eine laufende Staffel trägt oben rechts einen Punkt, eine, die noch kommt, einen Ring. Pokémon Horizonte hat 4 Reiter, Pokémon (Hauptserie) 12 für die Staffeln 1 bis 25 (ein Eintrag der Daten deckt teils mehrere Staffeln ab, z. B. „1–5“). '
        + 'Im Folgenbereich: je Staffel der Detaildatei (`s`) ein Reiter mit ihrer Nummer, ab zwei Staffeln; er wählt nur den Abschnitt, nie den Titel. Pokémon (Staffel 1–5): fünf Reiter; Pokémon Reisen: drei (23–25). '
        + 'Beide Leisten: Pfeile stehen nur, wenn in ihrer Richtung weitere Reiter liegen; ein Tipp rollt höchstens eine Leistenbreite; kein Scrollbalken.',
    },
  },
})
