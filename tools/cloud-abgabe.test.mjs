/**
 * Test zu tools/cloud-abgabe.mjs (Logik mit Attrappe-Welt), tools/cloud-abgabe-welt.mjs (gh-Aufrufe mit Attrappe-gh) und
 * .github/workflows/cloud-abgabe.yml (Auslöser, Rechte, ein Schritt mit Zweigname nur über env).
 * Läuft mit `node tools/cloud-abgabe.test.mjs`, Exit ≠ 0 bei Fehlern.
 */
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'
import { ENDZEILE, abgabe, codeZweigKandidaten, hatNachtrag, lauf, liesPrText, nachtragKopf } from './cloud-abgabe.mjs'
import { echteWelt } from './cloud-abgabe-welt.mjs'

let fehler = 0
let anzahl = 0
function pruefe(name, ok, info = '') {
  anzahl++
  if (!ok) {
    fehler++
    console.error(`✗ ${name} ${info}`)
  }
}
const gleich = (name, ist, soll) => pruefe(name, JSON.stringify(ist) === JSON.stringify(soll), `ist ${JSON.stringify(ist)}, soll ${JSON.stringify(soll)}`)
const wurzel = join(dirname(fileURLToPath(import.meta.url)), '..')

// --- Attrappe-Welt ---------------------------------------------------------------------------------------------------
const SHA_A = 'aaaaaaa1111111111111111111111111111111111'
const SHA_B = 'bbbbbbb2222222222222222222222222222222222'
const PR_MD = '<!-- titel: fix(x): Beispiel -->\n## Ursache\nText mit $(rm -rf /) und `cmd` und "Anführungszeichen"\n'
const BERICHT = 'Bericht: fertig.\nRückblick: gut.\n'

/** Welt mit Zweigen (Name → sha), Dateien je prtext-Zweig, offenen PRs und Kommentaren; jede Mutation wird in `log` festgehalten. */
function welt({ zweige = {}, dateien = {}, prs = {}, kommentare = {}, labels = {}, stufe = 1, anlegenSchlaegtFehl = false } = {}) {
  const log = []
  const w = {
    log,
    zeile: (t) => log.push(['zeile', t]),
    datei: (zweig, name) => dateien[zweig]?.[name] ?? null,
    zweigSha: (z) => zweige[z] ?? null,
    offenerPr: (z) => (prs[z] === undefined ? null : { nummer: prs[z] }),
    prAnlegen: (a) => {
      log.push(['prAnlegen', a])
      if (anlegenSchlaegtFehl) return null
      prs[a.zweig] = 77
      return { nummer: 77 }
    },
    kommentare: (nr) => kommentare[nr] ?? [],
    kommentarSchreiben: (nr, text) => {
      log.push(['kommentar', nr, text])
      kommentare[nr] = [...(kommentare[nr] ?? []), text]
    },
    stufe: () => stufe,
    labels: (nr) => [...(labels[nr] ?? [])],
    labelAnlegen: (n) => log.push(['labelAnlegen', n]),
    labelSetzen: (nr, n) => {
      log.push(['labelSetzen', nr, n])
      labels[nr] = [...(labels[nr] ?? []), n]
    },
    labelEntfernen: (nr, n) => {
      log.push(['labelEntfernen', nr, n])
      labels[nr] = (labels[nr] ?? []).filter((l) => l !== n)
    },
  }
  // Die Beschreibung eines PR ändern gibt es nicht: jeder solche Aufruf wäre ein Fehler.
  return new Proxy(w, { get: (z, n) => (n in z || typeof n === 'symbol' || n === 'then' ? z[n] : () => { throw new Error(`unerlaubter Aufruf ${String(n)}`) }) })
}
const aufrufe = (w, art) => w.log.filter((e) => e[0] === art)
const standard = (extra = {}) => welt({ zweige: { 'fix/foo': SHA_A }, dateien: { 'prtext/foo': { 'pr.md': PR_MD, 'bericht.md': BERICHT } }, ...extra })

