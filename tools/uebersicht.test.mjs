/**
 * Test für tools/uebersicht.mjs mit uebersicht-stand.mjs, uebersicht-regeln.mjs, uebersicht-modell.mjs, uebersicht-kopf.mjs,
 * uebersicht-gh.mjs, uebersicht-md.mjs, uebersicht-html.mjs (samt uebersicht-seite.css/.js): erfundene Mini-stand.md (PR-Nummern ab 900000),
 * feste Zeit, gh als Attrappe. Prüft Parser, Gruppierung, Rang, Labels, Blockiert, Streichkandidaten, Alter, gh-Seiten, Ausgaben, CLI.
 */
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { holeMerges, holePrDaten } from './uebersicht-gh.mjs'
import { htmlVon } from './uebersicht-html.mjs'
import { kennzahlen } from './uebersicht-kopf.mjs'
import { markdownVon } from './uebersicht-md.mjs'
import { baueModell, labelZaehlung } from './uebersicht-modell.mjs'
import { alterVon, datenImText, hatAbnahmeDirigent, mergesJeTag, themaVon } from './uebersicht-regeln.mjs'
import { leseStand } from './uebersicht-stand.mjs'
import { erzeuge, main } from './uebersicht.mjs'

const JETZT = Date.parse('2026-11-25T12:00:00Z')
const STAND = [
  '# Stand',
  '## Neu und live testbar (Kopf)',
  '- [2026-11-24 10:00] Neu A — [Link](https://example.org/neu)',
  '## Daniel-Todo (Kopf)',
  '### Jetzt',
  '- 🔴 **Jetzt-Aufgabe** — [Datei](file:///C:/x/y.md)',
  '### Später',
  '- 📅 **27.11. Termin** — später',
  '- ⏳ **Lieferung abwarten** — x {wartet: pr:900001 → 🔵}',
  '- 🚫 **Gesperrt** — x',
  '## In Arbeit (Stand 25.11. mit PR 900099 in der Überschrift)',
  '- 🟠 **Daten Eins** {eigen · hoch · Daten · 20.11.} PR 900001 [PR 900002](https://github.com/o/r/pull/900002)',
  '  - 🔴 **Kind Mod-Werkzeug** {kritisch · sofort · Autonomie · 24.11.}: PR 900003 `</script>` $& <b>fett</b>',
  '  Fortsetzung mit [PR 900004](https://github.com/o/r/pull/900004)',
  '- **Ohne Kennzeichen**: wartet auf Daniel @lokal',
  '<!-- pr-zeilen: automatisch -->',
  '- **Auto PR** — PR 900005',
  '<!-- /pr-zeilen -->',
  '- 🔵 **Delta** {eigen · normal · Code · 01.12.}',
  '## Als Nächstes (Todo)',
  '- 🔵 **Beta** {eigen · normal · Daten · 24.11.}',
  '- 🔵 **Alpha** {auftrag · hoch · Daten · 23.11.}',
  '- 🔵 **Gamma** {eigen · normal · Daten · 20.11.}',
  '- **Ohne Rang**',
  '- 🔵 **Erledigt** {eigen · normal · Code · 22.11.} PR 900010',
  '- 🔵 **Teilweise** {eigen · normal · Code · 22.11.} PR 900010 PR 900011',
  '- 🔵 **Mit Rest** {eigen · normal · Code · 22.11.} PR 900010: offen bleibt der Rest',
  '- 📅 **Termin-Zeile** {eigen · normal · Code · 22.11.} PR 900010',
  '- 🔵 **Wartende** {eigen · normal · Code · 22.11. · wartet: Daniel} PR 900010',
  '## Anderes',
  '- **zählt nicht**',
]
const TEXT = STAND.join('\n')
const PR = (labels, extra = {}) => ({ typ: 'PullRequest', autor: 'derNamenloseDaniel', labels, offen: false, gemergt: true, abnahmeDirigent: false, ...extra })
const PR_DATEN = {
  900001: PR(['orchester'], { abnahmeDirigent: true }),
  900002: PR([]),
  900003: PR(['orchester']),
  900004: PR([], { autor: 'anime-kalender-daten' }),
  900010: PR([]),
  900011: PR([], { offen: true, gemergt: false }),
}
const titel = (liste) => liste.map((e) => e.titel)
const eintraegeVon = (abschnitt) => abschnitt.gruppen.flatMap((g) => g.themen.flatMap((t) => t.eintraege))
const ab = (m, id) => m.abschnitte.find((a) => a.id === id)

