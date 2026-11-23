/**
 * Test für `.claude/hooks/pr-create-sperre.js` (PreToolUse auf Bash): rohes `gh pr create` wird abgewiesen,
 * `bash tools/pr-einreichen.sh` (das intern `gh pr create` ruft) und andere `gh pr`-Befehle bleiben frei.
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
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
  'gh --repo a/b pr create',
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

// Das Skript selbst darf `gh pr create` weiter rufen: der Hook prüft nur den äußeren Befehl.
assert.match(readFileSync(join(wurzel, 'tools', 'pr-einreichen.sh'), 'utf8'), /gh pr create/, 'pr-einreichen.sh ruft gh pr create')
frei('bash tools/pr-einreichen.sh "Titel" "Text"')

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
