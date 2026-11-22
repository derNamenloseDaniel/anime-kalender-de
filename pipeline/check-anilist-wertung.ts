/**
 * Zusicherungen zum AniList-Rückfall der Wertung (Rang 7a, 22.11.2026): `averageScore`, sonst `meanScore`, ab `MIN_STIMMEN_ANILIST` Stimmen,
 * nur wo aniSearch keine gültige Wertung hat, gekennzeichnet mit `scoreQuelle: 'anilist'`. Läuft gegen eine Wegwerf-Wurzel (`AK_ROOT`), Aufruf: `check:logic`.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Title } from '../shared/types.ts'

const wurzel = mkdtempSync(join(tmpdir(), 'ak-anilist-wertung-'))
process.env.AK_ROOT = wurzel
mkdirSync(join(wurzel, 'data', 'cache'), { recursive: true })
mkdirSync(join(wurzel, 'data', 'curated'), { recursive: true })
for (const y of ['kino-ankuendigungen.yaml', 'anisearch-ids-hand.yaml']) writeFileSync(join(wurzel, 'data', y), '[]') // Einfuhr der Bauphasen liest sie beim Laden
const verteilung = (...mengen: number[]) => ({ scoreDistribution: mengen.map((amount, i) => ({ score: (i + 1) * 10, amount })) })
const eintrag = (id: number, averageScore: number | null, meanScore: number | null, ...mengen: number[]) => ({ id, averageScore, meanScore, stats: verteilung(...mengen) })
writeFileSync(join(wurzel, 'data', 'cache', 'anilist-by-id.json'), JSON.stringify({
  900101: eintrag(900101, 70, 60, 30, 10), // beide: averageScore gewinnt
  900102: eintrag(900102, null, 64, 6, 6), // nur meanScore, 12 Stimmen
  900103: eintrag(900103, null, 80, 9), // 9 Stimmen: zu wenig
  900104: eintrag(900104, 55, 55, 10), // genau 10 Stimmen: gilt
  900105: eintrag(900105, null, null, 50), // keine Zahl
  900106: { id: 900106, averageScore: null, meanScore: 70, stats: null }, // keine Verteilung
}))
writeFileSync(join(wurzel, 'data', 'cache', 'anilist-media.json'), JSON.stringify({ 5001: eintrag(900107, null, 52, 20) }))

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const { anilistWertungAus, ladeAnilistWertungen } = await import('./lib/anilist-wertung.ts')
const { bewertungNachRegel, mitProduktFeldern } = await import('./bau/produkt-regel.ts')
const { verweiseFuer } = await import('../web/src/components/detail/verweise.ts')

const w = ladeAnilistWertungen()
pruefe('averageScore hat Vorrang vor meanScore', w.get(900101)?.score === 70, w.get(900101))
pruefe('meanScore ist Rückfall, wo averageScore fehlt', w.get(900102)?.score === 64, w.get(900102))
pruefe('9 Stimmen reichen nicht, 10 gelten', !w.has(900103) && w.get(900104)?.score === 55, [w.get(900103), w.get(900104)])
pruefe('ohne Zahl oder ohne Verteilung keine Wertung', !w.has(900105) && !w.has(900106))
pruefe('auch Einträge nach MAL-Kennung (anilist-media.json) zählen, Schlüssel ist die AniList-Kennung', w.get(900107)?.score === 52, w.get(900107))
pruefe('Stimmen sind die Summe der Verteilung', w.get(900101)?.stimmen === 40, w.get(900101))
pruefe('Einheit: Stufe mit leerer Verteilung (null) zählt 0 Stimmen', anilistWertungAus({ averageScore: 80, meanScore: 80, stats: { scoreDistribution: null } }) === undefined)

const titel = (id: number, rest: Partial<Title> = {}): Title => ({ id, dubConfidence: 'low', ...rest }) as Title
const rueck = (id: number, asId?: number, rest: Partial<Title> = {}) => {
  const t = mitProduktFeldern(titel(id, rest), asId)
  return { score: t.score, scoreQuelle: t.scoreQuelle }
}
pruefe('Rückfall: Wertung von AniList, gekennzeichnet', JSON.stringify(rueck(900101)) === JSON.stringify({ score: 70, scoreQuelle: 'anilist' }), rueck(900101))
pruefe('Rückfall meanScore im Bau ebenfalls gekennzeichnet', JSON.stringify(rueck(900102)) === JSON.stringify({ score: 64, scoreQuelle: 'anilist' }), rueck(900102))
pruefe('zu wenig Stimmen: keine Wertung, keine Kennzeichnung', rueck(900103).score === undefined && rueck(900103).scoreQuelle === undefined)
pruefe('aniSearch-Klarwert (Seite 10: 74 %, 1991 Stimmen) hat Vorrang vor AniList', JSON.stringify(rueck(900101, 10)) === JSON.stringify({ score: 74, scoreQuelle: undefined }), rueck(900101, 10))
pruefe('aniSearch genau 5 Stimmen (Seite 1001: 36 %) gilt, 4 Stimmen (Seite 10066) fallen auf AniList zurück',
  JSON.stringify(rueck(900101, 1001)) === JSON.stringify({ score: 36, scoreQuelle: undefined }) && JSON.stringify(rueck(900101, 10066)) === JSON.stringify({ score: 70, scoreQuelle: 'anilist' }), [rueck(900101, 1001), rueck(900101, 10066)])
pruefe('fehlende Zwischenspeicher-Datei zählt leer, die vorhandene bleibt', ladeAnilistWertungen(['data/cache/gibt-es-nicht.json', 'data/cache/anilist-by-id.json']).get(900101)?.score === 70)
pruefe('TMDB-Wertung (Cartoon) bleibt', JSON.stringify(rueck(900101, undefined, { score: 66, scoreQuelle: 'tmdb' })) === JSON.stringify({ score: 66, scoreQuelle: 'tmdb' }))
pruefe('Titel ohne Eintrag: keine Wertung', rueck(900199).score === undefined)
pruefe('bewertungNachRegel ohne AniList-Wertung und ohne Seite: leer', Object.keys(bewertungNachRegel({}, undefined)).length === 0)

const alsAnilist = titel(900101, { score: 70, scoreQuelle: 'anilist', anisearchId: 10 })
const verweise = verweiseFuer(alsAnilist)
pruefe('Absprung der Wertung führt zu AniList, nicht zu aniSearch', verweise.length === 1 && verweise[0]?.name === 'AniList' && verweise[0].ziel === 'https://anilist.co/anime/900101' && verweise[0].hinweis === 'Bei AniList ansehen', verweise)
pruefe('ohne Rückfall bleibt der Absprung aniSearch', verweiseFuer(titel(900101, { score: 74, anisearchId: 10 }))[0]?.name === 'aniSearch')

writeFileSync(join(wurzel, 'data', 'cache', 'anilist-by-id.json'), JSON.stringify({ 900101: eintrag(900101, 33, 33, 99) }))
pruefe('Standardliste wird einmal je Prozess gelesen, eine eigene Liste liest neu und ändert den Merker nicht',
  ladeAnilistWertungen().get(900101)?.score === 70 && ladeAnilistWertungen(['data/cache/anilist-by-id.json']).get(900101)?.score === 33 && ladeAnilistWertungen().get(900101)?.score === 70)

rmSync(wurzel, { recursive: true, force: true })
console.log(verletzt ? `\nAniList-Wertung: ${verletzt} Zusicherung(en) verletzt.` : 'AniList-Wertung: alle Zusicherungen halten.')
process.exit(verletzt ? 1 : 0)
