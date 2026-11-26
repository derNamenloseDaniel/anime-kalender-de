/**
 * Filter-Skript der Übersicht (tools/uebersicht-seite.js) im echten Browser: Label-Knöpfe, Ziel-Knöpfe, Suchfeld, Zähler der
 * Gruppen, leere Gruppen ausgeblendet, Abschnitte bleiben. Seite aus tools/uebersicht-html.mjs mit erfundener stand.md, per route
 * aus dem Speicher, kein Netz. Ohne Playwright-Browser „übersprungen“ (tools/browser-weiche.mjs).
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

import { browserDa } from './browser-weiche.mjs'
import { htmlVon } from './uebersicht-html.mjs'
import { kennzahlen } from './uebersicht-kopf.mjs'
import { baueModell } from './uebersicht-modell.mjs'

const JETZT = Date.parse('2026-11-25T12:00:00Z')
const TEXT = [
  '## In Arbeit',
  '- **Anton** {eigen · hoch · Daten · 20.11.} PR 900001 eingereicht',
  '- **Berta** {eigen · normal · Daten · 20.11.} PR 900002 eingereicht',
  '- **Cäsar** {eigen · normal · Code · 20.11.} PR 900003 eingereicht',
  '- **Dora** {eigen · normal · Code · 20.11.}',
  '## Als Nächstes',
  '- **Emil** {auftrag · hoch · Autonomie · 20.11.} @nacht',
  '- **Findling** {eigen · normal · Live5 · 20.11.}',
].join('\n')
const PR = (labels, extra = {}) => ({ typ: 'PullRequest', autor: 'x', labels, offen: true, gemergt: false, abnahmeDirigent: false, ...extra })
const modell = baueModell(TEXT, JETZT, { prDaten: { 900001: PR(['orchester'], { abnahmeDirigent: true }), 900002: PR(['orchester']), 900003: PR([]) } })
const html = htmlVon(modell, kennzahlen(modell, null, JETZT))
// Die Seite trägt genau das Skript der Datei (nicht eine Kopie): der Browserlauf unten prüft dieses Skript.
assert.ok(html.includes(`<script>${readFileSync(join(import.meta.dirname, 'uebersicht-seite.js'), 'utf8')}</script>`))
if (!browserDa('uebersicht-filter.test', chromium)) process.exit()

const browser = await chromium.launch()
try {
  const seite = await browser.newPage()
  const fehler = []
  seite.on('pageerror', (e) => fehler.push(String(e)))
  // Jede Anfrage beantwortet die Attrappe: die Seite kommt aus dem Speicher, nichts geht ins Netz.
  await seite.route('**/*', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: html }))
  await seite.goto('https://uebersicht.invalid/')
  const sichtbar = async () => (await seite.$$eval('li.e:not([hidden])', (l) => l.map((x) => x.querySelector('.titel').textContent))).sort()
  const zahl = (abschnitt) => seite.$eval(`#a-${abschnitt} > summary .zahl`, (e) => e.textContent)
  const knopf = (feld, wert) => seite.click(`button[data-feld="${feld}"][data-wert="${wert}"]`)
  const gedrueckt = (feld) => seite.$$eval(`button[data-feld="${feld}"][aria-pressed="true"]`, (b) => b.map((x) => x.dataset.wert))

  assert.deepEqual(await sichtbar(), ['Anton', 'Berta', 'Cäsar', 'Dora', 'Emil', 'Findling'])
  assert.deepEqual([await zahl('inArbeit'), await zahl('naechstes')], ['(4)', '(2)'])

  await knopf('label', 'lokal')
  assert.deepEqual(await sichtbar(), ['Anton', 'Cäsar'])
  await knopf('label', 'nacht')
  assert.deepEqual(await sichtbar(), ['Anton', 'Berta', 'Emil'])
  assert.deepEqual([await zahl('inArbeit'), await zahl('naechstes')], ['(2)', '(1)'])
  assert.deepEqual(await gedrueckt('label'), ['nacht'], 'genau ein Label-Knopf gedrückt')
  assert.deepEqual(await gedrueckt('ziel'), ['alle'])
  assert.equal(await seite.$eval('details.ziel:has(li[data-ziel="Code"])', (d) => d.hidden), true, 'Gruppe ohne Treffer ausgeblendet')
  assert.equal(await seite.$eval('details.ziel:has(li[data-ziel="Daten"])', (d) => d.hidden), false)
  assert.equal(await seite.$eval('details.ziel:has(li[data-ziel="Daten"]) > summary .zahl', (e) => e.textContent), '(2)')
  await knopf('label', 'beide')
  assert.deepEqual(await sichtbar(), ['Anton'])
  await knopf('label', 'offen')
  assert.deepEqual(await sichtbar(), ['Dora', 'Findling'])
  await knopf('label', 'alle')
  assert.equal((await sichtbar()).length, 6)

  await knopf('ziel', 'Code')
  assert.deepEqual(await sichtbar(), ['Cäsar', 'Dora'])
  assert.deepEqual(await gedrueckt('ziel'), ['Code'])
  assert.deepEqual(await gedrueckt('label'), ['alle'])
  await knopf('label', 'offen')
  assert.deepEqual(await sichtbar(), ['Dora'])
  assert.equal(await seite.$eval('#a-naechstes', (d) => d.hidden), false, 'Abschnitt bleibt trotz 0 Treffern')
  assert.equal(await zahl('naechstes'), '(0)')
  await knopf('label', 'alle')
  await knopf('ziel', 'alle')

  await seite.fill('#suche', 'FINDLING')
  assert.deepEqual(await sichtbar(), ['Findling'])
  await knopf('label', 'lokal')
  assert.deepEqual(await sichtbar(), [], 'Suche und Label verknüpfen sich')
  await knopf('label', 'alle')
  await seite.fill('#suche', '  ')
  assert.equal((await sichtbar()).length, 6, 'Leerzeichen sind keine Suche')
  await seite.fill('#suche', 'pr 900002 eingereicht')
  assert.deepEqual(await sichtbar(), ['Berta'], 'Suche im Kopftext, nicht nur im Titel')
  await seite.fill('#suche', '')
  assert.equal((await sichtbar()).length, 6)
  assert.deepEqual(fehler, [])
} finally {
  await browser.close()
}
console.log('uebersicht-filter.test.mjs: ok')
