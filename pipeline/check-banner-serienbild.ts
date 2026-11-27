/**
 * Serienbild nur, wenn die TMDB-Serie genau diesen Titel umfasst (`bau/banner-serienbild.ts`, `bannerNachRegel`): Anlass JoJo 2012
 * (AniList 14719, live /t/6041/) trug das Hintergrundbild von Steel Ball Run (27.11.2026). Erst die reine Regel, dann der Bau-Leser
 * an den echten Dateien in `data/` (Schnellweg). Aufruf: `npx tsx pipeline/check-banner-serienbild.ts` (`check:logic`).
 */
import { geteilteSerien, serienbildFremd, type SerienFolgen, type SerienZuordnung } from './bau/banner-serienbild.ts'
import { bannerNachRegel } from './bau/produkt-regel.ts'

let fehler = 0
function pruefe(name: string, bedingung: boolean, gefunden?: unknown): void {
  if (bedingung) return console.log(`  ✓ ${name}`)
  fehler++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — ${JSON.stringify(gefunden)}`}`)
}

const staffeln = (...folgenJe: number[]) => folgenJe.flatMap((n, i) => Array.from({ length: n }, () => ({ s: i + 1 })))
const zuordnung: SerienZuordnung = { 1: { tmdbId: 10, kind: 'tv' }, 2: { tmdbId: 20, kind: 'tv' }, 3: { tmdbId: 20, kind: 'tv' }, 4: { tmdbId: 40, kind: 'movie' }, 5: { tmdbId: 50, kind: 'tv' }, 6: null }
const folgen: SerienFolgen = { 1: { tmdbId: 10, folgen: [{ s: 0 }, ...staffeln(26, 48)] }, 5: { tmdbId: 50, folgen: [{ s: 0 }, { s: 0 }, ...staffeln(12)] } }
const geteilt = geteilteSerien(zuordnung)
const fremd = (id: number, episodes?: number, f: SerienFolgen = folgen) => serienbildFremd({ id, episodes }, zuordnung, f, geteilt)

console.log('Regel')
pruefe('geteilte Serie: nur TV-Kennungen mit mehr als einem Titel', [...geteilt].join() === '20', [...geteilt])
pruefe('Serie mit zwei Staffeln, Titel nur die erste: fremd', fremd(1, 26))
pruefe('Titel umfasst alle regulären Folgen: eigen', !fremd(1, 74))
pruefe('Folgenzahl unbekannt: kein Urteil aus den Staffeln', !fremd(1, undefined))
pruefe('zwei Titel auf derselben Serie: fremd, auch ohne Folgen', fremd(2, 12) && fremd(3, 12))
pruefe('Film: nie fremd', !fremd(4, 1))
pruefe('Specials (Staffel 0) zählen nicht als zweite Staffel', !fremd(5, 12))
pruefe('ohne Zuordnung: eigen', !fremd(6, 12) && !fremd(7, 12))
pruefe('Folgen einer anderen TMDB-Kennung zählen nicht', !fremd(1, 26, { 1: { tmdbId: 99, folgen: staffeln(26, 48) } }))

console.log('Bau-Leser an den echten Dateien')
const AL = 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/14719-m7Hv2AxcNNjM.jpg'
pruefe('JoJo 2012 (14719): eigenes AniList-Banner statt Serienbild', bannerNachRegel(14719, AL, 26) === AL, bannerNachRegel(14719, AL, 26))
pruefe('JoJo 2012 ohne AniList-Banner: Serienbild bleibt (kein leerer Kopf)', bannerNachRegel(14719, undefined, 26)?.includes('image.tmdb.org') === true)
pruefe('Gantz (384, 395) teilen eine TMDB-Serie: beide AniList', bannerNachRegel(384, 'a', 13) === 'a' && bannerNachRegel(395, 'b', 13) === 'b')
pruefe('Cowboy Bebop (1): eine Staffel, alle Folgen: TMDB bleibt', bannerNachRegel(1, 'a', 26)?.includes('image.tmdb.org') === true, bannerNachRegel(1, 'a', 26))

if (fehler) {
  console.error(`\n✖ ${fehler} Zusicherung(en) verletzt`)
  process.exit(1)
}
console.log('\n✓ Serienbild nur für den Titel, den die TMDB-Serie ganz umfasst')
