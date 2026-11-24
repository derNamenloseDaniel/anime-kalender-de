/**
 * Zusicherung: `sammleBelege` (09-1-belege.ts) ruft seine Teilschritte mit den richtigen Titeln auf — Termin-Ton und Kalender-Slot (`dub`),
 * Handverweise, Joyn aus JustWatch, Beleg-Index samt zweiter Ausgabe, Reparatur pfadloser Crunchyroll-Adressen. Jeder Fall hat mindestens zwei
 * Glieder je Rolle (zwei Titel, einer davon mit, einer ohne Wirkung); die Erwartungen stehen als Literale da.
 *
 * Aufruf: npm run check:logic (steckt darin) oder `tsx pipeline/check-sammle-belege-naht.ts`
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Release, Title } from '../shared/types.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const kulisse = mkdtempSync(join(tmpdir(), 'ak-sammle-belege-'))
mkdirSync(join(kulisse, 'data', 'curated'), { recursive: true })
const datei = (name: string, inhalt: string) => writeFileSync(join(kulisse, 'data', name), inhalt)
datei('anisearch-ids-hand.yaml', '[]\n')
datei(
  'dub-confirmed.yaml',
  `- anilistId: 900003
  platform: primevideo
  url: https://www.amazon.de/dp/B0BBB00001
  dub: false
  checkedAt: '2026-11-01'
- anilistId: 900003
  platform: primevideo
  url: https://www.amazon.de/dp/B0BBB00009
  dub: true
  checkedAt: '2026-11-02'
- anilistId: 900004
  platform: primevideo
  url: https://www.amazon.de/gp/video/detail/B0BBB00002
  dub: false
  checkedAt: '2026-11-01'
- anilistId: 900004
  platform: primevideo
  url: https://www.amazon.de/gp/video/detail/B0BBB00008
  dub: true
  checkedAt: '2026-11-02'
- anilistId: 900014
  platform: crunchyroll
  available: false
  checkedAt: '2026-11-01'
`,
)
datei(
  'verweise-von-hand.yaml',
  `- anilistId: 900001
  platform: netflix
  url: https://www.netflix.com/title/90000001
  belegtAm: '2026-11-12'
- anilistId: 900002
  platform: primevideo
  url: https://www.amazon.de/dp/B0CCC00001
  kanal: Crunchyroll
  belegtAm: '2026-11-11'
`,
)
datei(
  'justwatch-audio.json',
  JSON.stringify({
    900005: { angebote: [{ anbieter: 'Joyn', art: 'ADS', url: 'https://www.joyn.de/serien/jw-5' }] },
    900006: { angebote: [{ anbieter: 'Joyn Plus', art: 'FLATRATE', url: 'https://www.joyn.de/serien/jw-6' }] },
  }),
)
datei(
  'cr-katalog-de.json',
  JSON.stringify({
    eintraege: [
      { id: 'GG5H5XQ7D', titel: 'Kaiju No. 8', slug: 'kaiju-no-8', audio: ['de-DE'] },
      { id: 'GKAI00009', titel: 'Kaiju No. 9', slug: 'kaiju-no-9', audio: ['ja-JP'] },
    ],
  }),
)
process.env.AK_ROOT = kulisse
const { sammleBelege } = await import('./bau/09-1-belege.ts')

const stream = (platform: string, url: string) => ({ platform, url })
const titel = (id: number, streams: unknown[], titleDe = `Titel ${id}`) => ({ id, slug: `t${id}`, titleDe, format: 'TV', streams }) as unknown as Title
const eintrag = { time: '18:00', weekday: 0, dates: [], rawTitle: 'x' }
const ADN = 'https://gw.api.animationdigitalnetwork.com/x'
const termin = (titleId: number, quelle: string) =>
  ({ titleId, platform: 'adn', schedule: { firstEpisodeDate: '2000-01-01' }, sources: [quelle] }) as unknown as Release

const titles = new Map<number, Title>(
  [
    titel(900001, [stream('netflix', 'https://www.netflix.com/title/90000009')]),
    titel(900002, [stream('primevideo', 'https://www.amazon.de/dp/B0AAA00002')]),
    titel(900003, [stream('primevideo', 'https://www.amazon.de/dp/B0BBB00001')]),
    titel(900004, [stream('primevideo', 'https://www.amazon.de/gp/video/detail/B0BBB00002')]),
    titel(900005, [stream('netflix', 'https://www.netflix.com/title/90000005')]),
    titel(900006, [stream('netflix', 'https://www.netflix.com/title/90000006')]),
    titel(900007, [stream('crunchyroll', 'https://www.crunchyroll.com/series/CRBBB/b')]),
    titel(900008, [stream('crunchyroll', 'https://www.crunchyroll.com/series/CRDDD/d')]),
    titel(900009, [stream('adn', 'https://animationdigitalnetwork.com/video/900009')]),
    titel(900010, [stream('adn', 'https://animationdigitalnetwork.com/video/900010')]),
    titel(900011, [stream('crunchyroll', 'https://crunchyroll.com')], 'Kaiju No. 8'),
    titel(900012, [stream('crunchyroll', 'https://www.crunchyroll.com/')], 'Kaiju No. 9'),
    titel(900013, [stream('crunchyroll', 'https://www.crunchyroll.com')], 'Unbekannte Serie'),
    titel(900014, [stream('crunchyroll', 'https://www.crunchyroll.com')], 'Beantwortete Serie'),
  ].map((t) => [t.id, t]),
)
const belege = sammleBelege({
  releases: [termin(900009, ADN), termin(900010, 'https://www.anisearch.de/x')],
  titles,
  crBySeriesId: new Map([['CRBBB', { ...eintrag, seriesId: 'CRBBB' }]]),
  tmdbMehrdeutig: new Set<string>(),
  tmdbTitles: {},
  tvJeTmdb: new Set<string>(),
  toteAdressen: new Set<string>(),
  crDub: { scrapedAt: '', serien: [] } as never,
})

const urls = (id: number) => titles.get(id)!.streams.map((s) => s.url)
const dub = (id: number) => titles.get(id)!.streams.map((s) => s.dub === true)
console.log('Termin-Ton und Kalender-Slot')
pruefe('Termin mit Ton-Quelle setzt dub (900009)', dub(900009)[0] === true, dub(900009))
pruefe('Termin ohne Ton-Quelle setzt kein dub (900010)', dub(900010)[0] === false, dub(900010))
pruefe('Kalender-Slot setzt dub (900007)', dub(900007)[0] === true, dub(900007))
pruefe('Serie nicht im Kalender setzt kein dub (900008)', dub(900008)[0] === false, dub(900008))
console.log('Handverweise')
pruefe('900002 bekommt den Handverweis mit Kanal', JSON.stringify(titles.get(900002)!.streams[1]) === JSON.stringify({ platform: 'primevideo', url: 'https://www.amazon.de/dp/B0CCC00001', kanal: 'Crunchyroll' }), titles.get(900002)!.streams)
pruefe('900001 bekommt den Handverweis', urls(900001).length === 2 && urls(900001)[1] === 'https://www.netflix.com/title/90000001', urls(900001))
pruefe('belegtAm je Adresskern: 2 Einträge', belege.vonHandBelegtAm.size === 2, [...belege.vonHandBelegtAm])
console.log('Joyn aus JustWatch')
pruefe('900005 bekommt Joyn (kostenlos)', urls(900005)[1] === 'https://www.joyn.de/serien/jw-5' && belege.joynZugang.get('https://www.joyn.de/serien/jw-5') === 'kostenlos', [urls(900005), [...belege.joynZugang]])
pruefe('900006 bekommt Joyn (Abo)', urls(900006)[1] === 'https://www.joyn.de/serien/jw-6' && belege.joynZugang.get('https://www.joyn.de/serien/jw-6') === 'abo', [...belege.joynZugang])
console.log('Beleg-Index, zweite Ausgabe')
pruefe('900003 bekommt die zweite Ausgabe mit Deutsch', urls(900003).includes('https://www.amazon.de/dp/B0BBB00009'), urls(900003))
pruefe('900004 bekommt die zweite Ausgabe mit Deutsch', urls(900004).includes('https://www.amazon.de/gp/video/detail/B0BBB00008'), urls(900004))
pruefe('belegFuer: Beleg derselben Adresse (900003)', belege.belegFuer(900003, 'primevideo', 'https://www.amazon.de/dp/B0BBB00009', 2)?.dub === true)
pruefe('belegFuer: fremde Adresse bei zwei Wegen kein Ja (900003)', belege.belegFuer(900003, 'primevideo', 'https://www.amazon.de/dp/B0ZZZ00000', 2)?.dub !== true)
console.log('Pfadlose Crunchyroll-Adressen')
pruefe('900011 bekommt die Serienadresse aus dem Katalog', urls(900011)[0] === 'https://www.crunchyroll.com/de/series/GG5H5XQ7D/kaiju-no-8', urls(900011))
pruefe('900012 bekommt die Serienadresse aus dem Katalog', urls(900012)[0] === 'https://www.crunchyroll.com/de/series/GKAI00009/kaiju-no-9', urls(900012))
pruefe('900014 verliert den pfadlosen Weg, die beantwortete Suche bleibt nicht offen', urls(900014).length === 0)
pruefe('900013 verliert den pfadlosen Weg, Suche bleibt offen', urls(900013).length === 0 && JSON.stringify(belege.suchOffen.map((s) => s.id)) === '[900013]', belege.suchOffen)
pruefe('crAdresseZu liefert die Katalogadresse', belege.crAdresseZu('Kaiju No. 8') === 'https://www.crunchyroll.com/de/series/GG5H5XQ7D/kaiju-no-8')
pruefe('crKatalogDeutsch: nur Einträge mit de-DE', JSON.stringify([...belege.crKatalogDeutsch]) === '["GG5H5XQ7D"]', [...belege.crKatalogDeutsch])

rmSync(kulisse, { recursive: true, force: true })
if (verletzt) {
  console.error(`check-sammle-belege-naht: ${verletzt} Verstoß/Verstöße`)
  process.exit(1)
}
console.log('check-sammle-belege-naht: ok (19 Zusicherungen)')
