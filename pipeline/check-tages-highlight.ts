/**
 * Zusicherungen zum Tageshighlight (`shared/tages-highlight.ts`) und zum Tagesbild (`lib/og-tag.ts`).
 * Feste Fixtures nach dem Stand vom 26.11.2026, kein Lesen von `public/data`; das Zeichnen läuft mit echtem `sharp`, ohne Cover.
 * Läuft in `check:logic`.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import type { Release, Title } from '../shared/types.ts'
import { waehleTageshighlight } from '../shared/tages-highlight.ts'
import { baueTagesbild, raeumeAlteTagesbilder, schreibeTagesbild, startseiteFuerTag, startseiteMitTagesbild, tagBildAlt, tagBildName, tagesKarte, tagesbildAlt } from './lib/og-tag.ts'

let fehler = 0
function pruefe(name: string, ok: boolean, info = ''): void {
  if (ok) return
  fehler++
  console.error(`FEHLER: ${name} ${info}`)
}

const HEUTE = '2026-11-26'
type Extra = Partial<Omit<Release, 'schedule'>> & { schedule?: Record<string, unknown> }
const titel = (id: number, dub: Title['dubConfidence'] = 'very-high', episodes = 12): Title => ({ id, titleDe: `T${id}`, dubConfidence: dub, episodes }) as unknown as Title
function release(slug: string, titleId: number, extra: Extra): Release {
  return { slug, titleId, name: `Name ${titleId}`, platform: 'netflix', releaseType: 'weekly', sources: ['https://quelle.example/'], ...extra, schedule: { firstEpisodeDate: HEUTE, ...extra.schedule } } as unknown as Release
}
const woechentlich = (slug: string, id: number, ep: number, extra: Partial<Release> = {}) =>
  release(slug, id, { ...extra, schedule: { firstEpisodeDate: '2026-09-01', episodeCount: 24, observed: { [ep]: HEUTE } } })
const sieger = (rs: Release[], t = titel_) => waehleTageshighlight(rs, t, HEUTE)

const titel_ = new Map([1, 2, 3, 4, 5, 6, 7, 8].map((id) => [id, titel(id)]))
const komplett = release('komplett-netflix', 1, { releaseType: 'batch', schedule: { episodeCount: 12 } })
const folge9 = woechentlich('serie-folge-9', 2, 9)
const folge1 = woechentlich('serie-folge-1', 3, 1, { platform: 'crunchyroll' })
const katalog = release('katalog-prime', 4, { releaseType: 'batch', platform: 'primevideo', dateMeaning: 'available-from' })

// Komplettstart mit belegter Folgenzahl schlägt Staffelstart, Katalog und Einzelfolge.
const heute = sieger([folge9, folge1, katalog, komplett])
pruefe('Komplettstart gewinnt', heute?.release.slug === 'komplett-netflix', heute?.release.slug)
pruefe('Text „Alle 12 Folgen“ auf Netflix', heute?.folge === 'Alle 12 Folgen' && heute?.ort === 'auf Netflix', `${heute?.folge}|${heute?.ort}`)
pruefe('Reihenfolge der Eingabe ändert nichts', sieger([komplett, katalog, folge1, folge9])?.release.slug === 'komplett-netflix')

// Rangfolge ohne den Sieger jeweils darunter.
pruefe('Katalog vor Staffelstart', sieger([folge1, katalog, folge9])?.release.slug === 'katalog-prime')
pruefe('Staffelstart (Folge 1) vor Einzelfolge', sieger([folge9, folge1])?.release.slug === 'serie-folge-1')
pruefe('Einzelfolge: „Folge 9“ auf Netflix', sieger([folge9])?.folge === 'Folge 9')
const erst = release('erst', 5, { releaseType: 'batch', erstausgabe: true })
pruefe('Erstausgabe vor Komplettstart', sieger([komplett, erst])?.release.slug === 'erst')
pruefe('Katalogtitel: „Neu im Angebot“, keine erfundene Folgenzahl', sieger([katalog])?.folge === 'Neu im Angebot')

// Filme (A1): Rang 4 nur für Kino; Stream-Film heißt „Film auf <Anbieter>“, Disc nie.
const kino = release('film-kino', 6, { releaseType: 'movie', platform: 'kino' })
const streamFilm = release('film-prime', 7, { releaseType: 'movie', platform: 'primevideo' })
const kinoSieger = sieger([folge1, kino])
pruefe('Kinofilm (Rang 4) vor Staffelstart', kinoSieger?.release.slug === 'film-kino', kinoSieger?.release.slug)
pruefe('Kinostart: „Kinostart“ im Kino', kinoSieger?.folge === 'Kinostart' && kinoSieger?.ort === 'im Kino', `${kinoSieger?.folge}|${kinoSieger?.ort}`)
const streamSieger = sieger([streamFilm])
pruefe('Stream-Film: „Film“ auf Prime Video, nie „Kino“', streamSieger?.folge === 'Film' && streamSieger?.ort === 'auf Prime Video', `${streamSieger?.folge}|${streamSieger?.ort}`)
pruefe('Disc-Film (Plattform disc, Typ movie) kein Highlight', sieger([{ ...streamFilm, platform: 'disc' } as Release]) === undefined)
pruefe('Disc-Plattform bei jedem Typ kein Highlight', sieger([{ ...komplett, platform: 'disc' } as Release]) === undefined)
pruefe('Plattform unbekannt kein Highlight', sieger([{ ...komplett, platform: 'unbekannt' } as Release]) === undefined)

// Folgenzahl (A2): nur aus dem Release, mindestens 2.
const text = (extra: Extra) => sieger([release('x', 1, { releaseType: 'batch', ...extra })])?.folge
pruefe('Ein Folge: kein „Alle 1 Folgen“', text({ schedule: { episodeCount: 1 } }) === 'Neu', String(text({ schedule: { episodeCount: 1 } })))
pruefe('Ohne belegte Folgenzahl keine Zahl, auch wenn der Titel 12 Folgen hat', text({}) === 'Neu', String(text({})))
pruefe('Angenommene Folgenzahl wird nicht genannt', text({ schedule: { episodeCount: 12, episodeCountAssumed: true } }) === 'Neu')
pruefe('Folgenblock: „Folgen 9–10“', sieger([release('block', 2, { schedule: { firstEpisodeDate: '2026-09-01', episodeCount: 24, observed: { 9: HEUTE, 10: HEUTE } } })])?.folge === 'Folgen 9–10')

// Synchro (A3): Sprachangabe am Release (offen/omu) = Synchro nicht belegt, nie Highlight.
pruefe('Sprache „offen“ kein Highlight', sieger([{ ...komplett, sprache: 'offen' }]) === undefined)
pruefe('Sprache „offen“ verliert nicht nur, sie fehlt: Folge daneben gewinnt', sieger([{ ...komplett, sprache: 'offen' }, folge9])?.release.slug === 'serie-folge-9')
pruefe('OmU kein Highlight', sieger([{ ...komplett, sprache: 'omu' }]) === undefined)

// Gleicher Rang: bessere Synchro-Stufe, dann Slug.
const mitNormal = new Map(titel_).set(6, titel(6, 'normal'))
pruefe('Gleicher Rang: höhere Synchro-Stufe gewinnt', sieger([release('a-batch', 6, { releaseType: 'batch' }), komplett], mitNormal)?.release.slug === 'komplett-netflix')
const zwei = [release('b-zwei', 7, { releaseType: 'batch' }), release('a-eins', 8, { releaseType: 'batch' })]
pruefe('Gleicher Rang und Stufe: kleinerer Slug gewinnt', sieger(zwei)?.release.slug === 'a-eins' && sieger([...zwei].reverse())?.release.slug === 'a-eins')

// Ausschlüsse: nie ohne Beleg.
pruefe('Ohne sources kein Highlight', sieger([{ ...komplett, sources: [] }]) === undefined)
pruefe('Schwache Synchro-Stufe (low) kein Highlight', sieger([komplett], new Map([[1, titel(1, 'low')]])) === undefined)
pruefe('Disc (Typ) zählt nicht', sieger([{ ...komplett, releaseType: 'disc' } as Release]) === undefined)
pruefe('Termin an anderem Tag kein Highlight', waehleTageshighlight([komplett], titel_, '2026-11-27') === undefined)
pruefe('Ohne Titel kein Highlight', sieger([komplett], new Map()) === undefined)
const fortgeschrieben = release('fort', 2, { schedule: { firstEpisodeDate: '2026-11-19', episodeCount: 24, observed: { 1: '2026-11-12', 2: '2026-11-19' } } })
pruefe('Fortgeschriebene Folge (estimated) kein Highlight', sieger([fortgeschrieben]) === undefined)
pruefe('TV-Sichtung kein Highlight', sieger([woechentlich('sichtung', 2, 9, { tvLetzteSichtung: HEUTE } as Partial<Release>)]) === undefined)
pruefe('Fernsehen kein Highlight (Wiederholung nicht ausschließbar)', sieger([{ ...folge9, platform: 'tv', sender: 'KiKA' } as Release]) === undefined)
const ausgeblieben = release('aus', 2, { schedule: { firstEpisodeDate: '2026-09-01', episodeCount: 24, observed: { 9: HEUTE }, verpasst: { 9: { erwartetAm: HEUTE } } } })
pruefe('Ausgebliebene Folge kein Highlight', sieger([ausgeblieben]) === undefined)

// Tagesbild-Dateien: Name mit Tag und Slug, 7 Tage Aufbewahrung, ein Bild je Tag.
const ordner = mkdtempSync(resolve(tmpdir(), 'og-tag-'))
const kein = async (): Promise<Buffer | undefined> => undefined
async function proben(): Promise<void> {
  mkdirSync(ordner, { recursive: true })
  for (const n of ['tag-2026-11-18-alt.jpg', 'tag-2026-11-19-alt.jpg', 'tag-2026-11-26-anderer.jpg', 'default.jpg', 'komplett-netflix.jpg']) writeFileSync(resolve(ordner, n), 'x')
  const weg = raeumeAlteTagesbilder(ordner, HEUTE, tagBildName(HEUTE, 'komplett-netflix'))
  pruefe('Nur 8 Tage altes und anderes Tagesbild von heute fliegen', weg.sort().join() === 'tag-2026-11-18-alt.jpg,tag-2026-11-26-anderer.jpg', weg.join())
  pruefe('Alles andere bleibt', readdirSync(ordner).sort().join() === 'default.jpg,komplett-netflix.jpg,tag-2026-11-19-alt.jpg', readdirSync(ordner).join())
  rmSync(ordner, { recursive: true, force: true })
  mkdirSync(ordner, { recursive: true })

  // schreibeTagesbild: erster Lauf, zweiter Lauf mit anderem Sieger (A4), kein Highlight.
  writeFileSync(resolve(ordner, 'tag-2026-11-18-uralt.jpg'), 'x')
  const a = await schreibeTagesbild([komplett, folge9], titel_, HEUTE, ordner, kein)
  const dateiA = resolve(ordner, tagBildName(HEUTE, 'komplett-netflix'))
  pruefe('Tagesbild geschrieben, Sieger zurückgegeben', a?.release.slug === 'komplett-netflix' && existsSync(dateiA))
  pruefe('Schreiben räumt Altes (8 Tage) weg', !existsSync(resolve(ordner, 'tag-2026-11-18-uralt.jpg')), readdirSync(ordner).join())
  writeFileSync(dateiA, 'unveraendert')
  await schreibeTagesbild([komplett, folge9], titel_, HEUTE, ordner, kein)
  pruefe('Vorhandene Datei bleibt (kein Neuzeichnen)', readFileSync(dateiA, 'utf8') === 'unveraendert')
  await schreibeTagesbild([komplett, folge9], titel_, HEUTE, ordner, kein, true)
  pruefe('Erzwingen zeichnet neu', readFileSync(dateiA, 'utf8') !== 'unveraendert')
  const b = await schreibeTagesbild([folge9], titel_, HEUTE, ordner, kein)
  pruefe('Anderer Sieger: neue Datei, Bild des früheren Siegers weg', b?.release.slug === 'serie-folge-9' && existsSync(resolve(ordner, tagBildName(HEUTE, 'serie-folge-9'))) && !existsSync(dateiA), readdirSync(ordner).join())
  const ohne = await schreibeTagesbild([], titel_, HEUTE, ordner, kein)
  pruefe('Ohne Highlight: undefined', ohne === undefined)
  rmSync(ordner, { recursive: true, force: true })
  mkdirSync(ordner, { recursive: true })
  await dateiTests()
}

// Alt-Text und Seite (A4/A5): Name und Alt kommen vom selben Sieger, nur mit vorhandener Datei.
async function dateiTests(): Promise<void> {
  const dist = resolve(ordner, 'dist')
  mkdirSync(resolve(dist, 'og'), { recursive: true })
  pruefe('Ohne Datei im dist kein Tagesbild', tagesbildAlt([komplett], titel_, HEUTE, dist) === undefined)
  writeFileSync(resolve(dist, 'og', tagBildName(HEUTE, 'serie-folge-9')), 'x')
  pruefe('Datei eines anderen Siegers zählt nicht', tagesbildAlt([komplett, folge9], titel_, HEUTE, dist) === undefined)
  const mitDatei = tagesbildAlt([folge9], titel_, HEUTE, dist)
  const h = sieger([folge9])!
  pruefe('Mit Datei: Name und Alt-Text des Siegers', mitDatei?.name === 'tag-2026-11-26-serie-folge-9.jpg' && mitDatei?.alt === tagBildAlt(h, HEUTE) && mitDatei.alt.startsWith('Heute neu: Name 2 — Folge 9 auf Netflix, '), mitDatei?.alt)
  pruefe('Ohne Highlight kein Tagesbild, auch mit Datei', tagesbildAlt([], titel_, HEUTE, dist) === undefined)
  const SITE = 'https://anime-kalender.de/'
  const seite = `<meta property="og:image"\n content="${SITE}og/default.jpg" />\n<meta property="og:image:alt"\n content="Marke" />\n<meta name="twitter:image"\n content="${SITE}og/default.jpg" />`
  const voll = startseiteFuerTag(seite, SITE, [folge9], titel_, HEUTE, dist)
  pruefe('Seite des Tages: beide Adressen und Alt vom Sieger', voll.split(`${SITE}og/tag-2026-11-26-serie-folge-9.jpg"`).length === 3 && voll.includes('Heute neu: Name 2') && !voll.includes('default.jpg'), voll)
  pruefe('Seite ohne Datei bleibt gleich', startseiteFuerTag(seite, SITE, [komplett], titel_, HEUTE, dist) === seite)
  const mit = startseiteMitTagesbild(seite, SITE, { name: 'tag-x.jpg', alt: 'Heute neu: "X"' })
  pruefe('Alt-Text ersetzt und maskiert', mit.includes('content="Heute neu: &quot;X&quot;"') && !mit.includes('Marke'), mit)
  pruefe('Ohne Tagesbild bleibt die Seite gleich', startseiteMitTagesbild(seite, SITE, undefined) === seite)
}

// Karteninhalt und Bauschritt (A5, A7): Badge „Heute neu“; ein Zeichenfehler bricht den Bau nicht.
const karte = tagesKarte(sieger([komplett])!, HEUTE)
pruefe('Karte: Badge „Heute neu“, Folge, Ort', karte.badges[0]?.text === 'Heute neu' && karte.folge === 'Alle 12 Folgen' && karte.fakt === 'auf Netflix' && karte.title === 'Name 1', JSON.stringify(karte))
async function schrittTests(): Promise<void> {
  const logs: string[] = []
  const warns: string[] = []
  const melde = { log: (t: string) => logs.push(t), warn: (t: string) => warns.push(t) }
  const bomb = async (): Promise<Buffer | undefined> => { throw new Error('Cover kaputt') }
  mkdirSync(ordner, { recursive: true })
  await baueTagesbild([komplett], titel_, HEUTE, ordner, bomb, false, melde)
  pruefe('Zeichenfehler: Warnung statt Abbruch', warns.length === 1 && warns[0]!.includes('Cover kaputt') && logs.length === 0, warns.join())
  await baueTagesbild([komplett], titel_, HEUTE, ordner, kein, false, melde)
  pruefe('Erfolg: Logzeile mit Titel', logs.length === 1 && logs[0]!.includes('Name 1') && warns.length === 1, logs.join())
  await baueTagesbild([], titel_, HEUTE, ordner, kein, false, melde)
  pruefe('Kein Highlight: Logzeile „Markenbild bleibt“', logs.length === 2 && logs[1]!.includes('Markenbild bleibt'), logs.join())
}

// Verdrahtung: die Hauptläufe rufen die geprüften Schritte (Quelltext, die Läufe selbst starten Netz und Bild).
const quelle = (d: string) => readFileSync(resolve(import.meta.dirname, d), 'utf8')
pruefe('build-og.ts ruft baueTagesbild', /await baueTagesbild\(releases, titleById, today, OUT_DIR,/.test(quelle('build-og.ts')))
pruefe('build-share-pages.ts ruft startseiteFuerTag mit dem Tag und dem dist', /startseiteFuerTag\(template, SITE, releases, volleTitel, today, DIST\)/.test(quelle('build-share-pages.ts')))

try {
  await proben()
  rmSync(ordner, { recursive: true, force: true })
  await schrittTests()
} finally {
  rmSync(ordner, { recursive: true, force: true })
}

if (fehler) {
  console.error(`${fehler} Zusicherung(en) verletzt`)
  process.exit(1)
}
console.log('Tageshighlight: alle Zusicherungen erfüllt')
