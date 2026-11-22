import { EMPTY_FILTERS, emptyLists, type FilterState } from './filters.ts'

/**
 * **Die Schnellfilter sind Vorlieben, je Ansicht ein Speicher** (Daniel, 02.10.2026; getrennt am 22.11.2026): Sie bleiben im
 * Browser stehen, nicht in der Adresse. Kalender („was kommt wann") und Datenbank („was gibt es") merken sich je ihre eigenen;
 * ein Auge im Kalender ändert die Datenbank nicht und umgekehrt, auch nicht das Push-Abo (hängt am Kalender).
 *
 * Eine Adresse mit `fav=1` (Push-Nachricht) schaltet den Filter für diese Ansicht ein und merkt ihn sich nicht.
 */
export type Ansicht = 'kalender' | 'datenbank'

export interface Vorlieben {
  favoritesOnly: boolean
  kostenlosOnly: boolean
  confirmedOnly: boolean
  availableOnly: boolean
  discAus: boolean
  favoritesExcluded: boolean
  kostenlosExcluded: boolean
  confirmedExcluded: boolean
  availableExcluded: boolean
  zweitanbieterExcluded: boolean
}

/** Alter gemeinsamer Schlüssel; wird beim Lesen als Kopie für beide Ansichten genommen (Migration bis 31.01.2027, Plan Abschnitt 5). */
const ALT = 'vorlieben'
const schluessel = (a: Ansicht) => `vorlieben.${a}`
/** Was die Ansicht nicht kennt: „bestätigt" gibt es in der Datenbank nicht (Termine), „verfügbar" im Kalender wirkt dort nicht. */
const VERWORFEN: Record<Ansicht, (keyof Vorlieben)[]> = {
  kalender: ['availableOnly', 'availableExcluded'],
  datenbank: ['confirmedOnly', 'confirmedExcluded'],
}
const LEER: Vorlieben = {
  favoritesOnly: false,
  kostenlosOnly: false,
  confirmedOnly: false,
  availableOnly: false,
  discAus: false,
  favoritesExcluded: false,
  kostenlosExcluded: false,
  confirmedExcluded: false,
  availableExcluded: false,
  zweitanbieterExcluded: false,
}

function rohLesen(a: Ansicht): Partial<Vorlieben> {
  const eigen = localStorage.getItem(schluessel(a))
  return JSON.parse(eigen ?? localStorage.getItem(ALT) ?? '{}') as Partial<Vorlieben>
}

export function vorliebenLesen(ansicht: Ansicht): Vorlieben {
  try {
    const roh = rohLesen(ansicht)
    const v = { ...LEER }
    for (const k of Object.keys(LEER) as (keyof Vorlieben)[]) v[k] = roh[k] === true && !VERWORFEN[ansicht].includes(k)
    return v
  } catch {
    /* Gesperrter Speicher oder kaputter Wert: dann gilt die Standardansicht. */
    return { ...LEER }
  }
}

/** Die Vorlieben, wie `filters` sie gerade zeigt. */
export function vorliebenAus(filters: FilterState): Vorlieben {
  return {
    favoritesOnly: filters.favoritesOnly,
    kostenlosOnly: filters.kostenlosOnly,
    confirmedOnly: filters.confirmedOnly,
    availableOnly: filters.availableOnly,
    discAus: filters.excluded.releaseTypes.includes('disc'),
    favoritesExcluded: filters.favoritesExcluded,
    kostenlosExcluded: filters.kostenlosExcluded,
    confirmedExcluded: filters.confirmedExcluded,
    availableExcluded: filters.availableExcluded,
    zweitanbieterExcluded: filters.zweitanbieterExcluded,
  }
}

/** Die Schnellfilter einer Ansicht als Filterzustand — Start der Datenbank und Grundlage des Kalenders, wenn er nicht offen ist. */
export function filterAusVorlieben(ansicht: Ansicht): FilterState {
  const v = vorliebenLesen(ansicht)
  return {
    ...EMPTY_FILTERS,
    favoritesOnly: v.favoritesOnly,
    kostenlosOnly: v.kostenlosOnly,
    confirmedOnly: v.confirmedOnly,
    availableOnly: v.availableOnly,
    favoritesExcluded: v.favoritesExcluded,
    kostenlosExcluded: v.kostenlosExcluded,
    confirmedExcluded: v.confirmedExcluded,
    availableExcluded: v.availableExcluded,
    zweitanbieterExcluded: v.zweitanbieterExcluded,
    excluded: { ...emptyLists(), releaseTypes: v.discAus ? ['disc'] : [] },
  }
}

function vorliebenSchreiben(ansicht: Ansicht, v: Vorlieben): void {
  try {
    localStorage.setItem(schluessel(ansicht), JSON.stringify(v))
    /* Der alte gemeinsame Schlüssel ist überflüssig, sobald beide Ansichten ihren haben. */
    if (localStorage.getItem(schluessel('kalender')) && localStorage.getItem(schluessel('datenbank'))) localStorage.removeItem(ALT)
  } catch {
    /* Gesperrter Speicher: die Wahl gilt dann für diesen Besuch. */
  }
}

/**
 * Merkt sich, was sich zwischen `vorher` und `nachher` geändert hat — und nur das — im Speicher der Ansicht. Ein Filter, den nur die
 * Adresse eingeschaltet hat (`fav=1` aus der Push-Nachricht), wird dadurch nicht zur Vorliebe,
 * wenn jemand daneben einen anderen Schalter umlegt.
 */
export function vorliebenNachfuehren(ansicht: Ansicht, vorher: FilterState, nachher: FilterState): void {
  const alt = vorliebenAus(vorher)
  const neu = vorliebenAus(nachher)
  const gemerkt = vorliebenLesen(ansicht)
  let geaendert = false
  for (const k of Object.keys(LEER) as (keyof Vorlieben)[]) {
    if (VERWORFEN[ansicht].includes(k)) continue
    if (alt[k] !== neu[k] && gemerkt[k] !== neu[k]) {
      gemerkt[k] = neu[k]
      geaendert = true
    }
  }
  if (geaendert) vorliebenSchreiben(ansicht, gemerkt)
}
