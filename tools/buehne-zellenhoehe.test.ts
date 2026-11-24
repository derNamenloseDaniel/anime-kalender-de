/**
 * Wächter für `web/buehne/rahmen.css`: Handy-Zellen der Bühne sind nie niedriger als 610 px (Daniel, 24.11.2026: bei 720 px
 * Fensterhöhe waren sie 240 px und schnitten das Panel ab). Gemessen im Browser (1280×720: 240 → 640, seit der CI-Messung 610); hier die Regel selbst,
 * damit eine zurückgesetzte Untergrenze oder eine überschreibende Regel sofort rot wird.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

/** Mindesthöhe, ab der ein Handy-Bild das Panel nicht mehr abschneidet (Daniel: über 600). */
const UNTERGRENZE = 610

const css = readFileSync(new URL('../web/buehne/rahmen.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
/** Alle `min-height`-Werte in px aus Regeln, deren Selektor `iframe` der Zellen betrifft. */
function mindesthoehen(selektor: RegExp): number[] {
  const werte: number[] = []
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!selektor.test(m[1]!.trim())) continue
    const h = /min-height:\s*(\d+)px/.exec(m[2]!)
    if (h) werte.push(Number(h[1]))
  }
  return werte
}

const handy = mindesthoehen(/^\.zelle iframe$/)
assert.equal(handy.length, 1, 'genau eine Regel `.zelle iframe` mit min-height in px')
assert.ok(handy[0]! >= UNTERGRENZE, `Handy-Zelle min-height ${handy[0]} px liegt unter ${UNTERGRENZE} px`)
// Nichts, was Handy-Zellen darunter wieder zusammenschiebt: keine kleinere px-Mindesthöhe an einer anderen Zellen-iframe-Regel.
const weitere = mindesthoehen(/iframe/).filter((h) => h > 0 && h < UNTERGRENZE)
assert.deepEqual(weitere, [], 'keine weitere iframe-Regel mit kleinerer Mindesthöhe')
// Desktop-Zellen bleiben, wie sie waren: Mindesthöhe der Zelle statt des Rahmens.
assert.match(css, /\.zelle\.desktop iframe\s*\{\s*min-height:\s*0;/, 'Desktop-Rahmen unverändert')

console.log(`buehne-zellenhoehe: ok (Handy-Zelle >= ${UNTERGRENZE} px, Desktop unverändert)`)
