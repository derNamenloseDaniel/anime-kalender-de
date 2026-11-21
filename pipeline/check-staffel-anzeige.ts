/**
 * Staffelzählung in Anbieterzeile und Kalenderkarte (Daniel, 21.11.2026: „wieso ist pokemon horizonte immer noch nicht aufgeteilt nach
 * staffeln?“). Wo der Titel deutsche Staffelgrenzen hat, sagt die RTL+-Zeile „Staffel 1–3 · Staffel 4 Fg. 1“ statt „Fg. 1–136 seit
 * 20.11.2026“ (das Datum gehört zum Termin ab Folge 137), und die Karte des Termins „Folge 1“ bzw. „Staffel 4 · Folge 1“ statt „Folge 137“.
 * Lehre: Eine Folgennummer in Gesamtzählung ist bei einem Titel mit Staffeln keine Antwort auf „welche Staffel, welche Folge?“, und ein
 * Datum gehört zu den Folgen, deren Termin es trägt. Aufruf: npx tsx pipeline/check-staffel-anzeige.ts (läuft in `check:logic`).
 */
import type { Release, ReleaseEvent, StreamLink, Title } from '../shared/types.ts'
import { staffelTeile, staffelUndFolge, type StaffelZeile } from '../shared/staffel-folge.ts'
import { staffelAngabe } from '../web/src/components/detail/staffel-angabe.ts'
import { pilleUnten } from '../web/src/components/detail/pille-unten.ts'
import { anbieterUndFolge } from '../web/src/components/kalender/Marken.tsx'
import { schreibeStaffelFolgen } from './bau/staffel-folge-termine.ts'
import { HORIZONTE_STAFFELN, ladeStaffelGrenzen, staffelListen } from './lib/pokemon-staffeln.ts'

let verletzt = 0
let gezaehlt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  gezaehlt++
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const T = (k: string, v?: Record<string, string | number>) => `${k}:${JSON.stringify(v)}`
const S13 = 'detail.teilStaffel:{"von":1,"bis":3}'
const S4F1 = 'detail.staffelFolgen:{"s":4,"bereiche":"1"}'
const horizonte = staffelListen(ladeStaffelGrenzen(HORIZONTE_STAFFELN)).get(158871)
const rtl: Pick<StreamLink, 'platform' | 'dubRanges'> = { platform: 'rtlplus', dubRanges: [{ from: 1, to: 136, dub: true }] }
const rel = (schedule: Partial<Release['schedule']>, extra: Partial<Release> = {}): Release =>
  ({ slug: 'p-900410', titleId: 900410, name: 'Probe', platform: 'rtlplus', releaseType: 'batch', ...extra, schedule: { firstEpisodeDate: '2026-11-20', ...schedule } }) as Release
const s4 = rel({ firstEpisodeNumber: 137, episodeCount: 1 })
const angabe = (s: StaffelZeile[] | undefined, weg: Parameters<typeof staffelAngabe>[1], rs: Release[], heute = '2026-11-21') => staffelAngabe(s, weg, rs, heute, T)

