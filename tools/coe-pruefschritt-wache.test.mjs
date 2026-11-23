/**
 * Test für tools/coe-pruefschritt-wache.mjs (Wächter gegen `continue-on-error` an Prüfschritten).
 * Einheiten aus festen Werten; der Lauf über die echten Workflows und die Prozessfälle stehen in
 * tools/check-workflows.test.mjs. Kein Netz, keine Uhr.
 */
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { findeFunde, istPruefschritt, pruefeContinueOnError } from './coe-pruefschritt-wache.mjs'

// Prüfschritte erkennen: je Muster ein Fall, dazu Nicht-Prüfungen knapp daneben.
for (const run of [
  'npm run check:qualitaet > x.log',
  'npm run data:motn:check >> $GITHUB_STEP_SUMMARY',
  'npm run data:validate',
  'node tools/delta-pruefen.mjs --tage 1 | tee d.txt',
  'node tools/briefkasten-wache.mjs',
  'npx tsx pipeline/check-logic.ts',
  'node tools/zugangs-waechter.mjs',
  'node tools/probe.test.mjs',
  'node --test tools/a.test.mjs',
  'npx tsc --noEmit -p .',
  'node --test tools/a.mjs',
  'echo hallo\nnpm run check:x',
]) assert.equal(istPruefschritt(run), true, `Prüfung nicht erkannt: ${run}`)
for (const run of [
  'npx tsx pipeline/termine-pruefen.ts',
  'npm run data:dub-checks',
  'npm run data:dub-check',
  'npm run data:motn -- --budget 800',
  'npm run data:vorfaelle',
  'node tools/kachel-ecken-messen.mjs --live',
  'bash "$MELDER" schritt "Messung gegen die eigenen Belege"',
  '# npm run check:x\necho hallo',
  'npm run data:tonspur-verdacht',
  undefined,
]) assert.equal(istPruefschritt(run), false, `fälschlich als Prüfung erkannt: ${run}`)

// Funde: Schritt, Job, Ausdruck, `false`.
const doc = (job) => ({ jobs: { a: job } })
const pruef = { name: 'P', run: 'npm run check:x' }
assert.deepEqual(findeFunde(doc({ steps: [{ ...pruef, 'continue-on-error': true }] })), [{ art: 'schritt', job: 'a', schritt: 'P' }])
assert.deepEqual(findeFunde(doc({ steps: [{ ...pruef, 'continue-on-error': '${{ inputs.x }}' }] })).length, 1)
assert.deepEqual(findeFunde(doc({ steps: [{ run: 'npm run check:y', 'continue-on-error': true }] })), [{ art: 'schritt', job: 'a', schritt: 'npm run check:y' }])
assert.deepEqual(findeFunde(doc({ steps: [{ ...pruef, 'continue-on-error': false }] })), [])
assert.deepEqual(findeFunde(doc({ steps: [{ ...pruef, 'continue-on-error': 'false' }] })), [])
assert.deepEqual(findeFunde(doc({ steps: [pruef] })), [])
assert.deepEqual(findeFunde(doc({ steps: [{ name: 'M', run: 'echo x', 'continue-on-error': true }] })), [])
assert.deepEqual(findeFunde(doc({ 'continue-on-error': true, steps: [pruef] })), [{ art: 'job', job: 'a', schritt: null }])
assert.deepEqual(findeFunde(doc({ 'continue-on-error': true, steps: [{ run: 'echo x' }] })), [])
assert.deepEqual(findeFunde(doc({ 'continue-on-error': false, steps: [pruef] })), [])
assert.deepEqual(findeFunde({}), [])

// Gesamtlauf im Wegwerf-Ordner: drei Dateien, je eine Ausnahme, ein Fremdschritt.
const wurzel = mkdtempSync(join(tmpdir(), 'coe-wache-'))
try {
  mkdirSync(join(wurzel, '.github/workflows'), { recursive: true })
  const schreibe = (name, text) => writeFileSync(join(wurzel, '.github/workflows', name), text)
  const schritt = (name, extra = '        continue-on-error: true\n') => `      - name: ${name}\n${extra}        run: npm run check:x\n`
  const kopf = 'name: P\non: push\njobs:\n  j:\n    runs-on: x\n    steps:\n'
  schreibe('a.yml', kopf + schritt('Erlaubt') + schritt('Zweiter'))
  schreibe('b.yml', kopf + schritt('Erlaubt'))
  schreibe('c.yml', kopf + schritt('Sauber', ''))
  const ausnahmen = [
    { datei: 'a.yml', schritt: 'Erlaubt', grund: 'g' },
    { datei: 'c.yml', schritt: 'Sauber', grund: 'g' },
  ]
  const r = pruefeContinueOnError(wurzel, ausnahmen)
  assert.equal(r.treffer, 3)
  assert.equal(r.meldungen.length, 3)
  assert.match(r.meldungen[0], /a\.yml: Prüfschritt „Zweiter"/)
  assert.match(r.meldungen[1], /b\.yml: Prüfschritt „Erlaubt"/)
  assert.match(r.meldungen[2], /Ausnahme „Sauber" \(c\.yml\) hat keinen Treffer mehr/)
  // Ausnahme gilt nur für die eigene Datei und nie für Jobs.
  schreibe('d.yml', kopf.replace('    runs-on: x\n', "    runs-on: x\n    continue-on-error: true\n") + schritt('Erlaubt', ''))
  const j = pruefeContinueOnError(wurzel, [{ datei: 'd.yml', schritt: 'Erlaubt', grund: 'g' }, { datei: 'd.yml', schritt: null, grund: 'g' }])
  assert.ok(j.meldungen.some((m) => /d\.yml: Job "j" enthält Prüfschritte/.test(m)))
  // Auch die Endung .yaml wird gelesen.
  schreibe('e.yaml', kopf + schritt('Nur yaml'))
  assert.ok(pruefeContinueOnError(wurzel, []).meldungen.some((m) => /e\.yaml: Prüfschritt „Nur yaml"/.test(m)))
} finally {
  rmSync(wurzel, { recursive: true, force: true })
}
console.log('coe-pruefschritt-wache.test: grün (Erkennung, Funde, Ausnahmen, Job)')
