import { createContext } from 'react'
import type { FilterZaehlung } from './filter-zaehlung.ts'

/** Die Zahlen an den Chips des Filterfensters der Datenbank; ohne Wert (Kalender, noch nicht gerechnet) steht keine Zahl am Chip. */
export const FilterZaehlungContext = createContext<FilterZaehlung | undefined>(undefined)
