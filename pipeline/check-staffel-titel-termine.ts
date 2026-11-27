/**
 * Zusicherung: **Termine eines Sammeltitels landen in der Staffel, die ihre Folge zeigt** (`pipeline/lib/staffel-termine.ts`).
 * Fernsehen nach Folgentitel (tv.de nennt keine Nummer; die Sender wiederholen quer durch die Staffeln, Tor-Befund PR 4579), alles andere
 * nach durchlaufender Folge; `ev.id` bleibt (ICS-UID). Fixtures plus echter Fall: jede Horizonte-Sichtung aus `data/tv-programm.json` mit
 * Treffer in `data/wikipedia-folgen.json` liegt in der Staffel ihres Titels (unabhängig nachgezählt). Läuft in `check:logic`.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { join, resolve } from 'node:path'
import type { Release, ReleaseEvent, Title } from '../shared/types.ts'
import { folgenKern } from '../shared/folgen-zuordnung.ts'
import type { TvSendung } from './fetch-tv-programm.ts'
import { staffelPlaene, type StaffelPlan } from './lib/staffel-titel.ts'
import { folgentitelJeSendeplatz, staffelJeFolgentitel, teileTermine, trefferFuer, zielDesTermins } from './lib/staffel-termine.ts'
import { teileEinenSammeltitel, teileStaffelTitel } from './bau/staffel-titel.ts'
import { ROOT } from './lib/util.ts'
import { unbedingteAufrufe, type Aufruf } from './lib/unbedingte-aufrufe.ts'

let fehler = 0
let faelle = 0
function pruefe(name: string, ok: boolean, info = ''): void {
  faelle++
  if (ok) return
  fehler++
  console.error(`✖ ${name}${info ? ` — ${info}` : ''}`)
}

const SAMMEL = 158871
const [plan] = staffelPlaene([
  {
    anilistId: SAMMEL,
    titel: 'Pokémon Horizonte',
    basis: 3,
    staffeln: [
      { nr: 1, von: 1, bis: 3, folgen: 3, kennung: 7_000_001 },
      { nr: 2, von: 4, bis: 6, folgen: 3, kennung: 7_000_002 },
      { nr: 3, von: 7, offen: true },
    ],
  },
]) as [StaffelPlan]
const S3 = SAMMEL // Basis = Staffel 3 in der kleinen Fixture

// Wikipedia-Liste: Staffel 1 drei Folgen, Staffel 2 drei, Staffel 3 eine; `st` springt auf 1 zurück.
const NAMEN = ['Der Anhänger beginnt', 'Feliospa mit Herz', 'Ein Lied im Nebel', 'Erneuter Kurs voraus', 'Enteis wilder Kampfschrei', 'Das schwarze Rayquaza', 'Eine Welt voller Abenteuer']
const wiki = NAMEN.map((dt, i) => ({ nr: 1235 + i, st: (i % 3) + 1, dt }))
const jeTitel = staffelJeFolgentitel(wiki, plan)
pruefe('Liste: „Enteis wilder Kampfschrei“ ist Staffel 2 Folge 2', JSON.stringify(jeTitel.get(folgenKern('Enteis wilder Kampfschrei'))) === '{"nr":2,"folge":2}')
let liefAuseinander = false
try {
  staffelJeFolgentitel(wiki.map((f, i) => (i === 3 ? { ...f, st: 4 } : f)), plan)
} catch (e) {
  liefAuseinander = /Wikipedia-Folge 4 .„Erneuter Kurs voraus“. liegt in Staffel 1, die Yaml sagt 2/.test((e as Error).message)
}
pruefe('Liste und Yaml laufen auseinander (kein Rücksprung bei 4): wirft', liefAuseinander)
const doppelt = staffelJeFolgentitel([...wiki.slice(0, 6), { nr: 1300, st: 1, dt: 'Der Anhänger beginnt' }], plan)
pruefe('Titel doppelt in der Liste: keine Zuordnung', !doppelt.has(folgenKern('Der Anhänger beginnt')))

// Sichtungen: werktags erst Staffel 2 (B2, B3), dann Staffel 1 von vorn (A1, A2); samstags Staffel 3 (C1); einmal ein Titel ohne Treffer.
const sendung = (tag: string, zeit: string, folge: string, sender = 'Super RTL'): TvSendung => ({ titleId: SAMMEL, titel: 'Pokémon Horizonte: Die Serie', folge, sender, start: `${tag}T${zeit}:00+02:00`, ende: `${tag}T${zeit}:30+02:00`, gesehenAm: tag })
const sendungen = [
  sendung('2026-09-16', '16:05', 'Enteis wilder Kampfschrei'),
  sendung('2026-09-17', '16:05', 'Pokémon Horizonte: Das schwarze Rayquaza'),
  sendung('2026-09-19', '13:00', 'Eine Welt voller Abenteuer'),
  sendung('2026-09-21', '16:15', 'Der Anhänger beginnt'),
  sendung('2026-09-22', '16:15', 'Feliospa mit Herzz'),
  sendung('2026-09-23', '16:15', 'Ganz anderer Titel'),
  { ...sendung('2026-09-16', '16:05', 'Enteis wilder Kampfschrei'), titleId: 20 },
]
const ev = (tag: string, zeit: string, episode: number, extra: Partial<ReleaseEvent> = {}): ReleaseEvent =>
  ({ id: `auto-${SAMMEL}-tv-super-rtl@${tag}`, releaseSlug: `auto-${SAMMEL}-tv-super-rtl`, titleId: SAMMEL, date: tag, time: zeit, episode, platform: 'tv', sender: 'Super RTL', sichtung: true, releaseType: 'weekly', name: 'Pokémon Horizonte', ...extra }) as ReleaseEvent
const tvRelease = { slug: `auto-${SAMMEL}-tv-super-rtl`, titleId: SAMMEL, name: 'Pokémon Horizonte', platform: 'tv', sender: 'Super RTL', releaseType: 'weekly', herkunft: 'Automatisch aus dem TV-Programm von RTL+ (6 Sendungen gesichtet).', sources: ['https://plus.rtl.de/tv-programm'], schedule: { firstEpisodeDate: '2026-09-16', episodeCount: 6, episodeCountAssumed: true, observed: {} }, sendungen: [{ start: '2026-09-22T16:15', ende: '2026-09-22T16:45', folge: 'Feliospa mit Herzz', nr: 5 }, { start: '2026-09-23T16:15', ende: '2026-09-23T16:45', folge: 'Ganz anderer Titel', nr: 6 }] } as unknown as Release
const rtlRelease = { slug: 'pokemon-horizonte-s3-rtlplus', titleId: SAMMEL, name: 'Pokémon Horizonte – Staffel 3', platform: 'rtlplus', releaseType: 'batch', schedule: { firstEpisodeDate: '2026-11-20', firstEpisodeNumber: 7, episodeCount: 1 } } as unknown as Release
const fremdRelease = { slug: 'fremd', titleId: 20, platform: 'tv', schedule: {} } as unknown as Release
const events = [
  ev('2026-09-16', '16:05', 1),
  ev('2026-09-17', '16:05', 2),
  ev('2026-09-19', '13:00', 3),
  ev('2026-09-21', '16:15', 4),
  ev('2026-09-22', '16:15', 5),
  ev('2026-09-23', '16:15', 6),
  { id: 'pokemon-horizonte-s3-rtlplus@2026-11-20', releaseSlug: 'pokemon-horizonte-s3-rtlplus', titleId: SAMMEL, date: '2026-11-20', episode: 7, platform: 'rtlplus', releaseType: 'batch', staffelFolge: [3, 1], name: 'x' } as ReleaseEvent,
  { id: 'fremd@2026-09-16', releaseSlug: 'fremd', titleId: 20, date: '2026-09-16', episode: 1, platform: 'tv', sender: 'Super RTL', sichtung: true, releaseType: 'weekly', time: '16:05', name: 'Fremd' } as ReleaseEvent,
]
const sendeplatz = folgentitelJeSendeplatz(sendungen, SAMMEL)
pruefe('Sendeplatz: nur Sendungen des Sammeltitels', sendeplatz.size === 6)
const t = teileTermine([tvRelease, rtlRelease, fremdRelease], events, plan, sendeplatz, jeTitel)
const nach = (id: string) => t.events.find((e) => e.id === id)!
pruefe('TV nach Folgentitel, nicht nach Zählnummer: Termin 1 („B2“) ist Staffel 2 Folge 2', nach(`auto-${SAMMEL}-tv-super-rtl@2026-09-16`).titleId === 7_000_002 && nach(`auto-${SAMMEL}-tv-super-rtl@2026-09-16`).episode === 2)
pruefe('Vorspann „Pokémon Horizonte: “ fällt weg (B3)', nach(`auto-${SAMMEL}-tv-super-rtl@2026-09-17`).episode === 3 && nach(`auto-${SAMMEL}-tv-super-rtl@2026-09-17`).titleId === 7_000_002)
pruefe('Wiederholung von vorn: Termin 4 („A1“) ist Staffel 1 Folge 1', nach(`auto-${SAMMEL}-tv-super-rtl@2026-09-21`).titleId === 7_000_001 && nach(`auto-${SAMMEL}-tv-super-rtl@2026-09-21`).episode === 1)
pruefe('Schreibvariante („Herzz“) trifft über aehnlicherKern', nach(`auto-${SAMMEL}-tv-super-rtl@2026-09-22`).episode === 2 && nach(`auto-${SAMMEL}-tv-super-rtl@2026-09-22`).titleId === 7_000_001)
pruefe('samstags Staffel 3 (Basis) Folge 1', nach(`auto-${SAMMEL}-tv-super-rtl@2026-09-19`).titleId === S3 && nach(`auto-${SAMMEL}-tv-super-rtl@2026-09-19`).episode === 1)
const ohne = nach(`auto-${SAMMEL}-tv-super-rtl@2026-09-23`)
pruefe('ohne Treffer: an der Basis, ohne Folge, gezählt', ohne.titleId === SAMMEL && ohne.episode === undefined && t.ohneTreffer === 1)
pruefe('ev.id aller Termine unverändert, Zahl gleich', t.events.length === events.length && events.every((e) => t.events.some((n) => n.id === e.id)) && t.vorher === 7 && t.nachher === 7, `${t.vorher}/${t.nachher}`)
pruefe('Termin-Name ist der der Staffel', nach(`auto-${SAMMEL}-tv-super-rtl@2026-09-21`).name === 'Pokémon Horizonte – Staffel 1')
const rtlEv = nach('pokemon-horizonte-s3-rtlplus@2026-11-20')
pruefe('Stapel nach Nummer: Folge 7 → Staffel 3 Folge 1, staffelFolge entfällt', rtlEv.titleId === S3 && rtlEv.episode === 1 && rtlEv.staffelFolge === undefined)
pruefe('fremder Titel unberührt (gleicher Sendeplatz)', nach('fremd@2026-09-16').titleId === 20 && nach('fremd@2026-09-16').episode === 1 && t.releases.some((r) => r === fremdRelease))
const rel = (slug: string) => t.releases.find((r) => r.slug === slug)
pruefe('Release je Staffel und Sender, Slug folgt der Kennung, Basis behält ihn', ['auto-7000001-tv-super-rtl', 'auto-7000002-tv-super-rtl', `auto-${SAMMEL}-tv-super-rtl`, 'pokemon-horizonte-s3-rtlplus'].every((s) => rel(s)), t.releases.map((r) => r.slug).join())
pruefe('jeder Termin zeigt auf ein Release, das es gibt', t.events.every((e) => t.releases.some((r) => r.slug === e.releaseSlug)))
const r2 = rel('auto-7000002-tv-super-rtl')!
pruefe('Staffel-2-Release: ab Folge 2, 2 Folgen, Beobachtungen in Staffelzählung', r2.titleId === 7_000_002 && r2.schedule.firstEpisodeNumber === 2 && r2.schedule.episodeCount === 2 && JSON.stringify(r2.schedule.observed) === '{"2":"2026-09-16","3":"2026-09-17"}' && r2.schedule.time === '16:05', JSON.stringify(r2.schedule))
pruefe('Staffel-2-Release: Folgen belegt, Wikipedia in den Quellen, Zahl der Sendungen', r2.folgenBelegt === true && (r2.sources ?? []).length === 1 && /\(2 Sendungen gesichtet\)/.test(r2.herkunft ?? ''), JSON.stringify(r2))
const mitQuelle = teileTermine([tvRelease], events.slice(0, 2), { ...plan, quelle: 'https://de.wikipedia.org/wiki/X' }, sendeplatz, jeTitel)
pruefe('Quelle der Liste steht in sources', mitQuelle.releases[0]!.sources!.includes('https://de.wikipedia.org/wiki/X'))
pruefe('Staffel-2-Release: Herkunft nennt die Episodenliste', (r2.herkunft ?? '').endsWith('Staffel und Folge aus der Episodenliste der Wikipedia.'), r2.herkunft)
/* Zwei Sendungen derselben Folge am selben Tag, spätere zuerst geliefert: die frühere Uhrzeit zählt. */
const amTag = folgentitelJeSendeplatz([sendung('2026-10-05', '18:00', NAMEN[1]!), sendung('2026-10-05', '16:05', NAMEN[1]!)], SAMMEL)
const zweiAmTag = teileTermine([tvRelease], [ev('2026-10-05', '18:00', 1, { id: 'spaet' }), ev('2026-10-05', '16:05', 1, { id: 'frueh' })], plan, amTag, jeTitel)
const tagRel = zweiAmTag.releases.find((r) => r.slug === 'auto-7000001-tv-super-rtl')
pruefe('gleicher Tag: Sendungen nach Uhrzeit geordnet, die frühere ist die Beobachtung', tagRel?.schedule.time === '16:05', JSON.stringify(zweiAmTag.releases.map((r) => [r.slug, r.schedule])))
const r1 = rel('auto-7000001-tv-super-rtl')!
pruefe('angehängte Sendung wandert mit, Nummer in Staffelzählung', JSON.stringify(r1.sendungen) === '[{"start":"2026-09-22T16:15","ende":"2026-09-22T16:45","folge":"Feliospa mit Herzz","nr":2}]', JSON.stringify(r1.sendungen))
const basisTv = rel(`auto-${SAMMEL}-tv-super-rtl`)!
pruefe('Sendung ohne Treffer bleibt an der Basis, ohne Nummer', JSON.stringify(basisTv.sendungen) === '[{"start":"2026-09-23T16:15","ende":"2026-09-23T16:45","folge":"Ganz anderer Titel"}]' && basisTv.folgenBelegt === undefined, JSON.stringify(basisTv))
const rtlNeu = rel('pokemon-horizonte-s3-rtlplus')!
pruefe('Stapel-Release: erste Folge in Staffelzählung (1 entfällt)', rtlNeu.schedule.firstEpisodeNumber === undefined && rtlNeu.titleId === S3)
const leer = teileTermine([{ ...rtlRelease, slug: 'leer', schedule: { firstEpisodeDate: '2026-01-01', firstEpisodeNumber: 5 } } as unknown as Release], [], plan, sendeplatz, jeTitel)
pruefe('Release ohne Termine: an die Staffel seiner ersten Folge (5 → Staffel 2 Folge 2, Slug -s2)', leer.releases[0]!.titleId === 7_000_002 && leer.releases[0]!.schedule.firstEpisodeNumber === 2 && leer.releases[0]!.slug === 'leer-s2')

