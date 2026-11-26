/**
 * Marke „[Prüfung rot]“ fällt von selbst (25.11.2026): `tools/rote-sammler-erneut.sh` prüft einen markierten Sammler-PR neu (PR-Stand gemergt mit aktuellem main,
 * `quellen_pruefen` plus `quellen_neue_fehler`); hier steht nur die Entscheidung daraus und der Wortlaut des Kommentars.
 *
 * Befund: `gruen` (Prüfung grün), `gleich` (rot, aber nur aus Gründen, die main selbst hat), `neu` (rot mit neuen Fehlern), `konflikt` (Merge mit main nicht möglich).
 * Aufruf: `echo "<Text>" | node tools/rote-sammler-erneut.mjs entscheide <befund> <Kommentardatei>` schreibt den Kommentar, gibt `freigeben` oder `bleibt` aus;
 *         `node tools/rote-sammler-erneut.mjs ohne-marke "<Titel>"` gibt den Titel ohne Marke aus.
 */
import { writeFileSync } from 'node:fs'
import { MARKE } from './rote-sammler-prs.mjs'

/** Kennzeile im Kommentar: Der Lauf aktualisiert genau diesen einen Kommentar, statt je Durchgang einen neuen anzulegen. */
export const KOMMENTAR_KENNUNG = '<!-- sammler-rot-erneut -->'
const ZEILEN_MAX = 20

export const ohneMarke = (titel) => (titel.startsWith(MARKE) ? titel.slice(MARKE.length).trimStart() : titel)

/** `freigeben` nur, wenn der Stand geprüft werden konnte und keine neuen Fehler hat; ein Konflikt bleibt rot (der nächste Sammel-Lauf holt auf frischem main neu). */
export function entscheide(befund, text = '') {
  const zeilen = text.split('\n').filter(Boolean).slice(0, ZEILEN_MAX).join('\n')
  if (befund === 'gruen') return { freigeben: true, kommentar: `${KOMMENTAR_KENNUNG}\nNeu geprüft auf dem aktuellen main: die Datenprüfungen sind grün. Die Marke ist entfernt; der Daten-Merge nimmt den PR mit.` }
  if (befund === 'gleich') return { freigeben: true, kommentar: `${KOMMENTAR_KENNUNG}\nNeu geprüft auf dem aktuellen main: rot sind nur Prüfungen, die auf main selbst rot sind. Der Fund bringt keine neuen Fehler; die Marke ist entfernt, der Daten-Merge nimmt den PR mit.` }
  if (befund === 'konflikt') return { freigeben: false, kommentar: `${KOMMENTAR_KENNUNG}\nNeu prüfen ging nicht: der Zweig lässt sich nicht konfliktfrei mit dem aktuellen main zusammenführen. Die Marke bleibt; der nächste Sammel-Lauf holt auf frischem main neu und löst diesen PR ab.` }
  if (befund === 'neu') return { freigeben: false, kommentar: `${KOMMENTAR_KENNUNG}\nNeu geprüft auf dem aktuellen main: weiter rot, mit Fehlern, die erst der Fund bringt. Die Marke bleibt.\n\n\`\`\`\n${zeilen}\n\`\`\`` }
  throw new Error(`Unbekannter Befund: ${befund}`)
}

if (process.argv[2] === 'ohne-marke') console.log(ohneMarke(process.argv[3] ?? ''))
if (process.argv[2] === 'entscheide') {
  const text = await new Promise((fertig) => {
    let t = ''
    process.stdin.on('data', (d) => (t += d))
    process.stdin.on('end', () => fertig(t))
  })
  const { freigeben, kommentar } = entscheide(process.argv[3], text)
  writeFileSync(process.argv[4], `${kommentar}\n`)
  console.log(freigeben ? 'freigeben' : 'bleibt')
}