/* Anbieterzeile: der echte Horizonte-Fall auf den echten Staffelgrenzen. */
pruefe('Echte Grenzen Horizonte geladen (4 Staffeln, letzte offen)', JSON.stringify(horizonte) === '[[1,1,45],[2,46,89],[3,90,136],[4,137]]', horizonte)
pruefe('RTL+ Horizonte: „Staffel 1–3 · Staffel 4 Fg. 1“', angabe(horizonte, rtl, [s4]) === `${S13} · ${S4F1}`, angabe(horizonte, rtl, [s4]))
pruefe('Vor dem Termin: nur „Staffel 1–3“', angabe(horizonte, rtl, [s4], '2026-11-19') === S13, angabe(horizonte, rtl, [s4], '2026-11-19'))
pruefe('Netflix 2–44: „Staffel 1 Fg. 2–44“', angabe(horizonte, { platform: 'netflix', dubRanges: [{ from: 2, to: 44, dub: true }] }, [s4]) === 'detail.staffelFolgen:{"s":1,"bereiche":"2–44"}')
pruefe('Termin eines anderen Anbieters zählt nicht', angabe(horizonte, rtl, [rel({ firstEpisodeNumber: 137, episodeCount: 1 }, { platform: 'netflix' })]) === S13)
pruefe('Termin über einen Kanal zählt nicht für den Weg ohne Kanal', angabe(horizonte, rtl, [rel({ firstEpisodeNumber: 137, episodeCount: 1 }, { kanal: 'Probe' })]) === S13)
pruefe('Nur-OmU-Termin zählt nicht', angabe(horizonte, rtl, [rel({ firstEpisodeNumber: 137, episodeCount: 1 }, { sprache: 'omu' })]) === S13)
pruefe('Bereich ohne Deutsch zählt nicht', angabe(horizonte, { platform: 'rtlplus', dubRanges: [{ from: 1, to: 45, dub: true }, { from: 46, to: 89, dub: false }] }, []) === 'detail.teilStaffelEine:{"nr":1}')
pruefe('Volle Staffeln mit Lücke: „Staffel 1 · Staffel 3“', angabe(horizonte, { platform: 'rtlplus', dubRanges: [{ from: 1, to: 45, dub: true }, { from: 90, to: 136, dub: true }] }, []) === 'detail.teilStaffelEine:{"nr":1} · detail.teilStaffelEine:{"nr":3}')
pruefe('Grenze: Staffel 2 bis 88 ist angebrochen', angabe(horizonte, { platform: 'rtlplus', dubRanges: [{ from: 1, to: 88, dub: true }] }, []) === 'detail.teilStaffelEine:{"nr":1} · detail.staffelFolgen:{"s":2,"bereiche":"1–43"}')
pruefe('Offene Staffel ist nie voll', angabe([[1, 1, 2], [2, 3]], { platform: 'rtlplus', dubRanges: [{ from: 1, to: 5, dub: true }] }, []) === 'detail.teilStaffelEine:{"nr":1} · detail.staffelFolgen:{"s":2,"bereiche":"1–3"}')
pruefe('Folge hinter der letzten Staffel: durchgehende Zählung', angabe([[1, 1, 10]], { platform: 'rtlplus', dubRanges: [{ from: 1, to: 12, dub: true }] }, []) === undefined)
pruefe('Folge vor der ersten Staffel: durchgehende Zählung', staffelTeile([[2, 3, 5]], [[1, 5]]) === undefined)
pruefe('Ohne Staffelgrenzen: nichts', angabe(undefined, rtl, [s4]) === undefined && angabe([], rtl, [s4]) === undefined)
pruefe('Ohne deutsche Folgen: nichts', angabe(horizonte, { platform: 'rtlplus', dubRanges: [] }, []) === undefined)
pruefe('Joyn (rollendes Fenster): nichts', angabe(horizonte, { ...rtl, platform: 'joyn' }, [s4]) === undefined)
pruefe('Vom Wochenplan ergänzte Folgen (≈): nichts', angabe(horizonte, { ...rtl, ergaenzteFolgen: [136] }, [s4]) === undefined)

/* Die ganze zweite Zeile der Pille: Staffeln statt Bereich, und das Datum des S4-Termins steht nicht als „seit“ des Wegs da. */
const titel = { id: 900410 } as Title
const weg = { platform: 'rtlplus', dub: true, dubRanges: rtl.dubRanges } as StreamLink
const mit = pilleUnten({ title: titel, s: weg, releases: [s4], folgenAngabe: 'detail.folgenBereich:{"bereich":"1–136"}', today: '2026-11-21', t: T, staffelAngabe: angabe(horizonte, weg, [s4]) })
pruefe('Pille Horizonte RTL+: Staffeln, ohne „seit 20.11.2026“', mit === `${S13} · ${S4F1}`, mit)
const ohne = pilleUnten({ title: titel, s: weg, releases: [s4], folgenAngabe: 'detail.folgenBereich:{"bereich":"1–136"}', today: '2026-11-21', t: T })
pruefe('Gegenfall ohne Staffeln: Bereich und „seit“ wie bisher', ohne === 'detail.folgenBereich:{"bereich":"1–136"} · detail.seitDatum:{"d":"20.11.2026"}', ohne)
const abEins = pilleUnten({ title: titel, s: weg, releases: [rel({ firstEpisodeNumber: 1, episodeCount: 136 })],folgenAngabe: '', today: '2026-11-21', t: T, staffelAngabe: S13 })
pruefe('Termin ab Folge 1 bleibt „seit“ auch mit Staffeln', abEins === `${S13} · detail.seitDatum:{"d":"20.11.2026"}`, abEins)

