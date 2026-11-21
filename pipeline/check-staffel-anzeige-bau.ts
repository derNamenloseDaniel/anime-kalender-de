/**
 * Verdrahtung: der echte Bauschritt `rolleTermineAus` schreibt `staffelFolge` an den Termin eines Titels mit Staffelgrenzen
 * (Horizonte Staffel 4: Folge 137 → [4, 1], 21.11.2026), nicht an Titel ohne Grenzen. Kulisse über `AK_ROOT` mit eigener
 * Staffeldatei. Aufruf: npx tsx pipeline/check-staffel-anzeige-bau.ts (läuft in `check:logic`).
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Release, Title } from '../shared/types.ts'

/* Der Bauschritt schreibt Dateien nach `data/`: Er läuft gegen eine leere Kulisse (`AK_ROOT`), nie gegen das Repo. */
const kulisse = mkdtempSync(join(tmpdir(), 'staffel-anzeige-bau-'))
mkdirSync(join(kulisse, 'data', 'curated'), { recursive: true })
for (const datei of ['ohne-synchro-von-hand.yaml', 'kino-ankuendigungen.yaml']) writeFileSync(join(kulisse, 'data', datei), '[]\n')
writeFileSync(
  join(kulisse, 'data', 'curated', 'horizonte-staffeln.yaml'),
  ['titel:', '- anilistId: 900421', '  staffeln:', '    - { nr: 1, von: 1, bis: 3, folgen: 3 }', '    - { nr: 2, von: 4, offen: true }', ''].join('\n'),
)
process.env.AK_ROOT = kulisse
const { rolleTermineAus } = await import('./bau/10-termine.ts')

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const titel = (id: number): Title => ({ id, streams: [{ platform: 'rtlplus', dub: true }] }) as unknown as Title
const release = (titleId: number, slug: string, folge: number): Release =>
  ({
    slug,
    titleId,
    name: slug,
    platform: 'rtlplus',
    platformUrl: 'https://plus.rtl.de/probe',
    releaseType: 'batch',
    year: 2026,
    sources: ['https://www.anime2you.de/news/1'],
    schedule: { firstEpisodeDate: '2026-11-20', firstEpisodeNumber: folge, episodeCount: 1 },
  }) as unknown as Release
try {
  const { events } = rolleTermineAus({
    releases: [release(900421, 'mit-staffeln', 4), release(900422, 'ohne-staffeln', 4)],
    titles: new Map([[900421, titel(900421)], [900422, titel(900422)]]),
    jpStart: new Map(),
  })
  const je = Object.fromEntries(events.map((e) => [e.releaseSlug, e.staffelFolge ?? null]))
  pruefe('Titel mit Grenzen: Folge 4 → Staffel 2 Folge 1', JSON.stringify(je['mit-staffeln']) === '[2,1]', je)
  pruefe('Titel ohne Grenzen: kein Feld', je['ohne-staffeln'] === null, je)
} finally {
  rmSync(kulisse, { recursive: true, force: true })
}
if (verletzt) {
  console.error(`${verletzt} Verletzung(en).`)
  process.exit(1)
}
console.log('check-staffel-anzeige-bau: ok (Bauschritt schreibt Staffel und Folge nur bei Staffelgrenzen)')
