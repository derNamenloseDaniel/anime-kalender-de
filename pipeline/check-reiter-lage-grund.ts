/**
 * Zusicherungen für die Zeile zur Marke am Reiter (Daniel, 26.11.2026): Marke und Grund kommen aus derselben Rechnung, der Tooltip
 * nennt den frühesten künftigen Termin. Alle Fälle bauen ihre Titel und Releases selbst und übergeben einen festen Stichtag.
 * Aufruf: `npm run check:logic`.
 */
import type { Release, ReleaseEvent, Title } from '../shared/types.ts'
import { fruehesterTermin, staffelLageMitGrund } from '../shared/logic.ts'

const { useLang } = await import('../web/src/lib/i18n.tsx')
const { reihenLageMitGrund, reihenLageVon } = await import('../web/src/components/detail/reihen-reiter-liste.ts')
const { lageZeile, reiterTitel } = await import('../web/src/components/detail/staffel-reiter.tsx')
const { t } = useLang()

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}
const gleich = (name: string, ist: unknown, soll: unknown) => pruefe(name, JSON.stringify(ist) === JSON.stringify(soll), ist)

const HEUTE = '2026-11-26'
const titel = (mehr: Partial<Title> = {}) => ({ id: 900801, episodes: 12, streams: [{ platform: 'crunchyroll', url: 'https://x.invalid', dub: true }], ...mehr }) as Title
const woechentlich = (slug: string, erste: string, beobachtet: Record<string, string> = {}): Release =>
  ({ slug, titleId: 900801, name: 'Reihe: Staffel 2', platform: 'crunchyroll', platformUrl: 'https://x.invalid', releaseType: 'weekly', sources: ['https://x.invalid'], schedule: { firstEpisodeDate: erste, episodeCount: 12, ...(Object.keys(beobachtet).length ? { observed: beobachtet } : {}) } }) as unknown as Release
const disc = (vol: number, datum: string, geschaetzt: boolean): Release =>
  ({ slug: `reihe-s2-vol${vol}`, titleId: 900801, name: `Reihe – Staffel 2 – Vol. ${vol}`, platform: 'disc', platformUrl: 'https://x.invalid', releaseType: 'disc', edition: 'Blu-ray', sources: ['https://x.invalid'], schedule: { firstEpisodeDate: datum, ...(geschaetzt ? { estimated: true } : {}) } }) as unknown as Release
const abgeschlossen = () => {
  const beobachtet: Record<string, string> = {}
  for (let i = 1; i <= 12; i++) beobachtet[String(i)] = `2024-${String(10 + Math.floor((i + 1) / 5)).padStart(2, '0')}-${String(1 + i).padStart(2, '0')}`
  return woechentlich('reihe-cr', '2024-10-02', beobachtet)
}

/* Aristocrat Staffel 2: Stream komplett (2024/25), Vol. 1 schon da, Vol. 2 am 15.01.2027 geschätzt: Ring, Tooltip nennt die Blu-ray. */
const aristocrat = reihenLageMitGrund(titel(), [abgeschlossen(), disc(1, '2026-11-20', false), disc(2, '2027-01-15', true)], HEUTE)
gleich('Aristocrat S2: Ring, Grund ist Blu-ray Vol. 2 am 15.01.2027 geschätzt', [aristocrat.lage, aristocrat.grund?.date, aristocrat.grund?.estimated, aristocrat.grund?.disc], ['kommt', '2027-01-15', true, 'Blu-ray Vol. 2'])
gleich('Aristocrat S2: Zeile zur Marke', lageZeile(aristocrat, t), '○ = Blu-ray Vol. 2 am 15.01.2027 (≈)')
gleich('Aristocrat S2: Tooltip = Titel, Zeile', reiterTitel('Titel', aristocrat, t), 'Titel\n○ = Blu-ray Vol. 2 am 15.01.2027 (≈)')
gleich('Marke und Grund gleich: reihenLageVon sagt dasselbe', reihenLageVon(titel(), [abgeschlossen(), disc(1, '2026-11-20', false), disc(2, '2027-01-15', true)], HEUTE), aristocrat.lage)
/* Nur Vol. 1 in der Zukunft, belegt: ohne ≈, früheste von zwei künftigen gewinnt. */
const zwei = reihenLageMitGrund(titel(), [abgeschlossen(), disc(2, '2027-01-15', true), disc(1, '2026-12-05', false)], HEUTE)
gleich('zwei künftige Discs: die frühere, belegt ohne ≈', lageZeile(zwei, t), '○ = Blu-ray Vol. 1 am 05.12.2026')

