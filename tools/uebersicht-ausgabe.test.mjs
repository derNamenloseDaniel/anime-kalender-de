/**
 * Ausgaben und Läufer von tools/uebersicht.mjs: Markdown und HTML einer kleinen stand.md Zeichen für Zeichen (Soll aus der Absicht
 * gelesen, nicht aus dem Code erzeugt), `main` mit gh-Attrappe samt Zwischenspeicher (fehlt, zweiter Lauf, kaputt) und der echte
 * gh-Runner `ghAusfuehren` gegen ein Node-Kind. Fester Zeitpunkt, Wegwerf-Ordner unter os.tmpdir().
 */
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { htmlVon } from './uebersicht-html.mjs'
import { kennzahlen } from './uebersicht-kopf.mjs'
import { markdownVon } from './uebersicht-md.mjs'
import { baueModell } from './uebersicht-modell.mjs'
import { ghAusfuehren, main } from './uebersicht.mjs'

const JETZT = Date.parse('2026-11-25T12:00:00Z')
const TEXT = [
  '## Daniel-Todo',
  '### Später',
  '- 📅 **Termin** 27.11.',
  '## In Arbeit',
  '- 🟠 **Eins | zwei** {eigen · hoch · Daten · 24.11.} PR 900001 [Bericht](file:///C:/b.md) [PR 900002](https://github.com/o/r/pull/900002) [A](https://a/1) [B](https://a/2)',
  '- **Zwei** {eigen · normal · Code · 21.11. · wartet: Daniel}',
  '## Als Nächstes',
  '- **Drei** {auftrag · hoch · Daten · 20.11.} @nacht',
  '## Neu und live testbar',
  '- [2026-11-24 10:00] **Neu** — [Link](https://example.org/n)',
].join('\n')
const PR1 = { typ: 'PullRequest', autor: 'x', labels: [], offen: false, gemergt: true, abnahmeDirigent: false }
const m = baueModell(TEXT, JETZT, { prDaten: { 900001: PR1 } })
const k = kennzahlen(m, null, JETZT)

assert.equal(markdownVon(m, k), [
  '# Übersicht',
  '',
  'Erzeugt 2026-11-25T12:00:00.000Z aus stand.md (einzige Wahrheit, nicht von Hand ändern).',
  '',
  '| Abschnitt | Punkte |',
  '|---|---|',
  '| Jetzt für Daniel | 0 |',
  '| In Arbeit | 1 |',
  '| Blockiert / wartet | 1 |',
  '| Als Nächstes | 1 |',
  '| Später (Daniel) | 1 |',
  '| Neu live | 1 |',
  '',
  'Labels offene Punkte: 💻 lokal 1 · 🌙 nacht 1 · beide 0 · ohne Beleg 2',
  '',
  '_GitHub nicht erreichbar: PR- und Merge-Zahlen sowie PR-Labels entfallen._',
  '',
  '## Jetzt für Daniel (0)',
  '',
  '## In Arbeit (1)',
  '',
  '### Volle Daten',
  '#### Sonstiges',
  '- **Eins / zwei** 💻 lokal seit 1 Tag (eigen · hoch) — [Bericht](file:///C:/b.md) [PR 900002](https://github.com/o/r/pull/900002) [A](https://a/1)',
  '',
  '## Blockiert / wartet (1)',
  '',
  '### Fehlerfrei (Code)',
  '#### Sonstiges',
  '- **Zwei** ❗ seit 4 Tagen (eigen · normal) — wartet: Daniel',
  '',
  '## Als Nächstes (1)',
  '',
  '### Volle Daten',
  '#### Sonstiges',
  '- ▶ **Drei** 🌙 nacht ❗ seit 5 Tagen (auftrag · hoch)',
  '',
  '## Später (Daniel) (1)',
  '',
  '### Ohne Ziel',
  '#### Sonstiges',
  '- **Termin** fällig in 2 Tagen',
  '',
  '## Neu live (1)',
  '',
  '- **Neu** seit 1 Tag — [Link](https://example.org/n)',
  '',
].join('\n'))