// --- reine Funktionen --------------------------------------------------------------------------------------------------
gleich('Titel und Zweigzeile', liesPrText('<!-- titel: A: b -->\n<!-- zweig: feat/x -->\nText'), { titel: 'A: b', zweig: 'feat/x', text: '<!-- titel: A: b -->\n<!-- zweig: feat/x -->\nText' })
gleich('ohne Titel', liesPrText('Text').titel, null)
gleich('Kandidaten ohne Suffix', codeZweigKandidaten('foo'), ['fix/foo'])
gleich('Kandidaten -r1', codeZweigKandidaten('foo-r1'), ['fix/foo-r1', 'fix/foo'])
gleich('Kandidaten -r1b', codeZweigKandidaten('foo-r1b'), ['fix/foo-r1b', 'fix/foo'])
gleich('Kandidaten -r12 mitten im Namen bleibt', codeZweigKandidaten('foo-r1-bar'), ['fix/foo-r1-bar'])
pruefe('Nachtragskopf mit 7 Zeichen', nachtragKopf(SHA_A) === '## Nachtrag (Cloud-Bericht, Kopf aaaaaaa)')
pruefe('hatNachtrag: gleicher Kopf', hatNachtrag(['x', `${nachtragKopf(SHA_A)}\n\nBericht`], SHA_A))
pruefe('hatNachtrag: anderer Kopf', !hatNachtrag([`${nachtragKopf(SHA_B)}\n\nBericht`], SHA_A))
pruefe('hatNachtrag: Kopf nur mitten im Kommentar zählt nicht', !hatNachtrag([`Hallo\n${nachtragKopf(SHA_A)}`], SHA_A))

// --- neuer PR --------------------------------------------------------------------------------------------------------
{
  const w = standard()
  const code = lauf(['prtext/foo'], w)
  gleich('neuer PR: Exit 0', code, 0)
  const [[, a]] = aufrufe(w, 'prAnlegen')
  gleich('neuer PR: Titel und Zweig', [a.titel, a.zweig], ['fix(x): Beispiel', 'fix/foo'])
  pruefe('neuer PR: Text = pr.md bytegleich samt $(…) und Backticks, Endzeile angehängt', a.text === `${PR_MD.replace(/\s+$/, '')}\n\n${ENDZEILE}\n`, JSON.stringify(a.text))
  const [[, nr, text]] = aufrufe(w, 'kommentar')
  pruefe('neuer PR: Bericht als Nachtrag an PR 77', nr === 77 && text === `## Nachtrag (Cloud-Bericht, Kopf aaaaaaa)\n\n${BERICHT.trimEnd()}\n`, text)
  gleich('neuer PR: Label stufe-1 angelegt und gesetzt', [aufrufe(w, 'labelAnlegen'), aufrufe(w, 'labelSetzen')], [[['labelAnlegen', 'stufe-1']], [['labelSetzen', 77, 'stufe-1']]])
}
{
  const w = standard({ dateien: { 'prtext/foo': { 'pr.md': `${PR_MD}\n${ENDZEILE}\n`, 'bericht.md': BERICHT } } })
  lauf(['prtext/foo'], w)
  pruefe('Endzeile schon da: nicht doppelt', (aufrufe(w, 'prAnlegen')[0][1].text.match(/Generated with/g) ?? []).length === 1)
}
{
  const w = standard({ dateien: { 'prtext/foo': { 'pr.md': PR_MD } } })
  gleich('ohne bericht.md: Exit 0, kein Kommentar', [lauf(['prtext/foo'], w), aufrufe(w, 'kommentar').length], [0, 0])
}

