/**
 * Zusicherungen zum Tageshighlight (`shared/tages-highlight.ts`) und zum Tagesbild (`lib/og-tag.ts`).
 * Feste Fixtures nach dem Stand vom 26.11.2026 (Fool Night als einziger Komplettstart), kein Lesen von `public/data`.
 * Läuft in `check:logic`.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import type { Release, Title } from '../shared/types.ts'
import { waehleTageshighlight } from '../shared/tages-highlight.ts'
import { raeumeAlteTagesbilder, startseiteMitTagesbild, tagBildName } from './lib/og-tag.ts'

let fehler = 0
function pruefe(name: string, ok: boolean, info = ''): void {
  if (ok) return
  fehler++
  console.error(`FEHLER: ${name} ${info}`)
}

const HEUTE = '2026-11-26'
const titel = (id: number, dub: Title['dubConfidence'] = 'very-high', episodes = 12): Title => ({ id, titleDe: `T${id}`, dubConfidence: dub, episodes }) as unknown as Title
function release(slug: string, titleId: number, extra: Partial<Release> & { schedule?: Record<string, unknown> }): Release {
  return { slug, titleId, name: `Name ${titleId}`, platform: 'netflix', releaseType: 'weekly', sources: ['https://quelle.example/'], ...extra, schedule: { firstEpisodeDate: HEUTE, ...extra.schedule } } as unknown as Release
}
const woechentlich = (slug: string, id: number, ep: number, extra: Partial<Release> = {}) =>
  release(slug, id, { ...extra, schedule: { firstEpisodeDate: '2026-09-01', episodeCount: 24, observed: { [ep]: HEUTE } } })

const titel_ = new Map([1, 2, 3, 4, 5, 6].map((id) => [id, titel(id)]))
const fool = release('fool-night', 1, { releaseType: 'batch', sprache: 'offen' })
const folge9 = woechentlich('serie-folge-9', 2, 9)
const folge1 = woechentlich('serie-folge-1', 3, 1, { platform: 'crunchyroll' })
const katalog = release('katalog-prime', 4, { releaseType: 'batch', platform: 'primevideo', dateMeaning: 'available-from', sprache: 'offen' })

// Der Fall vom 26.11.2026: Komplettstart schlägt Staffelstart, Katalog und Einzelfolge.
const heute = waehleTageshighlight([folge9, folge1, katalog, fool], titel_, HEUTE)
pruefe('Fool Night gewinnt am 26.11.2026', heute?.release.slug === 'fool-night', heute?.release.slug)
pruefe('Text „Alle 12 Folgen“ auf Netflix', heute?.folge === 'Alle 12 Folgen' && heute?.ort === 'auf Netflix', `${heute?.folge}|${heute?.ort}`)
pruefe('Reihenfolge der Eingabe ändert nichts', waehleTageshighlight([fool, katalog, folge1, folge9], titel_, HEUTE)?.release.slug === 'fool-night')

// Rangfolge ohne den Sieger jeweils darunter.
pruefe('Katalog vor Staffelstart', waehleTageshighlight([folge1, katalog, folge9], titel_, HEUTE)?.release.slug === 'katalog-prime')
pruefe('Staffelstart (Folge 1) vor Einzelfolge', waehleTageshighlight([folge9, folge1], titel_, HEUTE)?.release.slug === 'serie-folge-1')
pruefe('Einzelfolge: „Folge 9“ auf Netflix', waehleTageshighlight([folge9], titel_, HEUTE)?.folge === 'Folge 9')
const erst = release('erst', 5, { releaseType: 'batch', erstausgabe: true })
pruefe('Erstausgabe vor Komplettstart', waehleTageshighlight([fool, erst], titel_, HEUTE)?.release.slug === 'erst')
pruefe('Katalogtitel: „Neu im Angebot“, keine erfundene Folgenzahl', waehleTageshighlight([katalog], titel_, HEUTE)?.folge === 'Neu im Angebot')

// Gleicher Rang: bessere Synchro-Stufe, dann Slug.
const mitNormal = new Map(titel_).set(6, titel(6, 'normal'))
pruefe('Gleicher Rang: höhere Synchro-Stufe gewinnt', waehleTageshighlight([release('a-batch', 6, { releaseType: 'batch' }), fool], mitNormal, HEUTE)?.release.slug === 'fool-night')

// Ausschlüsse: nie ohne Beleg.
pruefe('Ohne sources kein Highlight', waehleTageshighlight([{ ...fool, sources: [] }], titel_, HEUTE) === undefined)
pruefe('OmU kein Highlight', waehleTageshighlight([{ ...fool, sprache: 'omu' }], titel_, HEUTE) === undefined)
pruefe('Schwache Synchro-Stufe (low) kein Highlight', waehleTageshighlight([fool], new Map([[1, titel(1, 'low')]]), HEUTE) === undefined)
pruefe('Disc zählt nicht', waehleTageshighlight([{ ...fool, releaseType: 'disc' } as Release], titel_, HEUTE) === undefined)
pruefe('Termin an anderem Tag kein Highlight', waehleTageshighlight([fool], titel_, '2026-11-27') === undefined)
pruefe('Ohne Titel kein Highlight', waehleTageshighlight([fool], new Map(), HEUTE) === undefined)
const fortgeschrieben = release('fort', 2, { schedule: { firstEpisodeDate: '2026-11-19', episodeCount: 24, observed: { 1: '2026-11-12', 2: '2026-11-19' } } })
pruefe('Fortgeschriebene Folge (estimated) kein Highlight', waehleTageshighlight([fortgeschrieben], titel_, HEUTE) === undefined)

// Tagesbild-Dateien: Name mit Datum, 7 Tage Aufbewahrung.
const ordner = mkdtempSync(resolve(tmpdir(), 'og-tag-'))
try {
  mkdirSync(ordner, { recursive: true })
  for (const n of ['tag-2026-11-18.jpg', 'tag-2026-11-19.jpg', 'tag-2026-11-26.jpg', 'default.jpg', fool.slug + '.jpg']) writeFileSync(resolve(ordner, n), 'x')
  const weg = raeumeAlteTagesbilder(ordner, HEUTE)
  pruefe('Nur das Tagesbild vom 18.11. fliegt (8 Tage alt)', weg.join() === 'tag-2026-11-18.jpg', weg.join())
  pruefe('Alles andere bleibt', readdirSync(ordner).sort().join() === 'default.jpg,fool-night.jpg,tag-2026-11-19.jpg,tag-2026-11-26.jpg', readdirSync(ordner).join())
} finally {
  rmSync(ordner, { recursive: true, force: true })
}

// Startseite: nur og:image, twitter:image und Alt wechseln.
const SITE = 'https://anime-kalender.de/'
const seite = `<meta property="og:image"\n content="${SITE}og/default.jpg" />\n<meta property="og:image:alt"\n content="Marke" />\n<meta name="twitter:image"\n content="${SITE}og/default.jpg" />`
const mit = startseiteMitTagesbild(seite, SITE, HEUTE, 'Heute neu: "X"')
pruefe('Beide Bild-Adressen zeigen auf das Tagesbild', mit.split(`${SITE}og/${tagBildName(HEUTE)}"`).length === 3 && !mit.includes('default.jpg'), mit)
pruefe('Alt-Text ersetzt und maskiert', mit.includes('content="Heute neu: &quot;X&quot;"') && !mit.includes('Marke'), mit)
pruefe('Ohne Tagesbild bleibt die Seite gleich', startseiteMitTagesbild(seite, SITE, HEUTE, undefined) === seite)

if (fehler) {
  console.error(`${fehler} Zusicherung(en) verletzt`)
  process.exit(1)
}
console.log('Tageshighlight: alle Zusicherungen erfüllt')
