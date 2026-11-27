/** Test für tools/cover-nach-r2.mjs: nur Dateien, die im Manifest stehen und die vermerkte Größe haben, werden hochgeladen (Fixture in Temp, kein wrangler). */
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { auftraegeAus } from './cover-nach-r2.mjs'

const ordner = mkdtempSync(join(tmpdir(), 'cover-r2-'))
try {
  mkdirSync(join(ordner, 'anisearch'))
  writeFileSync(join(ordner, 'anisearch/1.webp'), 'abcde') // 5 Bytes, passt
  writeFileSync(join(ordner, 'anisearch/2.webp'), 'abc') // Manifest sagt 9
  writeFileSync(join(ordner, 'anisearch/3.webp'), 'xyz') // nicht im Manifest
  const manifest = {
    1: { datei: 'anisearch/1.webp', groesse: 5 },
    2: { datei: 'anisearch/2.webp', groesse: 9 },
    4: { groesse: 1 }, // ohne Datei: zählt nicht
  }
  const { aufgaben, abgelehnt } = auftraegeAus(ordner, manifest)
  assert.deepEqual(aufgaben, [{ key: 'anisearch/1.webp', datei: join(ordner, 'anisearch/1.webp') }])
  assert.deepEqual(abgelehnt.sort(), ['anisearch/2.webp: Größe 3 statt 9', 'anisearch/3.webp: steht nicht im Manifest'])

  const leer = mkdtempSync(join(tmpdir(), 'cover-r2-leer-'))
  try {
    assert.deepEqual(auftraegeAus(leer, manifest), { aufgaben: [], abgelehnt: [] }, 'ohne Unterordner nichts zu tun')
  } finally {
    rmSync(leer, { recursive: true, force: true })
  }
} finally {
  rmSync(ordner, { recursive: true, force: true })
}
console.log('cover-nach-r2.test: ok')