/* Grenze: ein Termin am Stichtag selbst zählt, einer am Vortag nicht. */
const ereignis = (datum: string) => ({ r: disc(1, datum, false), e: { date: datum, platform: 'disc' } as ReleaseEvent })
gleich('Termin am Stichtag zählt, am Vortag nicht', [fruehesterTermin([ereignis(HEUTE)], HEUTE)?.date, fruehesterTermin([ereignis('2026-11-25')], HEUTE)], [HEUTE, undefined])

/* Ruht: Stream komplett, nichts kommt → keine Marke, keine Zeile. */
const ruht = reihenLageMitGrund(titel(), [abgeschlossen()], HEUTE)
gleich('abgeschlossen ohne Termin: ruht, keine Zeile', [ruht.lage, lageZeile(ruht, t), reiterTitel('Titel', ruht, t)], ['ruht', '', 'Titel'])

/* Kommende Staffel: erste Folge am 03.01.2027. */
const kommt = reihenLageMitGrund(titel({ streams: [] }), [woechentlich('reihe-neu', '2027-01-03')], HEUTE)
gleich('kommende Staffel: Ring, Folge 1 am 03.01.2027', [kommt.lage, lageZeile(kommt, t)], ['kommt', '○ = Folge 1 bei Crunchyroll am 03.01.2027'])

/* Laufende Staffel: Folgen 1–4 gesehen, die nächste steht an. */
const laeuft = reihenLageMitGrund(titel(), [woechentlich('reihe-lauf', '2026-10-30', { 1: '2026-10-30', 2: '2026-11-06', 3: '2026-11-13', 4: '2026-11-20' })], HEUTE)
gleich('laufende Staffel: Punkt', laeuft.lage, 'laeuft')
gleich('laufende Staffel: Zeile nennt Folge 5 am 27.11.2026, fortgeschrieben mit ≈', lageZeile(laeuft, t), '● = läuft, Folge 5 bei Crunchyroll am 27.11.2026 (≈)')

/* Staffel-Reiter (staffelLage): dieselbe Rechnung mit Folgenbereich; Marke und Grund zusammen. */
const staffelKommt = staffelLageMitGrund(1, 12, false, [woechentlich('reihe-neu', '2027-01-03')], HEUTE)
gleich('Staffel-Reiter: kommt mit Folge 1 am 03.01.2027', [staffelLageMitGrund(1, 12, false, [], HEUTE).lage, staffelKommt.lage, staffelKommt.grund?.episode, staffelKommt.grund?.date], ['ruht', 'kommt', 1, '2027-01-03'])
const staffelLaeuft = staffelLageMitGrund(1, 12, true, [woechentlich('reihe-neu', '2027-01-03')], HEUTE)
gleich('Staffel-Reiter: deutsche Folge da und weitere Folgen offen: Punkt mit Grund', [staffelLaeuft.lage, staffelLaeuft.grund?.episode], ['laeuft', 1])
gleich('Staffel-Reiter: Gestrichelt-Zeile', reiterTitel('X', { lage: 'ruht' }, t, true), 'X\ngestrichelt = ohne deutsche Synchro')

if (verletzt > 0) {
  console.error(`\n${verletzt} Prüfung(en) verletzt`)
  process.exit(1)
}
console.log('\ncheck-reiter-lage-grund: Marke und Grund aus einer Rechnung, Tooltip-Zeile ✓')
