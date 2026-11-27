import { type ReactNode } from 'react'
import { type Release, type Title } from '@shared/types.ts'
import { type Antwort } from './antwort-typ.ts'
import { type Gruppe } from './stream-pillen.ts'

/** Die Eigenschaften des Antwortkastens (aus `antwort-kasten.tsx` herausgelöst). */
export interface AntwortKastenProps {
  /** Pillen mit Termin und Anbieter/Sender — sie stehen vor der ersten Folge statt der Streamwege. */
  terminPillen?: ReactNode[]
  /** Bereich je Pillen-Schlüssel (`key`) — nur gebraucht, wenn es einen kostenlosen Weg gibt. */
  pillenGruppen?: Map<string, Gruppe>
  /** Über einen Disc-Termin geöffnet — dann steht der Umschalter auf „Disc". */
  discZuerst?: boolean
  /** Erklärt die Zustände der Anbieterzeilen (Stream-Seite) — nur, was dort wirklich vorkommt. */
  legende?: string
  /** Alle Stream-Zeilen ohne Sprachbeleg: Die Überschrift „Auf Deutsch …“ entfällt. */
  ohneSprachbeleg?: boolean | 'omu' | 'anbieter'
  /** Die Termine des Titels — gebraucht für den frühesten deutschen Start (`de-seit.ts`). */
  releases?: Release[]
  antwort: Antwort
  title: Title
  t: (k: never, v?: Record<string, string | number>) => string
  today: string
  /**
   * Die Anbieter-Pillen. Sie standen bis zum 03.09.2026 in einem eigenen
   * Abschnitt „WO LÄUFT ES" darunter — mit dem Ergebnis, dass der Kopf des
   * Panels je Titel eine andere Höhe hatte und beim Wechsel sprang (Daniel, mit
   * drei Bildern). Im Kasten haben sie einen festen Platz.
   */
  stream?: ReactNode[]
  disc?: ReactNode[]
  /**
   * **Was dasteht, wenn es keinen Weg gibt.**
   *
   * „WO LÄUFT ES — Kein Anbieter bekannt" war bis zum 04.09.2026 ein eigener
   * Abschnitt unter dem Kasten. Seit die Pillen im Kasten stehen, ist er die
   * letzte Hälfte eines Bereichs, den es nicht mehr gibt.
   *
   * Der Satz selbst bleibt, und zwar an der Stelle der Pillen: Er unterscheidet
   * „läuft nirgends" von „wissen wir nicht" — bei 665 von 2.760 Titeln die
   * einzige Auskunft, die das Suchen auf dieser Seite beendet.
   */
  wegeHinweis?: string
  /**
   * **Was den Termin erklärt, steht beim Termin.**
   *
   * `Release.hinweis` trägt das, was aus keiner Zahl hervorgeht — „der Tag steht
   * noch nicht fest", „Netflix nennt den Termin auf der Titelseite; das Jahr
   * ist abgeleitet". Was nur unsere Zuordnung erklärt („Zum Start standen die
   * Folgen 1 bis 3 bereit", „Automatisch übernommen aus …"), steht seit dem
   * 13.09.2026 in `Release.herkunft` und nicht hier.
   * **45 Releases haben eine** (Stand 05.11.2026, `data/curated/*.yaml`), und sie standen bis zum 04.09.2026 als
   * orangefarbener Kasten im Terminbereich.
   *
   * Mit dem Bereich sind sie verschwunden — unbeabsichtigt, denn die Pille
   * nahm nur Name und Datum mit. Daniel hat es an der falschen Beschreibung im
   * Footer gemerkt: „was für 24 folgen mit belegtem termin? das ist staffel 3,
   * das erscheint erst ab 01.10.2026". Bei „Apothekerin" Staffel 3 stand dort
   * in Wahrheit: „Deutsche Fassung laut aniSearch für Oktober 2026
   * angekündigt — der Tag steht noch nicht fest."
   */
  notiz?: string; folgen?: ReactNode // Folgenliste (`folgen-bereich.tsx`)
  /** Wer außer dem Hauptweg noch nachlegt, mit Tag und Uhrzeit (`nachleger-zeilen.tsx`) — gehört in den Kopf, nicht über die Folgenliste. */
  nachleger?: string[]
  schnitt?: Release['schnitt']
  /**
   * **„Im Angebot seit" — die einzige Angabe, die der frühere Terminblock allein trug.**
   *
   * 267 Titel haben sie (Streaming Availability API: seit wann ein Anbieter den
   * Titel führt). Sie ist **nicht** das Erscheinungsdatum der deutschen Fassung;
   * der Tooltip am Datum sagt das. Sie steht seit dem 16.09.2026 hier, weil der
   * Block darunter ersatzlos entfallen ist.
   */
  angebotSeit?: string
  /**
   * Der Merken-Hinweis für Titel ohne belegte Synchro — was der Stern bewirkt.
   *
   * Stand bis zum 16.09.2026 im Block darunter, zusammen mit einem zweiten
   * „Keine deutsche Synchro bekannt" neben dem, das der Kasten schon sagt.
   * Geblieben ist der Teil, der etwas Neues sagt.
   */
  hinweis?: ReactNode
}
