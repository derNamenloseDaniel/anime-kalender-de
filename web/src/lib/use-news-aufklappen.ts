import { useState } from 'react'
import { type NewsEintrag } from '@shared/types.ts'

export const schluesselVon = (e: NewsEintrag): string => `${e.am}|${e.titelId}`

/** Welche Tageszeilen aufgeklappt sind; eine einzelne Meldung öffnet stattdessen ihr Panel. */
export function useNewsAufklappen(oeffne: (titelId: number) => void): {
  offen: Set<string>
  umschalten: (e: NewsEintrag) => void
} {
  const [offen, setOffen] = useState<Set<string>>(new Set())

  const umschalten = (e: NewsEintrag): void => {
    /*
      **Eine einzelne Meldung öffnet den Teil, zu dem sie gehört.**

      Der Klick führte auf den Reihenkopf — und im Panel stand die Meldung dann
      nirgends. Für „Mononoke" bündelt die Zeile auf „The Phantom in the Rain",
      der Termin am 29.09.2026 gehört aber zu „Chapter III"; wer klickte,
      landete bei einem Titel ohne diesen Termin.

      Die aufgeklappten Zeilen konnten das längst (`m.teilId ?? e.titelId`) —
      nur die Kopfzeile nicht.

      **Bei mehreren Meldungen bleibt es beim Aufklappen.** Sie können zu
      verschiedenen Teilen gehören; einen davon zu wählen wäre geraten.
    */
    if (e.meldungen.length < 2) {
      oeffne(e.meldungen[0]?.teilId ?? e.titelId)
      return
    }
    setOffen((alt) => {
      const neu = new Set(alt)
      const k = schluesselVon(e)
      if (!neu.delete(k)) neu.add(k)
      return neu
    })
  }

  return { offen, umschalten }
}