// Parser: Abschnitte, Kind mit eigenem Kennzeichen, Auto-Block und Überschrift zählen nicht
const roh = leseStand(TEXT)
assert.deepEqual(Object.fromEntries(Object.entries(roh).map(([k, v]) => [k, v.length])), { neuLive: 1, jetzt: 1, spaeter: 3, inArbeit: 4, naechstes: 9 })
assert.equal(roh.inArbeit[1].eltern, 'Daten Eins')
assert.equal(roh.inArbeit[1].notizen.length, 1)
assert.equal(roh.spaeter[1].wartet, 'pr:900001 → 🔵')
assert.equal(leseStand('').naechstes.length, 0)

// Jede Zeile genau einmal: Summe der Abschnitte = Zahl der Einträge der Datei
const m = baueModell(TEXT, JETZT, { prDaten: PR_DATEN })
assert.equal(m.eintraege, 18)
assert.equal(m.abschnitte.reduce((s, a) => s + a.anzahl, 0), 18)
assert.deepEqual(m.abschnitte.map((a) => a.id), ['jetzt', 'inArbeit', 'blockiert', 'naechstes', 'spaeter', 'neuLive'])
assert.deepEqual(m.abschnitte.map((a) => a.anzahl), [1, 3, 4, 8, 1, 1])
assert.equal(baueModell('', JETZT, null).eintraege, 0)

// Blockiert verschiebt: Wartezeilen aus allen Abschnitten, mit Grund
assert.deepEqual(titel(eintraegeVon(ab(m, 'blockiert'))).sort(), ['Gesperrt', 'Lieferung abwarten', 'Ohne Kennzeichen', 'Wartende'])
assert.equal(eintraegeVon(ab(m, 'blockiert')).find((e) => e.titel === 'Lieferung abwarten').grund, 'pr:900001 → 🔵')
assert.equal(eintraegeVon(ab(m, 'blockiert')).find((e) => e.titel === 'Wartende').grund, 'Daniel')
assert.deepEqual(titel(eintraegeVon(ab(m, 'spaeter'))), ['27.11. Termin'])

// Rang wie naechster.mjs: auftrag vor eigen, dann älterer Eingang, ungekennzeichnete zuletzt
const daten = ab(m, 'naechstes').gruppen.find((g) => g.ziel === 'Daten')
assert.deepEqual(titel(daten.themen.flatMap((t) => t.eintraege)), ['Alpha', 'Gamma', 'Beta'])
assert.equal(eintraegeVon(ab(m, 'naechstes')).find((e) => e.naechster).titel, 'Alpha')
assert.deepEqual(ab(m, 'naechstes').gruppen.map((g) => g.ziel), ['Daten', 'Code', '-'])
assert.equal(eintraegeVon(ab(m, 'naechstes')).at(-1).titel, 'Ohne Rang')

