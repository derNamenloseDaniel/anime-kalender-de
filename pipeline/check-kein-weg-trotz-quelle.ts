/**
 * Zusicherungen zu `keinWegTrotzQuelle` (26.11.2026, `pipeline/lib/kein-weg-trotz-quelle.ts`) an erfundenen Fällen; der Bestand läuft in
 * `check-kein-weg-trotz-quelle-bestand.ts`.
 */
import type { Release } from '../shared/types.ts'
import type { DubCheck } from './lib/dub-confirmed.ts'
import { baueNeinGilt } from './lib/maengel-nein.ts'
import { keinWegTrotzQuelle, type KuratierterEintrag } from './lib/kein-weg-trotz-quelle.ts'

let fehler = 0
function pruefe(name: string, ok: boolean, detail: unknown = ''): void {
  if (ok) return
  fehler++
  console.error(`FEHLER: ${name} — ${JSON.stringify(detail)}`)
}

const HEUTE = '2026-11-20'
const QUELLE = ['https://www.anime2you.de/news/1049795/prime-video-trinity-seven-und-mehr/']
const eintrag = (anilistId: number, platform: string, ab: string, mehr: Partial<KuratierterEintrag> = {}): KuratierterEintrag =>
  ({ anilistId, slug: `s${anilistId}-${platform}`, platform, releaseType: 'movie', schedule: { firstEpisodeDate: ab }, sources: QUELLE, ...mehr }) as KuratierterEintrag
const beleg = (anilistId: number, mehr: Partial<DubCheck>) => ({ anilistId, platform: 'primevideo', checkedAt: '2026-08-30', ...mehr }) as DubCheck
const lauf = (offen: number[], kuratiert: KuratierterEintrag[], belege: DubCheck[] = [], releases: Release[] = []) =>
  keinWegTrotzQuelle({ offen: new Set(offen), releases, kuratiert: [{ datei: 'streaming-nachtrag-2026.yaml', eintraege: kuratiert }], belege, neinGilt: baueNeinGilt(belege), heute: HEUTE })

const kuroko = lauf([102836], [eintrag(102836, 'primevideo', '2026-09-13')], [beleg(102836, { available: false })])
pruefe('Kuroko: Nachtrag-Termin nach dem Nein, Titel ohne Weg offen: rot mit Datei und Slug', kuroko.length === 1 && kuroko[0]!.rot && kuroko[0]!.quelle === 'streaming-nachtrag-2026.yaml s102836-primevideo', kuroko)
pruefe('ein Nein jünger als der Termin entschuldigt', lauf([102836], [eintrag(102836, 'primevideo', '2026-09-13')], [beleg(102836, { available: false, checkedAt: '2026-09-20' })]).length === 0)
pruefe('ein „ohne deutschen Ton“ entschuldigt unabhängig vom Datum', lauf([1], [eintrag(1, 'primevideo', '2026-09-13')], [beleg(1, { dub: false })]).length === 0)
pruefe('Kino, Fernsehen und Disc sind kein Weg', lauf([1], [eintrag(1, 'kino', '2026-09-13'), eintrag(1, 'tv', '2026-09-13'), eintrag(1, 'disc', '2026-09-13', { releaseType: 'disc' })]).length === 0)
pruefe('erst kommender, geschätzter oder quellenloser Termin zählt nicht', lauf([1], [eintrag(1, 'netflix', '2026-12-01'), eintrag(1, 'netflix', '2026-09-01', { schedule: { firstEpisodeDate: '2026-09-01', estimated: true } }), eintrag(1, 'disneyplus', '2026-09-01', { sources: [] })]).length === 0)
pruefe('ein Titel mit Weg (nicht offen) zählt nicht', lauf([], [eintrag(1, 'netflix', '2026-09-01')]).length === 0)
const gebaut = lauf([7], [], [], [{ ...eintrag(7, 'crunchyroll', '2026-10-01'), titleId: 7, slug: 'cr-7' } as unknown as Release])
pruefe('ein gebauter Termin in releases.json zählt ebenso', gebaut.length === 1 && gebaut[0]!.quelle === 'releases.json cr-7', gebaut)
const ja = lauf([9], [], [beleg(9, { available: false }), beleg(9, { dub: true, checkedAt: '2026-11-01' })])
pruefe('jüngster Handbeleg „deutsch“ ohne Weg: nur Warnung', ja.length === 1 && !ja[0]!.rot, ja)
pruefe('ein jüngeres Nein nach dem Ja: keine Warnung', lauf([9], [], [beleg(9, { dub: true, checkedAt: '2026-08-01' }), beleg(9, { available: false })]).length === 0)
const doppelt = lauf([5], [eintrag(5, 'netflix', '2026-09-01')], [beleg(5, { platform: 'netflix', dub: true })])
pruefe('Termin und Ja-Beleg zum selben Anbieter: ein roter Fund', doppelt.length === 1 && doppelt[0]!.rot, doppelt)

if (fehler) process.exit(1)
console.log('check-kein-weg-trotz-quelle: ok')
