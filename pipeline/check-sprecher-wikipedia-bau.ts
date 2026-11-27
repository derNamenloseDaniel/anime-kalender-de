/**
 * Zusicherung zur Bauphase „Sprecher aus de.wikipedia“ (`bau/sprecher-wikipedia.ts`): der echte Aufruf `sprecherRollen`
 * in einer Wegwerf-Wurzel (`AK_ROOT`) mit Handliste, Sammlung und `voices/`. Wikipedia füllt nur Titel ohne andere Rollen,
 * `unsicher` nur bei anderweitig belegter Synchro und mit Vermerk, Quelle je Titel mitgeführt, zweiter Bau ändert nichts,
 * und der Sprecher-Index nennt keine vermutete Besetzung.
 *
 * Aufruf: npm run check:logic (steckt darin) oder `tsx pipeline/check-sprecher-wikipedia-bau.ts`
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
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
const lies = (id: number): { titleId: number; roles: { character: string; actor: string; von?: string }[]; updatedAt: string; wikipedia?: { seite: string; url: string; unsicher?: string } } | undefined =>
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
    '    - id: 900011',
    '      unsicher: Film nicht genannt',
    '    - id: 900012',
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
    'Serie A': { abgerufen: '2026-11-20', abschnitt: 'Synchronisation', zeilen: [zeile('Held', ['Anna Alt', null]), zeile('Freund', ['Bernd Bar', null]), zeile('Held', ['Anna Alt', null])] },
    'Serie B': {
      abgerufen: '2026-11-21',
      abschnitt: 'Synchronsprecher',
      zeilen: [zeile('Vater', ['Carl Chor', 'alte Serie'], ['Dora Dur', 'neue Serie'], ['Emil Ems', 'neue Serie, ab Staffel 3']), zeile('Mutter', ['Fritz Fis', 'alte Serie']), zeile('Onkel', ['Gerd Gut (Staffel 2)', 'neue Serie'])],
    },
    'Serie C': { abgerufen: '2026-11-22', abschnitt: null, zeilen: [] },
  },
})
// Pflichtdateien, die `bau/grundlagen.ts` beim Laden liest.
for (const leer of ['data/kino-ankuendigungen.yaml', 'data/anisearch-ids-hand.yaml']) schreibe(leer, '')
schreibe('data/anisearch-sprecher.json', {})
schreibe('data/anisearch.json', { '900001': { anisearchId: 42 }, '900010': { anisearchId: 43 } })
const anilist = { titleId: 900004, updatedAt: '2026-01-01T00:00:00.000Z', roles: [{ character: 'Vater', actor: 'Gustav Gans' }] }
schreibe('public/data/voices/900004.json', anilist)
// Aus der Handliste gefallen: trug beim letzten Bau Wikipedia-Rollen.
schreibe('public/data/voices/900005.json', { titleId: 900005, updatedAt: '2026-11-01', roles: [{ character: 'X', actor: 'Y', von: 'wikipedia' }], wikipedia: { seite: 'Alt', url: 'u' } })
// Leerer Merker von AniList („dort keine deutschen Stimmen“).
schreibe('public/data/voices/900007.json', { titleId: 900007, updatedAt: '2026-02-02T00:00:00.000Z', roles: [] })
// Kein Ziel: AniList-Rolle plus Wikipedia-Rest eines früheren Baus; die aniSearch-Phase darf den Rest weder zählen noch behalten.
schreibe('public/data/voices/900010.json', { titleId: 900010, updatedAt: '2026-03-03', roles: [{ character: 'Held', actor: 'Ida Igel' }, { character: 'Alt', actor: 'Rest', von: 'wikipedia' }], wikipedia: { seite: 'Alt', url: 'u' } })
schreibe('public/data/voices/900012.json', '{kaputt')

const titel = (id: number, dub: boolean): Title => ({ id, streams: dub ? [{ platform: 'crunchyroll', dub: true }] : [] }) as unknown as Title
const titles = new Map<number, Title>([900001, 900002, 900003, 900004, 900005, 900006, 900007, 900009, 900010, 900012].map((id) => [id, titel(id, id !== 900003)]))
// Abgeleitete Synchro ist kein Beleg für eine vermutete Besetzung.
titles.set(900011, { id: 900011, streams: [{ platform: 'crunchyroll', dub: true, dubAbgeleitet: true }] } as unknown as Title)

const zeilen: string[] = []
const echtLog = console.log
const echtWarn = console.warn
const mitschreiben = (): void => {
  console.log = (...a: unknown[]) => void zeilen.push(a.join(' '))
  console.warn = (...a: unknown[]) => void zeilen.push(a.join(' '))
}
const zurueck = (): void => {
  console.log = echtLog
  console.warn = echtWarn
}
const { sprecherRollen } = await import('./bau/sprecher-anisearch.ts')
const { schreibeSprecherIndex } = await import('./bau/sprecher-index.ts')
mitschreiben()
const mit = sprecherRollen({ titles })
zurueck()

console.log('\nSprecher aus Wikipedia: Bauphase')
const a = lies(900001)
pruefe('Ziel ohne Rollen bekommt die Tabelle, von: wikipedia, Seite und Adresse, ohne unsicher', JSON.stringify(a?.roles) === JSON.stringify([{ character: 'Held', actor: 'Anna Alt', von: 'wikipedia' }, { character: 'Freund', actor: 'Bernd Bar', von: 'wikipedia' }]) && a?.wikipedia?.seite === 'Serie A' && a.wikipedia.url === 'https://de.wikipedia.org/wiki/Serie_A' && !('unsicher' in a.wikipedia), a)
pruefe('neue Datei trägt das Abrufdatum der Seite', a?.updatedAt === '2026-11-20', a?.updatedAt)
pruefe('unsicher mit belegter Synchro: Rollen und Vermerk mit Grund', lies(900002)?.wikipedia?.unsicher === 'Film nicht genannt' && lies(900002)?.roles.length === 2, lies(900002))
pruefe('unsicher ohne Synchrobeleg: keine Datei, kein Sprechermerker', lies(900003) === undefined && !mit.has(900003), lies(900003))
pruefe('Titel mit AniList-Rollen bleibt unverändert', JSON.stringify(lies(900004)) === JSON.stringify(anilist), lies(900004))
pruefe('aus der Handliste gefallen: Wikipedia-Rollen und Vermerk weg', JSON.stringify(lies(900005)?.roles) === '[]' && !lies(900005)?.wikipedia && !mit.has(900005), lies(900005))
pruefe('Fassung filtert, weiterer Zusatz und Klammer am Namen wandern an die Figur', lies(900006)?.roles.map((r) => `${r.character}=${r.actor}`).join(';') === 'Vater=Dora Dur;Vater (ab Staffel 3)=Emil Ems;Onkel (Staffel 2)=Gerd Gut', lies(900006)?.roles)
pruefe('leerer AniList-Merker wird gefüllt (ohne Fassung die ganze Tabelle, Zusatz an der Figur) und behält sein Datum', lies(900007)?.roles.map((r) => `${r.character}=${r.actor}`).join(';') === 'Vater (alte Serie)=Carl Chor;Vater (neue Serie)=Dora Dur;Vater (neue Serie, ab Staffel 3)=Emil Ems;Mutter (alte Serie)=Fritz Fis;Onkel (neue Serie, Staffel 2)=Gerd Gut' && lies(900007)?.updatedAt === '2026-02-02T00:00:00.000Z', lies(900007))
pruefe('Ziel ohne Titel im Datensatz bekommt keine Datei', lies(900008) === undefined)
pruefe('Seite ohne deutsche Spalte: keine Datei', lies(900009) === undefined)
pruefe('Sprechermerker genau für die Titel mit Rollen (auch AniList ohne Ziel)', [...mit].sort().join(',') === '900001,900002,900004,900006,900007,900010,900012', [...mit])
pruefe('unsicher mit nur abgeleiteter Synchro: keine Datei', lies(900011) === undefined, lies(900011))
pruefe('Titel ohne Ziel: Wikipedia-Rest und Vermerk weg, AniList-Rolle bleibt', JSON.stringify(lies(900010)?.roles) === '[{"character":"Held","actor":"Ida Igel"}]' && !lies(900010)?.wikipedia, lies(900010))
pruefe('unlesbare Sprecherdatei wird gemeldet und neu geschrieben', lies(900012)?.wikipedia?.seite === 'Serie A' && zeilen.some((z) => z.includes('900012.json unlesbar (SyntaxError:') && z.includes('JSON')), zeilen)
pruefe('Doppelte Tabellenzeile ergibt eine Rolle (900001 oben: zwei Rollen)', lies(900001)?.roles.length === 2)
pruefe(
  'Zählzeile der Phase',
  zeilen.includes('[pipeline] Sprecher aus Wikipedia: 5 Titel (1 ≈ unsicher); übergangen: 1 mit anderer Quelle, 2 unsicher ohne Synchrobeleg, 1 ohne Rollen, 1 ohne Titel'),
  zeilen.filter((z) => z.includes('Wikipedia')),
)

console.log('\nSprecher aus Wikipedia: zweiter Bau, Index')
const alle = [900001, 900002, 900004, 900005, 900006, 900007, 900010, 900012]
const vorher = alle.map((id) => JSON.stringify(lies(id))).join('\n')
const zeiten = alle.map((id) => statSync(join(voices, `${id}.json`)).mtimeMs).join(',')
mitschreiben()
sprecherRollen({ titles })
zurueck()
pruefe('zweiter Bau ändert nichts und schreibt keine Datei neu', alle.map((id) => JSON.stringify(lies(id))).join('\n') === vorher && alle.map((id) => statSync(join(voices, `${id}.json`)).mtimeMs).join(',') === zeiten)
zeilen.length = 0
mitschreiben()
schreibeSprecherIndex({ ausgeliefert: new Set(titles.keys()) })
zurueck()
pruefe('Indexzeile nennt die eine vermutete Besetzung, keine fremden Dateien', zeilen.some((z) => z.endsWith('gepackt); 1 Titel mit vermuteter Wikipedia-Besetzung nicht im Index')), zeilen)
const index = JSON.parse(readFileSync(join(wurzel, 'public', 'data', 'sprecher.json'), 'utf8')) as { sprecher: [string, number, string][] }
const namen = index.sprecher.map((s) => s[0])
pruefe('Index nennt sichere Wikipedia-Sprecher, aber keine nur vermutete Besetzung (Anna Alt: 900001 und 900012, nicht 900002), Namen ohne Zusatz', namen.includes('Anna Alt') && index.sprecher.find((s) => s[0] === 'Anna Alt')?.[1] === 2 && index.sprecher.find((s) => s[0] === 'Emil Ems')?.[1] === 2 && !namen.some((n) => n.includes('(')), index.sprecher)

console.log('\nSprecher aus Wikipedia: aniSearch kommt dazu')
schreibe('data/anisearch-sprecher.json', { '42': { de: [{ figur: 'Held', sprecher: 'Hanna Hut' }] }, '43': { de: [{ figur: 'Held', sprecher: 'Hanna Hut' }] } })
sprecherRollen({ titles })
pruefe('aniSearch ersetzt die Wikipedia-Rollen ganz', JSON.stringify(lies(900001)?.roles) === JSON.stringify([{ character: 'Held', actor: 'Hanna Hut', von: 'anisearch' }]) && !lies(900001)?.wikipedia, lies(900001))
pruefe('aniSearch-Phase behält die AniList-Rolle mit anderem Sprecher, Kennung und Datum der Datei', lies(900010)?.titleId === 900010 && lies(900010)?.updatedAt === '2026-03-03' && JSON.stringify(lies(900010)?.roles) === '[{"character":"Held","actor":"Hanna Hut","von":"anisearch"},{"character":"Held","actor":"Ida Igel"}]', lies(900010))

console.log('\nSprecher aus Wikipedia: Sammlung fehlt (Bau vor dem ersten Sammellauf)')
rmSync(join(wurzel, 'data', 'wikipedia-sprecher.json'))
const ohne = sprecherRollen({ titles })
pruefe('ohne Sammlung: kein Abbruch, Wikipedia-Rollen fallen weg', JSON.stringify(lies(900002)?.roles) === '[]' && !ohne.has(900002) && ohne.has(900004) && ohne.has(900010), lies(900002))

console.log('\nSprecher aus Wikipedia: Handliste fehlt (Bau-Kulisse anderer Prüfungen)')
rmSync(join(wurzel, 'data', 'wikipedia-sprecher-seiten.yaml'))
zeilen.length = 0
mitschreiben()
let ohneListe: Set<number> | undefined
let abbruch: unknown
try {
  ohneListe = sprecherRollen({ titles })
} catch (e) {
  abbruch = e
}
zurueck()
pruefe('ohne Handliste: kein Abbruch, Warnzeile nennt die Datei, AniList-Rollen bleiben', !abbruch && !!ohneListe?.has(900010) && zeilen.some((z) => z.endsWith('wikipedia-sprecher-seiten.yaml nicht lesbar (fehlt): keine Wikipedia-Sprecher')), abbruch ? String(abbruch) : zeilen)

rmSync(wurzel, { recursive: true, force: true })
if (verletzt) {
  console.error(`\n${verletzt} Prüfung(en) verletzt`)
  process.exit(1)
}
console.log('\nSprecher aus Wikipedia (Bauphase): alle Prüfungen ok')
