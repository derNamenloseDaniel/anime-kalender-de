/**
 * Prüft die Messfunktionen der Bühne (`buehne-messung.mjs`) mit einer Attrappen-Seite ohne Browser:
 * zu kleines Tippziel und zu schwacher Kontrast werden gemeldet, ein verstecktes Eingabefeld in einem Etikett und
 * deaktivierte Bedienelemente nicht.
 */
import assert from 'node:assert/strict'
import { kontrastImRahmen, MIN_TIPPZIEL, tippzieleImRahmen } from './buehne-messung.mjs'

const GRUND = 'rgb(255, 255, 255)'

/** Ein Attrappen-Element; `marken` sind die Selektor-Teile, auf die `closest` anspricht (z. B. `:disabled`). */
function el(tagName, mehr = {}) {
  const e = { tagName, parentElement: null, marken: [], breite: 100, hoehe: 44, text: '', farbe: 'rgb(0, 0, 0)', hg: 'rgba(0, 0, 0, 0)', ...mehr }
  e.getAttribute = () => null
  e.scrollIntoView = () => { e.imBild = true }
  e.contains = (k) => { for (; k; k = k.parentElement) if (k === e) return true; return false }
  e.textContent = e.text
  e.getBoundingClientRect = () => ({ width: e.breite, height: e.hoehe, left: 0, top: 0, right: e.breite, bottom: e.hoehe })
  e.closest = (sel) => {
    for (let k = e; k; k = k.parentElement) if (k.tagName.toLowerCase() === sel || k.marken.some((m) => sel.includes(m))) return k
    return null
  }
  return e
}
const kind = (eltern, k) => {
  k.parentElement = eltern
  return k
}

function stilVon(e) {
  return { display: 'block', visibility: 'visible', backgroundImage: 'none', backgroundColor: e.hg, color: e.farbe, opacity: '1', fontSize: '14px', fontWeight: '400', webkitTextFillColor: e.farbe }
}

/* `trifft`: Welche Elemente die Prüfpunkte treffen; ohne Angabe trifft kein Punkt etwas (nur die Elementbox zählt). */
function tippziele(ziele, trifft = () => null) {
  globalThis.document = { querySelectorAll: () => ziele, elementFromPoint: trifft }
  globalThis.getComputedStyle = stilVon
  return tippzieleImRahmen(MIN_TIPPZIEL)
}

const zahlen = (css) => (css === '#fff' ? [255, 255, 255] : css === '#000' ? [0, 0, 0] : css.match(/\d+/g).map(Number))
function kontrast(texte) {
  let fuell = [255, 255, 255]
  const stift = {
    set fillStyle(css) {
      this.aktuell = css
    },
    clearRect() {},
    fillRect() {
      if (this.aktuell.startsWith('rgba(0, 0, 0, 0)')) return
      fuell = zahlen(this.aktuell).slice(0, 3)
    },
    getImageData: () => ({ data: [...fuell, 255] }),
  }
  const liste = texte.map((t) => ({ nodeType: 3, textContent: t.text, parentElement: t }))
  globalThis.NodeFilter = { SHOW_TEXT: 4 }
  globalThis.document = {
    body: {},
    documentElement: { classList: { contains: () => false } },
    createElement: () => ({ getContext: () => stift }),
    querySelectorAll: () => [],
    createTreeWalker: () => ({ nodeNum: 0, nextNode() { return liste[this.nodeNum++] ?? null } }),
  }
  globalThis.getComputedStyle = stilVon
  return kontrastImRahmen()
}
const text = (mehr = {}) => el('SPAN', { text: 'Hallo', hg: GRUND, ...mehr })
const SCHWACH = 'rgb(200, 200, 200)'

