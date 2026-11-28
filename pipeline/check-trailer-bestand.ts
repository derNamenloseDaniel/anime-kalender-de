/**
 * Bestandsprüfung zu `lib/trailer-ablehnung.ts`: Der gesammelte Trailerbestand enthält kein Review, keine Reaktion, keinen ganzen Film.
 * Liest den gebauten Bestand (Animenamen aus public/data/titles.json), darum in check:bestand statt check:logic.
 */
import { animeNamen, entferneAbgelehnte } from './lib/trailer-ablehnung.ts'
import { ladeTrailerSperre } from './lib/trailer-hand.ts'
import { readJson } from './lib/util.ts'

const echt = readJson<Record<string, { video: string; titel: string }>>('data/trailer.json', {})
const titles = new Map(readJson<{ id: number; titleDe?: string; titleEn?: string; titleRomaji?: string }[]>('public/data/titles.json', []).map((t) => [String(t.id), t]))
const tmdbNamen = readJson<Record<string, { nameDe?: string }>>('data/tmdb-titles.json', {})
const uebrig = entferneAbgelehnte({ ...echt }, (id) => animeNamen(titles.get(id) ?? {}, tmdbNamen[id]?.nameDe), ladeTrailerSperre())
if (uebrig.length) {
  console.error(`  ✖ data/trailer.json enthält Nicht-Trailer: ${uebrig.map((e) => `${e.id} ${e.grund} ${e.titel}`).join(' | ')}`)
  process.exit(1)
}
console.log(`Trailerbestand: ${Object.keys(echt).length} Einträge, kein Nicht-Trailer`)
