/**
 * Bestandsprüfung zu `lib/trailer-ablehnung.ts`: Der gesammelte Trailerbestand enthält kein Review, keine Reaktion, keinen ganzen Film.
 * Liest den gebauten Bestand (Animenamen aus public/data/titles.json), darum in check:bestand statt check:logic.
 * `--trailer=<Datei>` und `--titles=<Datei>` ersetzen die beiden Dateien, nur für den Prozesstest `tools/trailer-bestand.test.mjs`.
 */
import { meldeVerletzte } from './lib/quarantaene.ts'
import { animeNamen, entferneAbgelehnte } from './lib/trailer-ablehnung.ts'
import { ladeTrailerSperre } from './lib/trailer-hand.ts'
import { readJson } from './lib/util.ts'

const argument = (name: string, standard: string): string => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? standard

const echt = readJson<Record<string, { video: string; titel: string }>>(argument('trailer', 'data/trailer.json'), {})
const titles = new Map(readJson<{ id: number; titleDe?: string; titleEn?: string; titleRomaji?: string }[]>(argument('titles', 'public/data/titles.json'), []).map((t) => [String(t.id), t]))
const tmdbNamen = readJson<Record<string, { nameDe?: string }>>('data/tmdb-titles.json', {})
const uebrig = entferneAbgelehnte({ ...echt }, (id) => animeNamen(titles.get(id) ?? {}, tmdbNamen[id]?.nameDe), ladeTrailerSperre())
/* Marke je Titel: der Bau stellt ihn zurück, statt dass ein einzelnes Review den ganzen Bestandsbau sperrt. */
meldeVerletzte(uebrig.map((e) => ({ ...e, id: Number(e.id) })), 'trailer-bestand', 'Trailer ist kein Trailer (Review, Reaktion, ganzer Film)', () => true)
for (const e of uebrig) console.error(`  ✖ data/trailer.json enthält Nicht-Trailer: ${e.id} ${e.grund} ${e.titel}`)
console.log(`Trailerbestand: ${Object.keys(echt).length} Einträge, ${uebrig.length} Nicht-Trailer`)
console.log(`VERSTÖSSE: ${uebrig.length}`)
process.exit(uebrig.length ? 1 : 0)