// --- offener PR: Beschreibung nie ändern, nur Nachtrag -------------------------------------------------------------
{
  const w = standard({ prs: { 'fix/foo': 50 }, labels: { 50: ['stufe-2', 'x'] }, stufe: 0 })
  gleich('offener PR: Exit 0', lauf(['prtext/foo'], w), 0)
  gleich('offener PR: kein PR angelegt', aufrufe(w, 'prAnlegen').length, 0)
  pruefe('offener PR: Nachtrag an #50', aufrufe(w, 'kommentar').length === 1 && aufrufe(w, 'kommentar')[0][1] === 50)
  gleich('offener PR: veraltetes Label ersetzt, fremdes bleibt', [aufrufe(w, 'labelEntfernen'), aufrufe(w, 'labelSetzen')], [[['labelEntfernen', 50, 'stufe-2']], [['labelSetzen', 50, 'stufe-0']]])
}
{
  // offener PR braucht keinen Titel in pr.md
  const w = standard({ prs: { 'fix/foo': 50 }, dateien: { 'prtext/foo': { 'pr.md': 'nur Text', 'bericht.md': BERICHT } } })
  gleich('offener PR ohne Titelzeile: Exit 0', lauf(['prtext/foo'], w), 0)
}
{
  const w = standard({ prs: { 'fix/foo': 50 }, labels: { 50: ['stufe-1'] }, stufe: 1 })
  lauf(['prtext/foo'], w)
  gleich('richtiges Label schon da: nichts angelegt, gesetzt, entfernt', [aufrufe(w, 'labelAnlegen').length, aufrufe(w, 'labelSetzen').length, aufrufe(w, 'labelEntfernen').length], [0, 0, 0])
}

// --- Suffix -r1 ----------------------------------------------------------------------------------------------------------
{
  const w = welt({ zweige: { 'fix/foo': SHA_A }, dateien: { 'prtext/foo-r1': { 'pr.md': PR_MD, 'bericht.md': BERICHT } }, prs: { 'fix/foo': 50 } })
  gleich('Suffix -r1 findet fix/foo', lauf(['prtext/foo-r1'], w), 0)
  pruefe('Suffix -r1: Nachtrag an den PR des Rumpf-Zweigs', aufrufe(w, 'kommentar')[0]?.[1] === 50)
}
{
  const w = welt({ zweige: { 'fix/foo': SHA_A }, dateien: { 'prtext/foo-r1b': { 'pr.md': PR_MD, 'bericht.md': BERICHT } } })
  lauf(['prtext/foo-r1b'], w)
  gleich('Suffix -r1b: PR für fix/foo', aufrufe(w, 'prAnlegen')[0]?.[1].zweig, 'fix/foo')
}
{
  const w = welt({ zweige: { 'fix/foo-r1': SHA_B }, dateien: { 'prtext/foo-r1': { 'pr.md': PR_MD, 'bericht.md': BERICHT } } })
  lauf(['prtext/foo-r1'], w)
  gleich('vorhandener Zweig mit vollem Namen gilt', aufrufe(w, 'prAnlegen')[0]?.[1].zweig, 'fix/foo-r1')
}

// --- Zweigzeile ------------------------------------------------------------------------------------------------------
{
  const w = welt({ zweige: { 'feat/x': SHA_A, 'fix/foo': SHA_B }, dateien: { 'prtext/foo': { 'pr.md': `<!-- zweig: feat/x -->\n${PR_MD}`, 'bericht.md': BERICHT } } })
  lauf(['prtext/foo'], w)
  gleich('Zeile zweig: gilt vor fix/<auftrag> (auch bei zwei vorhandenen Zweigen)', aufrufe(w, 'prAnlegen')[0]?.[1].zweig, 'feat/x')
  pruefe('Kopf-sha stammt vom Zweig der Zeile', aufrufe(w, 'kommentar')[0]?.[2].startsWith('## Nachtrag (Cloud-Bericht, Kopf aaaaaaa)'))
}

