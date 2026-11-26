/**
 * Wächter: Prüfungen, die PR-Kommentare lesen (`beschreibungMitKommentaren`), bekommen in `check:logic` GH_TOKEN und GITHUB_REPOSITORY
 * durchgereicht, alle anderen nicht (PR 5078, 26.11.2026: `ohneCiToken` entzog sie still, der Kommentar-Ausweg wirkte in der Kette nie).
 * Außerdem meldet `zugangsWarnung` den fehlenden Zugang im PR-Ereignis laut.
 *
 * Aufruf: `node tools/ci-anmeldung-durchreichung.test.mjs [Wurzelordner]`
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { CI_ANMELDUNG_DURCHREICHUNG, mitCiAnmeldung, ohneCiToken } from './bau-umgebung.mjs'
import { zugangsWarnung } from './patchnotes-kommentar.mjs'

const wurzel = resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..'))
const lies = (pfad) => readFileSync(join(wurzel, pfad), 'utf8')
const CI = { GITHUB_ACTIONS: 'true', GH_TOKEN: 't', GITHUB_TOKEN: 'u', GITHUB_REPOSITORY: 'o/r', GITHUB_RUN_ID: '1', PATH: '/bin' }
const PFLICHT = 'tools/check-patchnotes-pflicht.mjs'

// Durchreichung: genau die Variablen der Prüfung, die übrige CI-Kennung bleibt entzogen.
const basis = ohneCiToken(CI)
const mit = mitCiAnmeldung(basis, PFLICHT, CI)
assert.equal(mit.GH_TOKEN, 't')
assert.equal(mit.GITHUB_REPOSITORY, 'o/r')
for (const name of ['GITHUB_ACTIONS', 'GITHUB_TOKEN', 'GITHUB_RUN_ID']) assert.equal(mit[name], undefined, `${name} bleibt entzogen`)
assert.deepEqual(mitCiAnmeldung(basis, 'tools/andere-pruefung.mjs', CI), basis, 'fremde Prüfung bekommt nichts')
assert.deepEqual(mitCiAnmeldung(basis, PFLICHT, { PATH: '/bin' }), basis, 'ohne Quelle nichts erfunden')

// Klasse: jede Prüfung der Liste, die Kommentare liest, steht in der Durchreichung; Einträge haben eine Prüfung der Liste.
const liste = lies('tools/check-logic-liste.txt').split('\n').map((z) => z.trim()).filter((z) => z && !z.startsWith('#'))
for (const datei of liste.filter((d) => existsSync(join(wurzel, d)) && /\.(mjs|ts)$/.test(d))) {
  if (!/beschreibungMitKommentaren\(/.test(lies(datei))) continue
  const vars = CI_ANMELDUNG_DURCHREICHUNG[datei] ?? []
  assert.ok(vars.includes('GH_TOKEN') && vars.includes('GITHUB_REPOSITORY'), `${datei} liest PR-Kommentare, steht aber nicht in CI_ANMELDUNG_DURCHREICHUNG (bau-umgebung.mjs)`)
}
for (const datei of Object.keys(CI_ANMELDUNG_DURCHREICHUNG)) assert.ok(liste.includes(datei), `${datei} steht nicht in check-logic-liste.txt`)

// Verdrahtung: check:logic ruft die Durchreichung (ohne sie wäre die Tabelle wirkungslos).
assert.ok(/return mitCiAnmeldung\(sperreUmgebung\(.*\), datei\)/.test(lies('tools/check-logic-alle.mjs')), 'check-logic-alle.mjs reicht die Anmeldung nicht durch')

// Laute Warnung statt stillem Rückfall.
assert.equal(zugangsWarnung({ GITHUB_EVENT_NAME: 'push' }), null)
assert.equal(zugangsWarnung({ GITHUB_EVENT_NAME: 'pull_request', GITHUB_REPOSITORY: 'o/r', GH_TOKEN: 't' }), null)
assert.match(zugangsWarnung({ GITHUB_EVENT_NAME: 'pull_request', GH_TOKEN: 't' }), /GITHUB_REPOSITORY fehlt/)
assert.match(zugangsWarnung({ GITHUB_EVENT_NAME: 'pull_request', GITHUB_REPOSITORY: 'o/r' }), /GH_TOKEN fehlt/)
assert.match(zugangsWarnung({ GITHUB_EVENT_NAME: 'pull_request' }), /GITHUB_REPOSITORY und GH_TOKEN fehlt/)

// Beide Prüfungen starten wie in `check:logic` (Umgebung aus `ohneCiToken`, mit und ohne Durchreichung) und warnen auf stderr (Logzeile, nicht rot),
// wenn im PR-Ereignis die Anmeldung fehlt; mit Durchreichung bleibt stderr leer. Der Aufruf ist der echte der Prüfung, nur die API ist eine Attrappe.
const WEG = { GITHUB_EVENT_NAME: 'pull_request' }
const EXPORTIERT = { [PFLICHT]: 'tools/patchnotes-kommentar.mjs' } // die Pflicht-Prüfung exportiert die Funktion nicht, sie importiert sie von dort
function stderrVon(datei, env) {
  const code =
    `import { beschreibungMitKommentaren as f } from ${JSON.stringify(pathToFileURL(join(wurzel, EXPORTIERT[datei] ?? datei)).href)};` +
    `console.log(f({ body: 'B', number: 1 }, process.env.GITHUB_REPOSITORY, () => []))`
  const lauf = spawnSync(process.execPath, ['--input-type=module', '-e', code], { env: { PATH: process.env.PATH, ...env }, encoding: 'utf8' })
  assert.equal(lauf.status, 0, lauf.stderr)
  assert.equal(lauf.stdout.trim(), 'B', 'ohne Kommentare gilt die Beschreibung')
  return lauf.stderr
}
for (const datei of Object.keys(CI_ANMELDUNG_DURCHREICHUNG)) {
  assert.match(stderrVon(datei, { ...basis, ...WEG }), /⚠ .*GITHUB_REPOSITORY und GH_TOKEN fehlt/, `${datei}: fehlende Anmeldung im PR-Ereignis still`)
  assert.equal(stderrVon(datei, { ...mitCiAnmeldung(basis, datei, CI), ...WEG }), '', `${datei}: mit Durchreichung keine Warnung`)
  assert.equal(stderrVon(datei, { ...basis, GITHUB_EVENT_NAME: 'push' }), '', `${datei}: außerhalb des PR-Ereignisses keine Warnung`)
}

console.log('ci-anmeldung-durchreichung.test: ok')
