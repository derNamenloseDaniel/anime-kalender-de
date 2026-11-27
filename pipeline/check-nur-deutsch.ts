/**
 * Wächter (Daniel, 26.11.2026): „OmU is not allowed to be displayed anywhere, omu is only allowed in our data.“
 * Jede Ableitung für die Oberfläche bekommt eine OmU-Fixture und darf sie nicht zeigen: Kalendertermine, ICS, Wege-Pillen im Panel,
 * News, Hinweise und die Texte der Oberfläche. Zweiter Teil: ein veralteter Ankündigungs-Hinweis (Black Clover Staffel 2) bricht die Prüfung.
 * Aufruf: `npm run check:logic`.
 */
import { readFileSync } from 'node:fs'
import { expandEvents, merkbareTermine } from '../shared/logic.ts'
import { buildIcs } from '../shared/ics.ts'
import { fuerBesucher } from '../shared/nur-deutsch.ts'
import { wegeOhneNurUntertitel } from '../web/src/components/detail/legende-zeilen.ts'
import { ohneUntertitelMeldungen } from './lib/news-omu.ts'
import { veralteteSynchroHinweise } from './lib/veraltete-hinweise.ts'
import { pruefeErgebnis } from './lib/pruefung.ts'
import type { Release, ReleaseEvent, Title, NewsEintrag } from '../shared/types.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}
const HEUTE = '2026-11-26'
const release = (slug: string, extra: Partial<Release> = {}): Release =>
  ({
    slug,
    titleId: 1,
    name: slug,
    platform: 'crunchyroll',
    platformUrl: 'https://www.crunchyroll.com/de/series/X',
    releaseType: 'weekly',
    year: 2026,
    sources: ['https://example.org/a'],
    schedule: { firstEpisodeDate: '2026-11-28', episodeCount: 12, episodeCountAssumed: true },
    ...extra,
  }) as unknown as Release

console.log('Kalendertermine:')
const omu = release('x-omu', { sprache: 'omu' })
pruefe('Release mit Untertiteln allein: kein Ereignis', expandEvents(omu).length === 0)
pruefe('… und nichts zum Merken', merkbareTermine(omu, HEUTE).length === 0)
pruefe('Gegenprobe: dasselbe Release ohne Sprache hat Termine', expandEvents({ ...omu, sprache: undefined }).length > 0)
pruefe('Gegenprobe: „Synchro offen“ bleibt ein Termin', expandEvents({ ...omu, sprache: 'offen' }).length > 0)
pruefe('fuerBesucher entfernt nur die Untertitel-Releases', fuerBesucher([omu, { ...omu, sprache: undefined }, { ...omu, sprache: 'offen' }]).length === 2)

console.log('ICS und Feeds:')
const ereignis = { id: 'e1', releaseSlug: 'x-omu', titleId: 1, date: '2026-11-28', name: 'Black Clover', platform: 'crunchyroll', releaseType: 'weekly', episode: 1, time: '17:00', sprache: 'omu' } as unknown as ReleaseEvent
const ics = buildIcs([ereignis])
pruefe('ICS mit einem Untertitel-Termin: kein Eintrag, kein „OmU“, kein „Untertitel“', !ics.includes('BEGIN:VEVENT') && !/omu|untertitel/i.test(ics), ics.slice(0, 200))
pruefe('Gegenprobe: derselbe Termin ohne Sprache steht im ICS', buildIcs([{ ...ereignis, sprache: undefined }]).includes('BEGIN:VEVENT'))

console.log('Wege im Panel:')
const weg = (extra: object) => ({ platform: 'netflix', url: 'https://www.netflix.com/title/1', zugang: 'abo', ...extra })
const sortiert = (...plattformen: object[]): Parameters<typeof wegeOhneNurUntertitel>[0] => [{ art: 'abo', plattformen, streamWege: [], shops: [] }] as never
const titel = (extra: object = {}): Title => ({ id: 1, streams: [], ...extra }) as unknown as Title
const akiba = 'https://www.akibapass.tv/products/yaiba-samurai-legend-omu-season-1'
pruefe('Anbieter mit „omu“ in der Adresse (Akibapass): keine Kachel', wegeOhneNurUntertitel(sortiert(weg({ platform: 'akibapass', url: akiba })), titel(), []).length === 0)
pruefe('Anbieter, dessen Termin nur Untertitel nennt (Netflix, Vigilantes): keine Kachel', wegeOhneNurUntertitel(sortiert(weg({})), titel(), [release('v', { platform: 'netflix', sprache: 'omu' })]).length === 0)
pruefe('Anbieter mit angekündigter Synchro, noch ohne Beleg: keine Kachel', wegeOhneNurUntertitel(sortiert(weg({ platform: 'crunchyroll' })), titel({ ankuendigung: { platform: 'crunchyroll', synchro: 'angekuendigt', omuAb: '2026-10-03' } }), []).length === 0)
const kaufweg = (url: string): Parameters<typeof wegeOhneNurUntertitel>[0] => [{ art: 'kauf', plattformen: [], streamWege: [{ shop: 'akibapass', eintraege: [{ platform: 'akibapass', url }] }], shops: [] }] as never
pruefe('Bezugsweg „Kauf / Leihe“ mit „omu“ in der Adresse (Daniels Beispiel, Akibapass): keine Kachel', wegeOhneNurUntertitel(kaufweg(akiba), titel(), []).length === 0)
pruefe('Gegenprobe: Bezugsweg ohne Kennung bleibt', wegeOhneNurUntertitel(kaufweg('https://www.akibapass.tv/products/yaiba'), titel(), []).length === 1)
pruefe('Gegenprobe: Anbieter mit belegter Synchro bleibt', wegeOhneNurUntertitel(sortiert(weg({ dub: true, url: akiba })), titel(), []).length === 1)
pruefe('Gegenprobe: Anbieter ohne Angabe bleibt (Sprache offen ist kein Untertitel)', wegeOhneNurUntertitel(sortiert(weg({})), titel(), []).length === 1)

