/** Test für tools/panel-sperre.mjs: Ablauf der Seitensperr-Prüfung gegen eine Attrappe der Playwright-Seite (kein Browser). */
import assert from 'node:assert/strict'
import { pruefePanelSperre, pruefeSperreUndSchliesse } from './panel-sperre.mjs'

/** Attrappe: `overflows` = nacheinander gelesene Werte von documentElement.style.overflow; `knoepfe` = Quellen-Knöpfe im Panel. */
function attrappe({ overflows, knoepfe = 1 }) {
  const log = []
  const ort = (name) => ({
    waitFor: async () => log.push(`warte:${name}`),
    filter: () => ort('knopf'),
    first: () => ort('knopf'),
    count: async () => knoepfe,
    click: async () => log.push('klick'),
    locator: () => ort('knopf'),
  })
  return {
    log,
    goto: async (u) => log.push(`goto:${u}`),
    locator: (s) => ort(s),
    evaluate: async () => overflows.shift(),
    goBack: async () => log.push('zurueck'),
    waitForTimeout: async () => {},
  }
}

const akVon = (id) => id + 1000
const gut = attrappe({ overflows: ['hidden', ''] })
assert.deepEqual(await pruefePanelSperre(gut, 5, akVon), [], 'gesperrt bei offenem Panel, frei nach Zurück: in Ordnung')
assert.ok(gut.log.includes('goto:http://ak.test/#/datenbank?t=1005'), 'öffnet den Titel über die ak-Kennung')
assert.ok(gut.log.indexOf('klick') < gut.log.indexOf('zurueck'), 'erst Beleg-Knopf, dann Zurück')

const nichtGesperrt = await pruefePanelSperre(attrappe({ overflows: ['', ''] }), 5, akVon)
assert.deepEqual(nichtGesperrt, ['Panel offen, Seite nicht gesperrt'])
const bleibt = await pruefePanelSperre(attrappe({ overflows: ['hidden', 'hidden'] }), 5, akVon)
assert.equal(bleibt.length, 1)
assert.match(bleibt[0], /Seite bleibt gesperrt \(overflow „hidden"\)/)
assert.equal(await pruefePanelSperre(attrappe({ overflows: [], knoepfe: 0 }), 5, akVon), null, 'kein Quellen-Knopf → null')

// Schlussfunktion: Exit-Code und Browser schließen.
const meldungen = []
const log = console.log
console.log = (t) => meldungen.push(t)
const alt = process.exitCode
try {
  let zu = 0
  const browser = { close: async () => zu++ }
  process.exitCode = undefined
  await pruefeSperreUndSchliesse(browser, attrappe({ overflows: ['hidden', ''] }), [1], akVon)
  assert.equal(zu, 1, 'Browser wird geschlossen')
  assert.equal(process.exitCode, undefined, 'grün: Exit-Code bleibt')
  await pruefeSperreUndSchliesse(browser, attrappe({ overflows: [], knoepfe: 0 }), [1, 2], akVon)
  assert.equal(process.exitCode, 1, 'kein Titel mit Quellen-Knopf: rot, die Prüfung lief nicht')
  assert.match(meldungen.at(-1), /Prüfung der Seitensperre lief nicht/)
} finally {
  console.log = log
  process.exitCode = alt
}
console.log('panel-sperre.test: ok')
