/**
 * Zusicherung zur Bauphase „Sprecher aus de.wikipedia“ (`bau/sprecher-wikipedia.ts`): der echte Aufruf `sprecherRollen`
 * in einer Wegwerf-Wurzel (`AK_ROOT`) mit Handliste, Sammlung und `voices/`. Wikipedia füllt nur Titel ohne andere Rollen,
 * `unsicher` nur bei anderweitig belegter Synchro und mit Vermerk, Quelle je Titel mitgeführt, zweiter Bau ändert nichts,
 * und der Sprecher-Index nennt keine vermutete Besetzung.
 *
 * Aufruf: npm run check:logic (steckt darin) oder `tsx pipeline/check-sprecher-wikipedia-bau.ts`
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Title } from '../shared/types.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const wurzel = mkdtempSync(join(tmpdir(), 'ak-sprecher-wikipedia-'))
process.env.AK_ROOT = wurzel
const voices = join(wurzel, 'public', 'data', 'voices')
mkdirSync(voices, { recursive: true })
mkdirSync(join(wurzel, 'data'), { recursive: true })
const schreibe = (pfad: string, inhalt: unknown): void => writeFileSync(join(wurzel, pfad), typeof inhalt === 'string' ? inhalt : JSON.stringify(inhalt))
const lies = (id: number): { roles: { character: string; actor: string; von?: string }[]; updatedAt: string; wikipedia?: { seite: string; url: string; unsicher?: string } } | undefined =>
  existsSync(join(voices, `${id}.json`)) ? JSON.parse(readFileSync(join(voices, `${id}.json`), 'utf8')) : undefined

schreibe(
  'data/wikipedia-sprecher-seiten.yaml',
  [
    '- seite: Serie A',
    '  titel:',
    '    - id: 900001',
    '    - id: 900002',
    '      unsicher: Film nicht genannt',
    '    - id: 900003',
    '      unsicher: Film nicht genannt',
    '- seite: Serie B',
    '  titel:',
    '    - id: 900004',
    '    - id: 900006',
    '      fassung: neue Serie',
    '    - id: 900007',
    '    - id: 900008',
    '- seite: Serie C',
    '  titel:',
    '    - id: 900009',
  ].join('\n'),
)
const zeile = (rolle: string, ...deutsch: [string, string | null][]) => ({ rolle, deutsch: deutsch.map(([sprecher, zusatz]) => ({ sprecher, zusatz })) })
schreibe('data/wikipedia-sprecher.json', {
  seiten: {
    'Serie A': { abgerufen: '2026-11-20', abschnitt: 'Synchronisation', zeilen: [zeile('Held', ['Anna Alt', null]), zeile('Freund', ['Bernd Bar', null])] },
    'Serie B': {
      abgerufen: '2026-11-21',
      abschnitt: 'Synchronsprecher',
      zeilen: [zeile('Vater', ['Carl Chor', 'alte Serie'], ['Dora Dur', 'neue Serie'], ['Emil Ems', 'neue Serie, ab Staffel 3']), zeile('Mutter', ['Fritz Fis', 'alte Serie'])],
    },
    'Serie C': { abgerufen: '2026-11-22', abschnitt: null, zeilen: [] },
  },
})
// Pflichtdateien, die `bau/grundlagen.ts` beim Laden liest.
for (const leer of ['data/kino-ankuendigungen.yaml', 'data/anisearch-ids-hand.yaml']) schreibe(leer, '')
schreibe('data/anisearch-sprecher.json', {})
schreibe('data/anisearch.json', { '900001': { anisearchId: 42 } })
const anilist = { titleId: 900004, updatedAt: '2026-01-01T00:00:00.000Z', roles: [{ character: 'Vater', actor: 'Gustav Gans' }] }
schreibe('public/data/voices/900004.json', anilist)
// Aus der Handliste gefallen: trug beim letzten Bau Wikipedia-Rollen.
schreibe('public/data/voices/900005.json', { titleId: 900005, updatedAt: '2026-11-01', roles: [{ character: 'X', actor: 'Y', von: 'wikipedia' }], wikipedia: { seite: 'Alt', url: 'u' } })
// Leerer Merker von AniList („dort keine deutschen Stimmen“).
schreibe('public/data/voices/900007.json', { titleId: 900007, updatedAt: '2026-02-02T00:00:00.000Z', roles: [] })

const titel = (id: number, dub: boolean): Title => ({ id, streams: dub ? [{ platform: 'crunchyroll', dub: true }] : [] }) as unknown as Title
const titles = new Map<number, Title>([900001, 900002, 900003, 900004, 900005, 900006, 900007, 900009].map((id) => [id, titel(id, id !== 900003)]))
titles.set(900003, titel(900003, false))

const { sprecherRollen } = await import('./bau/sprecher-anisearch.ts')
const { schreibeSprecherIndex } = await import('./bau/sprecher-index.ts')
const mit = sprecherRollen({ titles })

console.log('\nSprecher aus Wikipedia: Bauphase')
const a = lies(900001)
pruefe('Ziel ohne Rollen bekommt die Tabelle, von: wikipedia, Seite und Adresse, ohne unsicher', JSON.stringify(a?.roles) === JSON.stringify([{ character: 'Held', actor: 'Anna Alt', von: 'wikipedia' }, { character: 'Freund', actor: 'Bernd Bar', von: 'wikipedia' }]) && a?.wikipedia?.seite === 'Serie A' && a.wikipedia.url === 'https://de.wikipedia.org/wiki/Serie_A' && !('unsicher' in a.wikipedia), a)
pruefe('neue Datei trägt das Abrufdatum der Seite', a?.updatedAt === '2026-11-20', a?.updatedAt)
pruefe('unsicher mit belegter Synchro: Rollen und Vermerk mit Grund', lies(900002)?.wikipedia?.unsicher === 'Film nicht genannt' && lies(900002)?.roles.length === 2, lies(900002))
pruefe('unsicher ohne Synchrobeleg: keine Datei, kein Sprechermerker', lies(900003) === undefined && !mit.has(900003), lies(900003))
pruefe('Titel mit AniList-Rollen bleibt unverändert', JSON.stringify(lies(900004)) === JSON.stringify(anilist), lies(900004))
pruefe('aus der Handliste gefallen: Wikipedia-Rollen und Vermerk weg', JSON.stringify(lies(900005)?.roles) === '[]' && !lies(900005)?.wikipedia && !mit.has(900005), lies(900005))
pruefe('Fassung filtert, weiterer Zusatz bleibt am Namen', lies(900006)?.roles.map((r) => `${r.character}=${r.actor}`).join(';') === 'Vater=Dora Dur;Vater=Emil Ems (ab Staffel 3)', lies(900006)?.roles)
pruefe('leerer AniList-Merker wird gefüllt (ohne Fassung die ganze Tabelle, Zusatz am Namen) und behält sein Datum', lies(900007)?.roles.map((r) => r.actor).join(';') === 'Carl Chor (alte Serie);Dora Dur (neue Serie);Emil Ems (neue Serie, ab Staffel 3);Fritz Fis (alte Serie)' && lies(900007)?.updatedAt === '2026-02-02T00:00:00.000Z', lies(900007))
pruefe('Ziel ohne Titel im Datensatz bekommt keine Datei', lies(900008) === undefined)
pruefe('Seite ohne deutsche Spalte: keine Datei', lies(900009) === undefined)
pruefe('Sprechermerker genau für die Titel mit Rollen', [...mit].sort().join(',') === '900001,900002,900004,900006,900007', [...mit])

console.log('\nSprecher aus Wikipedia: zweiter Bau, Index')
const vorher = [900001, 900002, 900004, 900005, 900006, 900007].map((id) => JSON.stringify(lies(id))).join('\n')
sprecherRollen({ titles })
pruefe('zweiter Bau ändert nichts', [900001, 900002, 900004, 900005, 900006, 900007].map((id) => JSON.stringify(lies(id))).join('\n') === vorher)
schreibeSprecherIndex({ ausgeliefert: new Set(titles.keys()) })
const index = JSON.parse(readFileSync(join(wurzel, 'public', 'data', 'sprecher.json'), 'utf8')) as { sprecher: [string, number, string][] }
const namen = index.sprecher.map((s) => s[0])
pruefe('Index nennt sichere Wikipedia-Sprecher, aber keine nur vermutete Besetzung', namen.includes('Anna Alt') && namen.includes('Dora Dur') && index.sprecher.find((s) => s[0] === 'Anna Alt')?.[1] === 1, index.sprecher)

console.log('\nSprecher aus Wikipedia: aniSearch kommt dazu')
schreibe('data/anisearch-sprecher.json', { '42': { de: [{ figur: 'Held', sprecher: 'Hanna Hut' }] } })
sprecherRollen({ titles })
pruefe('aniSearch ersetzt die Wikipedia-Rollen ganz', JSON.stringify(lies(900001)?.roles) === JSON.stringify([{ character: 'Held', actor: 'Hanna Hut', von: 'anisearch' }]) && !lies(900001)?.wikipedia, lies(900001))

rmSync(wurzel, { recursive: true, force: true })
if (verletzt) {
  console.error(`\n${verletzt} Prüfung(en) verletzt`)
  process.exit(1)
}
console.log('\nSprecher aus Wikipedia (Bauphase): alle Prüfungen ok')
