/**
 * Test für `.claude/hooks/anker-wache.js` (PreToolUse auf Bash): `git push` wird abgewiesen, wenn ein Mutationsanker des Diffs tot ist.
 * Mutationsprobe in einem Wegwerf-Repo mit nur den nötigen Dateien (kein Worktree, kein Hook des Hauptrepos; Commits per commit-tree):
 * Quellzeile eines Ankers verrutschen → rot, zurück → grün.
 */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

const wurzel = join(import.meta.dirname, '..')
const { pruefe, pushOrte } = createRequire(import.meta.url)(join(wurzel, '.claude', 'hooks', 'anker-wache.js'))

// Befehlserkennung: nur echte `git push`, mit -C-Ort und `cd`.
assert.deepEqual(pushOrte('git push'), [''])
assert.deepEqual(pushOrte('git -C /c/wt push -u origin x'), ['/c/wt'])
assert.deepEqual(pushOrte('git add a && git commit -m x && git push'), [''])
assert.deepEqual(pushOrte("bash -c 'git -C /w push'"), ['/w'])
for (const c of ['git status', 'git commit -m "git push"', 'echo git push', 'git log --oneline', 'git pull']) assert.deepEqual(pushOrte(c), [], `${c} ist kein Push`)
assert.deepEqual(pushOrte('cd /w && git push'), ['/w'], 'cd vor dem Push')
assert.deepEqual(pushOrte('cd /a && cd b && git push'), ['/a/b'], 'cd relativ zum letzten cd')
assert.deepEqual(pushOrte('cd /w && git -C sub push'), ['/w/sub'], '-C relativ zum cd')
assert.deepEqual(pushOrte('(cd /w && git push); git push'), ['/w', ''], 'cd gilt nur in seiner Klammer')
assert.deepEqual(pushOrte('bash -c "cd /w && git push"'), ['/w'], 'cd in bash -c')
assert.deepEqual(pushOrte('cd /w && git status'), [], 'cd ohne Push')
for (const c of ['git push origin --delete x', 'git push -d origin x', 'git push origin :x']) assert.deepEqual(pushOrte(c), [], `${c} löscht nur: frei`)
assert.equal(pruefe({ tool_name: 'Edit', tool_input: { command: 'git push' } }), null)

// Mutationsprobe: Anker aus tools/mutationen/beleg-marken.json (Datei pipeline/lib/beleg-marken.ts).
const ZEILE = 'if (gruppen.length < 2) return []'
const DATEIEN = ['tools/mutationsanker.mjs', 'tools/mutationsanker-umhaengen.mjs', 'tools/mutationslaeufer.mjs', 'tools/mutationen/beleg-marken.json', 'pipeline/lib/beleg-marken.ts']
const repo = mkdtempSync(join(tmpdir(), 'anker-wache-'))
const git = (...a) => execFileSync('git', ['-C', repo, ...a], { timeout: 60000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' } }).trim()
// Commit ohne Hooks: den Hook des Hauptrepos (Umfang, braucht node_modules) braucht der Wegwerf-Ordner nicht.
const commit = (nachricht) => {
  git('add', '-A')
  git('update-ref', 'HEAD', git('commit-tree', git('write-tree'), '-m', nachricht))
}
try {
  git('init', '-q')
  for (const d of DATEIEN) {
    mkdirSync(join(repo, dirname(d)), { recursive: true })
    copyFileSync(join(wurzel, d), join(repo, d))
  }
  const ziel = join(repo, 'pipeline/lib/beleg-marken.ts')
  const quelle = readFileSync(ziel, 'utf8')
  assert.ok(quelle.includes(ZEILE), 'Probe-Anker steht in der Quelle')
  assert.ok(readFileSync(join(repo, 'tools/mutationen/beleg-marken.json'), 'utf8').includes(ZEILE), 'Probe-Anker steht in der Liste')
  commit('basis')
  process.env.ANKER_BASIS = git('rev-parse', 'HEAD') // CI hat keinen origin/main (flacher Checkout)
  const push = { tool_name: 'Bash', cwd: repo, tool_input: { command: 'git push -u origin x' } }
  const aendere = (text, nachricht) => {
    writeFileSync(ziel, text)
    git('add', '-A')
    git('update-ref', 'HEAD', git('commit-tree', git('write-tree'), '-p', 'HEAD', '-m', nachricht))
  }
  assert.equal(pruefe(push), null, 'Ausgangsstand grün')
  aendere(quelle.replace(ZEILE, 'if (gruppen.length < 3) return [] // verrutscht'), 'anker verrutscht')
  const grund = pruefe(push)
  assert.match(grund ?? '', /^git push gesperrt: Mutationsanker tot/, 'verrutschter Anker: deny')
  assert.match(grund, /beleg-marken\.json/, 'Meldung nennt die Liste')
  assert.match(grund, /marken: einzelner Titel zaehlt als Luecke/, 'Meldung nennt den Mutanten')
  const aus = (command, cwd = wurzel) => pruefe({ ...push, cwd, tool_input: { command } })
  assert.match(aus(`git -C ${repo} push`) ?? '', /^git push gesperrt/, '-C wirkt')
  assert.match(aus(`cd ${repo} && git push`) ?? '', /^git push gesperrt/, 'cd <Ort> && git push wirkt (Bash startet im Hauptordner)')
  assert.equal(aus(`cd ${repo} && git push origin --delete x`), null, 'Löschpush frei')
  assert.equal(aus('git status', repo), null, 'kein Push: frei')
  aendere(quelle, 'anker zurück')
  assert.equal(pruefe(push), null, 'zurück: grün')
  console.log('✓ anker-wache')
} finally {
  rmSync(repo, { recursive: true, force: true })
}