// zielDesTermins direkt: Termin ohne passende Sichtung → kein Ziel (die Zählnummer zählt nicht).
pruefe('TV-Sichtung ohne Sendeplatz: kein Ziel, nicht nach Zählnummer', zielDesTermins(ev('2026-10-01', '09:00', 5), tvRelease, plan, sendeplatz, jeTitel) === undefined)

// Phase an Ort und Stelle: Titel-Reihenfolge bleibt, Riegel bricht ab.
const titel = (id: number) => ({ id, titleDe: `T${id}`, genres: [], keywords: [], streams: [], watchLinks: [] }) as unknown as Title
const bau = () => ({ titles: new Map([[1, titel(1)], [SAMMEL, { ...titel(SAMMEL), titleDe: 'Pokémon Horizonte' }], [2, titel(2)]]), releases: [structuredClone(tvRelease)], events: structuredClone(events.slice(0, 6)) })
const b = bau()
const s = teileEinenSammeltitel(plan, b, { sendungen, wiki: { [SAMMEL]: { seite: 'Pokémon (Anime)/Horizonte', folgen: wiki } } })
pruefe('Phase: Staffel-Titel an der Stelle des Sammeltitels', [...b.titles.keys()].join() === `1,7000001,7000002,${SAMMEL},2`)
pruefe('Phase: gibt den Sammeltitel vor dem Schnitt zurück, Quelle aus der Wikipedia-Seite', s?.titel.titleDe === 'Pokémon Horizonte' && s?.releases.length === 1 && s?.plan.quelle === 'https://de.wikipedia.org/wiki/Pok%C3%A9mon_(Anime)/Horizonte')
pruefe('Phase: Termine und Releases ersetzt', b.events.filter((e) => e.titleId === 7_000_002).length === 2 && b.releases.length === 3)
const kaputt = bau()
kaputt.titles.get(SAMMEL)!.watchLinks = [{ name: 'TOGGO', url: 'x', kind: 'stream', toggo: [{ staffel: 9, von: 1, bis: 1, ab: '', ende: '' }] }] as never
let abgebrochen = false
try {
  teileEinenSammeltitel(plan, kaputt, { sendungen, wiki: {} })
} catch (e) {
  abgebrochen = /unbekannten Staffel/.test((e as Error).message)
}
pruefe('Phase: Riegel bricht ab und lässt den Bau unverändert', abgebrochen && kaputt.titles.has(SAMMEL) && !kaputt.titles.has(7_000_001))
const ohneTitel = bau()
ohneTitel.titles.delete(SAMMEL)
pruefe('Phase: Sammeltitel nicht im Bau → nichts geteilt', teileEinenSammeltitel(plan, ohneTitel, { sendungen, wiki: {} }) === undefined && ohneTitel.events.every((e) => e.titleId === SAMMEL))
const unberuehrt = bau()
pruefe('Phase ohne Plan (Yaml ohne basis): No-op', teileStaffelTitel(unberuehrt, { plaene: [], sendungen, wiki: {} }).length === 0 && JSON.stringify(unberuehrt) === JSON.stringify(bau()))

