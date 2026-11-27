#!/usr/bin/env node
/**
 * Zählt Plakatwechsel in `data/tmdb-poster.json` zwischen zwei Git-Ständen (Wirkung der Sprachfolge de, en, textlos, ja; 21.11.2026):
 * japanisch → lesbar/textlos, japanisch bleibt, neu mit Plakat (vorher AniList-Cover), Einträge mit Beleg `nurJa`.
 * Aufruf: `node tools/plakat-wechsel.mjs <vorher> [nachher=HEAD]`
 */
import { execFileSync } from 'node:child_process'

const stand = (ref) => JSON.parse(execFileSync('git', ['show', `${ref}:data/tmdb-poster.json`], { encoding: 'utf8', maxBuffer: 1 << 28 }))
const [vorher, nachher = 'HEAD'] = process.argv.slice(2)
if (!vorher) {
  console.error('Aufruf: node tools/plakat-wechsel.mjs <vorher> [nachher]')
  process.exit(1)
}
const a = stand(vorher)
const b = stand(nachher)
const z = { jaZuLesbar: 0, jaBleibt: 0, neuMitPlakat: 0, nurJa: 0 }
const beispiele = []
for (const [id, n] of Object.entries(b)) {
  const v = a[id]
  if (v?.l === 'ja' && n && n.l !== 'ja') {
    z.jaZuLesbar++
    if (beispiele.length < 3) beispiele.push(`${id}: ja → ${n.l ?? 'textlos'}`)
  }
  if (v?.l === 'ja' && n?.l === 'ja') z.jaBleibt++
  if (!v && n) z.neuMitPlakat++
  if (n?.nurJa) z.nurJa++
}
console.log(JSON.stringify(z))
if (beispiele.length) console.log(`Stichproben: ${beispiele.join('; ')}`)
