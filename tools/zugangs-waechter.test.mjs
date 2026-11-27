// Zusicherungen für tools/zugangs-waechter.mjs: Kontingent-Erkennung und Register gegen die Workflows.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ausloeser, claudeErholung, kontingentFunde, zahlBefunde, pruefeLauf, registerBefunde, spezMitFrist, vomWecker, wachePlanBefunde, wacheLauf, weckplanLuecken } from './zugangs-waechter.mjs'

const schritt = (name, conclusion, von, bis) => ({ name, conclusion, started_at: von, completed_at: bis })

// Echter Fall 02.10.2026 (Lauf 37035218875): Claude-Schritt scheitert nach 16 s.
assert.equal(kontingentFunde([schritt('Recherche', 'failure', '2026-10-02T16:38:18Z', '2026-10-02T16:38:34Z')]).length, 1)
assert.equal(kontingentFunde([schritt('Run anthropics/claude-code-action@v1', 'failure', '2026-10-02T16:38:18Z', '2026-10-02T16:38:25Z')]).length, 1)
// Ein langer Fehlschlag ist ein anderer Fehler, ein schneller Erfolg kein Befund, ein fremder Schritt auch nicht.
assert.equal(kontingentFunde([schritt('Recherche', 'failure', '2026-10-08T11:01:34Z', '2026-10-08T11:03:45Z')]).length, 0)
assert.equal(kontingentFunde([schritt('Recherche', 'success', '2026-10-08T11:01:34Z', '2026-10-08T11:01:36Z')]).length, 0)
assert.equal(kontingentFunde([schritt('npm ci', 'failure', '2026-10-08T11:01:34Z', '2026-10-08T11:01:36Z')]).length, 0)

// Register: unbekanntes Secret und falsche Workflow-Liste werden gemeldet.
const reg = { laeufe: {}, zugaenge: [{ id: 'A', ort: 'github-secret', wofuer: 'x', gueltig: {}, erneuerung: {}, folge: 'y', workflows: ['a.yml'] }] }
assert.deepEqual(registerBefunde(reg, { A: new Set(['a.yml']) }, ['a.yml']), [])
assert.equal(registerBefunde(reg, { A: new Set(['a.yml']), B: new Set(['a.yml']) }, ['a.yml']).length, 1)
assert.equal(registerBefunde(reg, { A: new Set(['a.yml', 'b.yml']) }, ['a.yml', 'b.yml']).length, 1)

// Wecker (PAT, Nutzer) zählt, Wecker-Wache (github-actions[bot]) und Zeitplan-Starts nicht. Gemessen 11.10.2026: Probe-Dispatch der Wache aus einem GITHUB_TOKEN-Lauf (Lauf 38131257307 startete wecker-wache.yml) erschien mit actor und triggering_actor github-actions[bot].
assert.equal(vomWecker({ event: 'workflow_dispatch', actor: { login: 'derNamenloseDaniel' } }), true)
assert.equal(vomWecker({ event: 'workflow_dispatch', actor: { login: 'github-actions[bot]' } }), false)
assert.equal(vomWecker({ event: 'schedule', actor: { login: 'derNamenloseDaniel' } }), false)

// Wache muss jeden Workflow des Weckplans kennen.
assert.deepEqual(wachePlanBefunde("{ workflow: 'a.yml' }, { workflow: 'b-c.yml' }", 'PLAN="a.yml:3 b-c.yml:30:ohne-abbruch"'), [])
assert.equal(wachePlanBefunde("{ workflow: 'a.yml' }, { workflow: 'neu.yml' }", 'PLAN="a.yml:3"').length, 1)