console.log('News:')
const eintrag = (omuArt: 'synchro-offen' | 'synchro-angekuendigt'): NewsEintrag =>
  ({ am: '2026-10-11', titelId: 1, titel: 'X', slug: 'x', meldungen: [{ art: 'angekuendigt', platform: 'crunchyroll', datum: '2026-10-11', omu: omuArt }] }) as unknown as NewsEintrag
pruefe('News: „Start mit Untertiteln, keine Synchro angekündigt“ erreicht keinen Besucher', ohneUntertitelMeldungen([eintrag('synchro-offen')]).length === 0)
pruefe('Gegenprobe: „Synchro angekündigt“ bleibt', ohneUntertitelMeldungen([eintrag('synchro-angekuendigt')]).length === 1)

console.log('Texte der Oberfläche:')
const text = (p: string): string => readFileSync(new URL(p, import.meta.url), 'utf8')
const WORT = /\bOmU\b|Untertitel|Originalton/
const treffer: string[] = []
for (const datei of ['../web/src/lib/i18n.tsx', '../web/src/lib/i18n-spaet.ts', '../web/src/lib/i18n-zeilen.ts', '../web/src/lib/i18n-kalender.ts']) {
  for (const zeile of text(datei).split('\n')) if (/^\s*'[\w.]+':/.test(zeile) && WORT.test(zeile)) treffer.push(`${datei}: ${zeile.trim().slice(0, 90)}`)
}
for (const m of text('../worker/src/mail-abschnitte.ts').split('\n').filter((z) => /return `/.test(z) && WORT.test(z))) treffer.push(`mail: ${m.trim().slice(0, 90)}`)
pruefe('Kein Übersetzungstext und kein Mailsatz nennt OmU, Untertitel oder Originalton', treffer.length === 0, treffer)

console.log('Veraltete Hinweise (Black Clover Staffel 2):')
const bc = release('black-clover-s2-crunchyroll', { sprache: 'omu', hinweis: 'Crunchyroll zeigt die Staffel ab dem 03.10.2026 mit Untertiteln. Die deutsche Synchro ist angekündigt, ihr Termin noch offen.' })
const bcSynchro = release('black-clover-s2-crunchyroll-synchro', { schedule: { firstEpisodeDate: '2026-11-07', episodeCount: 12 } as Release['schedule'] })
pruefe('Synchro seit 07.11. da: der Hinweis ist veraltet', veralteteSynchroHinweise([bc, bcSynchro], HEUTE).map((r) => r.slug).join() === 'black-clover-s2-crunchyroll')
pruefe('Synchro erst nach heute: der Hinweis gilt noch', veralteteSynchroHinweise([bc, { ...bcSynchro, schedule: { firstEpisodeDate: '2026-12-05' } as Release['schedule'] }], HEUTE).length === 0)
pruefe('Synchro-Release eines anderen Anbieters: der Hinweis gilt noch', veralteteSynchroHinweise([bc, { ...bcSynchro, platform: 'adn' }], HEUTE).length === 0)
pruefe('nur ein weiterer Untertitel-Termin: der Hinweis gilt noch', veralteteSynchroHinweise([bc, { ...bcSynchro, sprache: 'omu' }], HEUTE).length === 0)
pruefe('widerlegte Synchro: der Hinweis gilt noch', veralteteSynchroHinweise([bc, { ...bcSynchro, widerlegt: { am: '2026-11-08', grund: 'x', gemeldet: true } }], HEUTE).length === 0)
pruefe('Hinweis ohne Ankündigungs-Wortlaut bleibt', veralteteSynchroHinweise([{ ...bc, hinweis: 'Wiederholung der Folgen 1 bis 12.' }, bcSynchro], HEUTE).length === 0)
const titles = new Map<number, Title>([[1, titel()]])
const fehler = pruefeErgebnis([bc, bcSynchro], [], titles, HEUTE).fehler
pruefe('Prüfung des erzeugten Datensatzes: veralteter Hinweis ist ein Fehler', fehler.some((f) => f.includes('black-clover-s2-crunchyroll"') && f.includes('Ankündigungs-Hinweis')), fehler)
const mitEreignis = pruefeErgebnis([bc], [{ ...ereignis, releaseSlug: 'black-clover-s2-crunchyroll' }], titles, HEUTE).fehler
pruefe('Prüfung: ein Ereignis zu einem Untertitel-Release ist ein Fehler', mitEreignis.some((f) => f.includes('erzeugt ein Ereignis')), mitEreignis)

if (verletzt) {
  console.error(`${verletzt} Verletzung(en).`)
  process.exit(1)
}
console.log('Nur deutsche Fassungen: alle Zusicherungen halten.')
