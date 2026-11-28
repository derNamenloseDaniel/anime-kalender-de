/**
 * Prozesstest zu pipeline/check-trailer-bestand.ts: Der Wächter ist rot (Exit 1, `VERSTÖSSE: 1`), wenn der Trailerbestand ein Review enthält,
 * und grün (Exit 0, `VERSTÖSSE: 0`) bei sauberem Bestand. Eigene Fixtures in einem Temp-Ordner, kein Lesen des echten Bestands.
 * Aufruf: node tools/trailer-bestand.test.mjs
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = join(dirname(fileURLToPath(import.meta.url)), '..')
const wurzel = mkdtempSync(join(tmpdir(), 'trailer-bestand-'))
const schreibe = (name, inhalt) => {
  const pfad = join(wurzel, name)
  writeFileSync(pfad, JSON.stringify(inhalt))
  return pfad
}

function lauf(trailer) {
  const r = spawnSync(
    process.execPath,
    [join(repo, 'node_modules/tsx/dist/cli.mjs'), join(repo, 'pipeline/check-trailer-bestand.ts'), `--trailer=${schreibe('trailer.json', trailer)}`, `--titles=${schreibe('titles.json', [{ id: 7, titleEn: 'Call of the Night' }, { id: 8, titleEn: 'Ranking of Kings' }])}`],
    { env: { ...process.env, AK_ROOT: wurzel }, encoding: 'utf8', timeout: 120_000, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] },
  )
  return { status: r.status, ausgabe: `${r.stdout}${r.stderr}` }
}

try {
  const review = lauf({ 7: { video: 'abcdefghijk', titel: 'CALL OF THE NIGHT | Der beste Anime der Sommer-Season 2022 | Anime Review' } })
  assert.equal(review.status, 1, review.ausgabe)
  assert.match(review.ausgabe, /^VERSTÖSSE: 1$/m)
  assert.match(review.ausgabe, /7 review/)

  const sauber = lauf({ 7: { video: 'abcdefghijk', titel: 'CALL OF THE NIGHT | Offizieller Trailer' }, 8: { video: 'bcdefghijkl', titel: 'Ranking of Kings | Offizieller Trailer' } })
  assert.equal(sauber.status, 0, sauber.ausgabe)
  assert.match(sauber.ausgabe, /^VERSTÖSSE: 0$/m)

  const leer = lauf({})
  assert.equal(leer.status, 0, leer.ausgabe)
  assert.match(leer.ausgabe, /^VERSTÖSSE: 0$/m)
  console.log('trailer-bestand.test: grün')
} finally {
  rmSync(wurzel, { recursive: true, force: true })
}
