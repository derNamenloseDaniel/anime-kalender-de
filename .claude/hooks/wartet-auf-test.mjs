// Test für wartet-auf.mjs und die neuen Meldungen in stand-waechter.js. Aufruf: node .claude/hooks/wartet-auf-test.mjs
// Ohne Netz und ohne gh: Dienste sind eingespeist; Dateien liegen in einem Wegwerf-Ordner.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { bedingung, dateiFreigeben, erfuellt, jetztZeile, lauf, liveBundles, verschiebe, wartende, DROSSEL_MS } from './wartet-auf.mjs'

const require = createRequire(import.meta.url)
const { waechter, berlinEpoche } = require('./stand-waechter.js')

const wurzel = mkdtempSync(join(tmpdir(), 'wartet-auf-'))
const standPfad = join(wurzel, 'stand.md')
const statePfad = join(wurzel, 'state.json')
const dateiE113 = join(wurzel, 'e113.md')
const dateiE95 = join(wurzel, 'e95.md')
const link = (p) => `file:///${p.replace(/\\/g, '/')}`
const JETZT_MS = berlinEpoche(2026, 11, 24, 8, 30)

const dateiText = (kennung, mitWarnung) => `# ${kennung} · Test\n\n*Stand: 23.11.2026 21:07*\n\n${mitWarnung ? '> ⚠ **Kann veraltet sein:** erst handeln, wenn hier „live“ steht.\n\n' : ''}## Deine Aufgabe\n\nTun.\n`
const standText = (eol) => [
  '# Stand', 'Aktualisiert: 2026-11-23 21:00 · Test', '', '### Jetzt', '- 🟠 [F157 · Staffel](file:///C:/x/f157.md)', '',
  '### Später',
  `- ⏳ [E113 · Gemerkte Titel](${link(dateiE113)}) — sobald der Fix live ist {wartet: pr:4763 + live:"favoritenAbgleichBasis" → 🔴}`,
  `- ⏳ [E95 · Netflix](${link(dateiE95)}) — sobald Titel auf der Liste stehen {wartet: prüfen:30.11.2026 → 🟠}`,
  '- 📅 **17.11. Aufräumen** — Ordner', '',
].join(eol)

function einrichten(eol = '\n', warnungE113 = true) {
  writeFileSync(standPfad, standText(eol))
  writeFileSync(dateiE113, dateiText('E113', warnungE113))
  writeFileSync(dateiE95, dateiText('E95', true))
  try { writeFileSync(statePfad, '{}') } catch { /* neu */ }
}
const dienste = (pr, bundles, ms = JETZT_MS) => ({ jetzt: ms, pr: async () => pr, bundles: async () => bundles })
const fahre = (d, extra = {}) => lauf({ standPfad, ms: JETZT_MS, dienste: d, statePfad, drosseln: false, ...extra })

// Bedingungen: Syntax
assert.deepEqual(bedingung('pr:4763'), { art: 'pr', nr: 4763 })
assert.deepEqual(bedingung('live:"a + b"'), { art: 'live', text: 'a + b' })
assert.equal(bedingung('ab:24.11.2026 08:00').ms, berlinEpoche(2026, 11, 24, 8, 0))
assert.equal(bedingung('prüfen:24.11.2026').art, 'pruefen')
assert.equal(bedingung('wann:irgendwann'), null)
const w = wartende(standText('\n').split('\n'))
assert.equal(w.length, 2, 'zwei Zeilen mit {wartet}, die 📅-Zeile zählt nicht')
assert.equal(w[0].kennung, 'E113')
assert.equal(w[0].icon, '🔴')
assert.equal(w[0].bedingungen.length, 2)
assert.equal(wartende(['### Später', '- ⏳ E1 {wartet: live:"a + b" + pr:3 → 🔴}'])[0].bedingungen.length, 2, 'Plus im Text trennt nicht')
assert.equal(wartende(['### Jetzt', '- ⏳ E1 {wartet: pr:3 → 🔴}']).length, 0, 'nur unter Später')

// Jetzt-Zeile: ohne „— …“ und ohne {wartet}
assert.equal(jetztZeile(w[0].zeile, '🔴'), `- 🔴 [E113 · Gemerkte Titel](${link(dateiE113)})`)
assert.equal(jetztZeile('- ⏳ **E5 Tun** — später {wartet: pr:1 → 🔵}', '🔵'), '- 🔵 **E5 Tun**')