// Abruf-Workflows: im Weckplan oder auf der Ausnahmeliste. Anlass 13.10.2026: offizielle-news.yml fehlte im Plan und lief nie.
const abruf = 'name: x\n\non:\n  workflow_dispatch:\n    inputs:\n      a:\n\npermissions:\n  contents: read\n'
const zeitplan = 'on:\n  schedule:\n    - cron: "0 1 * * *"\n  workflow_dispatch:\n'
assert.deepEqual(ausloeser(abruf), ['workflow_dispatch'])
assert.deepEqual(ausloeser(zeitplan), ['schedule', 'workflow_dispatch'])
assert.deepEqual(ausloeser('on: [push, workflow_dispatch]\n'), ['push', 'workflow_dispatch'])
assert.deepEqual(weckplanLuecken("{ workflow: 'a.yml' }", { 'a.yml': abruf }, {}), [])
assert.equal(weckplanLuecken("{ workflow: 'a.yml' }", { 'a.yml': abruf, 'neu.yml': abruf }, {}).length, 1)
assert.deepEqual(weckplanLuecken("{ workflow: 'a.yml' }", { 'a.yml': abruf, 'neu.yml': abruf }, { 'neu.yml': 'Grund' }), [])
assert.deepEqual(weckplanLuecken('', { 'z.yml': zeitplan }, {}), [])
assert.equal(weckplanLuecken('', { 'a.yml': abruf }, { 'a.yml': 'Grund', 'weg.yml': 'Grund' }).length, 1)
assert.equal(weckplanLuecken("{ workflow: 'a.yml' }", { 'a.yml': abruf }, { 'a.yml': 'Grund' }).length, 1)
assert.equal(weckplanLuecken('', { 'a.yml': 'name: x\n' }, {}).length, 1)
// Fremdes Repo im Plan: der Workflow liegt nicht hier, die Wache muss ihn nicht nachholen, und er deckt keinen gleichnamigen Workflow hier.
const fremd = "{ workflow: 'f.yml', repo: 'o/r', abstandMin: 40 },\n{ workflow: 'h.yml', abstandMin: 40 }"
assert.equal(wachePlanBefunde(fremd, 'h.yml:5').length, 0)
assert.equal(wachePlanBefunde(fremd, 'f.yml:5').length, 1)
assert.equal(weckplanLuecken(fremd, { 'f.yml': abruf }, {}).length, 1)
// `repo: '` in einem Kommentar (auch in der Zeile davor) lässt keinen Hauptrepo-Eintrag fallen.
const kommentar = "// Nativ: repo: 'o/r'\n{ workflow: 'h.yml', abstandMin: 40 }, // repo: 'x'\n// repo: 'y'\n{ workflow: 'g.yml', abstandMin: 40 }"
assert.equal(wachePlanBefunde(kommentar, '').length, 2)
assert.equal(weckplanLuecken(kommentar, { 'h.yml': abruf, 'g.yml': abruf }, {}).length, 0)
// Kommentar innerhalb eines mehrzeiligen Eintrags desselben Hauptrepos.
const innen = "{ workflow: 'k.yml',\n  // repo: 'z'\n  abstandMin: 40 }"
assert.equal(wachePlanBefunde(innen, '').length, 1)
assert.equal(weckplanLuecken(innen, { 'k.yml': abruf }, {}).length, 0)
// Gegenprobe am echten Bestand: ohne offizielle-news.yml im Plan wird die Prüfung rot, mit ihm grün.
const wurzel = new URL('..', import.meta.url)
const planText = readFileSync(new URL('shared/weckplan.ts', wurzel), 'utf8')
const verz = new URL('.github/workflows/', wurzel)
const echt = Object.fromEntries(readdirSync(verz).filter((d) => d.endsWith('.yml')).map((d) => [d, readFileSync(new URL(d, verz), 'utf8')]))
assert.deepEqual(weckplanLuecken(planText, echt), [])
const ohneNews = weckplanLuecken(planText.replace("workflow: 'offizielle-news.yml'", "workflow: 'x'"), echt)
assert.equal(ohneNews.length, 1)
assert.match(ohneNews[0], /offizielle-news\.yml/)

