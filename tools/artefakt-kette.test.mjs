/**
 * Test für tools/artefakt-kette.mjs: `path`, `name` und `run-id` des Artefakts `bau-eingaben-…` passen zwischen
 * bestand-bauen.yml (upload) und claude-reparatur.yml (download). Echte Workflows nur gelesen, Brüche an Fixtures.
 * Aufruf: node tools/artefakt-kette.test.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'
import { artefaktVerstoesse, gemeinsamerOrdner, uploadPfade } from './artefakt-kette.mjs'

const wurzel = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const lies = (datei) => parse(readFileSync(join(wurzel, '.github/workflows', datei), 'utf8'))

// Die echten Workflows: kein Bruch, und die Zahlen stammen aus der Datei (Zähler gegen „leer gelesen“).
const echtBauen = lies('bestand-bauen.yml')
const echtRep = lies('claude-reparatur.yml')
assert.deepEqual(artefaktVerstoesse(echtBauen, echtRep), [], 'bestand-bauen und claude-reparatur passen zusammen')
const echtAuf = Object.values(echtBauen.jobs).flatMap((j) => j.steps ?? []).filter((s) => String(s.uses).startsWith('actions/upload-artifact@') && s.with.name.startsWith('bau-eingaben-'))
assert.equal(echtAuf.length, 1)
assert.ok(uploadPfade(echtAuf[0].with.path).ein.length >= 2, 'der echte Upload nennt mehrere Pfade')

// Reine Hilfen.
assert.equal(gemeinsamerOrdner(['data/cache', 'data/dub-confirmed.yaml']), 'data')
assert.equal(gemeinsamerOrdner(['data/cache/a', 'data/cache/b']), 'data/cache')
assert.equal(gemeinsamerOrdner(['data/a/b.yaml']), 'data/a', 'ein Pfad: sein Ordner')
assert.equal(gemeinsamerOrdner(['data/x', 'extension/y']), '')
assert.equal(gemeinsamerOrdner(['data/cache', 'data/cachex/y']), 'data', 'Pfadteile, nicht Zeichen')
assert.deepEqual(uploadPfade('data/a\n!data/a/b\n\n  data/c  '), { ein: ['data/a', 'data/c'], aus: ['data/a/b'] })

// Fixtures: je Rolle zwei Glieder (ein fremdes Artefakt daneben), Ausgangslage passt.
const lauf = '${{ github.event.workflow_run.id }}'
const bauen = (mit = {}) => ({
  jobs: { bau: { steps: [
    { uses: 'actions/upload-artifact@v4', with: { name: 'dist-${{ github.run_id }}', path: 'dist' } },
    { uses: 'actions/upload-artifact@v4', with: { name: 'bau-eingaben-${{ github.run_id }}', path: 'data/cache\ndata/a.yaml\n!data/cache/frei', ...mit } },
    { uses: 'actions/download-artifact@v4', with: { name: 'bau-eingaben-fremd', path: 'x' } },
  ] } },
})
const rep = (mit = {}) => ({
  jobs: { untersuchen: { steps: [
    { uses: 'actions/download-artifact@v4', with: { name: 'dist-x', path: 'dist' } },
    { uses: 'actions/download-artifact@v4', with: { name: `bau-eingaben-${lauf}`, path: 'data', 'run-id': lauf, ...mit } },
  ] } },
})
assert.deepEqual(artefaktVerstoesse(bauen(), rep()), [], 'Ausgangslage')

const mitText = (fehler, text) => fehler.some((f) => f.includes(text))
// Jeder Bruch einzeln: genau seine Meldung.
assert.ok(mitText(artefaktVerstoesse(bauen(), rep({ path: 'data/cache' })), 'Download-path data/cache ist nicht der gemeinsame Ordner'), 'falscher Download-path')
assert.ok(mitText(artefaktVerstoesse(bauen({ path: 'data/cache\nextension/b.js' }), rep()), 'Download-path data ist nicht der gemeinsame Ordner'), 'Upload-Pfad außerhalb von data/')
assert.ok(mitText(artefaktVerstoesse(bauen(), rep({ 'run-id': '${{ github.run_id }}' })), 'Download-run-id'), 'run-id des eigenen Laufs')
assert.ok(mitText(artefaktVerstoesse(bauen(), rep({ name: 'bau-eingaben-${{ github.run_id }}' })), 'Download-Name'), 'Name ohne Bau-Lauf')
assert.ok(mitText(artefaktVerstoesse(bauen({ name: 'bau-eingaben-${{ github.run_number }}' }), rep()), 'Upload-Name'), 'Upload-Name ohne run_id')
assert.ok(mitText(artefaktVerstoesse(bauen({ path: 'data/cache\ndata/a.yaml\n!extension/x' }), rep()), 'Ausschluss !extension/x'), 'Ausschluss ohne Upload-Pfad')
assert.ok(mitText(artefaktVerstoesse(bauen({ path: '' }), rep()), 'Upload ohne Pfade'), 'leerer Upload-Pfad')
// Fehlende Enden: kein Upload bzw. kein Download (Name mit fremdem Vorsatz zählt nicht).
assert.ok(mitText(artefaktVerstoesse(bauen({ name: 'anderes-${{ github.run_id }}' }), rep()), '0 Upload-Schritte'), 'Upload fehlt')
assert.ok(mitText(artefaktVerstoesse(bauen(), rep({ name: `anderes-${lauf}` })), '0 Download-Schritte'), 'Download fehlt')
assert.ok(mitText(artefaktVerstoesse({ jobs: {} }, {}), '0 Upload-Schritte'), 'leere Workflows')
const doppelt = bauen()
doppelt.jobs.bau.steps.push({ uses: 'actions/upload-artifact@v4', with: { name: 'bau-eingaben-zwei', path: 'data/x' } })
assert.ok(mitText(artefaktVerstoesse(doppelt, rep()), '2 Upload-Schritte'), 'zwei Uploads')

const doppeltRep = rep()
doppeltRep.jobs.untersuchen.steps.push({ uses: 'actions/download-artifact@v4', with: { name: `bau-eingaben-zwei`, path: 'data', 'run-id': lauf } })
assert.ok(mitText(artefaktVerstoesse(bauen(), doppeltRep), '2 Download-Schritte'), 'zwei Downloads')

console.log('artefakt-kette.test: ok')
