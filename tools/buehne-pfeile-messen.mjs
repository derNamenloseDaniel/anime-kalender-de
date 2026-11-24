#!/usr/bin/env node
/**
 * Messlauf der Reiter-Pfeile (Mockup `staffel-abschnitt`, F157; `web/src/components/detail/staffel-pfeile.tsx`) im echten Browser:
 * Pfeilzustand ganz links / Mitte / ganz rechts, Klick-Sprung höchstens eine Leistenbreite (plus 2 px Snap), Trefferfläche des
 * aktiven Pfeils 44 × 44 und — der Rand des ersten und letzten Reiters wird nie von einem Pfeil (auch nicht von dessen `::after`) abgefangen.
 *
 * Aufruf: node tools/buehne-pfeile-messen.mjs [--streng]     (erst `npm run buehne:bauen`)
 * Messlauf: Exit 0 auch bei Befunden (sie stehen als „✕“-Zeilen); mit `--streng` setzt ein Befund Exit 1 (Mutationsproben).
 * Die Bewertung (`bewerte`) ist rein und steht im Test `tools/buehne-pfeile-messen.test.mjs`.
 */
import { pathToFileURL } from 'node:url'
import { oeffneZellen, starteBuehne } from './buehne-seite.mjs'

/** Der Sprung eines Klicks darf die Leiste um höchstens so viel überschreiten (Rundung, `snap-proximity`). */
export const SNAP_TOLERANZ = 2
/** Sichtbare Leistenbreite der Messung in px: schmal genug, dass die fünf Reiter der Pokémon-Hauptserie überstehen. */
const VERENGT = 120

/** Befunde (Texte) zu einer Messung; leer = in Ordnung. Ohne weitere Reiter in einer Richtung fehlt der Pfeil dort (`fehlt`). */
export function bewerte(m) {
  const f = []
  const soll = (ok, text) => { if (!ok) f.push(text) }
  soll(m.links.pfeilL === 'fehlt' && m.links.pfeilR === 'an', `ganz links: Pfeile ${m.links.pfeilL}/${m.links.pfeilR}`)
  soll(m.mitte.pfeilL === 'an' && m.mitte.pfeilR === 'an', `Mitte: Pfeile ${m.mitte.pfeilL}/${m.mitte.pfeilR}`)
  soll(m.rechts.pfeilL === 'an' && m.rechts.pfeilR === 'fehlt', `ganz rechts: Pfeile ${m.rechts.pfeilL}/${m.rechts.pfeilR}`)
  soll(m.klick.nachRechts > 100 && m.klick.nachRechts <= m.klick.c + SNAP_TOLERANZ, `Klick rechts rollt ${m.klick.nachRechts} px (Leiste ${m.klick.c} px)`)
  soll(m.klick.nachLinks < m.klick.nachRechts && m.klick.nachLinks >= 0, `Klick links rollt zurück (${m.klick.nachRechts} -> ${m.klick.nachLinks})`)
  soll(m.links.rand === 'reiter', `Rand des ersten Reiters trifft „${m.links.rand}“ statt Reiter`)
  soll(m.rechts.rand === 'reiter', `Rand des letzten Reiters trifft „${m.rechts.rand}“ statt Reiter`)
  soll(m.flaeche.oben && m.flaeche.unten && m.flaeche.seitlich, 'Trefferfläche des aktiven Pfeils nicht 44 × 44')
  return f
}

/** Im Rahmen: Zustand der Pfeile und was am Rand des ersten bzw. letzten Reiters getroffen wird. */
function messeStand() {
  const e = document.querySelector('[data-staffel-reiter]')
  const pfeil = (r) => { const b = document.querySelector(`[data-pfeil="${r}"]`); return b ? (b.getAttribute('aria-disabled') === 'true' ? 'aus' : 'an') : 'fehlt' }
  const art = (x, y) => { const b = document.elementFromPoint(x, y)?.closest('button'); return b ? (b.dataset.pfeil ? `pfeil ${b.dataset.pfeil}` : 'reiter') : 'nichts' }
  const reiter = [...e.querySelectorAll('button')]
  const erster = reiter[0].getBoundingClientRect()
  const letzter = reiter[reiter.length - 1].getBoundingClientRect()
  const y = (r) => r.top + r.height / 2
  return { l: Math.round(e.scrollLeft), pfeilL: pfeil('links'), pfeilR: pfeil('rechts'), randErster: art(erster.left + 4, y(erster)), randLetzter: art(letzter.right - 4, y(letzter)) }
}