// Fenster-Fall (Lauf 41468834098, 02.11.2026): 20 Läufe ohne Erfolg (10 skipped, 10 failure), der letzte Erfolg 10,7 h davor.
const JETZT = Date.parse('2999-12-31T12:00:00Z')
const vor = (h) => new Date(JETZT - h * 3600e3).toISOString()
const fenster = Array.from({ length: 20 }, (_, i) => ({ databaseId: 100 + i, status: 'completed', conclusion: i % 2 ? 'skipped' : 'failure', createdAt: vor(1 + i * 0.3), event: 'workflow_run' }))
const erfolgLauf = { databaseId: 99, status: 'completed', conclusion: 'success', createdAt: vor(10.7), event: 'workflow_run' }
const attrappe = (erfolge) => (...a) => {
  assert.equal(a[0], 'run')
  if (a.includes('--status')) return a[a.indexOf('--status') + 1] === 'success' && a[a.indexOf('--limit') + 1] === '1' ? erfolge : []
  return fenster
}
const imFenster = pruefeLauf('bestand-bauen.yml', { fristStunden: 24 }, attrappe([erfolgLauf]), JETZT)
assert.deepEqual(imFenster.map((z) => [z.rot, z.text]), [[false, 'bestand-bauen.yml: letzter Erfolg vor 11 h (Frist 24 h)']])
// Zu alt bleibt rot (Grenze: 24 h genau grün, 25 h rot), kein Erfolg überhaupt rot.
assert.equal(pruefeLauf('x.yml', { fristStunden: 24 }, attrappe([{ ...erfolgLauf, createdAt: vor(24) }]), JETZT)[0].rot, false)
assert.equal(pruefeLauf('x.yml', { fristStunden: 24 }, attrappe([{ ...erfolgLauf, createdAt: vor(25) }]), JETZT)[0].rot, true)
assert.match(pruefeLauf('x.yml', { fristStunden: 24 }, attrappe([]), JETZT)[0].text, /kein erfolgreicher Lauf/)
assert.equal(pruefeLauf('x.yml', { fristStunden: 24 }, attrappe([]), JETZT)[0].rot, true)
// Ohne Frist keine Zeile aus der Fristprüfung
assert.deepEqual(pruefeLauf('x.yml', { fristStunden: null }, attrappe([]), JETZT), [])

// Kontingent-Schnellabbruch (Lauf 45870267412, 26.11.2026 17:45Z): rot, bis irgendein Claude-Workflow danach gelang (gleiches Token).
const schnell = { databaseId: 7, status: 'completed', conclusion: 'failure', createdAt: vor(5), event: 'workflow_run' }
const claudeSchritt = { name: 'Run anthropics/claude-code-action@v1', conclusion: 'failure', started_at: vor(5), completed_at: new Date(Date.parse(vor(5)) + 14e3).toISOString() }
const claudeGh = () => (...a) => {
  if (a[0] === 'api') return { jobs: [{ steps: [claudeSchritt] }] }
  if (a.includes('--status')) return []
  return [schnell]
}
const erh = (h, workflow = 'claude-daten-merge.yml') => ({ createdAt: vor(h), workflow, lauf: 9 })
const kontingent = (erholt) => pruefeLauf('claude-reparatur.yml', { claude: true, fristStunden: null }, claudeGh(), JETZT, erholt)
assert.equal(kontingent(null).filter((z) => z.kontingent).length, 1, 'ohne spätere Erholung rot')
assert.equal(kontingent(erh(4)).filter((z) => z.kontingent).length, 0, 'anderer Claude-Workflow danach grün: Kontingent zurück')
assert.equal(kontingent(erh(6)).filter((z) => z.kontingent).length, 1, 'Erfolg vor dem Abbruch zählt nicht')
assert.equal(kontingent(erh(1, 'claude-reparatur.yml')).filter((z) => z.kontingent).length, 0, 'eigener späterer Claude-Erfolg')
// A2: die Deckung durch einen fremden Workflow bleibt als Zeile sichtbar (nicht rot), mit Lauf und Zeit der Erholung.
const gedeckt = kontingent(erh(4))
assert.equal(gedeckt.length, 1)
assert.equal(gedeckt[0].rot, false)
assert.match(gedeckt[0].text, /claude-reparatur\.yml: Claude-Schritt „Run anthropics\/claude-code-action@v1“ endete nach wenigen Sekunden \(Lauf 7, .*Z\) — Token läuft wieder: claude-daten-merge\.yml Lauf 9/)
assert.equal(kontingent(erh(1, 'claude-reparatur.yml')).length, 0, 'eigene Erholung braucht keine Deckungszeile')

