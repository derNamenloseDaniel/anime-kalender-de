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

import { REPO, holeMerges, holeOffene, holePrDaten } from './uebersicht-gh.mjs'
import { eintragHtml, esc, htmlVon } from './uebersicht-html.mjs'
import { kennzahlen } from './uebersicht-kopf.mjs'
import { alterText, labelText, markdownVon } from './uebersicht-md.mjs'
import { baueModell } from './uebersicht-modell.mjs'
import { alterVon, blockiertGrund, datenImText, grundText, markenVon, offenesWort, prBelege } from './uebersicht-regeln.mjs'
import { leseStand, linksVon, titelVon } from './uebersicht-stand.mjs'
import { begrenzt, erzeuge } from './uebersicht.mjs'

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
assert.deepEqual(dt('31.12.2026 01.01.2026 32.01.2026 15.13.2026 00.05.2026 15.00.2026'), ['2026-12-31', '2026-1-1'])
assert.equal(alterVon({ k: null, kopf: 'x 20.11. y', icon: null }, JETZT)?.tage, 5, 'jahrloses Datum im Kopf ohne Kennzeichen')
assert.equal(blockiertGrund({ wartet: null, icon: null }, `wartet ${'y'.repeat(200)}`).length, 90)
assert.deepEqual(dt('25.11. 26.11.'), ['2026-11-25', '2026-11-26'], 'jahrlos trägt das laufende Jahr, kein Zurückrollen')
assert.deepEqual(dt('29.02. 29.02.2028 29.02.2027 31.04.2026'), ['2028-2-29'], 'ungültige Daten fallen weg, auch 29.02. im Nichtschaltjahr')
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
const pb = (...t) => prBelege(t)
assert.deepEqual(pb('PR 900001 gemergt, PR 900002 eingereicht 19:45, PR 900003 läuft, PR 900004 Prüfer läuft, PR 900005 ohne Wort'), { beleg: [900001, 900002, 900003, 900004], geliefert: [900001] })
assert.deepEqual(pb('[PR 900001](https://x/pull/900009) gemergt 18:05', 'gemergt: PR 900002', 'eingereicht ([PR 900003](https://x/pull/900003)', 'PR #900004 gemergt PRs 900005 gemergt'), { beleg: [900001, 900002, 900003, 900004, 900005], geliefert: [900001, 900002, 900004, 900005] })
assert.deepEqual(pb('PR 12 gemergt PR 1234567 gemergt'), { beleg: [], geliefert: [] }, 'nur drei bis sechs Ziffern')
assert.deepEqual(pb('PR 100 gemergt', 'PR 999999 gemergt'), { beleg: [100, 999999], geliefert: [100, 999999] })
assert.deepEqual(pb('PR 900001 gemergt. PR 900002 danach offen'), { beleg: [900001], geliefert: [900001] }, 'der Satzpunkt trennt: gemergt gilt nur für den Satz davor')
assert.deepEqual(pb('PR 900001 ' + 'x '.repeat(40) + 'gemergt'), { beleg: [], geliefert: [] }, 'gemergt weiter als 70 Zeichen hinter dem PR zählt nicht')
assert.deepEqual(pb('{läuft: PR 900001 gemergt} PR 900002'), { beleg: [], geliefert: [] }, 'Stempel in geschweiften Klammern werden ignoriert')
// Fehlfälle der echten stand.md vom 25.11., als erfundene, gleich gebaute Zeilen: Messquelle, Ursache, Vorschlag, Herkunft
assert.deepEqual(pb('Bühne-Basis braucht 1157 s, Ansichten 847 s (gemessen vom Bauer, PR 900101). Dasselbe Muster wie dort.'), { beleg: [], geliefert: [] })
assert.deepEqual(pb('Basis 12–21 ms je Lauf; Messer kostet nach PR 900102 noch ≈ +4 ms und ist seit 21.11. an.'), { beleg: [], geliefert: [] })
assert.deepEqual(pb('Vorschlag Bauer Push-Filter (PR 900103): nur `tvAus` bleibt nach Neuladen.'), { beleg: [], geliefert: [] })
assert.deepEqual(pb('aus PR 900104 gemergt (Berserk, Ghost): Nummer gegen Reihenposition.'), { beleg: [], geliefert: [] })
assert.deepEqual(pb('Ursache PR 900105 gemergt; Herkunft PR 900106 gemergt; Messung PR 900107 läuft'), { beleg: [], geliefert: [] })
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
  '- 🟠 **Daten Eins** {eigen · hoch · Daten · 20.11.} PR 900001 gemergt [PR 900002](https://github.com/o/r/pull/900002) gemergt',
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
  kopf: '🟠 Daten Eins PR 900001 gemergt PR 900002 gemergt',
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
assert.ok(zeileHtml.includes('<span class="badge nacht">🌙 nacht</span>') && zeileHtml.includes('<p>wartet: Lieferung</p>') && zeileHtml.includes('gehört zu: Vater'))
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
const TEXT = '## In Arbeit\n- 🟠 **Daten Eins** {eigen · hoch · Daten · 20.11.} PR 900001 eingereicht\n- 🟠 **Zwei** {eigen · hoch · Daten · 21.11.}\n'
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

