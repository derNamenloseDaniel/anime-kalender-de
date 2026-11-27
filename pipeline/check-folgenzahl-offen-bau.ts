/**
 * Verdrahtung: `schreibeFolgenDateien` trägt in `folgen/zaehlung.json` bei offener letzter Staffel die dritte Stelle `1`, sonst nicht
 * (21.11.2026, Horizonte „137 von 137“). Kulisse über `AK_ROOT` mit eigener `data/curated/horizonte-staffeln.yaml`, echter Aufrufer.
 * Läuft in `check:logic`.
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const wurzelRepo = join(import.meta.dirname, '..')
const tsx = createRequire(join(wurzelRepo, 'package.json')).resolve('tsx/cli')
const wurzel = mkdtempSync(join(tmpdir(), 'folgenzahl-offen-bau-'))
try {
  for (const d of ['data/curated', 'data/cache', 'public/data']) mkdirSync(join(wurzel, d), { recursive: true })
  const folgen = (n: number) => Array.from({ length: n }, (_, i) => ({ nr: i + 1, datum: '2023-04-14', minuten: 24, de: `Folge ${i + 1}` }))
  /* 900401 offen (Staffel 2 ab 4), 900402 abgeschlossen, 900403 ohne Staffelgrenzen. */
  writeFileSync(join(wurzel, 'data/anisearch-folgen.json'), JSON.stringify({ 701: { folgen: folgen(4) }, 702: { folgen: folgen(4) }, 703: { folgen: folgen(3) } }))
  writeFileSync(join(wurzel, 'data/anisearch.json'), JSON.stringify({ 900401: { anisearchId: 701 }, 900402: { anisearchId: 702 }, 900403: { anisearchId: 703 } }))
  writeFileSync(
    join(wurzel, 'data', 'curated/horizonte-staffeln.yaml'), // ohne „data/“-Literal: check-workflows liest es sonst als Schreibziel
    [
      'titel:',
      '- anilistId: 900401',
      '  staffeln:',
      '    - { nr: 1, von: 1, bis: 3, folgen: 3 }',
      '    - { nr: 2, von: 4, offen: true }',
      '- anilistId: 900402',
      '  staffeln:',
      '    - { nr: 1, von: 1, bis: 2, folgen: 2 }',
      '    - { nr: 2, von: 3, bis: 4, folgen: 2 }',
      '',
    ].join('\n'),
  )
  writeFileSync(join(wurzel, 'data/folgen-hinweise.yaml'), '[]\n')
  writeFileSync(join(wurzel, 'data/kino-ankuendigungen.yaml'), '[]\n')
  const r = spawnSync(process.execPath, [tsx, join(wurzelRepo, 'pipeline/lib/kulisse-folgenzahl-offen.ts')], { env: { ...process.env, AK_ROOT: wurzel }, encoding: 'utf8', windowsHide: true, timeout: 120_000 })
  assert.equal(r.status, 0, r.stderr.slice(-400))
  const zaehlung = JSON.parse(r.stdout.trim().split('\n').pop()!) as Record<string, number[]>
  assert.deepEqual(zaehlung['900401'], [4, 0, 1], 'offene letzte Staffel: dritte Stelle 1')
  assert.deepEqual(zaehlung['900402'], [4, 0], 'abgeschlossene Staffeln: ohne dritte Stelle')
  assert.deepEqual(zaehlung['900403'], [3, 0], 'ohne Staffelgrenzen: ohne dritte Stelle')
} finally {
  rmSync(wurzel, { recursive: true, force: true })
}
console.log('check-folgenzahl-offen-bau: ok (offen → [alle, deutsch, 1], abgeschlossen und ohne Grenzen → [alle, deutsch])')