// Labels: PR-Daten, Abnahme Dirigent, Datenbot gibt nichts, Marke ohne PR, ohne Beleg leer
const lab = Object.fromEntries(m.abschnitte.flatMap(eintraegeVon).map((e) => [e.titel, e.labels]))
assert.deepEqual(lab['Daten Eins'], ['lokal', 'nacht'])
assert.deepEqual(lab['Kind Mod-Werkzeug'], ['nacht'])
assert.deepEqual(lab['Ohne Kennzeichen'], ['lokal'])
assert.deepEqual(lab.Beta, [])
assert.deepEqual(labelZaehlung(m), { lokal: 6, nacht: 1, beide: 1, offen: 9 })
assert.deepEqual(baueModell(TEXT, JETZT, null).abschnitte.flatMap(eintraegeVon).find((e) => e.titel === 'Daten Eins').labels, [])
assert.equal(hatAbnahmeDirigent([{ autor: 'derNamenloseDaniel', text: '## Nachtrag (Abnahme Dirigent) — Kopf abc' }]), true)
assert.equal(hatAbnahmeDirigent([{ autor: 'github-actions', text: '## Nachtrag (Abnahme Dirigent) — Kopf abc' }]), false)
assert.equal(hatAbnahmeDirigent([{ autor: 'derNamenloseDaniel', text: 'Zu ## Nachtrag (Abnahme Dirigent)' }]), false)

// Streichkandidaten: alle PRs gemergt, kein „offen“, kein 📅/⏳, kein Wartegrund; Zeilen bleiben im Abschnitt
assert.deepEqual(titel(m.streichkandidaten), ['Daten Eins', 'Kind Mod-Werkzeug', 'Erledigt'])
assert.ok(eintraegeVon(ab(m, 'naechstes')).some((e) => e.titel === 'Erledigt'))

// Alter: seit ab Eingang, Zukunft nie, Jahreswechsel, Termin fällig
const rotDelta = eintraegeVon(ab(m, 'inArbeit')).find((e) => e.titel === 'Delta').alter
assert.deepEqual(rotDelta, { art: 'seit', tage: 359, rot: true })
assert.deepEqual(eintraegeVon(ab(m, 'naechstes')).find((e) => e.titel === 'Alpha').alter, { art: 'seit', tage: 2, rot: false })
assert.deepEqual(eintraegeVon(ab(m, 'spaeter'))[0].alter, { art: 'faellig', tage: -2, rot: false })
assert.equal(alterVon({ k: { tag: 30, monat: 12 }, kopf: '', icon: null }, Date.parse('2026-01-05T10:00:00Z')).tage, 6)
assert.equal(alterVon({ k: null, kopf: 'x 2026-12-30 y', icon: null }, JETZT), null)
assert.equal(alterVon({ k: null, kopf: 'kein Datum', icon: null }, JETZT), null)
assert.deepEqual(datenImText('a 2026-11-01 b 03.11.2026 c 05.11. d 1.2.3', JETZT).map((d) => [d.j, d.m, d.d]), [[2026, 11, 1], [2026, 11, 3], [2026, 11, 5]])

// Thema nur bei genau einem Treffer
assert.equal(themaVon('Kind Mod-Werkzeug'), 'Mod, Werkzeuge und Regeln')
assert.equal(themaVon('Detail-Panel Prüfung'), 'Sonstiges')
assert.equal(themaVon('Alpha'), 'Sonstiges')

