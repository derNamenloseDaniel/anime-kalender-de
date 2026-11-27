/**
 * Test zu tools/liegegut-wellen.mjs (Gruppierung) und zur Sammelzeile `liegtZeile` in tools/liegegut.mjs (Anlass: Cloud-Welle 5130–5146,
 * zwölf rote PRs als zwölf Einträge). Fälle mit festen Zeiten; erwartete Zeilen stehen wörtlich im Test.
 */
import assert from 'node:assert/strict'
import { gruppiereWellen, WELLE_AB, zweigStamm } from './liegegut-wellen.mjs'
import { liegtZeile } from './liegegut.mjs'

const JETZT = Date.parse('2026-11-27T12:00:00Z')
const H = 3600 * 1000
const fund = (nr, zweig, signale = [4], seitH = 14, repo = 'anime-kalender-de') => ({ nr, repo, zweig, signale: signale.map((n) => ({ nr: n, seit: JETZT - seitH * H })) })
const nrn = (liste) => liste.map((f) => f.nr).join(',')

// zweigStamm
assert.equal(zweigStamm('fix/handlung-satz-teil-07'), 'fix/handlung-satz-teil-')
assert.equal(zweigStamm('fix/x-12'), 'fix/x-')
assert.equal(zweigStamm('fix/ohne-ziffer'), '')
assert.equal(zweigStamm(undefined), '')
assert.equal(zweigStamm(''), '')

// gruppiereWellen: Grenze WELLE_AB = 3
assert.equal(WELLE_AB, 3)
const drei = [fund(1, 'fix/a-1'), fund(2, 'fix/a-2'), fund(3, 'fix/a-3')]
assert.equal(gruppiereWellen(drei).wellen.length, 1, 'drei gleiche = Welle')
assert.equal(gruppiereWellen(drei).einzeln.length, 0)
assert.equal(gruppiereWellen(drei.slice(0, 2)).wellen.length, 0, 'zwei gleiche = keine Welle')
assert.equal(nrn(gruppiereWellen(drei.slice(0, 2)).einzeln), '1,2')
// verschiedene Signale, Repos und Stämme trennen
assert.equal(gruppiereWellen([...drei.slice(0, 2), fund(3, 'fix/a-3', [4, 8])]).wellen.length, 0, 'anderes Signalmuster trennt')
assert.equal(gruppiereWellen([...drei.slice(0, 2), fund(3, 'fix/a-3', [4], 14, 'anime-kalender-nativ')]).wellen.length, 0, 'anderes Repo trennt')
assert.equal(gruppiereWellen([...drei.slice(0, 2), fund(3, 'fix/b-3')]).wellen.length, 0, 'anderer Stamm trennt')
assert.equal(gruppiereWellen([fund(1, 'fix/a'), fund(2, 'fix/a'), fund(3, 'fix/a')]).wellen.length, 0, 'Zweige ohne Ziffer am Ende bilden nie eine Welle')
assert.equal(nrn(gruppiereWellen([fund(1, 'fix/a-1', [8, 4]), fund(2, 'fix/a-2', [4, 8]), fund(3, 'fix/a-3', [4, 8])]).wellen[0].funde), '1,2,3', 'Signalreihenfolge ist egal')
// gemischt: Welle plus Einzelne, Reihenfolge der Einzelnen bleibt
{
  const g = gruppiereWellen([fund(9, 'fix/z'), ...drei, fund(8, 'fix/y-5', [3])])
  assert.equal(g.wellen.length, 1)
  assert.equal(g.wellen[0].stamm, 'fix/a-')
  assert.equal(nrn(g.einzeln), '9,8')
}

// Sammelzeile
const welle12 = Array.from({ length: 12 }, (_, i) => fund(5130 + i, `fix/handlung-satz-teil-${String(i + 1).padStart(2, '0')}`, [4], 14 - (i % 3)))
assert.equal(liegtZeile(welle12, JETZT), 'LIEGT: Welle fix/handlung-satz-teil-* 12 PRs 5130, 5131, 5132, 5133, 5134, 5135, 5136, 5137, 5138, 5139, 5140, 5141 (rot 14 h)')
assert.equal(
  liegtZeile([fund(7, 'fix/einzeln', [3], 30), ...welle12.slice(0, 3)], JETZT),
  'LIEGT: 7 (Konflikt 30 h), Welle fix/handlung-satz-teil-* 3 PRs 5130, 5131, 5132 (rot 14 h)',
  'Einzelne zuerst, dann die Welle',
)
assert.equal(liegtZeile(welle12.slice(0, 2), JETZT), 'LIEGT: 5130 (rot 14 h), 5131 (rot 13 h)', 'unter WELLE_AB bleibt es bei Einzelzeilen')
assert.equal(
  liegtZeile(welle12.slice(0, 3).map((f) => ({ ...f, repo: 'anime-kalender-nativ' })), JETZT),
  'LIEGT: anime-kalender-nativ Welle fix/handlung-satz-teil-* 3 PRs 5130, 5131, 5132 (rot 14 h)',
  'Welle eines anderen Repos trägt den Repo-Namen',
)
console.log('liegegut-wellen.test: Gruppierung (Grenze, Signal, Repo, Stamm, Reihenfolge) und Sammelzeile grün')
