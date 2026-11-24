import { mockup } from '../register.ts'
import { KastenMitTitel, toggoKastenPillen } from './toggo-pillen-teile.tsx'

/** Beide Varianten: der Kasten trägt die Titelkennung, die TOGGO-Pille wird je Staffelseite aufgeteilt (nur bei mindestens zwei verschiedenen Adressen). */
mockup({
  name: 'toggo-pillen',
  titel: 'Gebündelte Staffeln: eine TOGGO-Pille, ein Absprung je Staffel',
  ausschnitt: 'detailpanel',
  faelle: ['pokemon-sammeltitel', 'pokemon-reisen'],
  varianten: {
    A: {
      ersatz: { AntwortKasten: KastenMitTitel, KastenPillen: toggoKastenPillen('A') },
      notiz: 'Eine TOGGO-Pille bleibt, darunter in ihrer Fläche je Staffel ein Knopf (S1 bis S5, mindestens 44 px) mit der Seite dieser Staffel bei TOGGO. Der Sprachhinweis steht einmal. Netflix, Prime Video und RTL+ führen mit einer Adresse auf den ganzen Titel: eine Pille wie heute. Pokémon (Staffel 1–5): fünf Knöpfe; Pokémon Reisen (Staffel 23–25): drei. Die Adressen sind die der Folgenliste (`tg`), keine ergänzt.',
    },
    B: {
      ersatz: { AntwortKasten: KastenMitTitel, KastenPillen: toggoKastenPillen('B') },
      notiz: 'Je Staffel eine eigene TOGGO-Pille („Staffel 1“ …), die direkt auf die Seite der Staffel führt; der Sprachhinweis nur an der ersten; die Folgenangabe der einen Pille („Fg. 1–48 · bis 30.09.“) entfällt, an ihrer Stelle steht die Staffel. Mehr Fläche (am Handy zwei Pillen je Zeile), dafür ein Tipp ohne Umweg. Netflix, Prime Video und RTL+ bleiben eine Pille, weil alle Staffeln auf dieselbe Adresse führen.',
    },
  },
})