// Ränder (Mutanten der Diff-Probe).
pruefe('Liste ohne „Folge in der Staffel“ (st): keine Zuordnung', staffelJeFolgentitel(wiki.map((f, i) => (i === 2 ? { nr: f.nr, dt: f.dt } : f)), plan).size === 0)
const mitDoppelpunkt = staffelJeFolgentitel([{ nr: 1, st: 1, dt: 'Teil 1: Der Anfang des Weges' }], plan)
pruefe('Folgentitel mit Doppelpunkt: ganzer Titel trifft, wenn der gekürzte nicht trifft', trefferFuer(mitDoppelpunkt, 'Teil 1: Der Anfang des Weges')?.folge === 1 && trefferFuer(mitDoppelpunkt, undefined) === undefined)
const kurz = staffelJeFolgentitel([{ nr: 1, st: 1, dt: 'Kurz' }], plan)
pruefe('kurzer Folgentitel hinter Vorspann: wörtlicher Treffer (ohne Schreibvarianten-Suche)', trefferFuer(kurz, 'Pokémon Horizonte: Kurz')?.folge === 1)
const nebel = staffelJeFolgentitel([{ nr: 1, st: 1, dt: 'Lied im Nebel' }], plan)
pruefe('Artikel-Rückfall: „Ein Lied im Nebel“ trifft „Lied im Nebel“', JSON.stringify(trefferFuer(nebel, 'Pokémon Horizonte: Ein Lied im Nebel')) === '{"nr":1,"folge":1}', JSON.stringify(trefferFuer(nebel, 'Ein Lied im Nebel')))
// „Der Weg nach Haus“ macht die Schreibvarianten-Suche mehrdeutig: Nur der wörtliche Kern trifft „Der Weg nach Hause“.
const weg = staffelJeFolgentitel([{ nr: 1, st: 1, dt: 'Der Weg nach Hause' }, { nr: 2, st: 2, dt: 'Ein Weg nach Hause' }, { nr: 3, st: 3, dt: 'Der Weg nach Haus' }], plan)
pruefe('Artikel-Rückfall trifft zwei Folgen („Weg nach Hause“): keine Zuordnung', trefferFuer(weg, 'Weg nach Hause') === undefined)
pruefe('wörtlicher Kern vor Schreibvariante und Rückfall', trefferFuer(weg, 'Pokémon Horizonte: Der Weg nach Hause')?.folge === 1)
const handTv = { ...tvRelease, slug: 'hand-tv', sendungen: undefined, schedule: { firstEpisodeDate: '2026-10-01', firstEpisodeNumber: 5, episodeCount: 2 } } as unknown as Release
const handEv = { ...ev('2026-10-01', '09:00', 5), id: 'hand-tv@2026-10-01', releaseSlug: 'hand-tv', sichtung: undefined }
const hand = teileTermine([handTv], [handEv], plan, sendeplatz, jeTitel)
pruefe('Fernsehen von Hand (ohne Sichtung): nach Folgennummer (5 → Staffel 2 Folge 2), Plan bleibt', hand.events[0]!.titleId === 7_000_002 && hand.events[0]!.episode === 2 && hand.releases[0]!.slug === 'hand-tv-s2' && hand.releases[0]!.schedule.firstEpisodeNumber === 2 && hand.releases[0]!.schedule.episodeCount === 2, JSON.stringify(hand.releases[0]))
const ohneNummer = teileTermine([{ ...rtlRelease, slug: 'disc', schedule: { firstEpisodeDate: '2026-12-01' } } as unknown as Release], [{ id: 'disc@2026-12-01', releaseSlug: 'disc', titleId: SAMMEL, date: '2026-12-01', platform: 'disc', releaseType: 'batch', name: 'x' } as unknown as ReleaseEvent], plan, sendeplatz, jeTitel)
pruefe('Termin ohne Folgennummer, Release ohne erste Folge: Staffel 1', ohneNummer.events[0]!.titleId === 7_000_001 && ohneNummer.events[0]!.episode === undefined && ohneNummer.releases[0]!.slug === 'disc-s1')
const leerOhne = teileTermine([{ ...rtlRelease, slug: 'leer2', schedule: { firstEpisodeDate: '2026-01-01' } } as unknown as Release], [], plan, sendeplatz, jeTitel)
pruefe('Release ohne Termine und ohne erste Folge: Staffel 1', leerOhne.releases[0]!.titleId === 7_000_001 && leerOhne.releases[0]!.slug === 'leer2-s1')
const [zu] = staffelPlaene([{ anilistId: SAMMEL, titel: 'X', basis: 2, staffeln: [{ nr: 1, von: 1, bis: 3, kennung: 7_000_001 }, { nr: 2, von: 4, bis: 6 }] }])
const jenseits = teileTermine([{ ...rtlRelease, slug: 'spaet', schedule: { firstEpisodeDate: '2026-01-01', firstEpisodeNumber: 9 } } as unknown as Release], [], zu!, sendeplatz, jeTitel)
pruefe('Release ohne Termine jenseits der letzten Staffel: an die Basis (Slug bleibt)', jenseits.releases[0]!.titleId === SAMMEL && jenseits.releases[0]!.slug === 'spaet')
const rueckwaerts = teileTermine([tvRelease], [ev('2026-09-17', '16:05', 2), ev('2026-09-16', '16:05', 1)], plan, sendeplatz, jeTitel).releases[0]!
pruefe('Termine in beliebiger Reihenfolge: erster und letzter Sendetag stimmen', rueckwaerts.schedule.firstEpisodeDate === '2026-09-16' && rueckwaerts.tvLetzteSichtung === '2026-09-17' && rueckwaerts.name === 'Pokémon Horizonte – Staffel 2')
pruefe('Basis-Release mit Treffer und ohne: Folge 1 um 13:00, Zahl aus den Treffern, letzte Sichtung der ohne Treffer', basisTv.schedule.time === '13:00' && basisTv.schedule.episodeCount === 1 && basisTv.schedule.firstEpisodeDate === '2026-09-19' && basisTv.schedule.firstEpisodeNumber === undefined && basisTv.tvLetzteSichtung === '2026-09-23' && basisTv.schedule.episodeCountAssumed === true && basisTv.schedule.episodeCountNurGesichtet === true, JSON.stringify(basisTv.schedule))
const nurOhne = teileTermine([tvRelease], [ev('2026-09-23', '16:15', 6)], plan, sendeplatz, jeTitel).releases[0]!
pruefe('Release nur aus Terminen ohne Treffer: Zahl = Sendungen, keine Beobachtung, keine Uhrzeit', nurOhne.schedule.episodeCount === 1 && nurOhne.schedule.observed === undefined && nurOhne.schedule.time === undefined && nurOhne.schedule.zeiten === undefined && nurOhne.herkunft === 'Automatisch aus dem TV-Programm von RTL+ (1 Sendungen gesichtet).', JSON.stringify(nurOhne))
const zweiZeiten = [sendung('2026-10-05', '16:15', 'Der Anhänger beginnt'), sendung('2026-10-06', '17:00', 'Feliospa mit Herz')]
const s1 = teileTermine([tvRelease], [ev('2026-10-05', '16:15', 1), ev('2026-10-06', '17:00', 2)], plan, folgentitelJeSendeplatz(zweiZeiten, SAMMEL), jeTitel).releases[0]!
pruefe('verschiedene Uhrzeiten: je Folge, ab Folge 1 ohne firstEpisodeNumber', JSON.stringify(s1.schedule.zeiten) === '{"1":"16:15","2":"17:00"}' && s1.schedule.time === undefined && s1.schedule.firstEpisodeNumber === undefined && s1.schedule.episodeCount === 2, JSON.stringify(s1.schedule))
const schonDa = teileTermine([{ ...tvRelease, sources: ['https://de.wikipedia.org/wiki/X'] } as Release], events.slice(0, 1), { ...plan, quelle: 'https://de.wikipedia.org/wiki/X' }, sendeplatz, jeTitel).releases[0]!
pruefe('Quelle schon in sources: nicht doppelt', schonDa.sources!.length === 1)

