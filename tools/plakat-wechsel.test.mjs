import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'

// Prüft tools/plakat-wechsel.mjs gegen ein Wegwerf-Repo mit zwei Ständen von data/tmdb-poster.json.
const werkzeug = resolve('tools/plakat-wechsel.mjs')

function repo(vorher, nachher) {
  const dir = mkdtempSync(join(tmpdir(), 'plakat-'))
  const git = (...a) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { cwd: dir, encoding: 'utf8', timeout: 30_000 })
  git('init', '-q')
  mkdirSync(join(dir, 'data'))
  for (const [stand, msg] of [[vorher, 'v'], [nachher, 'n']]) {
    writeFileSync(join(dir, 'data/tmdb-poster.json'), JSON.stringify(stand))
    git('add', '.')
    git('commit', '-q', '-m', msg)
  }
  return (...args) => execFileSync('node', [werkzeug, ...args], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30_000 })
}

test('plakat-wechsel zählt die vier Wechselarten', () => {
  const lauf = repo(
    { 1: { l: 'ja' }, 2: { l: 'ja' }, 3: { l: 'ja' }, 4: { l: 'ja' } },
    { 1: { l: 'de' }, 2: { l: 'en' }, 3: { l: 'ja' }, 4: { l: 'ja' }, 5: { l: 'de' }, 6: { l: 'ja', nurJa: true } },
  )
  const [json, stich] = lauf('HEAD~1').trim().split('\n')
  assert.deepEqual(JSON.parse(json), { jaZuLesbar: 2, jaBleibt: 2, neuMitPlakat: 2, nurJa: 1 })
  assert.match(stich, /^Stichproben: 1: ja → de; 2: ja → en$/)
})

test('plakat-wechsel ohne Stand bricht mit Aufrufhinweis ab', () => {
  const lauf = repo({ 1: { l: 'ja' } }, { 1: { l: 'de' } })
  assert.throws(() => lauf(), (e) => e.status === 1 && /Aufruf: node tools\/plakat-wechsel\.mjs/.test(e.stderr))
})