// erfuellt: teilweise erfüllt = nein; Netzfehler (bundles null) = nein; ab: Grenze
assert.equal(await erfuellt(w[0].bedingungen, dienste(true, 'x favoritenAbgleichBasis y')), true)
assert.equal(await erfuellt(w[0].bedingungen, dienste(true, 'ohne den Text')), false, 'PR gemergt, aber nicht live')
assert.equal(await erfuellt(w[0].bedingungen, dienste(false, 'x favoritenAbgleichBasis')), false, 'live, aber PR offen')
assert.equal(await erfuellt(w[0].bedingungen, dienste(true, null)), false, 'Netzfehler bei live')
assert.equal(await erfuellt(w[0].bedingungen, dienste(null, 'favoritenAbgleichBasis')), false, 'Netzfehler bei gh')
const ab = [{ b: bedingung('ab:24.11.2026 08:30') }]
assert.equal(await erfuellt(ab, dienste(false, null, JETZT_MS)), true)
assert.equal(await erfuellt(ab, dienste(false, null, JETZT_MS - 1)), false, 'eine ms vorher noch nicht')

// liveBundles: index.html + Script + modulepreload; Fehler = null
const abrufe = []
const abruf = (urls) => async (u) => {
  abrufe.push(String(u))
  const t = urls[String(u)]
  if (t == null) return { ok: false, status: 404, text: async () => '' }
  return { ok: true, status: 200, text: async () => t }
}
const html = '<script type="module" src="/assets/a.js"></script><link rel="modulepreload" href="/assets/b.js"><link rel="stylesheet" href="/assets/c.css">'
const t = await liveBundles(abruf({ 'https://anime-kalender.de/': html, 'https://anime-kalender.de/assets/a.js': 'AAA', 'https://anime-kalender.de/assets/b.js': 'BBB' }))
assert.equal(t, 'AAA\nBBB')
assert.equal(abrufe.some((u) => u.endsWith('.css')), false)
assert.equal(await liveBundles(abruf({ 'https://anime-kalender.de/': html, 'https://anime-kalender.de/assets/a.js': 'AAA' })), null, 'ein Bundle 404 = Nichtauskunft')
assert.equal(await liveBundles(async () => { throw new Error('offline') }), null)

