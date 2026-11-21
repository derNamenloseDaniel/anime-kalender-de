/**
 * Zusicherung: AniLists `duration` ist Laufzeit-Rückfall (Mängelart `laufzeit`, Lösungskarte 21.11.2026). `titleFromMedia` übernimmt sie,
 * `anisearchFelderAnwenden` (Bauphase 09-5-0) überschreibt sie mit aniSearch, wo aniSearch einen Wert hat, und zählt die Rückfälle im Baulog.
 * Läuft gegen eine Wegwerf-Wurzel (`AK_ROOT`), in `check:logic`.
 *
 * Aufruf: npx tsx pipeline/check-laufzeit-anilist.ts
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { AniListMedia } from './lib/anilist.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const wurzel = mkdtempSync(join(tmpdir(), 'laufzeit-anilist-'))
process.env.AK_ROOT = wurzel
mkdirSync(join(wurzel, 'data/cache'), { recursive: true })
/* aniSearch kennt nur 900401 (24 min) und 900403 (ohne Laufzeit). */
writeFileSync(join(wurzel, 'data/anisearch.json'), JSON.stringify({ 900401: { info: { runtimeMinutes: 24 } }, 900403: { info: {} } }))

try {
  const { titleFromMedia } = await import('./bau/titel-hilfen.ts')
  const medium = (id: number, duration: number | null): AniListMedia => ({ id, duration, title: {} }) as AniListMedia
  const laufzeit = (duration: number | null) => titleFromMedia(medium(900_400, duration), 'high').runtimeMin

  console.log('\nTitelkarte aus AniList (titleFromMedia):')
  pruefe('duration 23 → runtimeMin 23', laufzeit(23) === 23, laufzeit(23))
  pruefe('Film: duration 112 → runtimeMin 112', laufzeit(112) === 112, laufzeit(112))
  pruefe('duration null → kein runtimeMin-Feld', !('runtimeMin' in titleFromMedia(medium(900_400, null), 'high')))
  pruefe('duration 0 → kein runtimeMin-Feld', !('runtimeMin' in titleFromMedia(medium(900_400, 0), 'high')))

  console.log('\nVorrang aniSearch und Zählung (anisearchFelderAnwenden):')
  const { anisearchFelderAnwenden } = await import('./lib/anisearch-felder.ts')
  const karten = new Map(
    [
      titleFromMedia(medium(900_401, 23), 'high'), // aniSearch 24 → 24
      titleFromMedia(medium(900_402, 25), 'high'), // aniSearch ohne Eintrag → AniList 25
      titleFromMedia(medium(900_403, 30), 'high'), // aniSearch-Eintrag ohne Laufzeit → AniList 30
      titleFromMedia(medium(900_404, null), 'high'), // keine Quelle → leer
      { ...titleFromMedia(medium(900_405, null), 'high'), id: 5_000_405, runtimeMin: 40 }, // Eigentitel: zählt nicht als AniList
    ].map((t) => [t.id, t]),
  )
  const meldung = anisearchFelderAnwenden(karten)
  const werte = [900_401, 900_402, 900_403, 900_404, 5_000_405].map((id) => karten.get(id)?.runtimeMin ?? null)
  pruefe('aniSearch schlägt AniList (24 statt 23), sonst bleibt AniList (25, 30), ohne Quelle leer', JSON.stringify(werte) === '[24,25,30,null,40]', werte)
  pruefe('Baulog nennt 1 aus aniSearch und 2 aus AniList (Eigentitel nicht mitgezählt)', meldung.endsWith('1 mit Laufzeit aus aniSearch, 2 aus AniList'), meldung)
} finally {
  rmSync(wurzel, { recursive: true, force: true })
}

if (verletzt) {
  console.error(`\n${verletzt} Zusicherung(en) verletzt.`)
  process.exit(1)
}
console.log('\nAlle Zusicherungen erfüllt.')
