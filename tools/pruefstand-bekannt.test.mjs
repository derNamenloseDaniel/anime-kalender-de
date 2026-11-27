/**
 * Test für tools/pruefstand-bekannt.mjs (höchste belegte Folge je Kennung, Vergleichsbasis der Erweiterung): eine Lücke ohne deutschen Ton
 * und mehrere Einträge an einer Adresse lassen die Kennung weg, sonst zählt die obere Grenze der dubRanges.
 * Aufruf: node tools/pruefstand-bekannt.test.mjs
 */
import assert from 'node:assert/strict'
import { bekannteFolgen } from './pruefstand-bekannt.mjs'

const kennung = (adresse) => /\/detail\/([A-Z0-9]+)/.exec(adresse)?.[1] ?? null
const adr = (k) => `https://www.amazon.de/gp/video/detail/${k}`
const strom = (k, ranges, plattform = 'primevideo', feld = 'seite') => ({ platform: plattform, [feld]: adr(k), dubRanges: ranges })

// Obere Grenze je Kennung, drei Titel mit verschiedenen Wegen; die richtige Kennung steht in der Mitte
const titel = [
  { streams: [strom('B0AAA00001', [{ from: 1, to: 5, dub: true }])] },
  { streams: [strom('B0BBB00002', [{ from: 1, to: 3, dub: true }, { from: 4, to: 11, dub: true }])] },
  { streams: [strom('B0CCC00003', [{ from: 1, to: 24, dub: true }])] },
]
assert.deepEqual(bekannteFolgen(titel, 'primevideo', kennung), { B0AAA00001: 5, B0BBB00002: 11, B0CCC00003: 24 })

// Eine Spanne ohne deutschen Ton (dub: false) streicht die ganze Kennung
const luecke = [
  { streams: [strom('B0AAA00001', [{ from: 1, to: 6, dub: true }, { from: 7, to: 8, dub: false }])] },
  { streams: [strom('B0BBB00002', [{ from: 1, to: 9, dub: true }])] },
  { streams: [strom('B0CCC00003', [{ from: 1, to: 2, dub: true }])] },
]
assert.deepEqual(bekannteFolgen(luecke, 'primevideo', kennung), { B0BBB00002: 9, B0CCC00003: 2 })

// Mehrere Einträge an derselben Adresse (auch in verschiedenen Titeln): Nummern nicht vergleichbar, Kennung fehlt
const doppelt = [
  { streams: [strom('B0AAA00001', [{ from: 1, to: 5, dub: true }])] },
  { streams: [strom('B0BBB00002', [{ from: 1, to: 7, dub: true }])] },
  { streams: [strom('B0AAA00001', [{ from: 1, to: 12, dub: true }])] },
]
assert.deepEqual(bekannteFolgen(doppelt, 'primevideo', kennung), { B0BBB00002: 7 })
// Dreifach bleibt draußen (die Sperre setzt sich nicht zurück)
const dreifach = [...doppelt, { streams: [strom('B0AAA00001', [{ from: 1, to: 20, dub: true }])] }]
assert.deepEqual(bekannteFolgen(dreifach, 'primevideo', kennung), { B0BBB00002: 7 })

// Nur die gefragte Plattform zählt
const gemischt = [
  { streams: [strom('B0AAA00001', [{ from: 1, to: 5, dub: true }], 'netflix')] },
  { streams: [strom('B0BBB00002', [{ from: 1, to: 8, dub: true }])] },
  { streams: [strom('B0CCC00003', [{ from: 1, to: 3, dub: true }], 'disney')] },
]
assert.deepEqual(bekannteFolgen(gemischt, 'primevideo', kennung), { B0BBB00002: 8 })
assert.deepEqual(bekannteFolgen(gemischt, 'netflix', kennung), { B0AAA00001: 5 })

// Adresse aus `url`, wenn `seite` fehlt; `seite` hat Vorrang
const url = [
  { streams: [strom('B0AAA00001', [{ from: 1, to: 4, dub: true }], 'primevideo', 'url')] },
  { streams: [{ platform: 'primevideo', seite: adr('B0BBB00002'), url: adr('B0ZZZ99999'), dubRanges: [{ from: 1, to: 6, dub: true }] }] },
  { streams: [strom('B0CCC00003', [{ from: 1, to: 2, dub: true }])] },
]
assert.deepEqual(bekannteFolgen(url, 'primevideo', kennung), { B0AAA00001: 4, B0BBB00002: 6, B0CCC00003: 2 })

// Ohne Kennung (Adresse nicht lesbar), ohne dubRanges, mit `to` 0 oder nicht numerisch: nicht aufgeführt
const leer = [
  { streams: [{ platform: 'primevideo', seite: 'https://example.invalid/x', dubRanges: [{ to: 5, dub: true }] }] },
  { streams: [strom('B0AAA00001', undefined)] },
  { streams: [strom('B0BBB00002', [{ from: 1, to: 0, dub: true }])] },
  { streams: [strom('B0CCC00003', [{ from: 1, to: 'x', dub: true }])] },
  { streams: [strom('B0DDD00004', [{ from: 1, to: '13', dub: true }])] },
  {},
]
assert.deepEqual(bekannteFolgen(leer, 'primevideo', kennung), { B0DDD00004: 13 })
assert.deepEqual(bekannteFolgen([], 'primevideo', kennung), {})

console.log('pruefstand-bekannt.test.mjs ok')
