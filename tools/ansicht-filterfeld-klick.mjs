/**
 * Ein Klick neben das Filterfeld der Woche am Rechner schließt nur das Feld: Die Karte darunter öffnet kein Detail-Panel (Aufgabe 11, 23.11.2026).
 * Regel `klickDanebenAbweichungen` aus den Messwerten von `messeKlickDaneben`; geprüft wird die Verdrahtung des Schleiers in `KalenderFilter.tsx`.
 */
const ADRESSE = 'http://ak.test/#/woche'
const KARTE = '[data-hover-zeile]'
/* Feste Uhr (ein Freitag): an Wochenenden liegt keine Karte über dem Feld, die Messung hing am Wochentag (28.11.2026). */
const UHR = new Date('2026-11-27T10:00:00+01:00')

/** `m`: { vorher, nachher, panel, karte } = offene Filterfelder vor und nach dem Klick, offene Panels danach, ob eine Karte außerhalb des Feldes lag. */
export function klickDanebenAbweichungen(wo, m) {
  if (!m.vorher) return [`${wo}: Filterfeld nicht aufgegangen`]
  if (!m.karte) return [`${wo}: keine Karte außerhalb des Filterfeldes zum Anklicken`]
  const a = []
  if (m.nachher !== 0) a.push(`${wo}: Klick daneben schließt das Filterfeld nicht`)
  if (m.panel !== 0) a.push(`${wo}: Klick daneben öffnet die Karte dahinter`)
  return a
}

async function messeKlickDaneben(browser, antworte) {
  const seite = await browser.newPage({ viewport: { width: 1366, height: 900 } })
  await seite.clock.install({ time: UHR })
  await seite.route('**/*', antworte)
  await seite.goto('about:blank')
  await seite.goto(ADRESSE, { waitUntil: 'networkidle' })
  const knopf = seite.locator('button[aria-controls="ak-filterfeld"]').first()
  await knopf.waitFor({ state: 'visible', timeout: 15_000 })
  await seite.waitForTimeout(800)
  await knopf.click()
  await seite.locator('#ak-filterfeld').waitFor({ state: 'visible' })
  await seite.waitForTimeout(400)
  const feld = await seite.locator('#ak-filterfeld').boundingBox()
  /* Eine Karte unter der Kopfleiste und über dem Feld, an ihrem Mittelpunkt wirklich die oberste Fläche (sonst klickte man etwas anderes). */
  const ziel = await seite.evaluate(({ karte, oben }) => {
    for (const z of document.querySelectorAll(karte)) {
      const r = z.getBoundingClientRect()
      const x = r.left + r.width / 2
      const y = r.top + Math.min(r.height / 2, 20)
      if (y > 110 && y < oben - 8 && x > 0 && x < innerWidth) return { x, y }
    }
    return null
  }, { karte: KARTE, oben: feld.y })
  const zaehle = (sel) => seite.locator(sel).count()
  const vorher = await zaehle('#ak-filterfeld')
  if (ziel) await seite.mouse.click(ziel.x, ziel.y)
  await seite.waitForTimeout(600)
  const m = { vorher, nachher: await zaehle('#ak-filterfeld'), panel: await zaehle('[data-panel]'), karte: Boolean(ziel) }
  await seite.close()
  return m
}

/** Der Fall am Rechner; liefert die Abweichungen. */
export async function pruefeKlickDaneben(browser, antworte) {
  return { abweichungen: klickDanebenAbweichungen('Woche am Rechner', await messeKlickDaneben(browser, antworte)) }
}