// --- Exit 2: nie raten ----------------------------------------------------------------------------------------------------
function exit2(name, w, args, muster, geschrieben = []) {
  const code = lauf(args, w)
  const meldung = aufrufe(w, 'zeile').map((e) => e[1]).join('\n')
  pruefe(`${name}: Exit 2`, code === 2, `Exit ${code}`)
  pruefe(`${name}: Meldung ${muster}`, muster.test(meldung), meldung)
  const schreibend = w.log.filter((e) => ['prAnlegen', 'kommentar', 'labelSetzen', 'labelEntfernen'].includes(e[0])).map((e) => e[0])
  gleich(`${name}: geschrieben`, schreibend, geschrieben)
}
exit2('Code-Zweig fehlt', welt({ dateien: { 'prtext/foo': { 'pr.md': PR_MD, 'bericht.md': BERICHT } } }), ['prtext/foo'], /kein Code-Zweig gefunden \(gesucht: fix\/foo\)/)
exit2('Code-Zweig mehrdeutig', welt({ zweige: { 'fix/foo': SHA_A, 'fix/foo-r1': SHA_B }, dateien: { 'prtext/foo-r1': { 'pr.md': PR_MD, 'bericht.md': BERICHT } } }), ['prtext/foo-r1'], /mehrdeutig \(fix\/foo-r1, fix\/foo\)/)
exit2('Zeile zweig: ohne Zweig', welt({ zweige: { 'fix/foo': SHA_A }, dateien: { 'prtext/foo': { 'pr.md': `<!-- zweig: feat/weg -->\n${PR_MD}`, 'bericht.md': BERICHT } } }), ['prtext/foo'], /feat\/weg.*existiert nicht/)
for (const z of ['main', 'prtext/anderer', 'daten/x', 'a..b', 'x y', 'x;rm']) {
  exit2(`Zeile zweig: ${z} abgewiesen`, welt({ zweige: { [z]: SHA_A, 'fix/foo': SHA_B }, dateien: { 'prtext/foo': { 'pr.md': `<!-- zweig: ${z} -->\n${PR_MD}`, 'bericht.md': BERICHT } } }), ['prtext/foo'], /unzulässigen Zweig/)
}
exit2('pr.md fehlt', welt({ zweige: { 'fix/foo': SHA_A } }), ['prtext/foo'], /pr\.md fehlt/)
exit2('kein Titel und kein PR', standard({ dateien: { 'prtext/foo': { 'pr.md': 'nur Text', 'bericht.md': BERICHT } } }), ['prtext/foo'], /keine erste Zeile <!-- titel/)
exit2('kein prtext-Zweig', welt(), ['fix/foo'], /kein prtext-Zweig/)
exit2('leerer Auftrag', welt(), ['prtext/'], /kein prtext-Zweig/)
exit2('kein Argument', welt(), [], /Aufruf/)
exit2('Abruffehler der Welt', new Proxy(standard(), { get: (z, n) => (n === 'zweigSha' ? () => { throw new Error('HTTP 500') } : z[n]) }), ['prtext/foo'], /HTTP 500/)

// --- doppelter Push ---------------------------------------------------------------------------------------------------
{
  const w = standard()
  lauf(['prtext/foo'], w)
  const nachPr = w.log.length
  gleich('zweiter Lauf: Exit 0', lauf(['prtext/foo'], w), 0)
  gleich('zweiter Lauf: kein weiterer PR, kein Kommentar', [aufrufe(w, 'prAnlegen').length, aufrufe(w, 'kommentar').length], [1, 1])
  pruefe('zweiter Lauf meldet „Nachtrag lag schon vor“', aufrufe(w, 'zeile').at(-1)[1].includes('Nachtrag lag schon vor'), String(nachPr))
}
{
  // drei Kommentare, der passende Kopf in der Mitte: nichts posten; nur ein fremder Kopf: posten
  const mitte = standard({ prs: { 'fix/foo': 50 }, kommentare: { 50: [`${nachtragKopf(SHA_B)}\nalt`, `${nachtragKopf(SHA_A)}\nbericht`, 'Hallo'] } })
  lauf(['prtext/foo'], mitte)
  gleich('Kopf in der Mitte der Kommentare: kein neuer', aufrufe(mitte, 'kommentar').length, 0)
  const fremd = standard({ prs: { 'fix/foo': 50 }, kommentare: { 50: [`${nachtragKopf(SHA_B)}\nalt`, 'Hallo', 'noch einer'] } })
  lauf(['prtext/foo'], fremd)
  gleich('nur ein fremder Kopf vorhanden: neuer Nachtrag', aufrufe(fremd, 'kommentar').length, 1)
}
{
  // neuer Kopf nach einer Nachbesserung am Code-Zweig: wieder ein Nachtrag
  const w = standard({ prs: { 'fix/foo': 50 }, kommentare: { 50: [`${nachtragKopf(SHA_A)}\nalt`] } })
  w.zweigSha = (z) => (z === 'fix/foo' ? SHA_B : null)
  lauf(['prtext/foo'], w)
  pruefe('neuer Kopf: neuer Nachtrag mit neuem sha', aufrufe(w, 'kommentar')[0]?.[2].startsWith('## Nachtrag (Cloud-Bericht, Kopf bbbbbbb)'))
}
{
  // zwei Abgaben gleichzeitig: Anlegen meldet „existiert“ (422), danach Nachtragsweg am dann offenen PR
  const prs = {}
  const w = standard({ prs, anlegenSchlaegtFehl: true })
  let lesen = 0
  const offen = w.offenerPr
  w.offenerPr = (z) => (++lesen === 1 ? offen(z) : { nummer: 61 })
  gleich('422 beim Anlegen: Exit 0', lauf(['prtext/foo'], w), 0)
  pruefe('422: Nachtrag am PR 61 statt zweitem PR', aufrufe(w, 'kommentar')[0]?.[1] === 61)
  const w2 = standard({ anlegenSchlaegtFehl: true })
  exit2('422 und kein PR auffindbar', w2, ['prtext/foo'], /nicht anlegbar/, ['prAnlegen'])
}
{
  const w = standard({ stufe: 7 })
  w.stufe = () => 7
  exit2('unbekannte Stufe', w, ['prtext/foo'], /Prüfstufe „7“ unbekannt/, ['prAnlegen', 'kommentar'])
}

