import type { FilterLists } from './filters.ts'

/**
 * **Auf welcher Ebene entscheidet ein Filter?** (Filterkonzept 22.11.2026) `titel`: über den Titel (Genre, FSK, Herkunft …),
 * `weg`: über Wege (Plattform, Art, Jahr, Status; `wege-filter.ts`). `anbieter` bleibt Titel-Eigenschaft im Einschluss (Kauflinks
 * sind kein Weg), im Ausschluss zählen Stream-Links als Weg. Jedes Listenfeld braucht hier einen Eintrag (`check-filter-ebenen.ts`);
 * wer ein Feld ergänzt, entscheidet damit bewusst, wer es prüft.
 */
export const FILTER_EBENEN: Record<keyof FilterLists, 'titel' | 'weg'> = {
  platforms: 'weg',
  providers: 'weg',
  releaseTypes: 'weg',
  statuses: 'weg',
  years: 'weg',
  fsk: 'titel',
  genres: 'titel',
  keywords: 'titel',
  sprecher: 'titel',
  land: 'titel',
}