// Phase: Ausgabe der Meldungen, Map-Werte, Rückgabe, Quelle nur bei Wikipedia-Seite.
function ausgabe(f: () => void): string {
  const zeilen: string[] = []
  const [l, w] = [console.log, console.warn]
  console.log = (...a: unknown[]) => void zeilen.push(a.join(' '))
  console.warn = (...a: unknown[]) => void zeilen.push(a.join(' '))
  try {
    f()
  } finally {
    console.log = l
    console.warn = w
  }
  return zeilen.join('\n')
}
const b2 = bau()
const text = ausgabe(() => teileEinenSammeltitel(plan, b2, { sendungen, wiki: { [SAMMEL]: { seite: 'X', url: 'https://plus.rtl.de/liste', folgen: wiki } } }))
pruefe('Phase warnt mit Zahl der Termine ohne Treffer', /⚠ .*Staffel-Titel Pokémon Horizonte: 3 Titel, 6 Termine, 1 TV-Termine ohne Folgentitel-Treffer/.test(text), text)
pruefe('Phase: Liste mit eigener Adresse (keine Wikipedia-Seite) setzt keine Quelle', !b2.releases.some((r) => r.sources?.some((s) => s.includes('wikipedia'))))
pruefe('Phase: Map-Werte sind die Staffel-Titel', b2.titles.get(7_000_001)?.titleDe === 'Pokémon Horizonte – Staffel 1' && b2.titles.get(SAMMEL)?.titleDe === 'Pokémon Horizonte – Staffel 3' && b2.titles.get(1)?.titleDe === 'T1')
pruefe('Phase: genau die geteilten Releases und Termine (keine Reste, nichts angehängt)', b2.releases.map((r) => r.slug).sort().join() === `auto-158871-tv-super-rtl,auto-7000001-tv-super-rtl,auto-7000002-tv-super-rtl` && b2.events.length === 6 && b2.events.every((e) => [7_000_001, 7_000_002, SAMMEL].includes(e.titleId)), b2.releases.map((r) => r.slug).join())
const ruhig = ausgabe(() => teileEinenSammeltitel(plan, (() => { const x = bau(); x.events = x.events.slice(0, 2); return x })(), { sendungen, wiki: { [SAMMEL]: { seite: 'X', folgen: wiki } } }))
pruefe('Phase ohne Termine ohne Treffer: Hinweis ohne ⚠', /Staffel-Titel Pokémon Horizonte: 3 Titel, 2 Termine, 0 TV-Termine/.test(ruhig) && !ruhig.includes('⚠'), ruhig)
const fehlt = bau()
fehlt.titles.delete(SAMMEL)
pruefe('Phase: Sammeltitel fehlt → Hinweis im Log', /Staffel-Titel 158871: nicht im Bau, nichts geteilt/.test(ausgabe(() => teileEinenSammeltitel(plan, fehlt, { sendungen, wiki: {} }))))
const mitLinks = bau()
mitLinks.titles.get(SAMMEL)!.watchLinks = [{ name: 'TOGGO', url: 't', kind: 'stream', toggo: [{ staffel: 1, von: 1, bis: 3, ab: '', ende: '' }, { staffel: 2, von: 1, bis: 3, ab: '', ende: '' }] }, { name: 'Amazon', url: 'a', kind: 'buy' }] as never
ausgabe(() => teileEinenSammeltitel(plan, mitLinks, { sendungen, wiki: {} }))
pruefe('Phase: TOGGO-Blöcke verteilt, Kaufhinweis an jeder Staffel, Riegel zählt nur Blöcke', mitLinks.titles.get(7_000_001)!.watchLinks!.length === 2 && mitLinks.titles.get(SAMMEL)!.watchLinks!.length === 1)
const b3 = bau()
const alle = teileStaffelTitel(b3, { plaene: [plan], sendungen, wiki: {} })
pruefe('teileStaffelTitel: fährt jeden Plan und gibt seinen Sammeltitel zurück', alle.length === 1 && alle[0]!.plan.sammel === SAMMEL && b3.titles.has(7_000_001))