// --- gh-Anschluss (Attrappe-gh) --------------------------------------------------------------------------------------
function ghAttrappe(antworten) {
  const aufrufeGh = []
  const gh = (args, eingabe) => {
    aufrufeGh.push({ args, eingabe })
    const a = antworten.find((x) => x.passt(args))
    if (!a) throw new Error(`unerwarteter gh-Aufruf ${args.join(' ')}`)
    if (a.fehler) throw Object.assign(new Error(a.fehler), { stderr: a.fehler })
    return a.antwort ?? ''
  }
  return { gh, aufrufeGh }
}
const R = 'derNamenloseDaniel/anime-kalender-de'
const mitPfad = (teil) => (args) => args.some((x) => String(x).includes(teil))
{
  const { gh } = ghAttrappe([
    { passt: mitPfad('contents/pr.md?ref=prtext%2Ffoo'), antwort: PR_MD },
    { passt: mitPfad('contents/bericht.md'), fehler: 'gh: Not Found (HTTP 404)' },
    { passt: mitPfad('contents/kaputt.md'), fehler: 'gh: Server Error (HTTP 500)' },
  ])
  const w = echteWelt({ gh, repo: R })
  pruefe('datei: Inhalt', w.datei('prtext/foo', 'pr.md') === PR_MD)
  pruefe('datei: 404 → null', w.datei('prtext/foo', 'bericht.md') === null)
  let wirft = false
  try {
    w.datei('prtext/foo', 'kaputt.md')
  } catch {
    wirft = true
  }
  pruefe('datei: HTTP 500 wirft (nie still „fehlt“)', wirft)
}
{
  const { gh, aufrufeGh } = ghAttrappe([
    { passt: mitPfad('git/ref/heads/fix/foo'), antwort: `${SHA_A}\n` },
    { passt: mitPfad('git/ref/heads/fix/weg'), fehler: 'gh: Not Found (HTTP 404)' },
    { passt: mitPfad('git/ref/heads/fix/boese'), fehler: 'gh: Forbidden (HTTP 403)' },
  ])
  const w = echteWelt({ gh, repo: R })
  pruefe('zweigSha: sha', w.zweigSha('fix/foo') === SHA_A)
  pruefe('zweigSha: Pfad mit Schrägstrich, exakter Ref', aufrufeGh[0].args[1] === `repos/${R}/git/ref/heads/fix/foo`, aufrufeGh[0].args[1])
  pruefe('zweigSha: 404 → null', w.zweigSha('fix/weg') === null)
  let wirft = false
  try {
    w.zweigSha('fix/boese')
  } catch {
    wirft = true
  }
  pruefe('zweigSha: 403 wirft', wirft)
}
{
  const treffer = [
    { number: 1, head: { ref: 'fix/foo-anders', repo: { full_name: R } } },
    { number: 2, head: { ref: 'fix/foo', repo: { full_name: 'fremder/fork' } } },
    { number: 3, head: { ref: 'fix/foo', repo: { full_name: R } } },
  ]
  const { gh, aufrufeGh } = ghAttrappe([{ passt: mitPfad('pulls?state=open'), antwort: JSON.stringify(treffer) }])
  const w = echteWelt({ gh, repo: R })
  pruefe('offenerPr: exakter Zweig im eigenen Repo (Mitte), nicht Fork, nicht Namensanfang', w.offenerPr('fix/foo')?.nummer === 3)
  pruefe('offenerPr: head=Besitzer:Zweig kodiert', aufrufeGh[0].args[1].includes('head=derNamenloseDaniel%3Afix%2Ffoo'), aufrufeGh[0].args[1])
}
{
  const { gh, aufrufeGh } = ghAttrappe([
    { passt: (a) => a.includes('POST') && mitPfad('/pulls')(a), antwort: JSON.stringify({ number: 91 }) },
  ])
  const w = echteWelt({ gh, repo: R })
  const r = w.prAnlegen({ titel: 'T "x" $(y)', text: PR_MD, zweig: 'fix/foo' })
  pruefe('prAnlegen: Nummer', r.nummer === 91)
  const nutz = JSON.parse(aufrufeGh[0].eingabe)
  gleich('prAnlegen: Nutzlast über stdin, Text bytegleich, Basis main', [nutz.title, nutz.body === PR_MD, nutz.head, nutz.base], ['T "x" $(y)', true, 'fix/foo', 'main'])
  pruefe('prAnlegen: kein Text im Argument', !aufrufeGh[0].args.some((x) => String(x).includes('rm -rf')))
}
{
  let n = 0
  const gh422 = () => {
    n++
    throw Object.assign(new Error('gh: Validation Failed (HTTP 422)'), { stderr: 'A pull request already exists for x:fix/foo.' })
  }
  pruefe('prAnlegen: 422 „existiert“ → null, ein Versuch', echteWelt({ gh: gh422, repo: R }).prAnlegen({ titel: 't', text: 'x', zweig: 'fix/foo' }) === null && n === 1)
  let wirft = false
  try {
    echteWelt({ gh: () => { throw Object.assign(new Error('HTTP 422'), { stderr: 'No commits between main and fix/foo' }) }, repo: R }).prAnlegen({ titel: 't', text: 'x', zweig: 'fix/foo' })
  } catch {
    wirft = true
  }
  pruefe('prAnlegen: anderer 422 (kein Unterschied zu main) wirft', wirft)
  n = 0
  try {
    echteWelt({ gh: () => { n++; throw new Error('HTTP 502') }, repo: R }).kommentarSchreiben(5, 'x')
  } catch {
    /* erwartet */
  }
  pruefe('Kommentar schreiben: nie wiederholt', n === 1)
}
{
  const zeilen = [JSON.stringify('erste\nzeile'), JSON.stringify('zweiter'), '']
  const { gh } = ghAttrappe([{ passt: mitPfad('issues/5/comments'), antwort: zeilen.join('\n') }])
  gleich('kommentare: mehrzeilige Bodies als @json', echteWelt({ gh, repo: R }).kommentare(5), ['erste\nzeile', 'zweiter'])
}
{
  const { gh, aufrufeGh } = ghAttrappe([
    { passt: mitPfad('labels/stufe-1'), antwort: '{}' },
    { passt: mitPfad('labels/stufe-0'), fehler: 'gh: Not Found (HTTP 404)' },
    { passt: (a) => a.includes('POST') && a[3] === `repos/${R}/labels`, antwort: '{}' },
    { passt: (a) => a.includes('DELETE'), fehler: 'gh: Not Found (HTTP 404)' },
  ])
  const w = echteWelt({ gh, repo: R })
  w.labelAnlegen('stufe-1')
  gleich('labelAnlegen: vorhanden → kein POST', aufrufeGh.filter((a) => a.args.includes('POST')).length, 0)
  w.labelAnlegen('stufe-0')
  const post = aufrufeGh.find((a) => a.args.includes('POST'))
  pruefe('labelAnlegen: fehlt → POST mit Name', JSON.parse(post.eingabe).name === 'stufe-0')
  w.labelEntfernen(5, 'stufe-2')
  pruefe('labelEntfernen: 404 ist kein Fehler', true)
}
{
  const { gh } = ghAttrappe([])
  const w = echteWelt({ gh, repo: R, stufeAus: (args) => (args[1] === 'tools/pr-stufe.mjs' && args[2] === '12' ? '{"stufe":0}' : 'kaputt') })
  pruefe('stufe: ruft pr-stufe mit der PR-Nummer, liest JSON', w.stufe(12) === 0)
  pruefe('stufe: unlesbare Ausgabe gilt als 2 (fail closed)', w.stufe(13) === 2)
}
{
  const zeilen = []
  let wirft = false
  try {
    echteWelt({ repo: 'kein repo', zeile: (t) => zeilen.push(t) })
  } catch {
    wirft = true
  }
  pruefe('ungültiges Repo wirft', wirft)
}