const html = htmlVon(m, k)
const koerper = html.slice(html.indexOf('<body>'), html.indexOf('<script>'))
const teil = (s) => assert.ok(koerper.includes(s), `fehlt: ${s}`)
teil('<h1>Übersicht</h1><p class="mu">Erzeugt 2026-11-25 12:00 UTC aus stand.md (einzige Wahrheit; nicht von Hand ändern).</p>')
teil('<div class="karte"><b>1</b><small>In Arbeit</small></div>')
teil('<div class="karte"><b>1 · 1 · 0</b><small>lokal · nacht · beide (ohne Beleg 2)</small></div>')
teil('<p class="mu">GitHub nicht erreichbar: PR- und Merge-Zahlen sowie PR-Labels entfallen.</p>')
teil('<button type="button" class="f" data-feld="label" data-wert="alle" aria-pressed="true">Alle</button><button type="button" class="f" data-feld="label" data-wert="lokal" aria-pressed="false">💻 lokal</button>')
teil('data-wert="-" aria-pressed="false">Ohne Ziel</button></div><input type="search" id="suche" placeholder="Suchen …" aria-label="Suchen">')
teil('<details class="abschnitt" id="a-jetzt" open><summary><h2>Jetzt für Daniel</h2> <span class="zahl" data-zahl>(0)</span></summary><p class="leer">Keine Einträge.</p></details>')
teil('<details class="abschnitt" id="a-neuLive"><summary><h2>Neu live</h2> <span class="zahl" data-zahl>(1)</span></summary><ul class="liste"><li class="e" data-labels="" data-ziel="-"')
teil('<details class="ziel" open><summary><h3 style="display:inline">Volle Daten</h3> <span class="zahl" data-zahl>(1)</span></summary><details class="thema" open><summary>Sonstiges <span class="zahl" data-zahl>(1)</span></summary><ul class="liste"><li class="e" data-labels="lokal" data-ziel="Daten" data-text="eins | zwei 🟠 eins | zwei pr 900001 bericht pr 900002 a b">')
teil('<summary><span class="titel">Eins | zwei</span> <span class="badge lokal">💻 lokal</span> <span class="alt">seit 1 Tag</span> <span class="prio">eigen · hoch</span></summary>')
teil('<div class="detail"><p>🟠 Eins | zwei PR 900001 Bericht PR 900002 A B</p><p class="mu">Label-Beleg: PR 900001: ohne orchester</p><p><a href="file:///C:/b.md">Bericht</a> · <a href="https://github.com/o/r/pull/900002">PR 900002</a> · <a href="https://a/1">A</a> · <a href="https://a/2">B</a></p></div>')
teil('<div class="detail"><p>Zwei</p><p><b>wartet:</b> Daniel</p></div>')
teil('<span class="next">▶ nächster</span> <span class="titel">Drei</span> <span class="badge nacht">🌙 nacht</span> <span class="alt rot">❗ seit 5 Tagen</span> <span class="prio">auftrag · hoch</span>')
teil('<span class="titel">Termin</span>  <span class="alt">fällig in 2 Tagen</span></summary>')
assert.ok(html.indexOf('id="a-jetzt"') < html.indexOf('id="a-inArbeit"') && html.indexOf('id="a-inArbeit"') < html.indexOf('id="a-blockiert"') && html.indexOf('id="a-blockiert"') < html.indexOf('id="a-naechstes"') && html.indexOf('id="a-naechstes"') < html.indexOf('id="a-spaeter"') && html.indexOf('id="a-spaeter"') < html.indexOf('id="a-neuLive"'))
assert.ok(html.startsWith('<!doctype html>\n<html lang="de">') && html.includes('<title>Übersicht</title><style>:root {') && html.includes('</style></head>') && html.includes('<script>// Filter der Übersicht'))
assert.ok(html.endsWith('</script></body></html>\n'))
// Mit gh: Merges und Warnhinweis als eigene Karte
const mitGh = htmlVon(m, kennzahlen(m, { offene: { liste: [], abgeschnitten: false }, merges: { liste: [{ mergedAt: '2026-11-25T08:00:00Z', labels: [], autor: 'x' }], vollstaendig: true } }, JETZT))
assert.ok(mitGh.includes('<details class="abschnitt"><summary><h2>Merges je Tag</h2> <span class="zahl"></span></summary><div class="detail"><table><tr><th>Tag</th><th>💻 lokal</th><th>🌙 nacht</th><th>Datenbot</th></tr><tr><td>2026-11-25</td><td>1</td><td>0</td><td>0</td></tr>'))
assert.ok(mitGh.includes('<b>0</b><small>offene PRs, ältester 0 h</small>'))