// gh-PR-Daten: Form der Einträge, Abfragetext, Blockgrößen, Frischegrenze
const antwortNach = (query) => {
  const repo = {}
  for (const x of query.matchAll(/n(\d+): issueOrPullRequest/g)) {
    repo[`n${x[1]}`] = x[1] === '900300' ? null : { __typename: 'PullRequest', author: { login: 'a-login' }, state: 'OPEN', labels: { nodes: [{ name: 'l1' }, { name: 'l2' }] } }
  }
  return JSON.stringify({ data: { repository: repo } })
}
const queries = []
const gq = (b, a, o) => {
  assert.deepEqual([b, a.slice(0, 3), o], ['gh', ['api', 'graphql', '-f'], { timeout: 60_000 }])
  queries.push(a[3])
  return antwortNach(a[3])
}
const speicher = {}
const nums = Array.from({ length: 45 }, (_, i) => 900200 + i)
holePrDaten(gq, [...nums, 900300], speicher, JETZT)
const erste = queries[0].match(/issueOrPullRequest/g).length
assert.deepEqual([queries.length, erste, queries[1].match(/issueOrPullRequest/g).length], [2, 40, 6])
assert.ok(queries[0].startsWith('query=query { repository(owner: "derNamenloseDaniel", name: "anime-kalender-de") { n900200: issueOrPullRequest(number: 900200) { __typename ... on PullRequest { author { login } state labels(first: 20) { nodes { name } } } } n900201: '))
assert.deepEqual(speicher[900200], { typ: 'PullRequest', autor: 'a-login', labels: ['l1', 'l2'], offen: true, gemergt: false, abnahmeDirigent: false, abgerufen: JETZT })
assert.deepEqual(speicher[900300], { typ: 'unbekannt', autor: null, labels: [], offen: false, abnahmeDirigent: false, abgerufen: JETZT })
const n0 = queries.length
holePrDaten(gq, nums, speicher, JETZT + 599_999)
assert.equal(queries.length, n0, 'offener PR noch frisch')
holePrDaten(gq, nums, speicher, JETZT + 600_000)
assert.equal(queries.length, n0 + 2, 'offener PR nach 10 min neu')
assert.equal(Object.keys(holePrDaten(gq, [900200, 900999], {}, JETZT)).length, 2)
const mitGrenze = JSON.stringify({ number: 1, mergedAt: '2026-11-25T10:00:00Z', updatedAt: '2026-11-18T23:00:00Z', labels: [], autor: 'x' })
let grenzSeiten = 0
holeMerges(() => { grenzSeiten += 1; return grenzSeiten === 1 ? Array.from({ length: 100 }, () => mitGrenze).join('\n') : '' }, VON)
assert.equal(grenzSeiten, 2, 'Seite, deren letzte Aktualisierung genau am Fensterbeginn liegt, geht weiter')
const gedeckelt = holeMerges(() => seitenZeilen(100, '2026-11-25T10:00:00Z'), VON)
assert.deepEqual([gedeckelt.liste.length, gedeckelt.vollstaendig], [2500, false])