/* Kalender: Staffel und Folge am Termin, und der Kartentext. */
pruefe('staffelUndFolge: 137 → Staffel 4 Folge 1 (offen)', JSON.stringify(staffelUndFolge(horizonte, 137)) === '[4,1]')
pruefe('staffelUndFolge: Grenze 45 → [1,45], 46 → [2,1]', JSON.stringify([staffelUndFolge(horizonte, 45), staffelUndFolge(horizonte, 46)]) === '[[1,45],[2,1]]')
pruefe('staffelUndFolge: hinter geschlossener letzter Staffel nichts', staffelUndFolge([[1, 1, 10]], 11) === undefined)
const ev = (episode: number | undefined, extra: Partial<ReleaseEvent> = {}): ReleaseEvent =>
  ({ id: `e${episode}`, releaseSlug: 'p-900410', titleId: 158871, date: '2026-11-20', platform: 'rtlplus', releaseType: 'batch', name: 'Pokémon Horizonte – Staffel 4', ...(episode ? { episode } : {}), ...extra }) as ReleaseEvent
const termine = [ev(137), ev(50, { platform: 'tv' }), ev(undefined, { episodeCount: 1 }), ev(46, { titleId: 900411 }), ev(46)]
const geschrieben = schreibeStaffelFolgen(termine, new Map([[158871, horizonte!]]))
pruefe('Bau: genau zwei Termine bekommen Staffel und Folge', geschrieben === 2, geschrieben)
pruefe('Bau: 137 → [4,1], 46 → [2,1]', JSON.stringify([termine[0]!.staffelFolge, termine[4]!.staffelFolge]) === '[[4,1],[2,1]]', termine.map((e) => e.staffelFolge))
pruefe('Bau: Fernsehen, ohne Nummer, ohne Grenzen bleiben ohne', termine.slice(1, 4).every((e) => e.staffelFolge === undefined), termine.slice(1, 4))
const karte = anbieterUndFolge(termine[0]!, T)
pruefe('Karte „Pokémon Horizonte – Staffel 4“: „RTL+ · Folge 1“ (Staffel steht im Namen)', karte === 'RTL+ · kal.folge:{"n":1}', karte)
const ohneName = anbieterUndFolge({ ...termine[0]!, name: 'Pokémon Horizonte' }, T)
pruefe('Karte ohne Staffel im Namen: „RTL+ · Staffel 4 · Folge 1“', ohneName === 'RTL+ · kal.staffelFolge:{"s":4,"n":1}', ohneName)
const andere = anbieterUndFolge({ ...termine[0]!, name: 'Probe – Staffel 14', staffelFolge: [1, 3] }, T)
pruefe('„Staffel 14“ im Namen nennt Staffel 1 nicht', andere === 'RTL+ · kal.staffelFolge:{"s":1,"n":3}', andere)
const ohneFeld = anbieterUndFolge(ev(137), T)
pruefe('Gegenfall ohne Staffelgrenzen: „RTL+ · Folge 137“', ohneFeld === 'RTL+ · kal.folge:{"n":137}', ohneFeld)

if (verletzt) {
  console.error(`${verletzt} von ${gezaehlt} Zusicherung(en) verletzt.`)
  process.exit(1)
}
console.log(`check-staffel-anzeige: ${gezaehlt} Zusicherungen erfüllt (Anbieterzeile, Pille, Termin, Karte)`)
