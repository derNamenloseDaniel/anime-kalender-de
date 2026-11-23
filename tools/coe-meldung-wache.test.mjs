/**
 * Test für tools/coe-meldung-wache.mjs (Wächter: `continue-on-error` ohne Meldung des Fehlers).
 * Feste Werte und Wegwerf-Ordner; kein Netz, keine Uhr.
 */
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { findeStille, meldetFehler, pruefeMeldung } from './coe-meldung-wache.mjs'

// Meldungswege: je Muster ein Fall, dazu knapp daneben.
for (const run of [
  'echo "DATEN_WARNUNG=x" >> "$GITHUB_ENV"',
  'echo "FEHLER: Schritte fehlgeschlagen"',
  'FEHLER: kaputt',
  'bash "$MELDER" laeuft',
  'bash tools/lauf-melden.sh fehler "x"',
  'bash tools/lauf-abmelden.sh ok ""',
  'bash tools/schritte-auswerten.sh',
  'npm run a\nbash "${MELDER}" schritt "x"',
]) assert.equal(meldetFehler({ run }), true, `Meldung nicht erkannt: ${run}`)
for (const run of [
  'npm run data:rohfolgen',
  '# DATEN_WARNUNG kommt später\nnpm run data:x',
  'echo "kein FEHLER: hier"',
  'node tools/meldung.mjs',
  undefined,
]) assert.equal(meldetFehler({ run }), false, `fälschlich als Meldung erkannt: ${run}`)
assert.equal(meldetFehler({ uses: 'actions/upload-artifact@v4' }), false)

// Funde: Name, `uses`, `run`-Rückfall, Ausdruck, `false`, Meldung.
const doc = (...steps) => ({ jobs: { a: { steps } } })
assert.deepEqual(findeStille(doc({ name: 'S', run: 'npm run x', 'continue-on-error': true })), [{ job: 'a', schritt: 'S' }])
assert.deepEqual(findeStille(doc({ uses: 'a/b@v1', 'continue-on-error': true })), [{ job: 'a', schritt: 'a/b@v1' }])
assert.deepEqual(findeStille(doc({ run: 'npm run y', 'continue-on-error': true })), [{ job: 'a', schritt: 'npm run y' }])
assert.equal(findeStille(doc({ name: 'S', run: 'npm run x', 'continue-on-error': '${{ inputs.z }}' })).length, 1)
assert.deepEqual(findeStille(doc({ name: 'S', run: 'npm run x', 'continue-on-error': false })), [])
assert.deepEqual(findeStille(doc({ name: 'S', run: 'npm run x', 'continue-on-error': 'false' })), [])
assert.deepEqual(findeStille(doc({ name: 'S', run: 'npm run x' })), [])
assert.deepEqual(findeStille(doc({ name: 'S', run: 'echo DATEN_WARNUNG=1 >> $GITHUB_ENV', 'continue-on-error': true })), [])
assert.deepEqual(findeStille({}), [])

// Gesamtlauf im Wegwerf-Ordner: drei Dateien, je Rolle mehrere Glieder.
const wurzel = mkdtempSync(join(tmpdir(), 'coe-meldung-'))
try {
  mkdirSync(join(wurzel, '.github/workflows'), { recursive: true })
  const schreibe = (name, text) => writeFileSync(join(wurzel, '.github/workflows', name), text)
  const schritt = (name, run, extra = '        continue-on-error: true\n') => `      - name: ${name}\n${extra}        run: ${run}\n`
  const kopf = 'name: P\non: push\njobs:\n  j:\n    runs-on: x\n    steps:\n'
  schreibe('a.yml', kopf + schritt('Erlaubt', 'npm run x') + schritt('Zweiter', 'npm run y') + schritt('Meldet', 'echo DATEN_WARNUNG=1'))
  schreibe('b.yml', kopf + schritt('Erlaubt', 'npm run x'))
  schreibe('c.yml', kopf + schritt('Sauber', 'npm run x', ''))
  const ausnahmen = [
    { datei: 'a.yml', schritt: 'Erlaubt', grund: 'g' },
    { datei: 'c.yml', schritt: 'Sauber', grund: 'g' },
    { datei: 'a.yml', schritt: 'Meldet', grund: 'g' },
  ]
  const r = pruefeMeldung(wurzel, ausnahmen)
  assert.equal(r.treffer, 3)
  assert.equal(r.geduldet, 4)
  assert.equal(r.meldungen.length, 4)
  assert.match(r.meldungen[0], /a\.yml: Schritt „Zweiter"/)
  assert.match(r.meldungen[1], /b\.yml: Schritt „Erlaubt"/)
  assert.match(r.meldungen[2], /Ausnahme „Sauber" \(c\.yml\) hat keinen Treffer mehr/)
  assert.match(r.meldungen[3], /Ausnahme „Meldet" \(a\.yml\) hat keinen Treffer mehr/)
  // Ausnahme gilt nur für die eigene Datei.
  assert.equal(pruefeMeldung(wurzel, [{ datei: 'b.yml', schritt: 'Zweiter', grund: 'g' }]).meldungen.some((m) => /a\.yml: Schritt „Zweiter"/.test(m)), true)
  // Auch die Endung .yaml wird gelesen.
  schreibe('e.yaml', kopf + schritt('Nur yaml', 'npm run x'))
  assert.ok(pruefeMeldung(wurzel, []).meldungen.some((m) => /e\.yaml: Schritt „Nur yaml"/.test(m)))
} finally {
  rmSync(wurzel, { recursive: true, force: true })
}

// Echte Workflows: grün, Zahlen als feste Werte (Stand 23.11.2026; sinkt die Zahl der geduldeten Schritte, hier nachziehen).
const echt = pruefeMeldung(process.cwd())
assert.deepEqual(echt.meldungen, [])
assert.equal(echt.geduldet, 101)
assert.equal(echt.treffer, 47)
console.log('coe-meldung-wache.test: grün (Meldungswege, Funde, Ausnahmen, echte Workflows)')