// main mit gh-Attrappe: schreibt Zwischenspeicher, zweiter Lauf fragt abgeschlossene PRs nicht erneut, kaputter Speicher wird ersetzt
const ordner = mkdtempSync(join(tmpdir(), 'uebersicht-ausgabe-'))
const aufrufe = []
const fakeGh = () => (b, a, o) => {
  aufrufe.push(a[0] === 'api' ? a[1].slice(0, 7) : a[0])
  assert.equal(b, 'gh')
  assert.equal(o.timeout, 60_000)
  if (a[0] === 'pr') return '[]'
  if (a[1] === 'graphql') return JSON.stringify({ data: { repository: { n900001: { __typename: 'PullRequest', author: { login: 'x' }, state: 'MERGED', labels: { nodes: [] } } } } })
  return ''
}
const meldungen = []
const alt = console.error
const altLog = console.log
try {
  console.error = (t) => meldungen.push(String(t))
  console.log = () => {}
  const stand = join(ordner, 'stand.md')
  writeFileSync(stand, TEXT)
  assert.equal(main([stand, '--jetzt', '2026-11-25T12:00:00Z'], 0, fakeGh), 0)
  const speicher = JSON.parse(readFileSync(join(ordner, '.uebersicht-cache.json'), 'utf8'))
  assert.deepEqual(Object.keys(speicher), ['900001', '900002'])
  assert.equal(speicher[900001].typ, 'PullRequest')
  assert.equal(speicher[900002].typ, 'unbekannt', 'unbekannte Nummer wird mit gemerkt')
  assert.equal(aufrufe.filter((x) => x === 'graphql').length, 1)
  assert.ok(readFileSync(join(ordner, 'uebersicht.md'), 'utf8').includes('Offene PRs: 0'))
  const vor = aufrufe.length
  assert.equal(main([stand, '--jetzt', '2026-11-25T12:00:00Z'], 0, fakeGh), 0)
  assert.equal(aufrufe.slice(vor).filter((x) => x === 'graphql').length, 0, 'zweiter Lauf: PR aus dem Zwischenspeicher')
  writeFileSync(join(ordner, '.uebersicht-cache.json'), '{kaputt')
  assert.equal(main([stand, '--jetzt', '2026-11-25T12:00:00Z'], 0, fakeGh), 0)
  assert.ok(meldungen.some((t) => t.startsWith('Warnung: Zwischenspeicher unlesbar, neu aufgebaut: ')))
  assert.equal(JSON.parse(readFileSync(join(ordner, '.uebersicht-cache.json'), 'utf8'))[900001].typ, 'PullRequest')
  meldungen.length = 0
  assert.equal(main([stand, '--jetzt', '2026-11-25T12:00:00Z'], 0, () => null), 0)
  assert.deepEqual(meldungen, ['Warnung: ohne gh: keine PR-Labels, keine PR-Zahlen'])
  meldungen.length = 0
  assert.equal(main([stand, '--ohne-gh'], 0, () => assert.fail('gh darf nicht gefragt werden')), 0)
  assert.deepEqual(meldungen, ['Warnung: ohne gh: keine PR-Labels, keine PR-Zahlen'])
} finally {
  console.error = alt
  console.log = altLog
  rmSync(ordner, { recursive: true, force: true })
}

// Echter Runner: Node als „gh“; Ausgabe, geschlossene stdin, Frist, fehlendes Programm
const lauf = ghAusfuehren(process.execPath)
assert.equal(typeof lauf, 'function')
assert.equal(lauf(process.execPath, ['-e', 'process.stdout.write("x")'], { timeout: 20_000 }), 'x')
assert.equal(lauf(process.execPath, ['-e', 'process.stdin.resume();process.stdin.on("end",()=>process.stdout.write("ende"))'], { timeout: 20_000 }), 'ende', 'stdin ist geschlossen')
assert.throws(() => lauf(process.execPath, ['-e', 'setTimeout(()=>{},5000)'], { timeout: 200 }))
assert.equal(lauf(process.execPath, ['-e', 'process.stdout.write("é".repeat(10))'], { timeout: 20_000 }), 'é'.repeat(10), 'utf8')
const fehler = []
const alt2 = console.error
try {
  console.error = (t) => fehler.push(String(t))
  assert.equal(ghAusfuehren('gibt-es-nicht-uebersicht-4711'), null)
} finally {
  console.error = alt2
}
assert.match(fehler[0], /^Warnung: gh nicht verfügbar: /)
console.log('uebersicht-ausgabe.test.mjs: ok')