// Ladeweg: Yaml, Sichtungen und Liste aus AK_ROOT, Phase mit Vorgabe-Eingaben (Kindprozess, Kulisse `lib/kulisse-staffel-titel.ts`).
{
  const wurzel = mkdtempSync(join(tmpdir(), 'staffel-titel-'))
  try {
    /* Pfade ohne „data/“-Literal: check-workflows liest es sonst als Schreibziel. */
    mkdirSync(join(wurzel, 'data', 'curated'), { recursive: true })
    writeFileSync(join(wurzel, 'data', 'curated', 'horizonte-staffeln.yaml'), 'titel:\n  - anilistId: 158871\n    titel: "Pokémon Horizonte"\n    basis: 2\n    staffeln:\n      - { nr: 1, von: 1, bis: 3, folgen: 3, kennung: 7000001 }\n      - { nr: 2, von: 4, offen: true }\n')
    writeFileSync(join(wurzel, 'data', 'tv-programm.json'), JSON.stringify({ sendungen: { a: sendung('2026-09-16', '16:05', 'Feliospa mit Herz') } }))
    writeFileSync(join(wurzel, 'data', 'wikipedia-folgen.json'), JSON.stringify({ titel: { [SAMMEL]: { seite: 'X', folgen: wiki.slice(0, 4) } } }))
    const lauf = spawnSync(process.execPath, ['--import', 'tsx', fileURLToPath(new URL('./lib/kulisse-staffel-titel.ts', import.meta.url))], { env: { ...process.env, AK_ROOT: wurzel }, encoding: 'utf8', windowsHide: true, timeout: 60_000 })
    const zeile = lauf.stdout.trim().split('\n').at(-1) ?? ''
    pruefe('Ladeweg: Plan, Sichtungen und Liste aus AK_ROOT; Termin landet in Staffel 1 Folge 2', lauf.status === 0 && zeile === '{"plaene":[[7000001,158871]],"sendungen":1,"wiki":["158871"],"sammel":[158871],"termin":[[7000001,2]]}', `${lauf.status} ${zeile} ${lauf.stderr.slice(-300)}`)
    rmSync(join(wurzel, 'data', 'tv-programm.json'))
    rmSync(join(wurzel, 'data', 'wikipedia-folgen.json'))
    const ohneDaten = spawnSync(process.execPath, ['--import', 'tsx', fileURLToPath(new URL('./lib/kulisse-staffel-titel.ts', import.meta.url))], { env: { ...process.env, AK_ROOT: wurzel }, encoding: 'utf8', windowsHide: true, timeout: 60_000 })
    pruefe('Ladeweg mit Plan, ohne Sichtungen und Liste: Termin bleibt ohne Folge an der Basis, kein Absturz', ohneDaten.status === 0 && ohneDaten.stdout.trim().split('\n').at(-1) === '{"plaene":[[7000001,158871]],"sendungen":0,"wiki":[],"sammel":[158871],"termin":[[158871,null]]}', ohneDaten.stdout + ohneDaten.stderr.slice(-300))
    rmSync(join(wurzel, 'data', 'curated', 'horizonte-staffeln.yaml'))
    const ohne = spawnSync(process.execPath, ['--import', 'tsx', fileURLToPath(new URL('./lib/kulisse-staffel-titel.ts', import.meta.url))], { env: { ...process.env, AK_ROOT: wurzel }, encoding: 'utf8', windowsHide: true, timeout: 60_000 })
    pruefe('Ladeweg ohne Plan: nichts gelesen, nichts geteilt', ohne.status === 0 && ohne.stdout.trim().split('\n').at(-1) === '{"plaene":[],"sendungen":0,"wiki":[],"sammel":[],"termin":[[158871,1]]}', ohne.stdout + ohne.stderr.slice(-300))
  } finally {
    rmSync(wurzel, { recursive: true, force: true })
  }
}

