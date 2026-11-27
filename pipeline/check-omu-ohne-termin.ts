/**
 * Zusicherung (Daniel, 14.10.2026 und 26.11.2026): Ein OmU-Termin erzeugt nie ein Ereignis, mit oder ohne Deutsch-Beleg.
 * Aufruf: `npm run check:logic`.
 */
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Release, Title } from '../shared/types.ts'

/* Der Bauschritt schreibt Dateien nach `data/`: Er läuft gegen eine leere Kulisse (`AK_ROOT`), nie gegen das Repo. */
const kulisse = mkdtempSync(join(tmpdir(), 'omu-ohne-termin-'))
mkdirSync(join(kulisse, 'data', 'curated'), { recursive: true })
for (const datei of ['ohne-synchro-von-hand.yaml', 'kino-ankuendigungen.yaml']) writeFileSync(join(kulisse, 'data', datei), '[]\n')
process.env.AK_ROOT = kulisse
const { rolleTermineAus } = await import('./bau/10-termine.ts')
const { omuOhneDeutschBeleg, hinweiseAnVerworfenen } = await import('./bau/omu-ohne-termin.ts')
const { expandEvents } = await import('../shared/logic.ts')
const { setzeMarkenFuerPruefung } = await import('./lib/anisearch-marke.ts')

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

setzeMarkenFuerPruefung({ 900005: 'd', 900006: 'p', 900007: '-' })
const titel = (id: number, extra: Partial<Title> = {}): Title => ({ id, streams: [{ platform: 'netflix' }], ...extra }) as unknown as Title
const titles = new Map<number, Title>([
  [900001, titel(900001)],
  [900002, titel(900002, { streams: [{ platform: 'netflix', dub: true }] as Title['streams'] })],
  [900003, titel(900003, { ankuendigung: { platform: 'netflix', synchro: 'angekuendigt' } as Title['ankuendigung'] })],
  [900004, titel(900004, { ankuendigung: { platform: 'netflix', synchro: 'offen' } as Title['ankuendigung'] })],
  [900005, titel(900005)],
  [900006, titel(900006)],
  [900007, titel(900007)],
  [900008, titel(900008, { deErstausgabe: { synchro: true } } as Partial<Title>)],
])
const omuRelease = (titleId: number): Release => ({ slug: `r${titleId}`, titleId, name: 'x', platform: 'netflix', releaseType: 'weekly', sprache: 'omu', schedule: { firstEpisodeDate: '2099-01-02', episodeCount: 2 } }) as unknown as Release

console.log('Releases mit Untertiteln allein erzeugen nie ein Ereignis (auch mit Deutsch-Beleg am Titel):')
for (const id of [900001, 900002, 900003, 900004, 900005, 900006, 900007, 900008]) {
  pruefe(`Titel ${id}: kein Termin`, expandEvents(omuRelease(id)).length === 0)
}
pruefe('„Synchro offen“ bleibt ein Termin', expandEvents({ ...omuRelease(1), sprache: 'offen' }).length === 2)
pruefe('ohne Sprachkennzeichnung bleibt der Termin', expandEvents({ ...omuRelease(1), sprache: undefined }).length === 2)
const omuOhneBeleg = [900001, 900004, 900007].map((id) => omuOhneDeutschBeleg(titles.get(id)))
pruefe('omuOhneDeutschBeleg gilt weiter für nurOmuTitel', omuOhneBeleg.every(Boolean) && !omuOhneDeutschBeleg(titles.get(900002)) && !omuOhneDeutschBeleg(titles.get(900003)))

/* Verdrahtung: der echte Bauschritt lässt die OmU-Termine weg, der Titel bleibt im Bestand. */
const release = (titleId: number, slug: string, hinweis?: string): Release => ({
  slug,
  ...(hinweis ? { hinweis } : {}),
  titleId,
  name: slug,
  platform: 'netflix',
  platformUrl: 'https://www.netflix.com/title/1',
  releaseType: 'weekly',
  sprache: 'omu',
  year: 2026,
  sources: ['https://www.anime2you.de/news/1'],
  schedule: { firstEpisodeDate: '2099-01-02', episodeCount: 2, episodeCountAssumed: true },
}) as unknown as Release
const warnungen: string[] = []
const warnOriginal = console.warn
console.warn = (...a: unknown[]) => void warnungen.push(a.join(' '))
const lauf = rolleTermineAus({
  releases: [release(900001, 'ohne-beleg', 'Nicht geplant.'), release(900002, 'mit-beleg', 'Mit Beleg.'), release(900001, 'ohne-beleg-stumm')],
  titles: new Map([[900001, titles.get(900001)!], [900002, titles.get(900002)!]]),
  jpStart: new Map(),
})
console.warn = warnOriginal
const hinweisWarnungen = warnungen.filter((w) => w.includes('erreicht keinen Besucher'))
pruefe('Bauschritt warnt genau einmal: Hinweis am verworfenen Titel', hinweisWarnungen.length === 1 && hinweisWarnungen[0].includes('„ohne-beleg“'), hinweisWarnungen)
const rein = hinweiseAnVerworfenen(titles, [release(900001, 'a', 'x'), release(900002, 'b', 'x'), release(900001, 'c'), { ...release(900001, 'd', 'x'), widerlegt: { am: '2026-11-01', grund: 'x', gemeldet: true } } as Release])
pruefe('Wächter: nur Hinweis an Titel ohne Beleg, nicht widerlegt', rein.length === 1 && rein[0].includes('„a“'), rein)
pruefe('Wächter: Weg ohne OmU hält den Titel im Bestand', hinweiseAnVerworfenen(titles, [release(900001, 'a', 'x'), { ...release(900001, 'e'), sprache: undefined } as Release]).length === 0)
const verbleibend = [...new Set(lauf.events.map((e) => e.titleId))]
pruefe('Bauschritt: kein Titel behält einen Untertitel-Termin, auch der mit Beleg nicht', verbleibend.length === 0, verbleibend)

setzeMarkenFuerPruefung(undefined)
if (verletzt) {
  console.error(`${verletzt} Verletzung(en).`)
  process.exit(1)
}
console.log('OmU-Termine: alle Fälle in Ordnung.')