/** Im Rahmen: Trefferfläche des rechten Pfeils an drei Punkten (oben/unten/zur Mitte hin). */
function messeFlaeche() {
  const b = document.querySelector('[data-pfeil="rechts"]').getBoundingClientRect()
  const cy = b.top + b.height / 2
  const treffer = (x, y) => document.elementFromPoint(x, y)?.closest('button')?.dataset.pfeil === 'rechts'
  return { oben: treffer(b.right - 4, cy - 21), unten: treffer(b.right - 4, cy + 21), seitlich: treffer(b.right - 28, cy) }
}

async function messe(seite) {
  const zellen = await oeffneZellen(seite, { mockup: 'staffel-abschnitt', variante: 'A', fall: 'pokemon-sammeltitel', teil: 'nachher', zeit: '2026-11-24T10:00:00+01:00' })
  const f = zellen.find((z) => z.schluessel === 'nachher-375-hell').frame
  /* Fünf Reiter passen auf 375 px ganz hinein (dann gibt es zu Recht keinen Pfeil); für die Messung wird die Zeile auf 120 px Leiste verengt. */
  /* Die Reiter stehen im Folgenbereich, unterhalb der ersten Bildschirmhöhe: mittig rollen, sonst trifft `elementFromPoint` nichts. */
  await f.evaluate((b) => { const e = document.querySelector('[data-staffel-reiter]'); e.parentElement.style.width = `${b}px`; e.scrollIntoView({ block: 'center' }) }, VERENGT + 32)
  await seite.waitForTimeout(300)
  const rolle = async (x) => { await f.evaluate((s) => { const e = document.querySelector('[data-staffel-reiter]'); e.scrollLeft = s === 'mitte' ? (e.scrollWidth - e.clientWidth) / 2 : s < 0 ? e.scrollWidth : s }, x); await seite.waitForTimeout(300) }
  const breite = () => f.evaluate(() => document.querySelector('[data-staffel-reiter]').clientWidth)
  const stand = async (x) => { await rolle(x); return f.evaluate(messeStand) }
  const links = await stand(0)
  const mitte = await stand('mitte')
  const rechts = await stand(-1)
  await rolle(0)
  await f.locator('[data-pfeil="rechts"]').click({ position: { x: 8, y: 20 } })
  await seite.waitForTimeout(900)
  const nachRechts = (await f.evaluate(messeStand)).l
  await f.locator('[data-pfeil="links"]').click({ position: { x: 8, y: 20 } })
  await seite.waitForTimeout(900)
  const nachLinks = (await f.evaluate(messeStand)).l
  await rolle(0)
  const flaeche = await f.evaluate(messeFlaeche)
  const rand = (s, wo) => (s[wo] === 'reiter' ? 'reiter' : s[wo])
  return { links: { ...links, rand: rand(links, 'randErster') }, mitte, rechts: { ...rechts, rand: rand(rechts, 'randLetzter') }, klick: { c: await breite(), nachRechts, nachLinks }, flaeche }
}

export async function lauf({ starte = starteBuehne, streng = false, ausgabe = console.log } = {}) {
  const { browser, seite } = await starte()
  const befunde = []
  try {
    const m = await messe(seite)
    ausgabe(`links ${JSON.stringify(m.links)} Mitte ${m.mitte.pfeilL}/${m.mitte.pfeilR} rechts ${JSON.stringify(m.rechts)} Klick ${JSON.stringify(m.klick)} Fläche ${JSON.stringify(m.flaeche)}`)
    befunde.push(...bewerte(m))
  } finally {
    await browser.close()
  }
  for (const b of befunde) ausgabe(`  ✕ ${b}`)
  ausgabe(befunde.length ? `buehne-pfeile-messen: ${befunde.length} Befunde` : 'buehne-pfeile-messen: ok (3 Stände, Klick, Rand, Fläche)')
  return exitVon(befunde.length, streng)
}

/** Messlauf: Exit 0; `--streng`: Exit 1 bei mindestens einem Befund. */
export function exitVon(anzahl, streng) {
  return streng && anzahl > 0 ? 1 : 0
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = await lauf({ streng: process.argv.includes('--streng') })