// --- Prozess: Exit-Code und Meldung -----------------------------------------------------------------------------------
for (const [args, muster] of [[[], /Aufruf/], [['fix/foo'], /kein prtext-Zweig/]]) {
  const p = spawnSync(process.execPath, [join(wurzel, 'tools/cloud-abgabe.mjs'), ...args], { encoding: 'utf8', env: { ...process.env, GITHUB_REPOSITORY: 'a/b', GH_TOKEN: '' }, timeout: 30000, windowsHide: true })
  pruefe(`Prozess ${JSON.stringify(args)}: Exit 2`, p.status === 2, `Exit ${p.status} ${p.stderr}`)
  pruefe(`Prozess ${JSON.stringify(args)}: Meldung`, muster.test(p.stdout), p.stdout)
}
{
  const p = spawnSync(process.execPath, [join(wurzel, 'tools/cloud-abgabe.mjs'), 'prtext/x'], { encoding: 'utf8', env: { ...process.env, GITHUB_REPOSITORY: 'kein repo' }, timeout: 30000, windowsHide: true })
  pruefe('Prozess: ungültiges Repo → Exit 2 mit Meldung', p.status === 2 && /FEHLER: GITHUB_REPOSITORY ungültig/.test(p.stdout), `Exit ${p.status} ${p.stdout}`)
}