// verschiebe / dateiFreigeben
const v = verschiebe(standText('\n'), w[0].index, 'NEU', JETZT_MS)
assert.match(v, /### Jetzt\nNEU\n- 🟠 \[F157/)
assert.ok(!v.includes('E113 · Gemerkte Titel](file:///') || v.includes('NEU'))
assert.match(v, /Aktualisiert: 2026-11-24 08:30 · Test/)
assert.equal(verschiebe('### Später\n- x\n', 1, 'N', JETZT_MS), null, 'ohne „### Jetzt“ nichts tun')
const f = dateiFreigeben(dateiText('E113', true), JETZT_MS)
assert.ok(!f.includes('erst handeln'))
assert.ok(!f.includes('\n\n\n'), 'kein doppelter Abstand')
assert.match(f, /\*Stand: 24\.11\.2026 08:30\*/)
assert.equal(dateiFreigeben(dateiText('E113', false), JETZT_MS).includes('Deine Aufgabe'), true, 'Datei ohne ⚠-Zeile bleibt heil')
assert.ok(dateiFreigeben('# x\r\n\r\n*Stand: 01.01.2026 10:00*\r\n', JETZT_MS).includes('\r\n'), 'CRLF bleibt')

// Lauf: nicht erfüllt → nichts ändert sich
einrichten()
assert.equal(await fahre(dienste(true, 'ohne')), '')
assert.equal(readFileSync(standPfad, 'utf8'), standText('\n'))

// Lauf: erfüllt → Zeile wandert, Datei freigegeben, Meldung, wiederholter Lauf meldet nicht noch einmal
assert.equal(await fahre(dienste(true, 'favoritenAbgleichBasis')), '[Wartet erfüllt] E113 nach Jetzt geholt — Daniel im Chat Bescheid geben')
const nach = readFileSync(standPfad, 'utf8')
assert.match(nach, new RegExp(`### Jetzt\\n- 🔴 \\[E113 · Gemerkte Titel\\]\\(${link(dateiE113).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)\\n- 🟠 \\[F157`))
assert.equal(nach.split('\n').filter((z) => z.includes('E113')).length, 1, 'genau eine E113-Zeile, nicht doppelt')
assert.ok(nach.includes('E95 · Netflix'), 'fremde Zeile bleibt')
assert.ok(!readFileSync(dateiE113, 'utf8').includes('erst handeln'))
assert.match(readFileSync(dateiE113, 'utf8'), /\*Stand: 24\.11\.2026 08:30\*/)
assert.ok(readFileSync(dateiE95, 'utf8').includes('erst handeln'), 'fremde Jetzt-Datei unverändert')
assert.equal(await fahre(dienste(true, 'favoritenAbgleichBasis')), '', 'zweiter Lauf: nichts mehr zu holen')

// Datei ohne ⚠-Zeile, CRLF
einrichten('\r\n', false)
assert.match(await fahre(dienste(true, 'favoritenAbgleichBasis')), /E113 nach Jetzt geholt/)
assert.ok(readFileSync(standPfad, 'utf8').includes('\r\n'), 'CRLF in stand.md bleibt')
assert.match(readFileSync(dateiE113, 'utf8'), /\*Stand: 24\.11\.2026 08:30\*/)

// prüfen: vor dem Datum still, ab dem Datum einmal je Tag, nie verschoben
einrichten()
const vor = berlinEpoche(2026, 11, 29, 23, 59)
assert.equal(await fahre(dienste(false, null, vor), { ms: vor }), '')
const tag1 = berlinEpoche(2026, 11, 30, 0, 0)
assert.equal(await fahre(dienste(false, null, tag1), { ms: tag1 }), '[Wartet prüfen] E95: Bedingung von Hand prüfen')
assert.equal(await fahre(dienste(false, null, tag1 + 3600000), { ms: tag1 + 3600000 }), '', 'am selben Tag keine zweite Meldung')
const tag2 = berlinEpoche(2026, 12, 1, 9, 0)
assert.equal(await fahre(dienste(false, null, tag2), { ms: tag2 }), '[Wartet prüfen] E95: Bedingung von Hand prüfen', 'am nächsten Tag wieder')
assert.ok(readFileSync(standPfad, 'utf8').includes('E95 · Netflix'), 'prüfen: wird nie verschoben')
assert.ok(!readFileSync(standPfad, 'utf8').split('### Später')[0].includes('E95'), 'E95 nie unter Jetzt')

// unlesbare Bedingung: Meldung statt Schweigen, nichts verschoben
writeFileSync(standPfad, '### Jetzt\n### Später\n- ⏳ [E7 · X](file:///C:/nix.md) {wartet: wenn:bald → 🔴}\n')
writeFileSync(statePfad, '{}')
assert.match(await fahre(dienste(true, 'x')), /\[Wartet unlesbar\] E7: Bedingung „wenn:bald“ nicht verstanden/)

// Drossel: innerhalb von 10 min kein zweiter Abruf (Dienste werden nicht gefragt), danach wieder
einrichten()
let fragen = 0
const zaehlend = { jetzt: JETZT_MS, pr: async () => { fragen++; return false }, bundles: async () => { fragen++; return '' } }
await fahre(zaehlend, { drosseln: true })
const nach1 = fragen
assert.ok(nach1 > 0, 'erster Lauf fragt')
await fahre(zaehlend, { drosseln: true, ms: JETZT_MS + DROSSEL_MS - 1 })
assert.equal(fragen, nach1, 'innerhalb der Drossel keine Abfrage')
await fahre(zaehlend, { drosseln: true, ms: JETZT_MS + DROSSEL_MS })
assert.ok(fragen > nach1, 'nach 10 min wieder')
await fahre(zaehlend, { drosseln: false, ms: JETZT_MS + DROSSEL_MS })
assert.ok(fragen > nach1 + 0, 'SessionStart drosselt nie')

// fehlende stand.md (Worktree ohne Hauptordner): nichts tun
assert.equal(await lauf({ standPfad: join(wurzel, 'gibt-es-nicht.md'), ms: JETZT_MS, dienste: dienste(true, 'x'), statePfad, drosseln: false }), '')

// Wächter: Jetzt-Zeile, deren Datei „erst handeln, wenn“ sagt
mkdirSync(join(wurzel, 'w'), { recursive: true })
const lies = (p) => (p.endsWith('e113.md') ? dateiText('E113', true) : null)
const aend = () => null
const jetztMitWarte = `## In Arbeit\n### Jetzt\n- 🔴 [E113 · Gemerkte Titel](${link(dateiE113)})\n### Später\n`
const m1 = waechter(jetztMitWarte, Date.now(), () => true, lies, aend)
assert.match(m1, /Jetzt: E113 — die Datei sagt „erst handeln, wenn …“/)
const lies2 = () => dateiText('E113', false)
assert.ok(!waechter(jetztMitWarte, Date.now(), () => true, lies2, aend).includes('erst handeln'), 'ohne ⚠-Zeile keine Meldung')
// Wächter: ⏳-Zeile auf jetzt/…md ohne {wartet}
const spaeter = (z) => `### Jetzt\n### Später\n${z}\n`
const ohne = waechter(spaeter('- ⏳ [E95 · Netflix](file:///C:/code/ai/anime-kalender-de/daniel-zum-abarbeiten/jetzt/e95.md) — sobald'), Date.now(), () => true, () => null, aend)
assert.match(ohne, /Später: 1 Zeile \(.*E95.*\) verlinkt eine Jetzt-Datei ohne \{wartet: …\}/)
assert.ok(!waechter(spaeter('- ⏳ [E95 · Netflix](file:///C:/code/ai/anime-kalender-de/daniel-zum-abarbeiten/jetzt/e95.md) {wartet: pr:1 → 🔴}'), Date.now(), () => true, () => null, aend).includes('ohne {wartet'), 'mit Bedingung keine Meldung')
assert.ok(!waechter(spaeter('- ⏳ **Aoashi nachmessen** — ich prüfe selbst'), Date.now(), () => true, () => null, aend).includes('ohne {wartet'), 'ohne Jetzt-Datei-Link keine Meldung')

console.log('wartet-auf-test: ok')
