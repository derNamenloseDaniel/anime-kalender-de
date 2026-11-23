/**
 * Test für `.claude/hooks/anker-wache.js` (PreToolUse auf Bash): `git push` wird abgewiesen, wenn ein Mutationsanker des Diffs tot ist.
 * Mutationsprobe in einem Wegwerf-Worktree: Quellzeile eines Ankers verrutschen → rot, zurück → grün.
 */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const wurzel = join(import.meta.dirname, '..')
const { pruefe, pushOrte } = createRequire(import.meta.url)(join(wurzel, '.claude', 'hooks', 'anker-wache.js'))

// Befehlserkennung: nur echte `git push`, mit -C-Ort.
assert.deepEqual(pushOrte('git push'), [''])
assert.deepEqual(pushOrte('git -C /c/wt push -u origin x'), ['/c/wt'])
assert.deepEqual(pushOrte('git add a && git commit -m x && git push'), [''])
assert.deepEqual(pushOrte("bash -c 'git -C /w push'"), ['/w'])
for (const c of ['git status', 'git commit -m "git push"', 'echo git push', 'git log --oneline', 'git pull']) assert.deepEqual(pushOrte(c), [], `${c} ist kein Push`)
assert.equal(pruefe({ tool_name: 'Edit', tool_input: { command: 'git push' } }), null)

// Mutationsprobe: Anker aus tools/mutationen/beleg-marken.json (Datei pipeline/lib/beleg-marken.ts).
const ZEILE = 'if (gruppen.length < 2) return []'
const liste = readFileSync(join(wurzel, 'tools/mutationen/beleg-marken.json'), 'utf8')
assert.ok(liste.includes(ZEILE), 'Probe-Anker steht in der Liste')
const wt = mkdtempSync(join(tmpdir(), 'anker-wache-'))
const git = (...a) => execFileSync('git', ['-C', wt, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
try {
  execFileSync('git', ['-C', wurzel, 'worktree', 'add', '--detach', '-q', wt, 'HEAD'])
  const ziel = join(wt, 'pipeline/lib/beleg-marken.ts')
  const quelle = readFileSync(ziel, 'utf8')
  assert.ok(quelle.includes(ZEILE), 'Probe-Anker steht in der Quelle')
  process.env.ANKER_BASIS = git('rev-parse', 'HEAD').trim() // CI hat keinen origin/main (flacher Checkout)
  const push = { tool_name: 'Bash', cwd: wt, tool_input: { command: 'git push -u origin x' } }
  const commit = (text, msg) => {
    writeFileSync(ziel, text)
    git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qam', msg)
  }
  assert.equal(pruefe(push), null, 'Ausgangsstand grün')
  commit(quelle.replace(ZEILE, 'if (gruppen.length < 3) return [] // verrutscht'), 'anker verrutscht')
  const grund = pruefe(push)
  assert.match(grund ?? '', /^git push gesperrt: Mutationsanker tot/, 'verrutschter Anker: deny')
  assert.match(grund, /beleg-marken\.json/, 'Meldung nennt die Liste')
  assert.match(grund, /marken: einzelner Titel zaehlt als Luecke/, 'Meldung nennt den Mutanten')
  assert.equal(pruefe({ ...push, tool_input: { command: 'git -C ' + wt + ' push' }, cwd: wurzel })?.startsWith('git push gesperrt'), true, '-C wirkt')
  assert.equal(pruefe({ ...push, tool_input: { command: 'git status' } }), null, 'kein Push: frei')
  commit(quelle, 'anker zurück')
  assert.equal(pruefe(push), null, 'zurück: grün')
  console.log('✓ anker-wache')
} finally {
  execFileSync('git', ['-C', wurzel, 'worktree', 'remove', '--force', wt])
  rmSync(wt, { recursive: true, force: true })
}