// --- Workflow ---------------------------------------------------------------------------------------------------------
{
  const text = readFileSync(join(wurzel, '.github/workflows/cloud-abgabe.yml'), 'utf8')
  const wf = parse(text)
  const job = wf.jobs.abgeben
  gleich('Workflow: Auslöser push prtext/** und workflow_dispatch', [wf.on.push, Object.keys(wf.on)], [{ branches: ['prtext/**'] }, ['push', 'workflow_dispatch']])
  gleich('Workflow: GITHUB_TOKEN nur lesend', wf.permissions, { contents: 'read' })
  gleich('Workflow: ein Job', Object.keys(wf.jobs), ['abgeben'])
  const checkout = job.steps[0]
  pruefe('Workflow: Checkout von main ohne gespeicherte Anmeldung', checkout.uses === 'actions/checkout@v4' && checkout.with.ref === 'main' && checkout.with['persist-credentials'] === false)
  const app = job.steps.find((s) => s.id === 'app')
  gleich('Workflow: App-Token ohne contents: write (kein Merge)', Object.keys(app.with).filter((k) => k.startsWith('permission-')).sort().map((k) => `${k}=${app.with[k]}`), ['permission-contents=read', 'permission-issues=write', 'permission-pull-requests=write'])
  const schritt = job.steps.find((s) => s.name === 'Abgabe verarbeiten')
  pruefe('Workflow: Zweigname nur über env, run ohne Ausdruck', schritt.run === 'node tools/cloud-abgabe.mjs "$ZWEIG"' && !job.steps.some((s) => String(s.run ?? '').includes('${{')))
  pruefe('Workflow: kein weiterer Schritt sieht das Token', job.steps.filter((s) => JSON.stringify(s).includes('steps.app.outputs')).length === 1)
  gleich('Workflow: Gruppe je Zweig, nie abbrechen', [wf.concurrency.group.includes('github.event.inputs.zweig || github.ref'), wf.concurrency['cancel-in-progress']], [true, false])
}

console.log(`cloud-abgabe.test: ${anzahl} Prüfungen, ${fehler} Fehler`)
process.exit(fehler === 0 ? 0 : 1)
