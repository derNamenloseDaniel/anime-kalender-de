/**
 * Test für `.claude/hooks/pr-create-sperre.js` (PreToolUse auf Bash): rohes `gh pr create` wird abgewiesen,
 * `bash tools/pr-einreichen.sh` (das den PR per `gh api` anlegt) und andere `gh pr`-Befehle bleiben frei.
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const wurzel = join(import.meta.dirname, '..')
const hook = join(wurzel, '.claude', 'hooks', 'pr-create-sperre.js')
const { pruefe } = createRequire(import.meta.url)(hook)

const lauf = (command, tool_name = 'Bash') => pruefe({ tool_name, tool_input: { command } })
const gesperrt = (command) => assert.match(lauf(command), /pr-einreichen\.sh/, `${command} gesperrt`)
const frei = (command) => assert.equal(lauf(command), null, `${command} frei`)

for (const c of [
  'gh pr create --title x --body y',
  'gh pr create --base main --head fix/x --body-file /tmp/t.md',
  'gh pr create',
  'gh.exe pr create --fill',
  '"/c/Program Files/GitHub CLI/gh.exe" pr create --title x',
  'gh -R derNamenloseDaniel/anime-kalender-de pr create --title x',
  'gh --repo derNamenloseDaniel/anime-kalender-de pr create',
  'git push -u origin x && gh pr create --title x',
  'node tools/pr-vorpruefung.mjs --titel x; gh pr create --title x',
  "bash -c 'gh pr create --title x'",
  'eval "gh pr create --title x"',
  'timeout 60 gh pr create --title x',
  'gh pr create --title "a" --body "$(cat t.md)"',
]) {
  gesperrt(c)
}

for (const c of [
  'bash tools/pr-einreichen.sh "Titel"',
  'bash tools/pr-einreichen.sh "Titel" "Text mit gh pr create darin"',
  'gh pr view 5',
  'gh pr view fix/x --json number',
  'gh pr merge 5 --squash',
  'gh pr comment 5 --body-file x.md',
  'gh pr checks 5',
  'gh pr edit 5 --title x',
  'gh pr list --head fix/x',
  'gh pr diff 5',
  'gh workflow run x.yml',
  'git commit -m "kein gh pr create"',
  'echo gh pr create',
  "printf 'gh pr create'",
  'git commit -m x\ncat > f <<EOF\ngh pr create\nEOF',
  'grep -n "gh pr create" CLAUDE.md',
  '',
]) {
  frei(c)
}
assert.equal(lauf('gh pr create --title x', 'Write'), null, 'Write frei')
assert.equal(pruefe({ tool_name: 'Bash' }), null, 'ohne tool_input frei')

// Das Skript legt den PR per REST an (`gh api …/pulls`, seit 27.11.2026: GraphQL ist in Cloud-Sitzungen gesperrt) und steht dem Hook frei im Weg.
const skriptText = readFileSync(join(wurzel, 'tools', 'pr-einreichen.sh'), 'utf8')
assert.match(skriptText, /gh api "\$REPO_PFAD\/pulls" -f title=/, 'pr-einreichen.sh legt den PR per REST an')
assert.doesNotMatch(skriptText, /gh pr (view|create)/, 'pr-einreichen.sh ruft kein GraphQL-gh pr view/create')
frei('bash tools/pr-einreichen.sh "Titel" "Text"')

// Ziel-Repo: gesperrt nur, wo tools/pr-einreichen.sh existiert (Anlass: chrome-utilities hat es nicht, 23.11.2026).
const ordner = mkdtempSync(join(tmpdir(), 'pr-sperre-'))
const mit = join(ordner, 'mit-skript')
const ohne = join(ordner, 'ohne-skript')
mkdirSync(join(mit, 'tools'), { recursive: true })
mkdirSync(join(mit, 'web'), { recursive: true })
mkdirSync(ohne, { recursive: true })
writeFileSync(join(mit, 'tools', 'pr-einreichen.sh'), '#!/bin/sh\n')
const imOrdner = (command, cwd) => pruefe({ tool_name: 'Bash', tool_input: { command }, cwd })
const sl = (p) => p.replace(/\\/g, '/')
assert.match(imOrdner('gh pr create --title x', mit), /pr-einreichen\.sh/, 'cwd mit Skript: gesperrt')
assert.match(imOrdner('gh pr create --title x', join(mit, 'web')), /pr-einreichen\.sh/, 'Unterordner eines Repos mit Skript: gesperrt')
assert.equal(imOrdner('gh pr create --title x', ohne), null, 'cwd ohne Skript: frei')
assert.equal(imOrdner('gh pr create --title x && gh pr create', ohne), null, 'zweimal ohne Skript: frei')
assert.equal(imOrdner(`cd ${sl(ohne)} && gh pr create --title x`, mit), null, 'cd in Ordner ohne Skript: frei')
assert.match(imOrdner(`cd ${sl(mit)} && gh pr create --title x`, ohne), /pr-einreichen\.sh/, 'cd in Ordner mit Skript: gesperrt')
assert.equal(imOrdner(`(cd "${sl(ohne)}" && gh pr create --title x)`, mit), null, 'Subshell-cd ohne Skript: frei')
assert.match(imOrdner(`(cd ${sl(ohne)} && true); gh pr create --title x`, mit), /pr-einreichen\.sh/, 'cd in der Subshell wirkt nicht nach außen')
assert.equal(imOrdner(`bash -c 'cd ${sl(ohne)} && gh pr create --title x'`, mit), null, 'bash -c mit cd: frei')
assert.match(imOrdner('cd "$X" && gh pr create --title x', mit), /pr-einreichen\.sh/, 'nicht bestimmbares cd: cwd gilt')
assert.match(imOrdner('gh --repo derNamenloseDaniel/anime-kalender-de pr create', ohne), /pr-einreichen\.sh/, '--repo eigenes Repo: gesperrt, auch aus fremdem cwd')
assert.match(imOrdner('gh -R DerNamenloseDaniel/Anime-Kalender-DE pr create', ohne), /pr-einreichen\.sh/, 'Schreibweise egal')
assert.equal(imOrdner('gh -R derNamenloseDaniel/chrome-utilities pr create --title x', mit), null, '--repo anderes Repo: frei, auch aus cwd mit Skript')
assert.equal(imOrdner('gh --repo=derNamenloseDaniel/chrome-utilities pr create', mit), null, '--repo= anderes Repo: frei')
assert.match(imOrdner('gh pr create --title x', 'C:/gibt/es/nicht'), /pr-einreichen\.sh/, 'nicht existierender cwd: nicht bestimmbar, gesperrt')
assert.match(imOrdner('gh pr create --title x', undefined), /pr-einreichen\.sh/, 'ohne cwd gilt das Repo des Hooks')

// Prüfer R1 (PR 4770): Umgehungen. A1 Option NACH `create`, aus fremdem cwd (ohne Skript) gesperrt, fremdes Repo frei.
const EIG = 'derNamenloseDaniel/anime-kalender-de'
const FREMD = 'derNamenloseDaniel/chrome-utilities'
for (const c of [
  `cd ${sl(ohne)} && gh pr create --repo ${EIG}`,
  `gh pr create --title x -R ${EIG}`,
  `gh pr create --repo=${EIG} --title x`,
  `gh pr create --repo "${EIG}"`,
  `gh pr create --title "a b" --body "t" --repo ${EIG}`,
  // A2 Normalisierung
  `gh -R${EIG} pr create`,
  `gh pr create -R${EIG}`,
  `gh pr create -R https://github.com/${EIG}`,
  `gh pr create -R https://github.com/${EIG}.git`,
  `gh pr create -R github.com/${EIG}`,
  `gh pr create --repo=git@github.com:${EIG}.git`,
  `GH_REPO=${EIG} gh pr create --title x`,
  `env GH_REPO=${EIG} gh pr create --title x`,
  `export GH_REPO=${EIG}; gh pr create --title x`,
  `GH_REPO=${FREMD} gh pr create -R ${EIG}`,
  'gh pr create -R "$R"',
  'gh pr create -R foo',
  // A3 cd-Optionen, pushd, cd -
  `cd -P ${sl(mit)} && gh pr create`,
  `cd -- ${sl(mit)} && gh pr create`,
  `pushd ${sl(mit)} && gh pr create`,
  'cd - && gh pr create',
  'cd && gh pr create',
  `cd ${sl(mit)} && popd && gh pr create`,
  `pushd ${sl(ohne)} && popd && gh pr create`,
  // A4 Zweifel sperrt; A5 cd in Repo mit Skript, bash -c innen
  'cd ~/x && gh pr create',
  `cd ${sl(ordner)}/gibt-es-nicht && gh pr create`,
  `cd ${sl(mit)} && bash -c "gh pr create"`,
  `cd ${sl(mit)} && eval 'gh pr create --title x'`,
]) {
  assert.match(imOrdner(c, ohne), /pr-einreichen\.sh/, `${c} gesperrt`)
}
for (const c of [
  `gh pr create --title x -R ${FREMD}`,
  `gh pr create --repo=${FREMD}`,
  `gh pr create --repo "${FREMD}"`,
  `gh pr create -R https://github.com/${FREMD}.git`,
  `gh pr create -R${FREMD}`,
  `GH_REPO=${FREMD} gh pr create`,
  `env GH_REPO=${FREMD} gh pr create`,
  `export GH_REPO=${FREMD}; gh pr create`,
  `cd -P ${sl(ohne)} && gh pr create`,
  `pushd ${sl(ohne)} && gh pr create`,
  `cd ${sl(ohne)} && bash -c "gh pr create"`,
]) {
  assert.equal(imOrdner(c, mit), null, `${c} frei`)
}

// A4: ohne Skript entscheidet das Remote des Ordners (echtes git im Wegwerf-Repo).
const gitRepo = (name, url) => {
  const d = join(ordner, name)
  mkdirSync(d, { recursive: true })
  for (const a of [['init', '-q'], ['remote', 'add', 'origin', url]]) {
    assert.equal(spawnSync('git', ['-C', d, ...a], { encoding: 'utf8', timeout: 20000 }).status, 0, `git ${a[0]}`)
  }
  return d
}
const meins = gitRepo('remote-eigen', `https://github.com/${EIG}.git`)
const fremd = gitRepo('remote-fremd', `https://github.com/${FREMD}.git`)
assert.match(imOrdner('gh pr create --title x', meins), /pr-einreichen\.sh/, 'Remote eigenes Repo ohne Skript: gesperrt')
assert.equal(imOrdner('gh pr create --title x', fremd), null, 'Remote fremdes Repo: frei')
assert.equal(imOrdner(`cd ${sl(fremd)} && gh pr create`, mit), null, 'cd in fremdes Repo: frei')
assert.match(imOrdner(`cd ${sl(meins)} && gh pr create`, fremd), /pr-einreichen\.sh/, 'cd in eigenes Repo: gesperrt')

// Prozess: Verweigerung als JSON auf stdout, Exit 0; freier Befehl und kaputte Eingabe ohne Ausgabe bzw. mit Fehlerzeile.
const prozess = (roh) => spawnSync(process.execPath, [hook], { input: roh, encoding: 'utf8', timeout: 20000 })
const rot = prozess(JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'gh pr create --title x' } }))
assert.equal(rot.status, 0)
const aus = JSON.parse(rot.stdout).hookSpecificOutput
assert.equal(aus.permissionDecision, 'deny')
assert.match(aus.permissionDecisionReason, /bash tools\/pr-einreichen\.sh/)
const gruen = prozess(JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'gh pr view 5' } }))
assert.equal(gruen.status, 0)
assert.equal(gruen.stdout, '')
const kaputt = prozess('{')
assert.equal(kaputt.status, 0)
assert.match(kaputt.stderr, /^pr-create-sperre: /)

console.log('pr-create-sperre.test: ok (gh pr create roh gesperrt, auch -R, Ketten, bash -c, eval; frei: pr-einreichen.sh, view/merge/comment/checks/edit, echo, Heredoc, Prozess)')
