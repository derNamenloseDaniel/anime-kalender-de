import type { ReleaseEvent } from './types.ts'

/** Eine geschätzte Uhrzeit trägt in jeder Ausgabe ein Zeichen: „≈" in Seite und Bild, „ca." im Mailtext.
 *  Eine einmal belegte Uhrzeit gilt auch am fortgeschriebenen Termin (`estimated`), bis eine Quelle widerspricht. */
type ZeitFelder = Pick<ReleaseEvent, 'time' | 'timeEstimated' | 'estimated'>

export const zeitGeschaetzt = (ev: ZeitFelder): boolean => !!ev.timeEstimated

/** `17:00` bzw. `≈ 17:00` (Vorsatz je Medium); leer ohne Uhrzeit. */
export function zeitMitMarke(ev: ZeitFelder, vorsatz: '≈ ' | 'ca. '): string {
  if (!ev.time) return ''
  return `${zeitGeschaetzt(ev) ? vorsatz : ''}${ev.time}`
}