// Zeilenlesen: Icon nur am Anfang, Rücksetzen von Notizen und Auto-Block, strengere Einrückungsregel
const lies = (zeilen) => leseStand(zeilen.join('\n'))
assert.equal(lies(['## In Arbeit', `- ${'a'.repeat(14)} 🔴 **X**`]).inArbeit[0].icon, null)
assert.equal(lies(['## In Arbeit', '- 🔴 **X**']).inArbeit[0].icon, '🔴')
assert.equal(lies(['## In Arbeit', '- ab 🔴 **X**']).inArbeit[0].icon, '🔴', 'Icon an Stelle 3 bis 12 zählt')
assert.deepEqual(lies(['## In Arbeit', '- **A**', '## Als Nächstes', '  Notiz zu Nächstes']).inArbeit[0].notizen, [], 'neuer Abschnitt löst die Notiz vom letzten Eintrag')
assert.deepEqual(lies(['## In Arbeit', '- **A**', '## Fremd', '  Notiz zu Fremd']).inArbeit[0].notizen, [])
assert.deepEqual(lies(['## Daniel-Todo', '### Jetzt', '- **A**', '### Später', '  Notiz zu Später']).jetzt[0].notizen, [])
assert.deepEqual(lies(['## In Arbeit', '- **A**', '- **Autonomer Modus** an', '  Notiz zum Modus']).inArbeit[0].notizen, [])
assert.deepEqual(lies(['## In Arbeit', '- **A**', '  Notiz {eigen · hoch · Code · 01.11.}', '  - ohne Kennzeichen']).inArbeit.map((e) => e.notizen.length), [2])
assert.deepEqual(lies(['## In Arbeit', '<!-- pr-zeilen', '- **Auto**', '## Als Nächstes', '- **B**']).naechstes.map((e) => e.titel), ['B'], 'Überschrift beendet den Auto-Block')

