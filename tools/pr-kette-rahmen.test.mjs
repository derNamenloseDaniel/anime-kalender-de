/**
 * Test für tools/pr-kette-rahmen.mjs (festgeschriebener Rahmen der PR-Prüfkette): Trigger, Rechte, env, Runner, Frist,
 * Schrittfolge der Teiljobs und die Composite-Action kette-einrichten; jede Abweichung ist rot.
 * Aufruf: node tools/pr-kette-rahmen.test.mjs
 */
import assert from 'node:assert/strict'
import { pruefeRahmen, pruefeSchrittfolge } from './pr-kette-rahmen.mjs'

const CHECKOUT = 'actions/checkout@v4'
const EINRICHTEN = './.github/actions/kette-einrichten'

// Sollfassung der Aktion als eigenes Literal (nicht aus dem Prüfling)
const aktion = () => ({
  name: 'egal',
  description: 'egal',
  inputs: { playwright: { description: 'Chromium für Playwright bereitlegen', default: 'false' } },
  runs: {
    using: 'composite',
    steps: [
      { uses: 'actions/setup-node@v4', with: { 'node-version': 22, cache: 'npm' } },
      { name: 'node_modules aus dem Cache', id: 'nm', uses: 'actions/cache@v4', with: { path: 'node_modules', key: "nm-${{ runner.os }}-node22-${{ hashFiles('package.json', 'package-lock.json') }}" } },
      { name: 'Abhängigkeiten installieren', if: "steps.nm.outputs.cache-hit != 'true'", shell: 'bash', run: 'npm ci' },
      { name: 'Browser-Cache', if: "inputs.playwright == 'true'", id: 'pw', uses: 'actions/cache@v4', with: { path: '~/.cache/ms-playwright', key: "pw-${{ runner.os }}-${{ hashFiles('package-lock.json') }}" } },
      { name: 'Microsoft-Paketquelle entfernen', if: "inputs.playwright == 'true'", shell: 'bash', run: 'sudo grep -l packages.microsoft.com /etc/apt/sources.list.d/* | sudo xargs -r rm -fv || true' },
      { name: 'Chromium installieren', if: "inputs.playwright == 'true' && steps.pw.outputs.cache-hit != 'true'", shell: 'bash', run: 'npx playwright install chromium' },
      { name: 'Chromium-Systempakete', if: "inputs.playwright == 'true'", shell: 'bash', run: 'npx playwright install-deps chromium || echo "::warning::Chromium-Systempakete nicht installiert (apt-Störung); Browser-Tests laufen mit dem Runner-Abbild"' },
    ],
  },
})
const doc = () => ({
  permissions: { contents: 'read' },
  env: { TZ: 'Europe/Berlin' },
  on: { pull_request: { branches: ['main', 'zug'], types: ['opened', 'synchronize', 'reopened', 'ready_for_review'] } },
})
const pflicht = () => [['a', { 'runs-on': 'ubuntu-latest', 'timeout-minutes': 30 }], ['b', { 'runs-on': 'ubuntu-latest', 'timeout-minutes': 5 }]]

// Sollzustand: keine Verstöße (Frist genau 30 ist erlaubt)
assert.deepEqual(pruefeRahmen(doc(), pflicht(), aktion()), [])

// Rahmen: jede Abweichung genau ein Verstoß mit eigenem Text
const rahmen = [
  ['permissions', (d) => { d.permissions = { contents: 'write' } }, /permissions sind nicht exakt/],
  ['permissions erweitert', (d) => { d.permissions['id-token'] = 'write' }, /permissions sind nicht exakt/],
  ['env', (d) => { d.env = { TZ: 'UTC' } }, /env ist nicht exakt/],
  ['env zusätzlich', (d) => { d.env.X = '1' }, /env ist nicht exakt/],
  ['Trigger', (d) => { d.on = { pull_request_target: d.on.pull_request } }, /on ist nicht exakt/],
  ['Trigger-types', (d) => { d.on.pull_request.types.pop() }, /on ist nicht exakt/],
  ['Trigger-Zweige', (d) => { d.on.pull_request.branches = ['main'] }, /on ist nicht exakt/],
]
for (const [name, aendere, muster] of rahmen) {
  const d = doc()
  aendere(d)
  const fehler = pruefeRahmen(d, pflicht(), aktion())
  assert.equal(fehler.length, 1, name)
  assert.match(fehler[0], muster, name)
}
assert.match(pruefeRahmen({}, pflicht(), aktion()).join('|'), /permissions.*\|.*env.*\|.*on ist/)