// A1: Erholung zählt nur, wenn ein Claude-Schritt success meldete (Läufe 45986775382, 45987704866, 45970050457: grün, Schritte skipped).
const stepsJe = {
  11: [{ name: 'Artikel-Router', conclusion: 'skipped' }, { name: 'Artikel auswerten', conclusion: 'skipped' }],
  12: [{ name: 'Run anthropics/claude-code-action@v1', conclusion: 'success' }],
  13: [{ name: 'Recherche', conclusion: 'failure' }],
  14: [{ name: 'Recherche', conclusion: 'success' }],
}
const erfolgeJe = { 'a.yml': [{ databaseId: 11, createdAt: vor(1) }, { databaseId: 13, createdAt: vor(3) }], 'b.yml': [{ databaseId: 14, createdAt: vor(5) }, { databaseId: 12, createdAt: vor(8) }] }
const erholGh = (...a) => (a[0] === 'api' ? { jobs: [{ steps: stepsJe[a[1].match(/runs\/(\d+)\/jobs/)[1]] ?? [] }] } : erfolgeJe[a[a.indexOf('--workflow') + 1]] ?? [])
assert.deepEqual(claudeErholung({ 'a.yml': { claude: true }, 'b.yml': { claude: true }, 'c.yml': {} }, erholGh), { createdAt: vor(5), workflow: 'b.yml', lauf: 14 }, 'jüngster Lauf mit Claude-Erfolg; grüner Lauf ohne Claude-Schritt und Claude-Fehlschlag zählen nicht')
assert.equal(claudeErholung({ 'a.yml': { claude: true } }, erholGh), null, 'nur Läufe ohne gelungenen Claude-Schritt: keine Erholung')
assert.equal(claudeErholung({ 'c.yml': {} }, erholGh), null)

// A3: wacheLauf (die Schleife aus main) mit gh-Attrappe: Abbruch von a.yml, danach Claude-Erfolg in b.yml → kein roter Befund; ohne echten Claude-Schritt bleibt er rot.
const abbruch = { databaseId: 20, status: 'completed', conclusion: 'failure', createdAt: vor(6), event: 'workflow_run' }
const laufGh = (erfolge, jobsJe) => (...a) => {
  if (a[0] === 'api') {
    if (a[1].includes('refresh-hourly.yml')) return { workflow_runs: [{ event: 'workflow_dispatch', actor: { login: 'daniel' }, created_at: vor(1) }] }
    return { jobs: [{ steps: jobsJe[a[1].match(/runs\/(\d+)\/jobs/)[1]] ?? [] }] }
  }
  const w = a[a.indexOf('--workflow') + 1]
  return a.includes('--status') ? (erfolge[w] ?? []).slice(0, Number(a[a.indexOf('--limit') + 1])) : w === 'a.yml' ? [abbruch] : []
}
const schnellSchritte = [{ name: 'Recherche', conclusion: 'failure', started_at: vor(6), completed_at: new Date(Date.parse(vor(6)) + 9e3).toISOString() }]
const lauf = (erfolge, jobsJe) => {
  const s = sammle()
  const code = wacheLauf({ reg: { laeufe: { 'a.yml': { claude: true }, 'b.yml': { claude: true } }, zugaenge: [] }, ghAufruf: laufGh(erfolge, jobsJe), jetzt: JETZT, ausgabe: s.ausgabe })
  return { code, zeilen: s.zeilen }
}
function sammle() {
  const zeilen = []
  return { zeilen, ausgabe: (z) => zeilen.push(z) }
}
const echtErholt = lauf({ 'b.yml': [{ databaseId: 31, createdAt: vor(2) }] }, { 20: schnellSchritte, 31: [{ name: 'Recherche', conclusion: 'success' }] })
assert.equal(echtErholt.code, 0, echtErholt.zeilen.join('\n'))
assert.ok(echtErholt.zeilen.some((z) => z.startsWith('✓ a.yml: Claude-Schritt „Recherche“') && z.includes('Token läuft wieder: b.yml Lauf 31')))
const nurGruen = lauf({ 'b.yml': [{ databaseId: 32, createdAt: vor(2) }] }, { 20: schnellSchritte, 32: [{ name: 'Artikel auswerten', conclusion: 'skipped' }] })
assert.equal(nurGruen.code, 1, 'grüner Lauf ohne Claude-Schritt löscht den Befund nicht')
assert.ok(nurGruen.zeilen.some((z) => z.startsWith('✗ a.yml: Claude-Schritt „Recherche“')))
assert.ok(nurGruen.zeilen.some((z) => z.startsWith('::warning title=Claude-Kontingent leer')))

