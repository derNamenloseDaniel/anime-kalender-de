/**
 * Urteilsregel der Woche-Fahne am Handy (PR 4436, A3: „Neu bei Prime Video“ brach bei 360 px von 16,5 auf 31,5 px Höhe um):
 * reine Funktion aus Messwerten, getestet in `fahne-urteil.test.mjs`. Die Messung im Browser steht in `ansicht-fahne.mjs`.
 */

/** Spielraum für Rundung (px): einzeilig heißt Höhe des langen Texts <= Höhe des kurzen Texts + dieser Wert. */
export const RUNDUNG = 1

/**
 * `m`: { kurzHoehe (Fahne mit kurzem Text, eine Zeile), langHoehe (Fahne mit „Neu bei Prime Video“), breite (Fensterbreite) }.
 * Gibt die Fehlertexte zurück; leer = die Fahne bleibt einzeilig.
 */
export function urteilFahne(m) {
  const f = []
  if (!(m.kurzHoehe > 0)) f.push(`${m.breite} px: Fahne mit kurzem Text hat keine Höhe (${m.kurzHoehe}), Messung ungültig`)
  else if (m.langHoehe > m.kurzHoehe + RUNDUNG) f.push(`${m.breite} px: Fahne bricht um (${m.langHoehe} px statt ${m.kurzHoehe} px)`)
  return f
}
