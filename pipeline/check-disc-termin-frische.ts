/**
 * Zusicherungen zu `lib/disc-termin-frische.ts` (24.11.2026): Titel mit künftiger oder jüngster Disc-Ausgabe werden nach
 * `DISC_FRIST_TAGE` neu gelesen und stehen in der Warteschlange vor jeder anderen Auffrischung, auch unter engem `limit`;
 * der Bestandswächter `check-disc-termin-frische-bestand.ts` warnt und wird rot an den Grenzen. Fixture nach Pokémon-Reisen
 * (Titel 112153: 18.12.2026 angezeigt, am 24.11.2026 laut aniSearch der 30.04.2027, gelesen am 30.10.2026). Läuft in `check:logic`.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Release, Title } from '../shared/types.ts'
import { ARCHIV_DIR, baueWarteschlange } from './lib/anisearch-warteschlange.ts'
import { DISC_FRIST_TAGE, alterInTagen, discFaellig, discTitelMitTermin, unbestaetigteTermine } from './lib/disc-termin-frische.ts'

let fehler = 0
function pruefe(text: string, ist: unknown, soll: unknown) {
  const a = JSON.stringify(ist)
  const b = JSON.stringify(soll)
  if (a !== b) {
    fehler++
    console.error(`FEHLER ${text}:\n  ist  ${a}\n  soll ${b}`)
  }
}

const HEUTE = '2026-11-24'
const aus = (datum: string) => [{ edition: `Ausgabe ${datum}`, datum }]

// Alter in vollen Tagen; ohne oder mit kaputtem Zeitstempel null.
pruefe('Alter: 04:15 am 30.10. sind 24 volle Tage', alterInTagen('2026-10-30T04:15:04.819Z', HEUTE), 24)
pruefe('Alter 25 Tage', alterInTagen('2026-10-30T00:00:00.000Z', HEUTE), 25)
pruefe('Alter: „heute“ mit Uhrzeit zählt als Tag', alterInTagen('2026-10-30T00:00:00.000Z', '2026-11-24T23:30:00Z'), 25)
pruefe('Alter 0', alterInTagen('2026-11-24T00:00:00.000Z', HEUTE), 0)
pruefe('Alter ohne Stempel', alterInTagen(undefined, HEUTE), null)
pruefe('Alter kaputt', alterInTagen('gestern', HEUTE), null)

// Welche Titel zählen: heute, künftig und bis 30 Tage zurück; 31 Tage zurück und kaputte Daten nicht.
const ausgaben = {
  '1': aus('2027-04-30'),
  '2': aus('2026-11-24'),
  '3': aus('2026-10-25'),
  '4': aus('2026-10-24'),
  '5': aus('2026-10-00'),
  '6': [...aus('2020-01-01'), ...aus('2026-12-18')],
}
pruefe('Titel mit Termin', [...discTitelMitTermin(ausgaben, HEUTE)].sort((a, b) => a - b), [1, 2, 3, 6])

// Fälligkeit genau an der Frist, eins drüber, ohne Stempel, fremder Titel.
const stempel = (tage: number) => ({ fetchedAt: new Date(Date.parse(`${HEUTE}T00:00:00Z`) - tage * 86_400_000).toISOString() })
const faellig = discFaellig(new Set([1]), HEUTE)
pruefe('an der Frist nicht fällig', faellig(1, stempel(DISC_FRIST_TAGE)), false)
pruefe('eins drüber fällig', faellig(1, stempel(DISC_FRIST_TAGE + 1)), true)
pruefe('ohne Stempel fällig', faellig(1, {}), true)
pruefe('Titel ohne Termin nie', faellig(2, stempel(400)), false)

// Warteschlange: Pokémon (gelesen vor 25 Tagen, künftiger Termin) kommt vor einer älteren Seite ohne Termin und vor einem Titel mit Release.
const vorher = process.cwd()
const ordner = mkdtempSync(join(tmpdir(), 'ak-disc-frische-'))
process.chdir(ordner)
try {
  mkdirSync(ARCHIV_DIR, { recursive: true })
  const titel = (id: number) => ({ id }) as Title
  for (const asId of [701, 702, 703, 704]) writeFileSync(`${ARCHIV_DIR}/${asId}.html.gz`, '')
  const cache = { 1: { info: {}, ...stempel(25) }, 2: { info: {}, ...stempel(90) }, 3: { info: {}, ...stempel(95) }, 4: { info: {}, ...stempel(1) } }
  const basis = {
    ids: { 1: 701, 2: 702, 3: 703, 4: 704 } as Record<number, number>,
    titles: [titel(3), titel(2), titel(1), titel(4)],
    releases: [{ titleId: 2 }, { titleId: 3 }] as Release[],
    cache,
    force: false,
    limit: 100,
    veraltet: (e: { fetchedAt?: string }) => (alterInTagen(e.fetchedAt, HEUTE) ?? 999) > 30,
  }
  const ids = (q: Title[]) => q.map((t) => t.id)
  const disc = discFaellig(new Set([1, 4]), HEUTE)
  pruefe('ohne Disc-Regel: Titel 1 (25 Tage) bleibt draußen', ids(baueWarteschlange(basis)), [3, 2])
  pruefe('mit Disc-Regel: 1 kommt, und zwar vor den Titeln mit Release', ids(baueWarteschlange({ ...basis, discFaellig: disc })), [1, 3, 2])
  pruefe('unter engem limit gewinnt der Disc-Titel', ids(baueWarteschlange({ ...basis, discFaellig: disc, limit: 1 })), [1])
  // Disc-Titel stehen zwischen Titeln mit Release; unter limit 2 gewinnen beide Disc-Titel, in Eingangsreihenfolge.
  const viele = {
    ...basis,
    ids: { ...basis.ids, 5: 705, 6: 706 },
    titles: [titel(3), titel(5), titel(2), titel(6), titel(1)],
    cache: { ...cache, 5: { info: {}, ...stempel(20) }, 6: { info: {}, ...stempel(90) } },
    releases: [{ titleId: 2 }, { titleId: 3 }, { titleId: 6 }] as Release[],
    discFaellig: discFaellig(new Set([1, 5]), HEUTE),
  }
  for (const asId of [705, 706]) writeFileSync(`${ARCHIV_DIR}/${asId}.html.gz`, '')
  pruefe('Disc-Titel zwischen Release-Titeln: beide vorn', ids(baueWarteschlange({ ...viele, limit: 2 })), [5, 1])
  pruefe('danach Titel mit Release in Eingangsreihenfolge', ids(baueWarteschlange(viele)), [5, 1, 3, 2, 6])
  // Disc-Titel 7 ohne Cache-Eintrag: `discFaellig` darf nie mit `undefined` gerufen werden; Neue stehen vor den Disc-Titeln.
  // Zwei davon, damit der Vergleich nach `!cache` bis zur Disc-Regel kommt.
  const ohneEintrag = { ...viele, ids: { ...viele.ids, 7: 707, 8: 708 }, titles: [...viele.titles, titel(7), titel(8)], discFaellig: discFaellig(new Set([1, 5, 7, 8]), HEUTE) }
  pruefe('Disc-Titel ohne Cache-Eintrag: kein Wurf, kommen als neu zuerst', ids(baueWarteschlange(ohneEintrag)), [7, 8, 5, 1, 3, 2, 6])
  pruefe('frisch gelesener Disc-Titel 4 bleibt draußen', ids(baueWarteschlange({ ...basis, discFaellig: disc })).includes(4), false)
} finally {
  process.chdir(vorher)
  rmSync(ordner, { recursive: true, force: true })
}

// Bestandsprüfung als Liste: Titel 1 mit Seite von vor 25 Tagen, Titel 2 ohne Eintrag, Titel 3 frisch, Titel 4 ohne künftigen Termin.
const cacheListe = { '1': stempel(25), '3': stempel(2), '4': stempel(400) }
const liste = unbestaetigteTermine({ '1': aus('2027-04-30'), '2': aus('2026-12-01'), '3': aus('2026-12-01'), '4': aus('2020-01-01') }, cacheListe, HEUTE, 14)
pruefe('unbestätigt: 1 (25 Tage) und 2 (ohne Stempel)', liste.map((t) => [t.titelId, t.alter]), [[1, 25], [2, null]])
pruefe('Eintrag trägt Ausgabe und Datum für die Meldung', liste[0], { titelId: 1, edition: 'Ausgabe 2027-04-30', datum: '2027-04-30', alter: 25 })
pruefe('Grenze: genau 25 Tage bei maxTage 25 ist in Ordnung', unbestaetigteTermine({ '1': aus('2027-04-30') }, cacheListe, HEUTE, 25), [])

// Wächter als Prozess im Wegwerf-Ordner (AK_ROOT), feste Zeit über das Argument.
function waechter(alter: number | null, tag = HEUTE) {
  const wurzel = mkdtempSync(join(tmpdir(), 'ak-disc-frische-bestand-'))
  try {
    mkdirSync(join(wurzel, 'data'), { recursive: true })
    writeFileSync(join(wurzel, 'data/disc-ausgaben.json'), JSON.stringify({ '1': aus('2027-04-30') }))
    writeFileSync(join(wurzel, 'data/anisearch.json'), JSON.stringify({ '1': alter === null ? {} : stempel(alter), '9': stempel(0) }))
    const r = spawnSync(process.execPath, ['--import', 'tsx', join(vorher, 'pipeline/check-disc-termin-frische-bestand.ts'), tag], {
      env: { ...process.env, AK_ROOT: wurzel },
      encoding: 'utf8',
      timeout: 60_000,
      windowsHide: true,
    })
    return { status: r.status, aus: `${r.stdout}${r.stderr}` }
  } finally {
    rmSync(wurzel, { recursive: true, force: true })
  }
}
const frisch = waechter(14)
pruefe('Wächter: 14 Tage ist ruhig', [frisch.status, frisch.aus.includes('WARNUNG')], [0, false])
const warn = waechter(15)
pruefe('Wächter: 15 Tage warnt, bleibt grün', [warn.status, warn.aus.includes('⚠ WARNUNG'), warn.aus.includes('1 Titel')], [0, true, true])
const grenze = waechter(60)
pruefe('Wächter: 60 Tage nur Warnung', grenze.status, 0)
const rot = waechter(61)
pruefe('Wächter: 61 Tage rot, mit Titelmarke', [rot.status, rot.aus.includes('VERSTÖSSE: 1'), rot.aus.includes('disc-termin-frische')], [1, true, true])
const ohne = waechter(null)
pruefe('Wächter: ohne Stempel nur Warnung', [ohne.status, ohne.aus.includes('⚠ WARNUNG')], [0, true])

if (fehler) {
  console.error(`${fehler} Fehler`)
  process.exit(1)
}
console.log('Disc-Termin-Frische: alle Zusicherungen erfüllt')