// Eine Frist-Quelle: die Register-Datei trägt keine Fristen mehr, die Wache liest die Tabelle.
assert.equal(readFileSync(new URL('data/zugangs-register.json', wurzel), 'utf8').includes('fristStunden'), false)
assert.deepEqual(spezMitFrist('a.yml', { name: 'A', claude: true }, { 'a.yml': 7 }), { name: 'A', claude: true, fristStunden: 7 })
assert.equal(spezMitFrist('b.yml', { name: 'B' }, { 'a.yml': 7 }).fristStunden, null)

// Zahl „N Zugänge“ in betrieb.md gegen die Registereinträge (Anlass: „18“ stand wochenlang bei 21).
const abschnitt = (z) => `## Register der Zugänge und Wächter (08.10.2026)\n\nAlles: ${z} Zugänge (Namen) mit Zweck.\n`
assert.deepEqual(zahlBefunde(abschnitt('20'), 20), [])
assert.equal(zahlBefunde(abschnitt('18'), 21).length, 1)
assert.equal(zahlBefunde(abschnitt('22'), 21).length, 1)
assert.match(zahlBefunde(abschnitt('18'), 21)[0], /18.*21/)
assert.equal(zahlBefunde('## Register der Zugänge und Wächter (08.10.2026)\n\nAlles ohne Zahl.\n', 20).length, 1)
assert.equal(zahlBefunde('## Anderes\n\nSieben Zugänge\n', 20).length, 1)
// Eine Zahl aus einem anderen Abschnitt zählt nicht.
assert.equal(zahlBefunde(`${abschnitt('20')}\n## Weiter\n\n5 Zugänge\n`, 20).length, 0)
assert.equal(zahlBefunde('## Davor\n\n20 Zugänge\n\n## Register der Zugänge und Wächter (x)\n\nohne\n', 20).length, 1)
// Echte betrieb.md gegen das echte Register.
assert.deepEqual(zahlBefunde(readFileSync(new URL('docs/wissen/betrieb.md', wurzel), 'utf8'), JSON.parse(readFileSync(new URL('data/zugangs-register.json', wurzel), 'utf8')).zugaenge.length), [])

// main() mit --register-pruefen als eigener Prozess an einer Wegwerf-Kopie: die Zahlprüfung muss im Lauf verdrahtet sein (WURZEL hängt an import.meta.url).
function registerLauf(zahl) {
  const kopie = mkdtempSync(join(tmpdir(), 'zugangs-waechter-'))
  try {
    const quelle = fileURLToPath(wurzel)
    for (const teil of ['tools/zugangs-waechter.mjs', 'tools/wache-fristen.mjs', 'tools/zugangs-secret-wache.mjs', 'data/zugangs-register.json', 'shared/weckplan.ts', '.github/workflows']) cpSync(join(quelle, teil), join(kopie, teil), { recursive: true })
    const betrieb = readFileSync(join(quelle, 'docs/wissen/betrieb.md'), 'utf8').split(/^## /m)
    const i = betrieb.findIndex((a) => a.startsWith('Register der Zugänge'))
    betrieb[i] = betrieb[i].replace(/\d+ Zugänge/, `${zahl} Zugänge`)
    mkdirSync(join(kopie, 'docs/wissen'), { recursive: true })
    writeFileSync(join(kopie, 'docs/wissen/betrieb.md'), betrieb.join('## '))
    return spawnSync(process.execPath, [join(kopie, 'tools/zugangs-waechter.mjs'), '--register-pruefen'], { encoding: 'utf8', timeout: 60000, windowsHide: true })
  } finally {
    rmSync(kopie, { recursive: true, force: true })
  }
}
const echteZahl = JSON.parse(readFileSync(new URL('data/zugangs-register.json', wurzel), 'utf8')).zugaenge.length
const richtig = registerLauf(echteZahl)
assert.equal(richtig.status, 0, richtig.stderr)
const falsch = registerLauf(echteZahl - 1)
assert.equal(falsch.status, 1)
assert.match(falsch.stderr, new RegExp(`nennt ${echteZahl - 1} Zugänge`))

console.log('zugangs-waechter: Zusicherungen ok')
