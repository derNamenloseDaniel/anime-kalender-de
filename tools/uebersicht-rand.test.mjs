/**
 * Grenzfälle zu tools/uebersicht.mjs und seinen Teilen (uebersicht-stand, -regeln, -modell, -kopf, -gh, -md, -html):
 * jede Schwelle auf beiden Seiten, vollständige Eintragsform, gh-Aufrufe mit Argumenten und Frist, Erfolgsweg von `erzeuge`,
 * Zeilenlesen (CRLF, Autonomer Modus, Kinder), Ausgabeformen. Ergänzt tools/uebersicht.test.mjs; PR-Nummern ab 900000, feste Zeit.
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { REPO, holeMerges, holeOffene } from './uebersicht-gh.mjs'
import { eintragHtml, esc, htmlVon } from './uebersicht-html.mjs'
import { kennzahlen } from './uebersicht-kopf.mjs'
import { alterText, labelText, markdownVon } from './uebersicht-md.mjs'
import { baueModell } from './uebersicht-modell.mjs'
import { alterVon, blockiertGrund, datenImText, markenVon, prNummern } from './uebersicht-regeln.mjs'
import { leseStand, linksVon, titelVon } from './uebersicht-stand.mjs'
import { erzeuge } from './uebersicht.mjs'

const JETZT = Date.parse('2026-11-25T12:00:00Z')
const seit = (tag, monat) => alterVon({ k: { tag, monat }, kopf: '', icon: null }, JETZT)
const eintraege = (m, id) => m.abschnitte.find((a) => a.id === id).gruppen.flatMap((g) => g.themen.flatMap((t) => t.eintraege))

// Alter: Grenzen 0/2/3 Tage, Zukunft nie ein Alter
assert.deepEqual(seit(25, 11), { art: 'seit', tage: 0, rot: false })
assert.deepEqual(seit(23, 11), { art: 'seit', tage: 2, rot: false })
assert.deepEqual(seit(22, 11), { art: 'seit', tage: 3, rot: true })
assert.equal(seit(26, 11)?.tage, 364, 'ein jahrloses Datum morgen heißt vor einem Jahr, nie negativ')
const termin = (text) => alterVon({ k: null, kopf: text, icon: '📅' }, JETZT)
assert.deepEqual(termin('📅 25.11. x'), { art: 'faellig', tage: 0, rot: false })
assert.deepEqual(termin('📅 23.11. x'), { art: 'faellig', tage: 2, rot: false })
assert.deepEqual(termin('📅 22.11. x'), { art: 'faellig', tage: 3, rot: true })
assert.deepEqual(termin('📅 26.11. x'), { art: 'faellig', tage: -1, rot: false })
assert.deepEqual(termin('📅 02.01. x'), { art: 'faellig', tage: -38, rot: false }, 'Termin im nächsten Jahr')
assert.equal(termin('📅 ohne Datum'), null)
assert.deepEqual(alterVon({ k: null, kopf: 'a 2026-11-20 b 2026-11-22 c 2026-12-30', icon: null }, JETZT), { art: 'seit', tage: 5, rot: true }, 'frühestes vergangenes Datum')

// Daten im Text: Monats- und Tagesgrenzen, jahrlos am Stichtag
const dt = (t) => datenImText(t, JETZT).map((d) => `${d.j}-${d.m}-${d.d}`)
assert.deepEqual(dt('31.12.2026 01.01.2026 32.01.2026 15.13.2026 00.05.2026'), ['2026-12-31', '2026-1-1'])
assert.deepEqual(dt('25.11. 26.11.'), ['2026-11-25', '2025-11-26'])
assert.deepEqual(dt('x1.2.2026 v1.2.3 1.12.11.2026'), [])

// Blockiert-Grund: Wort in den ersten 220 Zeichen, Textstück ab dem Treffer, Rückfälle je Icon
assert.equal(blockiertGrund({ wartet: 'Daniel', icon: null }, 'wartet auf x'), 'Daniel')
assert.equal(blockiertGrund({ wartet: null, icon: null }, 'Vorspann wartet auf die Lieferung'), 'wartet auf die Lieferung')
assert.equal(blockiertGrund({ wartet: null, icon: null }, `${'a '.repeat(108)}wartet`), null, 'Wort über Zeichen 220 hinaus zählt nicht')
assert.equal(blockiertGrund({ wartet: null, icon: null }, `${'a '.repeat(107)}wartet`), 'wartet', 'Wort endet genau bei 220')
assert.equal(blockiertGrund({ wartet: null, icon: '⏳' }, 'ohne Stichwort'), 'wartet')
assert.equal(blockiertGrund({ wartet: null, icon: '🚫' }, 'ohne Stichwort'), 'blockiert')
assert.equal(blockiertGrund({ wartet: null, icon: '⏳' }, `x wartet ${'y'.repeat(200)}`).length, 90)
assert.equal(blockiertGrund({ wartet: null, icon: null }, 'Wartezeit, erwartet, wartete'), null)
assert.equal(blockiertGrund({ wartet: null, icon: '🔵' }, 'nichts'), null)

// PR-Nummern und Marken
assert.deepEqual(prNummern(['[PR 900001](https://x/pull/900002) PR #900003 PRs 900001 PR 12 PR 1234567 pull/99']), [900001, 900002, 900003])
assert.deepEqual(prNummern(['PR 100', 'PR 999999']), [100, 999999])
assert.deepEqual([...markenVon(['a @nacht', 'b x@lokal @nacht.', 'c /@lokal @lokalx'])].sort(), ['nacht'])
assert.deepEqual([...markenVon(['(@lokal)', '@nacht'])].sort(), ['lokal', 'nacht'])

// Parser: Titelrückfälle, Links, CRLF, Autonomer Modus, Kinder, Größe, `{wartet:}`
assert.equal(titelVon('- 🔴 [E95 · Test](file:///C:/x.md) rest'), 'E95 · Test')
assert.equal(titelVon(`- 🔵 ${'x'.repeat(100)}`), 'x'.repeat(70))
assert.equal(titelVon('- ⏳ ohne Fett und Link'), 'ohne Fett und Link')
assert.deepEqual(linksVon(['[A](https://a/1) [B](https://a/1) [C](file:///C:/c.md) [D](javascript:x) [E](mailto:x@y)', '[F](https://f/2)']).map((l) => l.text), ['A', 'C', 'F'])
const st = leseStand([
  '## Als Nächstes',
  '  eingerückt ohne Eintrag davor',
  '- **Autonomer Modus** bis 23:30',
  '  Notiz zum Autonomen Modus',
  '- [klein] **Eins** {eigen · normal · Code · 01.11.}',
  '  - **Kind** {auftrag · hoch · Code · 02.11.}',
  '    - **Enkel** {auftrag · hoch · Code · 03.11.}',
  '  Notiz am Enkel',
  '- **Zwei**',
  '## Fremd',
  '- **nicht gelesen**',
].join('\r\n'))
assert.deepEqual(st.naechstes.map((e) => e.titel), ['Eins', 'Kind', 'Enkel', 'Zwei'])
assert.deepEqual(st.naechstes.map((e) => e.eltern), [null, 'Eins', 'Eins', null])
assert.deepEqual(st.naechstes.map((e) => e.notizen), [[], [], ['Notiz am Enkel'], []])
assert.equal(st.naechstes[0].groesse, 'klein')
assert.equal(st.naechstes[3].groesse, null)
assert.equal(st.naechstes[3].k, null)
assert.equal(st.naechstes[1].nr, 6)
const todo = leseStand('## Daniel-Todo\n- 🔴 **Ohne Unterüberschrift**\n### Spaeter\n- ⏳ **S1** {wartet: x}\n### Jetzt\n- 🟠 **J1**\n## Anderes')
assert.deepEqual([todo.jetzt.map((e) => e.titel), todo.spaeter.map((e) => e.titel)], [['Ohne Unterüberschrift', 'J1'], ['S1']])
assert.deepEqual(leseStand('## Neu und live testbar\n- [2026-11-24 10:00] **A** — [L](https://a)\n## Als Nächstes\n- **B**').neuLive.map((e) => e.titel), ['A'])

// Modell: vollständige Eintragsform, Sortierung ohne Rang, Thema-Reihenfolge, Neu live, Zählung
const STAND = [
  '## In Arbeit',
  '- 🟠 **Daten Eins** {eigen · hoch · Daten · 20.11.} PR 900001 [PR 900002](https://github.com/o/r/pull/900002)',
  '  Notiz',
  '## Daniel-Todo',
  '### Jetzt',
  '- 🔵 **Blau**',
  '- 🔴 **Rot**',
  '- 🟠 **Orange**',
  '- **Ohne Icon**',
  '## Als Nächstes',
  '- **Staffel Eins** {eigen · normal · Daten · 20.11.}',
  '- **Sonstiges A** {eigen · normal · Daten · 19.11.}',
  '- **Skill Zwei** {eigen · normal · Daten · 21.11.}',
  '- **Anderes Ziel** {eigen · normal · Live5 · 21.11.}',
  '## Neu und live testbar',
  '- [2026-11-20 10:00] **Alt** — x',
  '- [2026-11-24 10:00] **Neu** — x',
]
const PR = (labels, extra = {}) => ({ typ: 'PullRequest', autor: 'derNamenloseDaniel', labels, offen: false, gemergt: true, abnahmeDirigent: false, ...extra })
const m = baueModell(STAND.join('\n'), JETZT, { prDaten: { 900001: PR(['orchester'], { abnahmeDirigent: true }), 900002: PR([]) } })
assert.deepEqual(eintraege(m, 'inArbeit')[0], {
  nr: 2,
  titel: 'Daten Eins',
  kopf: '🟠 Daten Eins PR 900001 PR 900002',
  notizen: 1,
  eltern: null,
  herkunft: 'inArbeit',
  ziel: 'Daten',
  prio: 'eigen · hoch',
  icon: '🟠',
  groesse: null,
  labels: ['lokal', 'nacht'],
  labelQuellen: ['PR 900001: orchester', 'PR 900001: Abnahme Dirigent', 'PR 900002: ohne orchester'],
  prs: [900001, 900002],
  links: [{ text: 'PR 900002', href: 'https://github.com/o/r/pull/900002' }],
  alter: { art: 'seit', tage: 5, rot: true },
  grund: null,
  thema: 'Sonstiges',
  naechster: false,
  streichen: true,
  sortier: 0,
})
assert.deepEqual(eintraege(m, 'jetzt').map((e) => [e.titel, e.prio, e.sortier]), [['Rot', 'dringend', 1000], ['Orange', 'heute', 1001], ['Blau', 'wenn Zeit ist', 1002], ['Ohne Icon', null, 1005]])
const naechstes = m.abschnitte.find((a) => a.id === 'naechstes')
assert.deepEqual(naechstes.gruppen.map((g) => [g.ziel, g.name]), [['Daten', 'Volle Daten'], ['Live5', 'Schnell live']])
assert.deepEqual(naechstes.gruppen[0].themen.map((t) => [t.thema, t.eintraege.map((e) => e.titel)]), [['Titel und Franchise', ['Staffel Eins']], ['Mod, Werkzeuge und Regeln', ['Skill Zwei']], ['Sonstiges', ['Sonstiges A']]])
assert.deepEqual(eintraege(m, 'neuLive').map((e) => e.titel), ['Neu', 'Alt'], 'Neu live: neueste zuerst')
assert.deepEqual(m.abschnitte.find((a) => a.id === 'neuLive').gruppen.map((g) => [g.ziel, g.name, g.themen.length, g.themen[0].thema]), [[null, null, 1, null]])

// Kennzahlen mit gh: Kopfzahlen, Alter der PRs (nie negativ), „≥“ und „unvollständig“
const gh = {
  offene: { liste: [{ number: 900020, title: 'Jung', createdAt: '2026-11-25T11:00:00Z', labels: ['orchester'] }, { number: 900021, title: 'Alt', createdAt: '2026-11-23T12:00:00Z', labels: [] }, { number: 900022, title: 'Zukunft', createdAt: '2026-11-25T13:00:00Z', labels: [] }], abgeschnitten: true },
  merges: { liste: [{ mergedAt: '2026-11-25T08:00:00Z', labels: ['orchester'], autor: 'x' }], vollstaendig: false },
}
const k = kennzahlen(m, gh, JETZT)
assert.deepEqual(k.prs.liste.map((p) => [p.number, p.stunden, p.labels]), [[900021, 48, []], [900020, 1, ['orchester']], [900022, 0, []]])
assert.equal(k.prs.abgeschnitten, true)
assert.equal(k.merges.vollstaendig, false)
assert.deepEqual(k.merges.tage[0], { tag: '2026-11-25', lokal: 0, nacht: 1, daten: 0 })
assert.deepEqual(k.abschnitte.map((a) => [a.id, a.anzahl]), [['jetzt', 4], ['inArbeit', 1], ['blockiert', 0], ['naechstes', 4], ['spaeter', 0], ['neuLive', 2]])
assert.equal(k.streichkandidaten, 1)
assert.deepEqual(k.labels, { lokal: 0, nacht: 0, beide: 1, offen: 8 })
assert.equal(kennzahlen(m, null, JETZT).prs, null)
assert.equal(kennzahlen(m, null, JETZT).merges, null)
const md = markdownVon(m, k)
assert.ok(md.includes('Offene PRs: ≥ 3') && md.includes('- PR 900021 — 48 h — Alt') && md.includes('- PR 900020 — 1 h — Jung [orchester]'))
assert.ok(md.includes('Merges je Tag (unvollständig: Seitengrenze erreicht)') && md.includes('| 2026-11-25 | 0 | 1 | 0 |'))
assert.ok(markdownVon(m, kennzahlen(m, { ...gh, offene: { ...gh.offene, abgeschnitten: false }, merges: { ...gh.merges, vollstaendig: true } }, JETZT)).includes('Offene PRs: 3\n'))
assert.ok(!markdownVon(m, kennzahlen(m, { ...gh, merges: { ...gh.merges, vollstaendig: true } }, JETZT)).includes('unvollständig'))
const html = htmlVon(m, k)
assert.ok(html.includes('≥ 3</b><small>offene PRs, ältester 48 h') && html.includes('unvollständig: Seitengrenze erreicht'))
assert.equal((html.match(/<button /g) ?? []).length, 5 + 6)
assert.equal((html.match(/<button [^>]*aria-pressed="true"/g) ?? []).length, 2)
assert.ok(html.includes('data-wert="Live5"') && html.includes('>Schnell live<'))

// Ausgabeformen: Alterstext, Labeltext, Eintragszeile, Escape
assert.equal(alterText(null), '')
assert.equal(alterText({ art: 'seit', tage: 1, rot: false }), 'seit 1 Tag')
assert.equal(alterText({ art: 'seit', tage: 3, rot: true }), '❗ seit 3 Tagen')
assert.equal(alterText({ art: 'faellig', tage: -1, rot: false }), 'fällig in 1 Tag')
assert.equal(alterText({ art: 'faellig', tage: -2, rot: false }), 'fällig in 2 Tagen')
assert.equal(alterText({ art: 'faellig', tage: 4, rot: true }), '❗ seit 4 Tagen fällig')
assert.equal(alterText({ art: 'faellig', tage: 0, rot: false }), 'seit 0 Tagen fällig')
assert.equal(labelText(['lokal', 'nacht']), '💻 lokal 🌙 nacht')
assert.equal(esc(`<a href="x" t='y'>&</a>`), '&lt;a href=&quot;x&quot; t=&#39;y&#39;&gt;&amp;&lt;/a&gt;')
const e1 = eintraege(m, 'inArbeit')[0]
const zeileHtml = eintragHtml({ ...e1, naechster: true, links: [{ text: 'A', href: 'javascript:alert(1)' }, { text: 'B', href: 'https://b/1' }], grund: 'Lieferung', eltern: 'Vater' })
assert.ok(zeileHtml.includes('data-labels="lokal nacht" data-ziel="Daten"') && zeileHtml.includes('<span class="next">▶ nächster</span>'))
assert.ok(zeileHtml.includes('<span class="alt rot">seit 5 Tagen</span>') || zeileHtml.includes('<span class="alt rot">❗ seit 5 Tagen</span>'))
assert.ok(zeileHtml.includes('<span class="badge nacht">🌙 nacht</span>') && zeileHtml.includes('<p><b>wartet:</b> Lieferung</p>') && zeileHtml.includes('gehört zu: Vater'))
assert.ok(zeileHtml.includes('A · <a href="https://b/1">B</a>') && !zeileHtml.includes('javascript:'))
assert.ok(zeileHtml.includes('Label-Beleg: PR 900001: orchester; PR 900001: Abnahme Dirigent; PR 900002: ohne orchester'))
assert.ok(!eintragHtml({ ...e1, alter: { art: 'seit', tage: 1, rot: false } }).includes('alt rot'))
assert.ok(!eintragHtml({ ...e1, naechster: false, labels: [], labelQuellen: [], grund: null, links: [] }).includes('badge'))

// gh-Aufrufe: Argumente, Frist, Grenzen
const aufruf = []
const offen = (n) => JSON.stringify(Array.from({ length: n }, (_, i) => ({ number: 900100 + i, title: `T${i}`, createdAt: '2026-11-25T00:00:00Z', labels: [{ name: 'a' }, { name: 'b' }] })))
const o199 = holeOffene((b, a, o) => { aufruf.push([b, a, o]); return offen(199) })
assert.deepEqual(aufruf[0], ['gh', ['pr', 'list', '--repo', REPO, '--state', 'open', '--limit', '200', '--json', 'number,title,createdAt,labels'], { timeout: 60_000 }])
assert.equal(o199.abgeschnitten, false)
assert.deepEqual(o199.liste[0], { number: 900100, title: 'T0', createdAt: '2026-11-25T00:00:00Z', labels: ['a', 'b'] })
assert.equal(holeOffene(() => offen(200)).abgeschnitten, true)
const mAufruf = []
const seitenZeilen = (n, updated) => Array.from({ length: n }, (_, i) => JSON.stringify({ number: i, mergedAt: '2026-11-25T10:00:00Z', updatedAt: updated, labels: [], autor: 'x' })).join('\n')
const VON = Date.parse('2026-11-18T23:00:00Z')
const r = holeMerges((b, a, o) => { mAufruf.push([b, a, o]); return seitenZeilen(100, '2026-11-18T22:59:59Z') }, VON)
assert.equal(mAufruf.length, 1, 'Seite endet vor dem Fenster: keine weitere')
assert.equal(r.vollstaendig, true)
assert.deepEqual(mAufruf[0][1].slice(0, 2), ['api', `repos/${REPO}/pulls?state=closed&sort=updated&direction=desc&per_page=100&page=1`])
assert.equal(mAufruf[0][1][2], '--jq')
assert.deepEqual(mAufruf[0][2], { timeout: 60_000 })
let seiten = 0
holeMerges(() => { seiten += 1; return seitenZeilen(100, '2026-11-25T10:00:00Z') }, VON)
assert.equal(seiten, 25, 'höchstens 25 Seiten')
assert.equal(holeMerges(() => seitenZeilen(99, '2026-11-25T10:00:00Z'), VON).liste.length, 99)
const grenze = JSON.stringify({ number: 1, mergedAt: '2026-11-18T23:00:00Z', updatedAt: '2026-11-18T23:00:00Z', labels: [], autor: 'x' })
assert.equal(holeMerges(() => grenze, VON).liste.length, 1, 'Merge genau am Fensterbeginn zählt')
assert.equal(holeMerges(() => grenze.replace('"mergedAt":"2026-11-18T23:00:00Z"', '"mergedAt":null'), VON).liste.length, 0, 'geschlossen ohne Merge zählt nicht')

// erzeuge, Erfolgsweg: gh liefert alles; Labels, PR-Zahlen, Merges stehen in beiden Ausgaben
const TEXT = '## In Arbeit\n- 🟠 **Daten Eins** {eigen · hoch · Daten · 20.11.} PR 900001\n- 🟠 **Zwei** {eigen · hoch · Daten · 21.11.}\n'
const gAufrufe = []
const attrappe = (b, a, o) => {
  gAufrufe.push([b, ...a.slice(0, 2)].join(' ').slice(0, 60))
  assert.equal(b, 'gh')
  assert.equal(o.timeout, 60_000)
  if (a[0] === 'pr') return JSON.stringify([{ number: 900050, title: 'Offen', createdAt: '2026-11-24T12:00:00Z', labels: [] }])
  if (a[1] === 'graphql') {
    const q = a.at(-1)
    const repo = q.includes('comments(last') ? { n900001: { __typename: 'PullRequest', comments: { nodes: [{ author: { login: 'derNamenloseDaniel' }, body: '## Nachtrag (Abnahme Dirigent) — Kopf abc' }] } } } : { n900001: { __typename: 'PullRequest', author: { login: 'x' }, state: 'MERGED', labels: { nodes: [{ name: 'orchester' }] } } }
    return JSON.stringify({ data: { repository: repo } })
  }
  return JSON.stringify({ number: 1, mergedAt: '2026-11-25T09:00:00Z', updatedAt: '2026-11-25T09:00:00Z', labels: ['orchester'], autor: 'x' })
}
const cache = {}
const ok = erzeuge(TEXT, JETZT, attrappe, cache, (w) => assert.fail(`Warnung: ${w}`))
assert.deepEqual(eintraege(ok.modell, 'inArbeit').map((e) => [e.titel, e.labels]), [['Daten Eins', ['lokal', 'nacht']], ['Zwei', []]])
assert.ok(ok.markdown.includes('Offene PRs: 1') && ok.markdown.includes('| 2026-11-25 | 0 | 1 | 0 |'))
assert.ok(ok.html.includes('🌙 nacht') && ok.html.includes('offene PRs, ältester 24 h'))
assert.equal(Object.keys(cache).join(), '900001')
assert.equal(gAufrufe.filter((x) => x.includes('graphql')).length, 2)

// Kindprozess: Reihenfolge der Argumente, --jetzt, Ausgabezeile, Exit-Codes
const ordner = mkdtempSync(join(tmpdir(), 'uebersicht-rand-'))
try {
  writeFileSync(join(ordner, 'stand.md'), TEXT)
  const lauf = (args) => spawnSync(process.execPath, [join(import.meta.dirname, 'uebersicht.mjs'), ...args], { encoding: 'utf8', timeout: 60_000, windowsHide: true })
  const l1 = lauf(['--ohne-gh', '--jetzt', '2026-11-25T12:00:00Z', join(ordner, 'stand.md')])
  assert.equal(l1.status, 0, l1.stderr)
  assert.match(l1.stdout, /^Übersicht: 2 Einträge, Labels \{"lokal":0,"nacht":0,"beide":0,"offen":2\}, Streichkandidaten 0$/m)
  assert.ok(readFileSync(join(ordner, 'uebersicht.md'), 'utf8').includes('Erzeugt 2026-11-25T12:00:00.000Z'))
  assert.match(l1.stderr, /Warnung: ohne gh/)
  assert.equal(lauf(['--ohne-gh', join(ordner, 'fehlt.md')]).status, 1)
  assert.match(lauf(['--ohne-gh', join(ordner, 'fehlt.md')]).stderr, /stand\.md fehlt: /)
} finally {
  rmSync(ordner, { recursive: true, force: true })
}
console.log('uebersicht-rand.test.mjs: ok')