// Tippziele
assert.equal(tippziele([el('BUTTON', { breite: 30, hoehe: 20 })]).length, 1, 'kleiner Knopf wird gemeldet')
assert.equal(tippziele([el('BUTTON', { breite: 44, hoehe: 44 })]).length, 0, 'ausreichender Knopf ist ok')
assert.equal(tippziele([el('BUTTON', { breite: 44, hoehe: 43 })]).length, 1, 'ein Pixel zu niedrig: gemeldet')
assert.equal(tippziele([el('BUTTON', { breite: 30, hoehe: 44 })]).length, 1, 'zu schmal, aber hoch genug: gemeldet')
assert.equal(tippziele([el('BUTTON', { breite: MIN_TIPPZIEL, hoehe: MIN_TIPPZIEL })]).length, 0, 'genau auf der Grenze: ok')
/* Wirksame Trefferfläche: Die Erweiterung (`::after`) gehört zum Knopf, ein Nachbar nicht; beide Enden der kurzen Achse müssen treffen. */
const knopf20 = el('BUTTON', { breite: 93, hoehe: 20 })
const nachbar = el('BUTTON', { breite: 93, hoehe: 20 })
assert.equal(tippziele([knopf20], () => knopf20).length, 0, 'Knopf 20 px mit 44-px-Erweiterung: ok')
assert.equal(tippziele([knopf20], (x, y) => (y < 10 ? knopf20 : nachbar)).length, 1, 'ein Ende trifft den Nachbarn: gemeldet')
assert.equal(tippziele([knopf20], () => null).length, 1, 'Punkte treffen nichts: gemeldet')
assert.deepEqual(tippziele([knopf20], (x, y) => (y < 10 ? knopf20 : nachbar)), [{ schluessel: 'button „“', w: 93, h: 20 }], 'gemeldet mit Elementmaß')
const schmal = el('BUTTON', { breite: 30, hoehe: 44 })
assert.equal(tippziele([schmal], () => schmal).length, 0, 'schmal, Erweiterung in der Breite: ok')
/* Außerhalb des Fensters (Punkt trifft nichts) wird erst ins Bild gerollt und dann gemessen. */
const unten = el('BUTTON', { breite: 93, hoehe: 20 })
assert.equal(tippziele([unten], () => (unten.imBild ? unten : null)).length, 0, 'unterhalb des Fensters: nach dem Einrollen wirksam 44 px')
assert.equal(unten.imBild, true, 'eingerollt')
const etikett = el('LABEL', { breite: 120, hoehe: 44 })
assert.equal(tippziele([kind(etikett, el('INPUT', { breite: 1, hoehe: 1 }))]).length, 0, 'verstecktes Feld im 44-px-Etikett: ok')
assert.equal(tippziele([el('INPUT', { breite: 1, hoehe: 1 })]).length, 1, 'verstecktes Feld ohne Etikett: gemeldet')
const flach = el('LABEL', { breite: 120, hoehe: 20 })
assert.equal(tippziele([kind(flach, el('INPUT', { breite: 1, hoehe: 1 }))]).length, 1, 'zu flaches Etikett: gemeldet')

// Kontrast
assert.equal(kontrast([text({ farbe: SCHWACH })]).length, 1, 'schwacher Text wird gemeldet')
assert.equal(kontrast([text()]).length, 0, 'schwarz auf weiß ist ok')
for (const marke of [':disabled', '[aria-disabled="true"]', '[data-zustand="aus"]']) {
  const aus = el('DIV', { marken: [marke], hg: GRUND })
  assert.equal(kontrast([kind(aus, text({ farbe: SCHWACH }))]).length, 0, `deaktiviert (${marke}): nicht gemeldet`)
}
const wach = el('DIV', { marken: [], hg: GRUND })
assert.equal(kontrast([kind(wach, text({ farbe: SCHWACH }))]).length, 1, 'aktiver Nachbar: weiter gemeldet')

console.log('ok  buehne-messung: 14 Tippziel-Fälle, 6 Kontrast-Fälle (inkl. versteckte Felder, deaktivierte Elemente)')