// Ausgaben: gleiche Einträge in gleicher Reihenfolge, HTML sicher und ohne fremde Adressen
const k = kennzahlen(m, null, JETZT)
const md = markdownVon(m, k)
const html = htmlVon(m, k)
const hauptMd = md.slice(md.indexOf('## Jetzt für Daniel')).split('\n').filter((z) => /^- /.test(z)).map((z) => /\*\*(.+?)\*\*/.exec(z)[1])
const hauptHtml = [...html.slice(html.indexOf('id="a-jetzt"')).matchAll(/class="titel">([^<]*)</g)].map((x) => x[1])
const erwartet = m.abschnitte.flatMap(eintraegeVon).map((e) => e.titel)
assert.deepEqual(hauptMd, erwartet)
assert.deepEqual(hauptHtml, erwartet.map((t) => t.replace(/&/g, '&amp;')))
assert.equal(html.split('</script>').length, 2, 'genau ein schließendes script')
assert.ok(!html.includes('<b>fett</b>') && html.includes('&lt;b&gt;fett&lt;/b&gt;'))
assert.ok(html.includes('$&amp;'), 'Dollar-Muster bleibt Text')
assert.ok(!/fetch\(|<link|\ssrc=|xmlns/.test(html))
const erlaubt = new Set(['https://example.org/neu', 'https://github.com/o/r/pull/900002', 'https://github.com/o/r/pull/900004', 'file:///C:/x/y.md'])
for (const u of html.match(/(?:https?|file):\/\/[^"'\s<)]*/g) ?? []) assert.ok(erlaubt.has(u), `fremde Adresse: ${u}`)
assert.ok(html.includes('prefers-color-scheme: dark'))
assert.ok(/id="a-streichen"/.test(html) && !/id="a-streichen" open/.test(html), 'Streichkandidaten eingeklappt')
assert.ok(/id="a-neuLive"(?! open)/.test(html), 'Neu live eingeklappt')
assert.ok(md.includes('## Streichkandidaten (3)'))
assert.ok(md.includes('💻 lokal') && md.includes('🌙 nacht'))
assert.ok(!html.includes('javascript:') && !/href="(?!https:|file:)/.test(html))
assert.ok(markdownVon(baueModell('', JETZT, null), kennzahlen(baueModell('', JETZT, null), null, JETZT)).includes('## Als Nächstes (0)'))

// gh: Merges über Seiten bis hinter den Fensterbeginn, Seitengrenze, Berliner Tag, Töpfe
const VON = Date.parse('2026-11-18T23:00:00Z')
const zeile = (n, merged, updated, labels = [], autor = 'derNamenloseDaniel') => JSON.stringify({ number: n, mergedAt: merged, updatedAt: updated, labels, autor })
const seite = (start, merged) => Array.from({ length: 100 }, (_, i) => zeile(start + i, merged, merged)).join('\n')
const aufrufe = []
const seiten = (args) => {
  aufrufe.push(args[1])
  const nr = Number(/&page=(\d+)$/.exec(args[1])[1])
  if (nr === 1) return seite(1000, '2026-11-25T10:00:00Z')
  if (nr === 2) return seite(2000, '2026-11-20T10:00:00Z')
  return [zeile(3000, '2026-11-10T10:00:00Z', '2026-11-10T10:00:00Z')].join('\n')
}
const r1 = holeMerges((_b, a) => seiten(a), VON)
assert.equal(r1.liste.length, 200)
assert.equal(r1.vollstaendig, true)
assert.equal(aufrufe.length, 3)
assert.equal(holeMerges(() => seite(1, '2026-11-25T10:00:00Z'), VON).vollstaendig, false, 'Seitengrenze erreicht')
const tage = mergesJeTag([
  { mergedAt: '2026-11-24T23:30:00Z', labels: ['orchester'], autor: 'x' },
  { mergedAt: '2026-11-24T22:30:00Z', labels: [], autor: 'anime-kalender-daten[bot]' },
  { mergedAt: '2026-11-25T08:00:00Z', labels: [], autor: 'derNamenloseDaniel' },
  { mergedAt: '2026-11-10T08:00:00Z', labels: [], autor: 'derNamenloseDaniel' },
], JETZT)
assert.equal(tage.length, 7)
assert.deepEqual(tage[0], { tag: '2026-11-25', lokal: 1, nacht: 1, daten: 0 })
assert.deepEqual(tage[1], { tag: '2026-11-24', lokal: 0, nacht: 0, daten: 1 })

// gh: PR-Daten in Blöcken, Teilfehler, Kommentare nur für orchester, Zwischenspeicher
const graphqlAufrufe = []
const antwort = (query) => {
  graphqlAufrufe.push(query)
  const nummern = [...query.matchAll(/n(\d+): issueOrPullRequest/g)].map((x) => Number(x[1]))
  const mitKommentar = query.includes('comments(last')
  const repo = {}
  for (const n of nummern) {
    if (n === 900777) continue
    if (mitKommentar) repo[`n${n}`] = { __typename: 'PullRequest', comments: { nodes: [{ author: { login: 'derNamenloseDaniel' }, body: '## Nachtrag (Abnahme Dirigent) — Kopf abcdef123' }] } }
    else repo[`n${n}`] = { __typename: 'PullRequest', author: { login: 'derNamenloseDaniel' }, state: n % 2 ? 'MERGED' : 'OPEN', labels: { nodes: n === 900003 ? [{ name: 'orchester' }] : [] } }
  }
  return JSON.stringify({ data: { repository: repo } })
}
const cache = {}
const nums = [...Array.from({ length: 44 }, (_, i) => 900100 + i), 900003, 900777]
const fehlerMitDaten = (_b, a) => {
  const q = a.at(-1).replace('query=', '')
  const roh = antwort(q)
  if (q.includes('900777')) throw Object.assign(new Error('Teilfehler'), { stdout: roh })
  return roh
}
const daten1 = holePrDaten(fehlerMitDaten, nums, cache, JETZT)
assert.equal(graphqlAufrufe.filter((q) => !q.includes('comments(last')).length, 2, '46 Nummern = 2 Blöcke zu höchstens 40')
assert.equal(graphqlAufrufe.filter((q) => q.includes('comments(last')).length, 1)
assert.equal(daten1[900003].abnahmeDirigent, true)
assert.equal(daten1[900100].abnahmeDirigent, false)
assert.equal(daten1[900777].typ, 'unbekannt')
assert.equal(daten1[900101].gemergt, true)
const vorher = graphqlAufrufe.length
holePrDaten(fehlerMitDaten, nums, cache, JETZT + 60_000)
assert.equal(graphqlAufrufe.length - vorher, 0, 'zweiter Lauf binnen 10 min: alles aus dem Zwischenspeicher')
holePrDaten(fehlerMitDaten, nums, cache, JETZT + 700_000)
assert.equal(graphqlAufrufe.length - vorher, 1, 'später: nur die 22 offenen PRs (ein Block), abgeschlossene bleiben im Zwischenspeicher')
assert.throws(() => holePrDaten(() => { throw new Error('kein gh') }, [900001], {}, JETZT), /kein gh/)

// erzeuge: gh wirft überall, trotzdem beide Ausgaben, Warnung mit erster Ursache
const warnungen = []
const r = erzeuge(TEXT, JETZT, () => { throw Object.assign(new Error('x'), { stderr: 'HTTP 502\nzweite Zeile' }) }, {}, (w) => warnungen.push(w))
assert.deepEqual(warnungen, ['gh PR-Labels: HTTP 502', 'gh offene PRs: HTTP 502', 'gh Merges: HTTP 502'])
assert.ok(r.markdown.includes('GitHub nicht erreichbar') && r.html.includes('GitHub nicht erreichbar'))

// CLI als Datei-Lauf: schreibt neben die Eingabe; fehlende Datei = Exit 1
const ordner = mkdtempSync(join(tmpdir(), 'uebersicht-'))
try {
  writeFileSync(join(ordner, 'stand.md'), TEXT)
  assert.equal(main([join(ordner, 'stand.md'), '--ohne-gh', '--jetzt', '2026-11-25T12:00:00Z'], 0), 0)
  assert.ok(readFileSync(join(ordner, 'uebersicht.md'), 'utf8').includes('## Als Nächstes (8)'))
  assert.ok(readFileSync(join(ordner, 'uebersicht.html'), 'utf8').startsWith('<!doctype html>'))
  assert.ok(!existsSync(join(ordner, '.uebersicht-cache.json')), 'ohne gh kein Zwischenspeicher')
  assert.equal(main([join(ordner, 'fehlt.md'), '--ohne-gh'], 0), 1)
} finally {
  rmSync(ordner, { recursive: true, force: true })
}
console.log('uebersicht.test.mjs: ok')
