import { mockup } from '../register.ts'

/** Entschieden (F158, 24.11.2026): Variante A. Seit dem Bau ist sie die echte Komponente (`staffel-knoepfe.tsx`), das Mockup zeigt sie ohne Ersatz und dient als Bildvergleich. */
mockup({
  name: 'toggo-pillen',
  titel: 'Gebündelte Staffeln: eine TOGGO-Fläche, ein Absprung je Staffel',
  ausschnitt: 'detailpanel',
  faelle: ['pokemon-sammeltitel', 'pokemon-reisen'],
  varianten: {
    A: {
      ersatz: {},
      notiz: 'In der Zugangsgruppe „Kostenlos“ steht eine TOGGO-Fläche „TOGGO · Staffel 1–5“, darin je Staffel ein Knopf mit der Zahl (mindestens 44 px, Rahmen in der Anbieterfarbe) und der Seite dieser Staffel bei TOGGO. Netflix, Prime Video und RTL+ führen mit einer Adresse auf den ganzen Titel: eine Pille wie bisher. Pokémon (Staffel 1–5): fünf Knöpfe; Pokémon Reisen (Staffel 23–25): drei. Die Adressen sind die der Folgenliste (`tg`), keine ergänzt.',
    },
  },
})
