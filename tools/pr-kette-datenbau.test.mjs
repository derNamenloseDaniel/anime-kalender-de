/**
 * Test für tools/pr-kette-datenbau.mjs (Sollfassung des Jobs PR-Datenbau der PR-Prüfkette): jede Abweichung ist rot,
 * der Job wird am Namen gefunden, genau einer verlangt.
 * Aufruf: node tools/pr-kette-datenbau.test.mjs
 */
import assert from 'node:assert/strict'
import { DATENBAU_NAME, SOLL_DATENBAU, pruefeDatenbau } from './pr-kette-datenbau.mjs'

const kopie = () => structuredClone(SOLL_DATENBAU)
const jobs = (job, andere = {}) => ({ scope: { name: 'Scope' }, datenbau: job, ...andere })

// Sollfassung selbst: Name, Frist, Runner und Befehle stehen als Literale fest
assert.equal(DATENBAU_NAME, 'PR-Datenbau')
assert.equal(SOLL_DATENBAU['timeout-minutes'], 20)
assert.equal(SOLL_DATENBAU['runs-on'], 'ubuntu-latest')
assert.deepEqual(SOLL_DATENBAU.needs, ['scope'])
assert.equal(SOLL_DATENBAU.steps.length, 9)
assert.ok(SOLL_DATENBAU.steps.some((s) => s.run === 'npm run data:build'), 'Bau ohne Commit')
assert.equal(SOLL_DATENBAU.steps[2].with.key, 'anilist-cache-${{ github.run_id }}')
assert.equal(SOLL_DATENBAU.steps[2].with['restore-keys'], 'anilist-cache-')
assert.equal(SOLL_DATENBAU.steps[3].if, "steps.cache.outputs.cache-matched-key == ''")
assert.equal(SOLL_DATENBAU.steps[3].run, 'echo "::error::Kein anilist-cache gefunden"\nexit 1\n', 'Cache-Miss bricht ab')
assert.equal(SOLL_DATENBAU.steps[0].with['fetch-depth'], 2)
assert.equal(SOLL_DATENBAU.steps[7].run, 'npx tsx pipeline/check-ja-hat-weg-bestand.ts')
assert.equal(SOLL_DATENBAU.steps.at(-1).run, 'node tools/pr-bestand-vergleich.mjs HEAD^1', 'Bestandsprüfung zuletzt')
assert.equal(SOLL_DATENBAU['continue-on-error'], undefined, 'kein continue-on-error')
assert.ok(SOLL_DATENBAU.steps.every((s) => s['continue-on-error'] === undefined))
assert.ok(SOLL_DATENBAU.steps.some((s) => s.run === 'node tools/pr-bestand-vergleich.mjs HEAD^1'), 'Bestandsprüfung gegen HEAD^1')

// Unverändert: grün (auch mit weiteren Jobs daneben)
assert.deepEqual(pruefeDatenbau(jobs(kopie())), [])
assert.deepEqual(pruefeDatenbau(jobs(kopie(), { anderer: { name: 'Anderer' } })), [])

// Jede einzelne Abweichung ist rot und nennt die Job-Kennung
const abweichungen = {
  'Frist': (j) => { j['timeout-minutes'] = 21 },
  'Runner': (j) => { j['runs-on'] = 'windows-latest' },
  'needs': (j) => { j.needs = [] },
  'if': (j) => { j.if = 'true' },
  'continue-on-error am Job': (j) => { j['continue-on-error'] = true },
  'Cache-Schlüssel': (j) => { j.steps[2].with.key = 'anderer-schluessel' },
  'Abbruch bei Cache-Miss entfernt': (j) => { j.steps.splice(3, 1) },
  'Bau-Befehl': (j) => { j.steps[5].run = 'npm run data:build -- --commit' },
  'Bestandsprüfung gegen main statt HEAD^1': (j) => { j.steps[8].run = 'node tools/pr-bestand-vergleich.mjs origin/main' },
  'Schritt angehängt': (j) => { j.steps.push({ name: 'Extra', run: 'echo hi' }) },
  'Checkout-Tiefe': (j) => { j.steps[0].with['fetch-depth'] = 1 },
}
for (const [name, aendere] of Object.entries(abweichungen)) {
  const job = kopie()
  aendere(job)
  const fehler = pruefeDatenbau(jobs(job))
  assert.equal(fehler.length, 1, `${name}: genau ein Verstoß`)
  assert.match(fehler[0], /^Job "datenbau" \(PR-Datenbau\) weicht von der Sollfassung in tools\/pr-kette-datenbau\.mjs ab/, name)
}

// Fehlender oder doppelter Job: eigene Meldung, kein Absturz
for (const [name, j] of [['fehlt', { scope: { name: 'Scope' } }], ['leer', {}], ['doppelt', jobs(kopie(), { zweiter: kopie() })]]) {
  const fehler = pruefeDatenbau(j)
  assert.equal(fehler.length, 1, name)
  assert.match(fehler[0], /^Kein \(oder mehr als ein\) Job mit dem Namen "PR-Datenbau"/, name)
}
// Umbenannter Job gilt als fehlend
const umbenannt = kopie()
umbenannt.name = 'Datenbau'
assert.match(pruefeDatenbau(jobs(umbenannt))[0], /^Kein \(oder mehr als ein\)/)

console.log('pr-kette-datenbau.test.mjs ok')
