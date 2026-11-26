import { mockup } from '../register.ts'
import { DiscKarten3, DiscMatrixOffen, DiscPillen } from './disc-bereich-3-varianten.tsx'

/*
  Disc-Bereich, Runde 3 (Daniel, 26.11.2026, Panel „The Most Heretical Last Boss Queen“): „disc pill bereiche sind zu unscheinbar,
  und unnötige klicks sind notwendig um die discs zu finden (1 eintrag – man muss erst ausklappen und dann den eintrag wählen)“.
  Ziel: auf einen Blick erfassbar, so auffällig wie die Stream-Pillen, höchstens ein Klick bis zum Händler; eine Gruppe mit
  einem Eintrag klappt nie zu. „Vorher“ ist die Seite (Matrix B3 aus Runde 2).
*/
mockup({
  name: 'disc-bereich-3',
  titel: 'Disc-Bereich Runde 3 – A: Pillen, B: offene Matrix, C: Karten',
  ausschnitt: 'detailpanel',
  faelle: ['last-boss-queen-disc', 'trigun-stampede-disc', 'dan-da-dan-disc', 'sakamoto-days-disc', 'fernsehtag-detektiv-conan-disc', 'one-piece-disc'],
  varianten: {
    A: {
      ersatz: { DiscBereich: DiscPillen },
      notiz: 'Eine Pille je Variante, gebaut wie die Stream-Pillen: Name und Edition, darunter Format und Datum, rechts das Ziel. Die ganze Pille führt zum Händler (ohne Händler zum aniSearch-Artikel); der Kalenderknopf steht nur bei Kommendem daneben.',
    },
    B: {
      ersatz: { DiscBereich: DiscMatrixOffen },
      notiz: 'Die Matrix aus Runde 2 bleibt (Zeile = Variante, Spalte = Format), steht aber offen; die letzte Spalte ist der Händler als Knopf.',
    },
    C: {
      ersatz: { DiscBereich: DiscKarten3 },
      notiz: 'Karten zu zweit, Gesamtausgaben über die ganze Breite: Name, Format und Datum, unten der Händler als Knopf über die Kartenbreite.',
    },
  },
})