// Modell: Zielnamen, Kürzungen, Abschnittswahl, Neu live ohne Datum, nächster Punkt nach Eingang
const alleZiele = baueModell(['## Als Nächstes', ...['Daten', 'Autonomie', 'Code', 'Live5', '-'].map((z) => `- **${z}-Punkt** {eigen · normal · ${z} · 01.11.}`)].join('\n'), JETZT, null)
assert.deepEqual(alleZiele.abschnitte.find((a) => a.id === 'naechstes').gruppen.map((g) => [g.ziel, g.name]), [['Daten', 'Volle Daten'], ['Autonomie', 'Autonomie'], ['Code', 'Fehlerfrei (Code)'], ['Live5', 'Schnell live'], ['-', 'Ohne Ziel']])
const lang = baueModell(['## In Arbeit', `- **L** {eigen · normal · Code · 01.11.} ${'wort '.repeat(100)}${Array.from({ length: 10 }, (_, i) => `[L${i}](https://l/${i})`).join(' ')}`].join('\n'), JETZT, null)
assert.equal(eintraege(lang, 'inArbeit')[0].kopf.length, 400)
assert.equal(eintraege(lang, 'inArbeit')[0].links.length, 8)
const bleibt = baueModell('## Daniel-Todo\n### Jetzt\n- 🔴 **J** {wartet: x}\n## Neu und live testbar\n- [2026-11-24 10:00] **N** wartet auf nichts', JETZT, null)
assert.deepEqual([eintraege(bleibt, 'jetzt').length, eintraege(bleibt, 'neuLive').length, eintraege(bleibt, 'blockiert').length], [1, 1, 0])
const undatiert = baueModell('## Neu und live testbar\n- **Ohne Datum**\n- [2026-11-24 10:00] **Mit Datum**\n- [2026-11-24 09:00] **Gleich alt**', JETZT, null)
assert.deepEqual(eintraege(undatiert, 'neuLive').map((e) => e.titel), ['Mit Datum', 'Gleich alt', 'Ohne Datum'])
const aeltester = baueModell('## Als Nächstes\n- **Neuer** {eigen · normal · Code · 05.11.}\n- **Älterer** {eigen · normal · Code · 03.11.}', JETZT, null)
assert.equal(eintraege(aeltester, 'naechstes').find((e) => e.naechster).titel, 'Älterer')
assert.deepEqual(kennzahlen(alleZiele, null, JETZT).abschnitte.map((a) => a.titel), ['Jetzt für Daniel', 'In Arbeit', 'Blockiert / wartet', 'Als Nächstes', 'Später (Daniel)', 'Neu live'])

// A1 Streichkandidaten: nur PRs, die der Satz als gemergt nennt; Fehlfälle der echten stand.md als erfundene, gleich gebaute Zeilen
const alleGemergt = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [900100 + i, PR([])]))
const kandidat = (...zeilen) => baueModell(`## Als Nächstes\n${zeilen.join('\n')}`, JETZT, { prDaten: alleGemergt }).streichkandidaten.map((e) => e.titel)
const KZ = '{eigen · normal · Code · 20.11.}'
assert.deepEqual(kandidat(`- **Messquelle** ${KZ}: Basis braucht 1157 s (gemessen vom Bauer, PR 900101). Dasselbe Muster wie dort.`), [], 'Messquelle ist keine Lieferung')
assert.deepEqual(kandidat(`- **Ursache** ${KZ}: Basis 12 ms je Lauf; der Messer kostet nach PR 900102 noch ≈ +4 ms und ist seit 21.11. an.`), [], 'Ursache ist keine Lieferung')
assert.deepEqual(kandidat(`- **Vorschlag** ${KZ}: Vorschlag Bauer Push-Filter (PR 900103): nur tvAus bleibt nach Neuladen.`), [], 'Vorschlag ist keine Lieferung')
assert.deepEqual(kandidat(`- **Herkunft** ${KZ}: aus PR 900104 (Berserk, Ghost): Nummer gegen Reihenposition.`), [], 'Herkunft ist keine Lieferung')
assert.deepEqual(kandidat(`- **Sperre** ${KZ}: Hook gemergt ([PR 900105](https://x/pull/900105)); Skript auch nicht im Hintergrund (PR 900106 gemergt); Prüfung nach fünf Aufträgen und am 22.11.: kein Volllauf mehr lokal?`), [], 'Prüfung offen')
assert.deepEqual(kandidat(`- **Aussteht** ${KZ}: Hook gemergt (PR 900105); die Prüfung steht aus.`), [], 'steht aus')
assert.deepEqual(kandidat(`- **Nein** ${KZ}: Sperre widerlegt → [PR 900107](https://x/pull/900107) gemergt 18:57 (S1 zurück), nach Deploy live prüfen; Nebenwirkung im Blick`), [], 'nach Deploy prüfen')
assert.deepEqual(kandidat(`- **Notiz** ${KZ}: [PR 900107](https://x/pull/900107) gemergt (S1 zurück)\n  Notiz: auf alle ausdehnen`), [], 'offene Notiz unter der Zeile')
assert.deepEqual(kandidat(`- **Fertig** ${KZ}: Fix [PR 900108](https://x/pull/900108) gemergt 18:05.`), ['Fertig'], 'Kontrolle: ausdrückliche Lieferung')
assert.deepEqual(kandidat(`- **Gemischt** ${KZ}: aus PR 900104 entstanden, Fix PR 900108 gemergt.`), ['Gemischt'], 'Herkunft daneben stört nicht')
for (const wort of ['offen', 'Rest', 'Reste', 'danach', 'vorher', 'zählen', 'prüfen', 'Prüfung', 'steht aus', 'ausdehnen', 'nachmessen', 'noch', 'Folgepunkte', 'später', 'geplant', 'beobachten', 'im Blick', 'wie ist das?', 'live nach Bestandsbau', 'nächster Schritt: abbauen', 'nach G4: Eingang', 'T2 entworfen', 'Sammelzeile']) {
  assert.deepEqual(kandidat(`- **Wort** ${KZ}: PR 900109 gemergt, ${wort}`), [], `offenes Wort „${wort}“`)
}
assert.deepEqual(kandidat(`- **Wort** ${KZ}: PR 900109 gemergt, alles live gemessen`), ['Wort'])
assert.deepEqual(kandidat(`- **Teile** ${KZ}: (b) PR 900109 gemergt 12.11. 10:33; (a) Start der Probe, (c) Fehler im Schritt`), [], 'Sammelzeile mit Teilen (a) und (c): ein PR erledigt nur (b)')
assert.deepEqual(kandidat(`- **Ein Teil** ${KZ}: (b) PR 900109 gemergt 12.11. 10:33`), ['Ein Teil'], 'ein einzelner Teilbuchstabe macht keine Sammelzeile')
assert.deepEqual(kandidat(`- 📅 **Termin** ${KZ}: PR 900109 gemergt`, `- ⏳ **Wartend** ${KZ}: PR 900109 gemergt`, `- **Ohne PR** ${KZ}: fertig`), [], '📅, ⏳ und Zeilen ohne PR sind nie Kandidaten')
assert.deepEqual(kandidat(`- **Zwei** ${KZ}: PR 900109 gemergt, PR 900111 gemergt`), ['Zwei'])
assert.deepEqual(baueModell(`## Als Nächstes\n- **Zwei** ${KZ}: PR 900109 gemergt, PR 900111 gemergt`, JETZT, { prDaten: { ...alleGemergt, 900111: PR([], { offen: true, gemergt: false }) } }).streichkandidaten, [], 'ein genannter PR noch offen')
assert.deepEqual(baueModell(`## Als Nächstes\n- **Fremd** ${KZ}: PR 900109 gemergt`, JETZT, { prDaten: { 900109: { typ: 'Issue', labels: [], gemergt: true } } }).streichkandidaten, [], 'Nummer ist kein PR')
assert.deepEqual(baueModell(`## Daniel-Todo\n### Später\n- **Fertig** PR 900109 gemergt`, JETZT, { prDaten: alleGemergt }).streichkandidaten, [], 'nur In Arbeit und Als Nächstes')

// A2 Labels: nur PRs, die die Zeile als Lieferung oder laufend nennt; Historie zählt nicht (Mängelregister-Fall)
const historie = Array.from({ length: 30 }, (_, i) => `PR ${900300 + i}`).join(', ')
const nachtPr = (extra = {}) => PR(['orchester'], extra)
const prDatenHist = { ...Object.fromEntries(Array.from({ length: 30 }, (_, i) => [900300 + i, nachtPr()])), 900330: nachtPr(), 900331: PR([]) }
const hist = baueModell(`## In Arbeit\n- **Register** ${KZ}: Historie ${historie} und zuletzt PR 900330 gemergt, PR 900331 eingereicht`, JETZT, { prDaten: prDatenHist })
const regEintrag = eintraege(hist, 'inArbeit')[0]
assert.deepEqual(regEintrag.prs, [900330, 900331])
assert.deepEqual(regEintrag.labels, ['lokal', 'nacht'])
assert.deepEqual(regEintrag.labelQuellen, ['PR 900330: orchester', 'PR 900331: ohne orchester'])
assert.deepEqual(eintraege(baueModell(`## In Arbeit\n- **Nur Historie** ${KZ}: Historie ${historie}`, JETZT, { prDaten: prDatenHist }), 'inArbeit')[0].labels, [], 'Verlauf allein gibt kein Label')

// A4 Alter: Termine ohne Jahr, Zukunft nie ein Alter, ungültiges Datum
assert.equal(alterVon({ k: null, kopf: 'fertig bis 31.12. abgeben', icon: null }, JETZT), null, 'jahrloses Datum in der Zukunft ist nie ein Alter')
assert.deepEqual(alterVon({ k: null, kopf: '📅 31.12. x', icon: '📅' }, JETZT), { art: 'faellig', tage: -36, rot: false })
assert.deepEqual(termin('📅 27.05. x'), { art: 'faellig', tage: 182, rot: true }, '182 Tage zurück: noch überfällig')
assert.deepEqual(termin('📅 26.05. x'), { art: 'faellig', tage: -182, rot: false }, '183 Tage zurück: nächstes Jahr')
assert.deepEqual(termin('📅 30.12. x'), { art: 'faellig', tage: -35, rot: false })
assert.deepEqual(alterVon({ k: null, kopf: '📅 30.12. x', icon: '📅' }, Date.parse('2026-01-05T12:00:00Z')), { art: 'faellig', tage: 6, rot: true }, 'Termin im Vorjahr, sechs Tage her')
assert.deepEqual(alterVon({ k: null, kopf: '📅 29.02. x', icon: '📅' }, Date.parse('2028-03-05T12:00:00Z')), { art: 'faellig', tage: 5, rot: true }, '29.02. im Schaltjahr gilt')
assert.equal(termin('📅 29.02. x'), null, '29.02. im Nichtschaltjahr ist ungültig, kein Rollen auf den 1. März')
assert.equal(alterVon({ k: { tag: 29, monat: 2 }, kopf: '', icon: null }, JETZT), null, 'ungültiger Eingang fällt weg')
assert.deepEqual(termin('📅 15.11.2025 x'), { art: 'faellig', tage: 375, rot: true }, 'mit Jahr gilt das Datum wörtlich')

// A7 Wartegrund und Neu-live-Titel
assert.equal(grundText('wartet'), 'wartet')
assert.equal(grundText('blockiert'), 'blockiert')
assert.equal(grundText('wartet auf DNS'), 'wartet auf DNS')
assert.equal(grundText('Blockiert durch X'), 'Blockiert durch X')
assert.equal(grundText('Daniel'), 'wartet: Daniel')
const ohneGrund = markdownVon(baueModell('## Daniel-Todo\n### Später\n- ⏳ **Leer** nichts weiter\n- 🚫 **Gesperrt** nichts weiter\n- ⏳ **Satz** Rückmeldung, wartet auf Daniel', JETZT, null), kennzahlen(baueModell('', JETZT, null), null, JETZT))
assert.ok(ohneGrund.includes('- **Leer** — wartet\n') && ohneGrund.includes('- **Gesperrt** — blockiert\n') && ohneGrund.includes('- **Satz** — wartet auf Daniel\n'))
assert.ok(!ohneGrund.includes('wartet: wartet') && !ohneGrund.includes('wartet: blockiert'))
const neu = (z) => eintraege(baueModell(`## Neu und live testbar\n${z}`, JETZT, null), 'neuLive').map((e) => e.titel)
assert.deepEqual(neu('- [2026-11-24 10:00] Abo-Seite hat den Abschnitt „Lizenz“ — [Seite](https://a/1)'), ['Abo-Seite hat den Abschnitt „Lizenz“'])
assert.deepEqual(neu('- [2026-11-24 10:00] Geteilte Links zeigen das Cover ([Titel](https://a/1))'), ['Geteilte Links zeigen das Cover'])
assert.deepEqual(neu('- [2026-11-24 10:00] [Startseite](https://a/1)'), ['Startseite'], 'ohne Text davor bleibt der Linktext')
assert.deepEqual(neu('- [2026-11-24 10:00] **Fett** — [Seite](https://a/1)'), ['Fett'])
assert.deepEqual(neu(`- 2026-11-24 ${'x'.repeat(150)} — [Seite](https://a/1)`), [`2026-11-24 ${'x'.repeat(88)}…`], 'Zeile ohne Datumsklammer, auf 100 Zeichen gekürzt')
assert.deepEqual(neu('- [2026-11-24] Nur Datum — [Seite](https://a/1)'), ['Nur Datum'])
assert.equal(titelVon('- [2026-11-24 10:00] [Seite](https://a/1)'), 'Seite', 'andere Abschnitte behalten den Linktext')

// Randfälle der PR-Erkennung: Fenster, Nachbar-PR, Duplikate, lange Link-Adressen
assert.deepEqual(pb('PR 900001 ' + 'a'.repeat(62) + 'gemergt'), { beleg: [900001], geliefert: [900001] }, 'gemergt endet genau bei 70 Zeichen')
assert.deepEqual(pb('PR 900001 ' + 'a'.repeat(63) + 'gemergt'), { beleg: [], geliefert: [] }, 'ein Zeichen weiter zählt nicht')
assert.deepEqual(pb('PR 900001 und PR 900002 gemergt'), { beleg: [900002], geliefert: [900002] }, 'gemergt gehört dem nächsten PR, nicht dem davor')
assert.deepEqual(pb('PR 900001 gemergt, PR 900001 gemergt', 'PR 900001 eingereicht'), { beleg: [900001], geliefert: [900001] }, 'jede Nummer einmal')
assert.deepEqual(pb('[PR 900001](https://example.org/' + 'a'.repeat(90) + ') gemergt'), { beleg: [900001], geliefert: [900001] }, 'die Link-Adresse zählt nicht ins Fenster')
assert.equal(offenesWort(['alles gut', 'bleibt offen']), 'offen')
assert.equal(offenesWort(['alles gut']), null)
assert.equal(offenesWort(['(a) eins', '(c) drei']), '(a)…(b)')

// Labels: Datenbot, Issue und unbekannte Nummer geben nichts (je allein)
const einLabel = (daten) => eintraege(baueModell(`## In Arbeit\n- **Eins** ${KZ}: PR 900401 gemergt`, JETZT, { prDaten: daten }), 'inArbeit')[0].labels
assert.deepEqual(einLabel({ 900401: PR([], { autor: 'anime-kalender-daten' }) }), [], 'Datenbot')
assert.deepEqual(einLabel({ 900401: { typ: 'Issue', autor: 'x', labels: [] } }), [], 'Issue')
assert.deepEqual(einLabel({}), [], 'unbekannte Nummer')
assert.deepEqual(einLabel({ 900401: PR([]) }), ['lokal'], 'Kontrolle')

// Neu-live-Titel: leere Zeile, Längengrenze
assert.deepEqual(neu('- [2026-11-24 10:00]'), ['[2026-11-24 10:00]'], 'nur das Datum: die Zeile selbst')
assert.deepEqual(neu(`- [2026-11-24 10:00] ${'y'.repeat(100)} — [Seite](https://a/1)`), ['y'.repeat(100)], 'genau 100 Zeichen bleiben')
assert.deepEqual(neu(`- [2026-11-24 10:00] ${'y'.repeat(101)} — [Seite](https://a/1)`), [`${'y'.repeat(99)}…`], '101 Zeichen werden gekürzt')

// Gesamtfrist: Restzeit 1 ms läuft noch, Optionen gehen durch, ein Abruf, der an der Frist abbricht, gilt als Frist
assert.equal(begrenzt((b, a, o) => o.timeout, 1001, () => 1000)('gh', [], {}), 1)
assert.deepEqual(begrenzt((b, a, o) => o, 1000, () => 0)('gh', [], { maxBuffer: 5, timeout: 5000 }), { maxBuffer: 5, timeout: 1000 }, 'weitere Optionen bleiben, Frist wird gekürzt')
const bis = (zeit) => {
  let uhr = 0
  const w = []
  const abbruch = (b, a) => { uhr = zeit; throw Object.assign(new Error('ETIMEDOUT'), { code: 'ETIMEDOUT' }) }
  const r = erzeuge('## In Arbeit\n- **A** {eigen · hoch · Daten · 20.11.} PR 900001 gemergt', JETZT, abbruch, {}, (x) => w.push(x), () => uhr, 75_000)
  return { w, md: r.markdown }
}
assert.deepEqual(bis(75_000).w, ['gh: Gesamtfrist abgelaufen, Rest entfällt'], 'Abruf endet genau an der Frist')
assert.ok(bis(75_000).md.includes('GitHub-Daten fehlen (Frist)'))
assert.deepEqual(bis(74_999).w, ['gh PR-Labels: ETIMEDOUT', 'gh offene PRs: ETIMEDOUT', 'gh Merges: ETIMEDOUT'], 'knapp vor der Frist ist es ein gewöhnlicher Fehler')
console.log('uebersicht-rand.test.mjs: ok')
