/**
 * Verdrahtung von `check-vermutung-beleg.ts`: der echte Bauschritt `rolleTermineAus` nimmt die angenommene Folgenzahl weg, wo die letzte
 * Folge belegt ist, und schreibt `katalog: 'belegt'` für eine Beobachtung am Starttag (Handdatei aus der Kulisse). Fehlt der Aufruf im Bau, wird es rot.
 * Aufruf: `npm run check:logic`.
 */
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Release, Title } from '../shared/types.ts'

/* Der Bauschritt liest und schreibt unter `data/`: er läuft gegen eine Kulisse (`AK_ROOT`), nie gegen das Repo. */
const kulisse = mkdtempSync(join(tmpdir(), 'vermutung-beleg-'))
mkdirSync(join(kulisse, 'data', 'curated'), { recursive: true })
for (const datei of ['ohne-synchro-von-hand.yaml', 'kino-ankuendigungen.yaml']) writeFileSync(join(kulisse, 'data', datei), '[]\n')
const handdatei = [
  '- slug: katalog',
  '  art: beobachtet',
  '  url: https://www.netflix.com/title/1',
  '  zitat: "Folgen 1–12 mit deutschem Ton"',
  "  gesehenAm: '2026-11-26'",
  '  bisFolge: 12',
]
writeFileSync(join(kulisse, 'data', 'katalog-release-von-hand.yaml'), handdatei.join('\n') + '\n')
process.env.AK_ROOT = kulisse
const { rolleTermineAus } = await import('./bau/10-termine.ts')

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const titel = (id: number): Title => ({ id, streams: [{ platform: 'netflix', dub: true }] }) as unknown as Title
const release = (slug: string, titleId: number, art: 'weekly' | 'batch', schedule: Record<string, unknown>): Release =>
  ({ slug, titleId, name: slug, platform: 'netflix', platformUrl: 'https://www.netflix.com/title/1', releaseType: art, sprache: 'de', year: 2026, sources: ['https://www.anime2you.de/news/1'], schedule }) as unknown as Release
const wochen = release('woche', 1, 'weekly', { firstEpisodeDate: '2026-11-05', episodeCount: 2, episodeCountAssumed: true, observed: { 1: '2026-11-05', 2: '2026-11-12' }, lastEpisodeDate: '2026-11-12' })
const offen = release('offen', 2, 'weekly', { firstEpisodeDate: '2026-11-05', episodeCount: 2, episodeCountAssumed: true, observed: { 1: '2026-11-05' } })
const katalog = release('katalog', 3, 'batch', { firstEpisodeDate: '2026-11-26', episodeCount: 12 })

const lauf = rolleTermineAus({ releases: [wochen, offen, katalog], titles: new Map([1, 2, 3].map((i) => [i, titel(i)])), jpStart: new Map() })
const jeKennung = (slug: string) => lauf.events.filter((e) => e.releaseSlug === slug)
pruefe('Bau: angenommene Folgenzahl mit belegter letzter Folge entfällt am Release und an den Terminen', !wochen.schedule.episodeCountAssumed && jeKennung('woche').length > 0 && jeKennung('woche').every((e) => !e.episodeCountAssumed), jeKennung('woche'))
pruefe('Bau: ohne belegtes Ende bleibt die Annahme', !!offen.schedule.episodeCountAssumed && jeKennung('offen').some((e) => e.episodeCountAssumed))
const k = jeKennung('katalog')
pruefe('Bau: Beobachtung am Starttag macht den Katalog-Release belegt', k.length === 1 && k[0]!.katalog === 'belegt', k)

console.log(verletzt ? `\n${verletzt} Zusicherung(en) verletzt.` : '\nAlle Zusicherungen halten.')
process.exit(verletzt ? 1 : 0)
