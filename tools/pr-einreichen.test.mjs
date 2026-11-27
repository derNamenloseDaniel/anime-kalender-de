/**
 * Test zu tools/pr-einreichen.sh: das Skript spricht nur REST (`gh api`), nie GraphQL (`gh pr …`, in Cloud-Sitzungen HTTP 403), und fährt die
 * Vorprüfung vor dem Push. Echtes git im Wegwerf-Ordner (Arbeitsrepo plus nacktes Remote), `gh` ist ein Ersatz im PATH, der jeden Aufruf
 * protokolliert und `gh pr …` wie die Cloud mit Exit 1 abweist. Unter Windows übersprungen (der Ersatz ist ein sh-Skript).
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

if (process.platform === 'win32') {
  console.log('pr-einreichen.test: unter Windows übersprungen (gh-Ersatz ist ein sh-Skript)')
  process.exit(0)
}

const SKRIPT = join(fileURLToPath(new URL('.', import.meta.url)), 'pr-einreichen.sh')
const ATTRAPPE = `
import { appendFileSync, existsSync, writeFileSync } from 'node:fs'
const [, , ...args] = process.argv
const ablage = process.env.ATTRAPPE_ORDNER
appendFileSync(ablage + '/aufrufe.jsonl', JSON.stringify(args) + '\\n')
if (args[0] === 'pr') {
  console.error('HTTP 403: GitHub GraphQL is not available from Claude Code sessions; use the REST API (gh api repos/{owner}/{repo}/...)')
  process.exit(1)
}
const pfad = args.find((a) => a.startsWith('repos/'))
const basis = process.env.ATTRAPPE_REPO_PFAD
const streng = (bedingung, text) => {
  if (!bedingung) {
    console.error('Attrappe: ' + text + ' (' + args.join(' ') + ')')
    process.exit(1)
  }
}
if (pfad === basis) {
  console.log('derNamenloseDaniel')
} else if (pfad === basis + '/pulls' && args.includes('-X')) {
  // Ohne Eigner-Präfix ignoriert GitHub den head-Filter (sonst wäre das erste Ergebnis ein fremder PR), mit state=all träfe er geschlossene PRs
  streng(args.includes('-f') && args.includes('head=derNamenloseDaniel:' + process.env.ATTRAPPE_ZWEIG), 'head-Filter muss Eigner:Zweig tragen')
  streng(args.includes('state=open'), 'nur offene PRs')
  const feld = (args.find((a) => a.startsWith('.[0].')) ?? '').replace('.[0].', '').replace(' // empty', '')
  const vorhanden = process.env.ATTRAPPE_PR_VORHANDEN === '1' || existsSync(ablage + '/angelegt')
  const werte = { number: '4711', body: 'Text des alten PR', html_url: 'https://github.com/x/y/pull/4711' }
  if (vorhanden) console.log(werte[feld])
} else if (pfad === basis + '/pulls') {
  streng(args.includes('head=' + process.env.ATTRAPPE_ZWEIG) && args.some((a) => a.startsWith('title=')) && args.some((a) => a.startsWith('base=')) && args.some((a) => a.startsWith('body=')), 'Anlegen braucht title, head, base, body')
  writeFileSync(ablage + '/angelegt', '1')
} else {
  console.error('unerwarteter Aufruf: ' + args.join(' '))
  process.exit(1)
}
`

const git = (ordner, ...args) => {
  const r = spawnSync('git', args, { cwd: ordner, encoding: 'utf8', timeout: 20000 })
  assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`)
  return r.stdout.trim()
}

/** Ein Szenario im frischen Wegwerf-Ordner; Rückgabe: Ausgang des Skripts, gh-Aufrufe, übergebener PR_TEXT, Zweige des Remotes. */
function szenario({ zweig = 'fix/test', vorhanden = false, vorpruefungExit = 0, basis, tools = true, repo } = {}) {
  const wurzel = mkdtempSync(join(tmpdir(), 'pr-einreichen-'))
  try {
    const remote = join(wurzel, 'remote.git')
    const arbeit = join(wurzel, 'arbeit')
    const ablage = join(wurzel, 'ablage')
    const bin = join(wurzel, 'bin')
    for (const o of [remote, arbeit, ablage, bin]) mkdirSync(o)
    git(remote, 'init', '-q', '--bare')
    git(arbeit, 'init', '-q', '-b', zweig)
    git(arbeit, 'config', 'user.email', 't@example.invalid')
    git(arbeit, 'config', 'user.name', 'Test')
    git(arbeit, 'remote', 'add', 'origin', remote)
    mkdirSync(join(arbeit, 'tools'))
    if (tools) copyFileSync(SKRIPT, join(arbeit, 'tools', 'pr-einreichen.sh'))
    writeFileSync(join(arbeit, 'tools', 'pr-vorpruefung.mjs'), `import { writeFileSync } from 'node:fs'\nwriteFileSync(process.env.ATTRAPPE_ORDNER + '/pr_text', process.env.PR_TEXT ?? '')\nprocess.exit(${vorpruefungExit})\n`)
    writeFileSync(join(arbeit, 'a.txt'), 'a\n')
    git(arbeit, 'add', '.')
    git(arbeit, 'commit', '-q', '-m', 'x')
    writeFileSync(join(bin, 'gh-attrappe.mjs'), ATTRAPPE)
    writeFileSync(join(bin, 'gh'), `#!/bin/sh\nexec "${process.execPath}" "${join(bin, 'gh-attrappe.mjs')}" "$@"\n`)
    chmodSync(join(bin, 'gh'), 0o755)
    const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, ATTRAPPE_ORDNER: ablage, ATTRAPPE_PR_VORHANDEN: vorhanden ? '1' : '0', ATTRAPPE_ZWEIG: zweig, ATTRAPPE_REPO_PFAD: repo === undefined ? 'repos/{owner}/{repo}' : `repos/${repo.wert}` }
    delete env.PR_BASIS
    delete env.GH_REPO
    delete env.GITHUB_REPOSITORY
    if (repo !== undefined) env[repo.name] = repo.wert
    if (basis) env.PR_BASIS = basis
    const r = spawnSync('bash', ['tools/pr-einreichen.sh', 'Titel', 'Text'], { cwd: arbeit, env, encoding: 'utf8', timeout: 60000 })
    const aufrufe = existsSync(join(ablage, 'aufrufe.jsonl')) ? readFileSync(join(ablage, 'aufrufe.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map((z) => JSON.parse(z)) : []
    const prText = existsSync(join(ablage, 'pr_text')) ? readFileSync(join(ablage, 'pr_text'), 'utf8') : null
    const zweige = spawnSync('git', ['branch', '--list'], { cwd: remote, encoding: 'utf8', timeout: 20000 }).stdout.trim()
    return { exit: r.status, aus: r.stdout + r.stderr, aufrufe, prText, zweige }
  } finally {
    rmSync(wurzel, { recursive: true, force: true })
  }
}

const anlegen = (aufrufe) => aufrufe.filter((a) => a.some((x) => /^repos\/.*\/pulls$/.test(x)) && !a.includes('-X'))
const graphql = (aufrufe) => aufrufe.filter((a) => a[0] === 'pr' || a.includes('graphql'))

{
  const s = szenario()
  assert.equal(s.exit, 0, s.aus)
  assert.equal(graphql(s.aufrufe).length, 0, 'kein GraphQL-Aufruf (gh pr …) wie in der Cloud')
  const neu = anlegen(s.aufrufe)
  assert.equal(neu.length, 1, 'genau ein Anlegen')
  for (const feld of ['title=Titel', 'head=fix/test', 'base=main', 'body=Text']) assert.ok(neu[0].includes(feld), `Anlegen trägt ${feld}`)
  assert.equal(s.prText, 'Text', 'Vorprüfung bekommt den Text dieses Aufrufs')
  assert.ok(s.zweige.includes('fix/test'), 'Zweig ist gepusht')
  assert.match(s.aus, /PR eingereicht: https:\/\/github\.com\/x\/y\/pull\/4711/)
}
{
  const s = szenario({ basis: 'zug' })
  assert.equal(s.exit, 0, s.aus)
  assert.ok(anlegen(s.aufrufe)[0].includes('base=zug'), 'PR_BASIS=zug setzt die Basis')
}
{
  const s = szenario({ vorhanden: true })
  assert.equal(s.exit, 0, s.aus)
  assert.equal(anlegen(s.aufrufe).length, 0, 'bestehender PR wird nicht noch einmal angelegt')
  assert.equal(s.prText, 'Text des alten PR', 'bei bestehendem PR gilt dessen Beschreibung')
  assert.equal(graphql(s.aufrufe).length, 0)
}
{
  const s = szenario({ vorpruefungExit: 1 })
  assert.equal(s.exit, 1, s.aus)
  assert.equal(anlegen(s.aufrufe).length, 0, 'rote Vorprüfung legt nichts an')
  assert.equal(s.zweige, '', 'rote Vorprüfung pusht nichts')
  assert.match(s.aus, /Vorprüfung rot/)
}
{
  const s = szenario({ zweig: 'main' })
  assert.equal(s.exit, 1, s.aus)
  assert.equal(s.aufrufe.length, 0, 'auf main kein gh-Aufruf')
}
// Repo aus GH_REPO oder GITHUB_REPOSITORY (Cloud-Remote ist ein Proxy): kein Platzhalter im Pfad, GH_REPO vor GITHUB_REPOSITORY
for (const repo of [{ name: 'GH_REPO', wert: 'eigner/repo' }, { name: 'GITHUB_REPOSITORY', wert: 'andere/sache' }]) {
  const s = szenario({ repo })
  assert.equal(s.exit, 0, s.aus)
  assert.equal(anlegen(s.aufrufe).length, 1, `${repo.name}: ein Anlegen`)
  assert.ok(s.aufrufe.every((a) => !a.some((x) => x.includes('{owner}'))), `${repo.name}: kein Platzhalter im Pfad`)
}
{
  const s = szenario({ repo: { name: 'GITHUB_REPOSITORY', wert: 'andere/sache' } })
  assert.ok(s.aufrufe.some((a) => a.includes('repos/andere/sache/pulls')), 'Pfad aus der Umgebung')
}
console.log('pr-einreichen.test: 8 Szenarien grün (nur REST, Vorprüfung vor Push, Basis, bestehender PR, main, Repo aus der Umgebung, strenge Attrappe)')