// Verdrahtung, geparst: Phase am Anfang der Auslieferung (nach der Phasenfolge samt Quarantäne, vor `baueMeta`), Sammeltitel bis zur Folgenliste.
{
  const quelle = (datei: string): string => readFileSync(new URL(datei, import.meta.url), 'utf8')
  const aufrufe = (datei: string, f: string) => unbedingteAufrufe(quelle(datei), f)
  const stelle = (a: Aufruf[], name: string): number => a.find((x) => x.name === name)?.stelle ?? -1
  const args = (a: Aufruf[], name: string): string | undefined => a.find((x) => x.name === name)?.args.join('|')
  const aus = aufrufe('./build.ts', 'liefereAus')
  pruefe('build: teileStaffelTitel({ titles, releases, events })', args(aus, 'teileStaffelTitel') === '{ titles, releases, events }', args(aus, 'teileStaffelTitel'))
  pruefe('build: Phase vor baueMeta', stelle(aus, 'baueMeta') > 0 && stelle(aus, 'teileStaffelTitel') >= 0 && stelle(aus, 'teileStaffelTitel') < stelle(aus, 'baueMeta'), aus.map((x) => `${x.stelle}:${x.name}`).join())
  pruefe('build: staffelSammel an schreibeDatensatzGemessen', /\|staffelSammel$/.test(args(aus, 'schreibeDatensatzGemessen') ?? ''), args(aus, 'schreibeDatensatzGemessen'))
  pruefe('build: liefereAus bekommt die ganze Phasenfolge (stelleZurueck lief davor)', args(aufrufe('./build.ts', 'main'), 'liefereAus') === 'bauePhasenfolge(ladeQuellen())')
  const schreiben = aufrufe('./bau/13-schreiben.ts', 'schreibeDatensatz')
  pruefe('13-schreiben: staffelSammel an schreibeZusatzdateien', /\bstaffelSammel\b/.test(args(schreiben, 'schreibeZusatzdateien') ?? ''), args(schreiben, 'schreibeZusatzdateien'))
  const zusatz = aufrufe('./bau/13-4-zusatzdateien.ts', 'schreibeZusatzdateien')
  pruefe('13-4: schreibeFolgenDateien(…, releases, staffelSammel)', args(zusatz, 'schreibeFolgenDateien') === '[...titles.values()]|releases|staffelSammel', args(zusatz, 'schreibeFolgenDateien'))
  const folgen = aufrufe('./bau/folgen-dateien.ts', 'schreibeFolgenDateien')
  pruefe('folgen-dateien: Sammelsicht vor der Schleife', args(folgen, 'sammelSicht') === 'nachSchnitt|releasesNachSchnitt|staffelSammel', args(folgen, 'sammelSicht'))
}

