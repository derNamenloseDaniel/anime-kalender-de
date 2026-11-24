import { terminNahFaellig } from './titel-termin-frist.ts'

/** Fälligkeit der aniSearch-Seitenlesungen (Titel und Disc-Artikel), aus den Sammlern herausgelöst, damit sie ohne Abruf prüfbar ist. */

export interface TitelLesung {
  fetchedAt: string
  stand?: number
  /** Herkunft des Namens; ohne Wert oder `ueberschrift` ist der Name nicht belegt deutsch. */
  quelle?: string
  synonyme?: unknown
}

export interface ArtikelLesung {
  fetchedAt: string
  stand: number
}

export interface FaelligOptionen {
  /** Jetzt in Millisekunden (`Date.now()`), als Parameter, damit Tests ihn festlegen. */
  jetzt: number
  alterTage: number
  parserStand: number
  /** Künftige Termine des Titels (Disc-Ausgaben): binnen `alterTage` kommt die Lesung früher wieder (`terminNahFaellig`). */
  termin?: { heute: string; tage: readonly string[] }
}

const terminNah = (e: { fetchedAt: string }, o: FaelligOptionen): boolean =>
  !!o.termin && terminNahFaellig(e.fetchedAt, o.termin.tage, o.termin.heute, o.alterTage)

/** Eine Nichtauskunft (kein belegter deutscher Name) kommt nach 30 Tagen wieder dran, nicht in jedem Lauf (27.09.2026: sonst holte jeder Block die 400 Seiten des vorigen noch einmal). */
export const OHNE_NAMEN_TAGE = 30

const alterTage = (fetchedAt: string, jetzt: number): number => (jetzt - Date.parse(fetchedAt)) / 86_400_000

export function titelFaellig(e: TitelLesung | undefined, o: FaelligOptionen): boolean {
  if (!e) return true
  if ((e.stand ?? 1) < o.parserStand) return true
  const tage = alterTage(e.fetchedAt, o.jetzt)
  if ((!e.quelle || e.quelle === 'ueberschrift') && !(tage < OHNE_NAMEN_TAGE)) return true
  /* Synonyme werden erst seit dem 12.09.2026 mitgespeichert und tragen oft den deutschen Namen, wo es keinen Sprachblock gibt. */
  if (!e.synonyme && e.fetchedAt < '2026-09-12') return true
  if (terminNah(e, o)) return true
  return !(tage < o.alterTage)
}

export function artikelFaellig(e: ArtikelLesung | undefined, o: FaelligOptionen): boolean {
  if (!e || e.stand < o.parserStand) return true
  return alterTage(e.fetchedAt, o.jetzt) >= o.alterTage || terminNah(e, o)
}
