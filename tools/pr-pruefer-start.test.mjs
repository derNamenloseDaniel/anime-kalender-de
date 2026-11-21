/**
 * Test für tools/pr-pruefer-start.mjs und die Auslöser von .github/workflows/pr-pruefer.yml (seit 21.11.2026 nur workflow_dispatch):
 * Ziel als Tabelle, `main` mit eingespeistem gh und echter GITHUB_OUTPUT-Datei, `starte` (ein Dispatch-Aufruf), `laeufeVon`,
 * Verdrahtung aus der YAML (kein pull_request_target, kein Ereigniswert in run:, alle Jobs hängen am Job `ziel`).
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { parse } from 'yaml'
import { laeufeVon, laufTitel, main, pruefpflichtig, starte, ziel } from './pr-pruefer-start.mjs'

const fehler = []
const gleich = (name, ist, soll) => {
  if (JSON.stringify(ist) === JSON.stringify(soll)) return console.log(`  ✓ ${name}`)
  fehler.push(name)
  console.error(`  ✗ ${name} — Ist ${JSON.stringify(ist)}, Soll ${JSON.stringify(soll)}`)
}

const KOPF = 'c'.repeat(40)
const ALT = 'a'.repeat(40)
const BASIS = 'e'.repeat(40)
const REPO = { full_name: 'o/r' }
const pr = (a = {}) => ({ number: 7, state: 'open', draft: false, head: { sha: KOPF, ref: 'claude/x-1', repo: REPO }, base: { ref: 'main', sha: BASIS, repo: REPO }, ...a })
const kopf = (a) => ({ head: { sha: KOPF, ref: 'claude/x-1', repo: REPO, ...a } })

// Ziel: jede Bedingung kippt allein, der Basisfall gibt alle Werte aus der API weiter.
gleich('Basisfall: los mit PR, Kopf, Basis, Zweig aus der API', ziel(pr(), KOPF), { los: true, grund: 'prüfpflichtig, Kopf aktuell', pr: 7, sha: KOPF, basis: BASIS, zweig: 'claude/x-1' })
gleich('sha leer: aktueller Kopf', ziel(pr(), '').sha, KOPF)
gleich('Kopf inzwischen weiter als der Kettenlauf: nichts tun', ziel(pr(), ALT).los, false)
gleich('kein PR', ziel(null, KOPF).los, false)
gleich('geschlossen', ziel(pr({ state: 'closed' }), KOPF).los, false)
gleich('Entwurf', ziel(pr({ draft: true }), KOPF).los, false)
gleich('Fork', ziel(pr(kopf({ repo: { full_name: 'f/r' } })), KOPF).los, false)
gleich('daten/', ziel(pr(kopf({ ref: 'daten/x' })), KOPF).los, false)
gleich('zug-fahrt, zug-probe', ['zug-fahrt', 'zug-probe'].map((ref) => ziel(pr(kopf({ ref })), KOPF).los), [false, false])
gleich('Basis dev', ziel(pr({ base: { ref: 'dev', sha: BASIS, repo: REPO } }), KOPF).los, false)
gleich('Basis zug', ziel(pr({ base: { ref: 'zug', sha: BASIS, repo: REPO } }), KOPF).los, true)
// Der Zweigname landet als Ausgabe in der env der Mutationsprobe: nur harmlose Zeichen.
gleich('Zweig mit Leerzeichen oder $: nichts tun', ['a b', 'a$(x)', 'a;b', 'a`b`'].map((ref) => ziel(pr(kopf({ ref })), KOPF).los), [false, false, false, false])
gleich('Basis-SHA kaputt: nichts tun', ziel(pr({ base: { ref: 'main', sha: 'xyz', repo: REPO } }), KOPF).los, false)
gleich('pruefpflichtig: Liste gefiltert', pruefpflichtig([pr(), pr({ draft: true }), pr(kopf({ ref: 'daten/y' }))]).length, 1)

// laeufeVon: PR 7 darf PR 70 nicht treffen.
const laeufe = [{ id: 3, display_title: 'PR-Prüfer #70 x' }, { id: 2, display_title: `PR-Prüfer #7 ${KOPF}` }, { id: 1, display_title: 'PR-Prüfer #7 ' }, { id: 0, display_title: 'PR-Prüfer' }]
gleich('laeufeVon: nur PR 7, Reihenfolge bleibt', laeufeVon(laeufe, 7).map((l) => l.id), [2, 1])
gleich('laeufeVon: leere Liste', laeufeVon(undefined, 7), [])
gleich('laufTitel', laufTitel(7), 'PR-Prüfer #7 ')

// starte: genau ein POST auf den Dispatch-Endpunkt, Fassung von main.
const aufrufe = []
starte('o/r', 7, KOPF, (args) => aufrufe.push(args.join(' ')))
gleich('starte: ein Dispatch-Aufruf mit ref main, pr und sha', aufrufe, [`api -X POST repos/o/r/actions/workflows/pr-pruefer.yml/dispatches -f ref=main -f inputs[pr]=7 -f inputs[sha]=${KOPF}`])

// main: Ausgaben in GITHUB_OUTPUT; Eingaben nur über env.
const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'pruefer-start-'))
function lauf(env, antwort = pr()) {
  const ausgabe = path.join(ordner, `out-${Math.random().toString(36).slice(2)}`)
  fs.writeFileSync(ausgabe, '')
  const gerufen = []
  const gh = (args) => {
    gerufen.push(args.join(' '))
    if (antwort instanceof Error) throw antwort
    return JSON.stringify(antwort)
  }
  const mute = console.log
  const zeilen = []
  console.log = (z) => zeilen.push(z)
  const code = main({ GITHUB_REPOSITORY: 'o/r', GITHUB_OUTPUT: ausgabe, ...env }, { gh, warte: () => {} })
  console.log = mute
  return { code, ausgabe: fs.readFileSync(ausgabe, 'utf8'), gerufen, zeilen }
}
try {
  const ja = lauf({ PR_EINGABE: '7', SHA_EINGABE: KOPF })
  gleich('main: los mit allen Werten, ein Abruf des PR, Exit 0', [ja.code, ja.ausgabe, ja.gerufen], [0, `los=1\npr=7\nsha=${KOPF}\nbasis=${BASIS}\nzweig=claude/x-1\n`, ['api repos/o/r/pulls/7']])
  gleich('main: Kopf weiter: los=0, Exit 0', (() => { const r = lauf({ PR_EINGABE: '7', SHA_EINGABE: ALT }); return [r.code, r.ausgabe] })(), [0, 'los=0\n'])
  gleich('main: ohne sha: aktueller Kopf', lauf({ PR_EINGABE: '7', SHA_EINGABE: '' }).ausgabe.includes(`sha=${KOPF}`), true)
  gleich('main: Entwurf: los=0', lauf({ PR_EINGABE: '7' }, pr({ draft: true })).ausgabe, 'los=0\n')
  for (const [name, env] of [['pr keine Zahl', { PR_EINGABE: '7; rm -rf /' }], ['pr fehlt', {}], ['sha kurz', { PR_EINGABE: '7', SHA_EINGABE: 'abc' }], ['sha Großbuchstaben', { PR_EINGABE: '7', SHA_EINGABE: 'C'.repeat(40) }]]) {
    const r = lauf(env)
    gleich(`main: ${name}: Exit 1, kein Abruf, keine Ausgabe`, [r.code, r.gerufen, r.ausgabe, r.zeilen.some((z) => z.includes('FEHLGESCHLAGEN'))], [1, [], '', true])
  }
  const kaputt = lauf({ PR_EINGABE: '7' }, new Error('HTTP 404: Not Found'))
  gleich('main: PR nicht lesbar: Exit 1 mit Grund, keine Ausgabe', [kaputt.code, kaputt.ausgabe, kaputt.zeilen.some((z) => z.includes('FEHLGESCHLAGEN PR 7') && z.includes('404'))], [1, '', true])
} finally {
  fs.rmSync(ordner, { recursive: true, force: true })
}

// Verdrahtung pr-pruefer.yml: nur Dispatch, Gruppe je PR, alle Jobs am Ziel, keine Ereigniswerte.
const text = fs.readFileSync(new URL('../.github/workflows/pr-pruefer.yml', import.meta.url), 'utf8')
const wf = parse(text)
gleich('Auslöser: nur workflow_dispatch mit pr (Pflicht) und sha', [Object.keys(wf.on), wf.on.workflow_dispatch.inputs.pr.required, wf.on.workflow_dispatch.inputs.sha.required], [['workflow_dispatch'], true, false])
gleich('Laufname trägt den PR (laeufeVon)', wf['run-name'].startsWith(laufTitel('${{ inputs.pr }}')), true)
gleich('Gruppe je PR, laufender Prüfer bricht ab', wf.concurrency, { group: 'pr-pruefer-${{ inputs.pr }}', 'cancel-in-progress': true })
gleich('kein github.event.* und kein github.head_ref mehr im Workflow', /github\.event\.|github\.head_ref/.test(text), false)
const zielJob = wf.jobs.ziel
const zielSchritt = zielJob.steps.find((s) => s.id === 'ziel')
gleich('Job ziel: Skript ohne Argumente, Eingaben nur über env', [zielSchritt.run, zielSchritt.env.PR_EINGABE, zielSchritt.env.SHA_EINGABE], ['node tools/pr-pruefer-start.mjs', '${{ inputs.pr }}', '${{ inputs.sha }}'])
gleich('Job ziel: nur lesen', zielJob.permissions, { contents: 'read', 'pull-requests': 'read' })
gleich('Job ziel: Ausgaben', Object.keys(zielJob.outputs), ['los', 'pr', 'sha', 'basis', 'zweig'])
for (const name of ['uebernahme', 'mutationsprobe', 'pruefen']) {
  const job = wf.jobs[name]
  gleich(`Job ${name}: hängt an ziel und verlangt los == '1'`, [[job.needs].flat().includes('ziel'), String(job.if).includes("needs.ziel.outputs.los == '1'")], [true, true])
}
// Kein Ausdruck in run:, außer den vorhandenen Pfaden über runner.temp; die Werte aus `ziel` gehen nur über env oder prompt.
const runMitZiel = Object.values(wf.jobs).flatMap((j) => j.steps).filter((s) => String(s.run ?? '').includes('needs.ziel'))
gleich('Werte aus ziel nie in run:', runMitZiel.map((s) => s.name), [])
gleich('pruefen: PR, Kopf, Basis aus ziel', wf.jobs.pruefen.env, { PR: '${{ needs.ziel.outputs.pr }}', HEAD_SHA: '${{ needs.ziel.outputs.sha }}', BASE_SHA: '${{ needs.ziel.outputs.basis }}' })
gleich('Mutationsprobe: Zweig aus ziel', wf.jobs.mutationsprobe.steps.find((s) => s.name === 'Mutationsprobe starten').env.ZWEIG, '${{ needs.ziel.outputs.zweig }}')

console.log(`Prüfer-Start: ${fehler.length === 0 ? 'alle Fälle grün' : fehler.length + ' Fälle rot'}`)
process.exit(fehler.length === 0 ? 0 : 1)