// Jobs: Runner und Frist je Job, Grenze 30/31
const frist = pruefeRahmen(doc(), [['a', { 'runs-on': 'ubuntu-latest', 'timeout-minutes': 31 }], ['b', { 'runs-on': 'ubuntu-latest', 'timeout-minutes': 30 }]], aktion())
assert.deepEqual(frist, ['Job "a": timeout-minutes über 30'])
const runner = pruefeRahmen(doc(), [['a', { 'runs-on': 'ubuntu-latest' }], ['b', { 'runs-on': 'self-hosted', 'timeout-minutes': 5 }]], aktion())
assert.deepEqual(runner, ['Job "b": runs-on ist nicht ubuntu-latest'])
assert.equal(pruefeRahmen(doc(), [], aktion()).length, 0, 'ohne Jobs nichts zu melden')

// Aktion: fehlt, Eingaben, Schrittzahl, jeder Schritt, using, fremde Schlüssel
assert.deepEqual(pruefeRahmen(doc(), pflicht(), undefined), ['Aktion kette-einrichten: nicht gelesen'])
assert.deepEqual(pruefeRahmen(doc(), pflicht(), null), ['Aktion kette-einrichten: nicht gelesen'])
let a = aktion()
a.inputs.playwright.default = 'true'
assert.deepEqual(pruefeRahmen(doc(), pflicht(), a), ['Aktion kette-einrichten: inputs weichen von der Sollfassung ab'])
a = aktion()
a.runs.using = 'node20'
assert.deepEqual(pruefeRahmen(doc(), pflicht(), a), ['Aktion kette-einrichten: runs.using ist nicht composite'])
a = aktion()
a.runs.steps.push({ name: 'Extra', shell: 'bash', run: 'git checkout origin/main -- .' })
assert.deepEqual(pruefeRahmen(doc(), pflicht(), a), ['Aktion kette-einrichten: 8 Schritte, Sollfassung hat 7'])
a = aktion()
a.runs.steps.pop()
assert.deepEqual(pruefeRahmen(doc(), pflicht(), a), [
  'Aktion kette-einrichten: 6 Schritte, Sollfassung hat 7',
  'Aktion kette-einrichten: Schritt 7 (Chromium-Systempakete) weicht von der Sollfassung ab',
])
for (let i = 0; i < 7; i++) {
  a = aktion()
  a.runs.steps[i].run = 'echo manipuliert'
  const f = pruefeRahmen(doc(), pflicht(), a)
  assert.equal(f.length, 1, `Schritt ${i + 1}`)
  assert.match(f[0], new RegExp(`^Aktion kette-einrichten: Schritt ${i + 1} \\(.+\\) weicht von der Sollfassung ab$`))
}
a = aktion()
a.runs.env = { X: '1' }
assert.deepEqual(pruefeRahmen(doc(), pflicht(), a), ['Aktion kette-einrichten: runs.env nicht erlaubt'])
a = aktion()
a.name = 'anderer Name'
a.description = 'andere Beschreibung'
assert.deepEqual(pruefeRahmen(doc(), pflicht(), a), [], 'Name und Beschreibung sind frei')

// Schrittfolge: erlaubt
assert.deepEqual(pruefeSchrittfolge('t', [{ uses: CHECKOUT }, { uses: EINRICHTEN }, { run: 'npm test' }]), [])
assert.deepEqual(pruefeSchrittfolge('t', [{ uses: CHECKOUT }, { uses: EINRICHTEN, with: { playwright: 'true' } }, { run: 'x' }]), [])
// Schrittfolge: Verstöße
const folge = (steps) => pruefeSchrittfolge('t', steps)
assert.match(folge([{ run: 'x' }, { uses: CHECKOUT }, { uses: EINRICHTEN }]).join('|'), /erster Schritt ist nicht actions\/checkout@v4/)
assert.match(folge([{ uses: CHECKOUT }, { run: 'x' }, { uses: EINRICHTEN }]).join('|'), /zweiter Schritt ist nicht .*kette-einrichten/)
assert.deepEqual(folge([{ uses: CHECKOUT }, { uses: EINRICHTEN }, { uses: CHECKOUT }]), ['Teiljob "t": genau ein Checkout verlangt (ein zweiter könnte main holen)'])
assert.deepEqual(folge([{ uses: CHECKOUT, with: { ref: 'main' } }, { uses: EINRICHTEN }]), ['Teiljob "t": Checkout mit with (ref/repository) nicht erlaubt'])
assert.deepEqual(folge([{ uses: CHECKOUT }, { uses: EINRICHTEN, with: { playwright: 'false' } }]), ["Teiljob \"t\": kette-einrichten erlaubt nur with playwright: 'true'"])
assert.deepEqual(folge([{ uses: CHECKOUT }, { uses: EINRICHTEN, with: { playwright: 'true', x: 1 } }]), ["Teiljob \"t\": kette-einrichten erlaubt nur with playwright: 'true'"])
assert.deepEqual(folge([{ uses: CHECKOUT }, { uses: EINRICHTEN }, { run: 'x', with: { a: 1 } }]), ['Teiljob "t": with an einem run-Schritt nicht erlaubt'])
assert.equal(folge([]).length, 3, 'leere Schrittfolge: erster, zweiter, Checkout-Zahl')

console.log('pr-kette-rahmen.test.mjs ok')