// Echter Fall: jede Horizonte-Sichtung mit Wikipedia-Treffer liegt in der Staffel ihres Titels (unabhängig gezählt: Position in der Liste).
const lies = (p: string) => JSON.parse(readFileSync(resolve(ROOT, p), 'utf8'))
const echteWiki = lies('data/wikipedia-folgen.json').titel[String(SAMMEL)].folgen as { nr: number; st?: number; dt: string }[]
const [echt] = staffelPlaene([{ anilistId: SAMMEL, titel: 'Pokémon Horizonte', basis: 4, staffeln: [{ nr: 1, von: 1, bis: 45, kennung: 7_000_001 }, { nr: 2, von: 46, bis: 89, kennung: 7_000_002 }, { nr: 3, von: 90, bis: 136, kennung: 7_000_003 }, { nr: 4, von: 137 }] }]) as [StaffelPlan]
const echteSendungen = (Object.values(lies('data/tv-programm.json').sendungen) as TvSendung[]).filter((x) => x.titleId === SAMMEL)
const echtJeTitel = staffelJeFolgentitel(echteWiki, echt)
const echtPlatz = folgentitelJeSendeplatz(echteSendungen, SAMMEL)
let getroffen = 0
let falsch = 0
for (const x of echteSendungen) {
  const i = echteWiki.findIndex((f) => folgenKern(f.dt) === folgenKern(x.folge))
  if (i < 0) continue
  const soll = i < 45 ? 1 : i < 89 ? 2 : i < 136 ? 3 : 4
  const tag = x.start.slice(0, 10)
  const ziel = zielDesTermins({ id: 'x', releaseSlug: 'x', titleId: SAMMEL, date: tag, time: x.start.slice(11, 16), platform: 'tv', sender: x.sender, sichtung: true, episode: 999, releaseType: 'weekly', name: '' } as ReleaseEvent, undefined, echt, echtPlatz, echtJeTitel)
  getroffen++
  if (ziel?.nr !== soll || ziel.folge !== echteWiki[i]!.st) falsch++
}
pruefe(`echte Sichtungen: jede mit wörtlichem Wikipedia-Treffer in der Staffel ihres Titels (${getroffen} geprüft)`, getroffen >= 100 && falsch === 0, `${falsch} falsch`)
const nebelEcht = echteSendungen.filter((x) => x.folge === 'Ein Lied im Nebel').map((x) => trefferFuer(echtJeTitel, x.folge))
pruefe('echte Sichtungen „Ein Lied im Nebel“ (13.11.): Staffel 1 Folge 31', nebelEcht.length >= 2 && nebelEcht.every((t) => t?.nr === 1 && t.folge === 31), JSON.stringify(nebelEcht))

console.log(`check-staffel-titel-termine: ${faelle} Fälle, ${fehler} Fehler (echte Sichtungen mit Treffer: ${getroffen})`)
process.exit(fehler ? 1 : 0)
