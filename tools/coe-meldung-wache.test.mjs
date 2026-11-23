/**
 * Test für tools/coe-meldung-wache.mjs (Wächter: `continue-on-error` ohne Meldung des Fehlers).
 * Feste Werte und Wegwerf-Ordner; kein Netz, keine Uhr.
 */
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { findeStille, meldetFehler, meldetSkript, pruefeMeldung } from './coe-meldung-wache.mjs'

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
assert.deepEqual(findeStille(doc({ name: 'S', run: 'npm run x', 'continue-on-error': true }), (run) => run === 'npm run x'), [])
assert.equal(findeStille(doc({ name: 'S', run: 'npm run x', 'continue-on-error': true }), (run) => run === 'npm run y').length, 1)

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

// Pipeline-Skripte, die selbst melden (direkt und über npm run): drei Skripte, der richtige in der Mitte.
const w2 = mkdtempSync(join(tmpdir(), 'coe-meldung-skript-'))
try {
  mkdirSync(join(w2, 'pipeline'), { recursive: true })
  writeFileSync(join(w2, 'pipeline/a.ts'), 'export const x = 1\n')
  writeFileSync(join(w2, 'pipeline/m.ts'), 'recordSource(x)\n')
  writeFileSync(join(w2, 'pipeline/v.ts'), 'meldeAbbruch(x)\n')
  writeFileSync(join(w2, 'package.json'), JSON.stringify({ scripts: { 'data:a': 'tsx pipeline/a.ts', 'data:m': 'tsx pipeline/m.ts', 'data:v': 'tsx pipeline/v.ts' } }))
  assert.equal(meldetSkript('npx tsx pipeline/m.ts', w2), true)
  assert.equal(meldetSkript('npx tsx pipeline/v.ts', w2), true)
  assert.equal(meldetSkript('npm run data:m', w2), true)
  assert.equal(meldetSkript('npm run data:v -- --x', w2), true)
  assert.equal(meldetSkript('npx tsx pipeline/a.ts', w2), false)
  assert.equal(meldetSkript('npm run data:a', w2), false)
  assert.equal(meldetSkript('npm run data:fehlt', w2), false)
  assert.equal(meldetSkript('npx tsx pipeline/fehlt.ts', w2), false)
  assert.equal(meldetSkript('# npx tsx pipeline/m.ts\necho x', w2), false)
  assert.equal(meldetSkript(undefined, w2), false)
  assert.equal(meldetSkript('npx tsx pipeline/m.ts', join(w2, 'leer')), false)
  mkdirSync(join(w2, '.github/workflows'), { recursive: true })
  const wf = (run) => `name: P\non: push\njobs:\n  j:\n    runs-on: x\n    steps:\n      - name: S\n        continue-on-error: true\n        run: ${run}\n`
  writeFileSync(join(w2, '.github/workflows/a.yml'), wf('npm run data:m'))
  writeFileSync(join(w2, '.github/workflows/b.yml'), wf('npm run data:a'))
  const rs = pruefeMeldung(w2, [])
  assert.equal(rs.treffer, 1)
  assert.match(rs.meldungen[0], /b\.yml: Schritt „S"/)
  // Kulisse ohne package.json (Ursache PR 4672, oder-true-wache.test): `npm run` ist nicht aufzulösen, a.yml wird zum Fund.
  rmSync(join(w2, 'package.json'))
  const ohnePaket = pruefeMeldung(w2, [])
  assert.equal(ohnePaket.treffer, 2)
  assert.match(ohnePaket.meldungen[0], /a\.yml: Schritt „S"/)
} finally {
  rmSync(w2, { recursive: true, force: true })
}

// Echte Workflows: grün, Zahlen als feste Werte (Stand 23.11.2026; sinkt die Zahl der geduldeten Schritte, hier nachziehen).
const echt = pruefeMeldung(process.cwd())
assert.deepEqual(echt.meldungen, [])
assert.equal(echt.geduldet, 101)
assert.equal(echt.treffer, 43)
console.log('coe-meldung-wache.test: grün (Meldungswege, Funde, Ausnahmen, echte Workflows)')
