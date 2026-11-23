/**
 * Woche-Fahne am Handy (360 und 375 px), gemessen in der gebauten App an einer echten Fahne der Wochenkacheln:
 * der Text „Neu bei Prime Video“ darf nicht umbrechen (Höhe wie bei einem kurzen Text; PR 4436, A3).
 * Die Fahne wird vor Ort mit beiden Texten befüllt (gleiche Klassen, gleiche Spalte) und danach zurückgesetzt.
 * Regel als reine Funktion in `fahne-urteil.mjs`. Ohne Server: `page.route()` liefert `dist/`.
 * Aufruf allein: `node tools/ansicht-fahne.mjs [--dist <ordner>]`; in `ansicht-bild.mjs --handy` als Zusatzprüfung.
 */
import { chromium } from 'playwright'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { urteilFahne } from './fahne-urteil.mjs'

const WURZEL = path.resolve(import.meta.dirname, '..')
const TYPEN = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' }
const COVER_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300"><rect width="200" height="300" fill="#4a5a80"/></svg>'
export const BREITEN = [360, 375]
/** Wochen ab diesem Montag werden nach einer Kachel mit Fahne abgesucht. */
const ERSTE_WOCHE = Date.UTC(2026, 10, 23)
const WOCHEN_SUCHE = 16
const FAHNE = 'span[class*="rounded-2xl"][class*="uppercase"][class*="font-extrabold"][class*="leading-tight"]'

function antworter(dist) {
  return async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname !== 'ak.test') return route.fulfill({ status: 200, contentType: 'image/svg+xml', body: COVER_SVG })
    const datei = path.join(dist, url.pathname === '/' ? '/index.html' : url.pathname)
    if (!existsSync(datei)) return route.fulfill({ status: 404, body: '' })
    return route.fulfill({ status: 200, contentType: TYPEN[path.extname(datei)] ?? 'application/octet-stream', body: await readFile(datei) })
  }
}

/** Setzt die erste Fahne auf die Texte, misst die Höhe je Text und stellt den Text wieder her. Läuft im Browser. */
function messeFahne({ selektor, kurz, lang }) {
  const fahne = document.querySelector(selektor)
  if (!fahne) return null
  const vorher = fahne.textContent
  const hoehe = (text) => {
    fahne.textContent = text
    return Math.round(fahne.getBoundingClientRect().height * 10) / 10
  }
  const ergebnis = { kurzHoehe: hoehe(kurz), langHoehe: hoehe(lang), spalte: Math.round(fahne.parentElement.getBoundingClientRect().width) }
  fahne.textContent = vorher
  return ergebnis
}

async function lade(seite, datum) {
  await seite.goto('about:blank')
  await seite.goto(`http://ak.test/#/woche?d=${datum}`, { waitUntil: 'networkidle' })
  await seite.locator('header').first().waitFor({ state: 'visible', timeout: 20_000 })
  await seite.waitForTimeout(2000)
}

async function neueSeite(browser, breite, dist) {
  const kontext = await browser.newContext({ viewport: { width: breite, height: 812 }, isMobile: true, hasTouch: true, colorScheme: 'dark' })
  await kontext.addInitScript(() => {
    localStorage.setItem('kennung:ak1', '1')
    localStorage.setItem('kennung:umleitung', '999999')
  })
  const seite = await kontext.newPage()
  await seite.route('**/*', antworter(dist))
  return seite
}

/** Misst bei einer Breite in der ersten Woche mit Fahne; `null`, wenn keine Woche eine trägt. */
async function messeBreite(browser, breite, dist) {
  const seite = await neueSeite(browser, breite, dist)
  for (let n = 0; n < WOCHEN_SUCHE; n++) {
    const datum = new Date(ERSTE_WOCHE + n * 7 * 86_400_000).toISOString().slice(0, 10)
    await lade(seite, datum)
    const m = await seite.evaluate(messeFahne, { selektor: FAHNE, kurz: 'Neu', lang: 'Neu bei Prime Video' })
    if (m) {
      await seite.context().close()
      return { breite, datum, ...m }
    }
  }
  await seite.context().close()
  return null
}

/** Prüft beide Breiten; gibt je Breite Messwerte und Fehler zurück (`fehler` leer = in Ordnung). */
export async function pruefeFahne(dist) {
  const browser = await chromium.launch()
  try {
    const ergebnisse = []
    for (const breite of BREITEN) {
      const m = await messeBreite(browser, breite, dist)
      if (!m) ergebnisse.push({ breite, fehler: [`${breite} px: keine Wochenkachel mit Fahne in ${WOCHEN_SUCHE} Wochen (Messung hätte nichts gemessen)`] })
      else ergebnisse.push({ ...m, fehler: urteilFahne({ ...m, breite }) })
    }
    return ergebnisse
  } finally {
    await browser.close()
  }
}

/** Schreibt das Ergebnis; wahr, wenn rot. */
export function meldeFahne(ergebnisse) {
  const rot = ergebnisse.some((e) => e.fehler.length)
  console.log(`\nWoche-Fahne „Neu bei Prime Video“ einzeilig (360/375 px): ${rot ? '' : 'ok'}`)
  for (const e of ergebnisse) {
    if (e.kurzHoehe !== undefined) console.log(`  ${e.breite} px: Woche ${e.datum}, Spalte ${e.spalte} px, Höhe ${e.langHoehe} px (kurz ${e.kurzHoehe} px)`)
    for (const f of e.fehler) console.log(`  ✕ ${f}`)
  }
  return rot
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const i = process.argv.indexOf('--dist')
  const dist = i > 0 ? path.resolve(process.argv[i + 1]) : path.join(WURZEL, 'dist')
  process.exit(meldeFahne(await pruefeFahne(dist)) ? 1 : 0)
}
