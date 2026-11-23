/**
 * Zusicherungen zur Rücknahme widerlegter Quellen aus `data/quellen-historie.json` (Aufgabe 16, `lib/quellen-ruecknahme.ts`):
 * Was für den Titel in `data/belege-entfernt.yaml` steht, fällt aus der Historie; was nur nicht mehr am Termin hängt, bleibt
 * als überholt; was noch in `sources` steht, bleibt aktuell. Läuft über `quellenPflegen` auf einer Kulisse (`AK_ROOT`), mit
 * erfundenen Titeln. Dieselbe Adresse an einem anderen Titel bleibt (Register gilt für Kennung und Adresse).
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Quelle, Release } from '../shared/types.ts'

const wurzel = mkdtempSync(join(tmpdir(), 'quellen-ruecknahme-'))
process.env.AK_ROOT = wurzel
mkdirSync(join(wurzel, 'data'), { recursive: true })
/* Beim Laden liest `bau/grundlagen.ts` diese Handdatei; leer genügt. */
writeFileSync(join(wurzel, 'data', 'kino-ankuendigungen.yaml'), '[]\n')

let fehler = 0
function pruefe(name: string, bedingung: boolean, gefunden?: unknown): void {
  if (bedingung) return void console.log(`  ✓ ${name}`)
  fehler++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const TERMIN = '2026-10-02'
const adresse = (n: string) => `https://www.anisearch.de/anime/${n}`
const alt = (url: string, extra: Partial<Quelle> = {}): Quelle => ({ url, name: 'anisearch.de', gesehenAm: '2026-10-01', stand: 'aktuell', ...extra })
const release = (slug: string, titleId: number, sources: string[]): Release =>
  ({ slug, titleId, name: slug, platform: 'crunchyroll', releaseType: 'weekly', schedule: { firstEpisodeDate: TERMIN }, sources }) as unknown as Release

const FALSCH_1 = adresse('20083')
const FALSCH_2 = adresse('20084')
const FEHLT_MIT_TAG = adresse('30001')
const FEHLT_OHNE_TAG = adresse('30002')
const BELEGT_1 = adresse('20704')
const BELEGT_2 = adresse('20705')

try {
  writeFileSync(
    join(wurzel, 'data', 'belege-entfernt.yaml'),
    [FALSCH_1, FALSCH_2].map((url) => `- anilistId: 101\n  url: ${url}\n  grund: 'Seite gehört einem anderen Titel (Fremdzuordnung)'\n  entferntAm: '2026-10-01'\n`).join(''),
  )
  writeFileSync(
    join(wurzel, 'data', 'quellen-historie.json'),
    JSON.stringify({
      a: [alt(FALSCH_1, { stand: 'vermutlich-ueberholt' }), alt(FALSCH_2), alt(FEHLT_MIT_TAG, { sagt: '2026-09-01', stand: 'ueberholt' }), alt(FEHLT_OHNE_TAG, { stand: 'vermutlich-ueberholt' }), alt(BELEGT_1), alt(BELEGT_2)],
      /* Dieselbe Adresse an einem anderen Titel: das Register nennt nur 101. */
      b: [alt(FALSCH_1)],
    }),
  )
  const { quellenPflegen } = await import('./bau/nebendateien.ts')
  const a = release('a', 101, [BELEGT_1, BELEGT_2])
  const b = release('b', 102, [BELEGT_1])
  quellenPflegen([a, b])
  const historie = JSON.parse(readFileSync(join(wurzel, 'data', 'quellen-historie.json'), 'utf8')) as Record<string, Quelle[]>
  const stand = (liste: Quelle[] | undefined, url: string) => liste?.find((q) => q.url === url)?.stand

  console.log('\nWiderlegt: steht für den Titel in belege-entfernt.yaml')
  pruefe('beide widerlegten Seiten fehlen in der Historie', stand(historie['a'], FALSCH_1) === undefined && stand(historie['a'], FALSCH_2) === undefined, historie['a'])
  pruefe('und in den ausgelieferten Quellen', !a.quellen?.some((q) => q.url === FALSCH_1 || q.url === FALSCH_2), a.quellen)

  console.log('\nNur fehlend: nicht am Termin, aber nicht widerlegt')
  pruefe('mit eigenem anderen Tag: überholt', stand(historie['a'], FEHLT_MIT_TAG) === 'ueberholt', historie['a'])
  pruefe('ohne eigenen Tag: vermutlich überholt', stand(historie['a'], FEHLT_OHNE_TAG) === 'vermutlich-ueberholt', historie['a'])

  console.log('\nWeiter belegt: steht noch in sources')
  pruefe('beide bleiben aktuell', stand(historie['a'], BELEGT_1) === 'aktuell' && stand(historie['a'], BELEGT_2) === 'aktuell', historie['a'])

  console.log('\nRegister gilt für Kennung und Adresse')
  pruefe('dieselbe Adresse an Titel 102 bleibt stehen', historie['b']?.some((q) => q.url === FALSCH_1) === true, historie['b'])
} finally {
  rmSync(wurzel, { recursive: true, force: true })
}

if (fehler) {
  console.error(`\n${fehler} Zusicherung(en) verletzt`)
  process.exit(1)
}
console.log('\nAlles in Ordnung')
