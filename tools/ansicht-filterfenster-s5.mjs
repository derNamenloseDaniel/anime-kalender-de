/**
 * Zusicherungen der Filter-Darstellung S5 (23.11.2026) für das offene Filterfenster: einfarbige Schnellfläche, Zahlen an den Chips der Datenbank,
 * „Streambar" mit 44-px-Tippfläche, die Schalter „ohne Synchro"/„Staffeln zusammenfassen" außerhalb des Fensters (Handy). Teil von `ansicht-filterfenster.mjs`.
 */

/** Misst im geöffneten Fenster, was S5 betrifft; läuft im Browser. `datenbank`: die Route hat Zahlen und Schalter. */
export function messeS5(datenbank) {
  const fenster = document.querySelector('#ak-filter')
  const grund = getComputedStyle(fenster).backgroundColor
  const schnellChip = [...fenster.querySelectorAll('button[aria-pressed]')].find((b) => b.textContent.includes('Favoriten'))
  /* Hintergründe zwischen Chip und Fenster: jeder muss durchsichtig oder wie das Fenster sein. */
  const hintergruende = []
  for (let e = schnellChip?.parentElement; e && e !== fenster; e = e.parentElement) hintergruende.push(getComputedStyle(e).backgroundColor)
  const streambar = [...fenster.querySelectorAll('button[aria-pressed]')].find((b) => /Streambar/.test(b.textContent))
  const plattform = [...fenster.querySelectorAll('button[aria-pressed]')].find((b) => /Netflix/.test(b.textContent))
  const schalterImFenster = [...fenster.querySelectorAll('label')].some((l) => /ohne deutsche Synchro|Staffeln/i.test(l.textContent))
  return {
    datenbank,
    grund,
    hintergruende,
    streambarDa: !!streambar,
    streambarHoehe: streambar ? parseFloat(getComputedStyle(streambar, '::after').height) : 0,
    plattformName: plattform?.getAttribute('aria-label') ?? plattform?.textContent ?? '',
    plattformZahlSichtbar: !!plattform?.querySelector('[aria-hidden=true].tabular-nums'),
    schalterImFenster,
  }
}

const DURCHSICHTIG = new Set(['rgba(0, 0, 0, 0)', 'transparent'])

/** Die Abweichungen von der S5-Darstellung, als Texte; reine Funktion über die Messung. */
export function s5Abweichungen(wo, m) {
  const a = []
  const gefaerbt = m.hintergruende.filter((h) => !DURCHSICHTIG.has(h) && h !== m.grund)
  if (gefaerbt.length) a.push(`${wo}: Schnellfläche hat eigene Farbe (${gefaerbt[0]}), soll einfarbig wie das Fenster sein`)
  if (!m.datenbank) return a
  if (!m.streambarDa) a.push(`${wo}: Chip „Streambar" fehlt (heißt noch „verfügbar"?)`)
  else if (m.streambarHoehe < 44) a.push(`${wo}: „Streambar" Tippfläche unter 44 px (${m.streambarHoehe})`)
  if (!m.plattformZahlSichtbar) a.push(`${wo}: Plattform-Chip ohne Zahl`)
  if (!/\d[\d.]* Titel/.test(m.plattformName) && m.plattformZahlSichtbar) a.push(`${wo}: Plattform-Chip nennt die Zahl nicht im Namen („${m.plattformName}")`)
  if (m.schalterImFenster) a.push(`${wo}: „ohne Synchro"/„Staffeln zusammenfassen" stehen noch im Filterfenster`)
  return a
}
