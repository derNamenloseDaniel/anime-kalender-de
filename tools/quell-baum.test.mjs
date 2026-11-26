/** Test für tools/quell-baum.ts: liefert den Git-Baum von HEAD (40 Hex) und im Repo denselben Wert wie git selbst. */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { quellBaum } from './quell-baum.ts'

const erwartet = execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { encoding: 'utf8', timeout: 30_000 }).trim()
assert.match(erwartet, /^[0-9a-f]{40,64}$/)
assert.equal(quellBaum(), erwartet)

// Außerhalb eines Repos (Temp-Ordner als cwd) ist das Ergebnis leer statt eines Fehlers.
const { tmpdir } = await import('node:os')
const { mkdtempSync, rmSync } = await import('node:fs')
const { join } = await import('node:path')
const leer = mkdtempSync(join(tmpdir(), 'quell-baum-'))
const alt = process.cwd()
const altGit = process.env.GIT_DIR
try {
  process.chdir(leer)
  process.env.GIT_CEILING_DIRECTORIES = tmpdir()
  delete process.env.GIT_DIR
  assert.equal(quellBaum(), '', 'ohne Git-Repo leer')
} finally {
  process.chdir(alt)
  if (altGit) process.env.GIT_DIR = altGit
  delete process.env.GIT_CEILING_DIRECTORIES
  rmSync(leer, { recursive: true, force: true })
}
console.log('quell-baum.test: ok')
