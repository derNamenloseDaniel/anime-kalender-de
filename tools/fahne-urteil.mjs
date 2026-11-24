/**
 * Urteilsregel der Woche-Fahne am Handy (PR 4436, A3: „Neu bei Prime Video“ brach bei 360 px von 16,5 auf 31,5 px Höhe um):
 * reine Funktion aus Messwerten, getestet in `fahne-urteil.test.mjs`. Die Messung im Browser steht in `ansicht-fahne.mjs`.
 */

const TAG_MS = 86_400_000

/** Montag der Woche von `jetztMs` nach Berliner Kalendertag, als `YYYY-MM-DD` (die Suche nach einer Kachel mit Fahne startet dort). */
export function montagDerWoche(jetztMs) {
  const teile = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(jetztMs).map((t) => [t.type, t.value]))
  const tagMs = Date.UTC(Number(teile.year), Number(teile.month) - 1, Number(teile.day))
  const wochentag = new Date(tagMs).getUTCDay()
  return new Date(tagMs - ((wochentag + 6) % 7) * TAG_MS).toISOString().slice(0, 10)
}

/** Datum des Montags `n` Wochen nach dem Montag `montag` (`YYYY-MM-DD`). */
export function wocheAb(montag, n) {
  return new Date(Date.parse(`${montag}T00:00:00Z`) + n * 7 * TAG_MS).toISOString().slice(0, 10)
}

/** Spielraum für Rundung (px): einzeilig heißt Höhe des langen Texts <= Höhe des kurzen Texts + dieser Wert. */
export const RUNDUNG = 1

/**
 * `m`: { kurzHoehe (Fahne mit kurzem Text, eine Zeile), langHoehe (Fahne mit „Neu bei Prime Video“), breite (Fensterbreite),
 * schriftDa (Referenzschrift Liberation Sans ist installiert; sonst misst die Probe mit einer anderen Schrift) }.
 * Gibt die Fehlertexte zurück; leer = die Fahne bleibt einzeilig.
 */
export function urteilFahne(m) {
  const f = []
  if (m.schriftDa !== true) f.push(`${m.breite} px: Referenzschrift Liberation Sans fehlt, Messung wäre schriftabhängig`)
  if (!(m.kurzHoehe > 0)) f.push(`${m.breite} px: Fahne mit kurzem Text hat keine Höhe (${m.kurzHoehe}), Messung ungültig`)
  else if (m.langHoehe > m.kurzHoehe + RUNDUNG) f.push(`${m.breite} px: Fahne bricht um (${m.langHoehe} px statt ${m.kurzHoehe} px)`)
  return f
}
