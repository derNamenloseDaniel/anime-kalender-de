/**
 * Serienbild nur, wenn die TMDB-Serie genau diesen Titel umfasst (`bau/banner-serienbild.ts`, `bannerNachRegel`): Anlass JoJo 2012
 * (AniList 14719, live /t/6041/) trug das Hintergrundbild von Steel Ball Run (27.11.2026). Erst die reine Regel, dann der Bau-Leser und die Bauschleife
 * an einer Kulisse (`AK_ROOT`) statt an den Bestandsdaten. Aufruf: `npx tsx pipeline/check-banner-serienbild.ts` (`check:logic`).
 */
import { geteilteSerien, serienbildFremd, type SerienFolgen, type SerienZuordnung } from './bau/banner-serienbild.ts'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Title } from '../shared/types.ts'

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


console.log('Bau-Leser und Bauschleife an einer Kulisse (AK_ROOT, keine Bestandsdaten)')
const AL = 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/14719-m7Hv2AxcNNjM.jpg'
const kulisse = mkdtempSync(join(tmpdir(), 'banner-serienbild-'))
const schreibe = (datei: string, inhalt: unknown): void => {
  mkdirSync(join(kulisse, 'data'), { recursive: true })
  writeFileSync(join(kulisse, 'data', datei), JSON.stringify(inhalt))
}
const bild = (p: string) => ({ p, w: 1280, h: 720 })
/* 14719: eine TMDB-Serie mit 2 Staffeln (26 + 48), Titel nur die erste · 384/395: teilen eine Serie · 1: Serie = Titel · 8: fremd, AniList ohne Banner · 9: TMDB ohne Banner */
schreibe('tmdb-banner.json', { 14719: bild('/jojo.jpg'), 384: bild('/gantz.jpg'), 395: bild('/gantz.jpg'), 1: bild('/bebop.jpg'), 8: bild('/acht.jpg') })
schreibe('tmdb-titles.json', { 14719: { tmdbId: 10, kind: 'tv' }, 384: { tmdbId: 20, kind: 'tv' }, 395: { tmdbId: 20, kind: 'tv' }, 1: { tmdbId: 50, kind: 'tv' }, 8: { tmdbId: 30, kind: 'tv' } })
schreibe('tmdb-folgen.json', { 14719: { tmdbId: 10, folgen: staffeln(26, 48) }, 1: { tmdbId: 50, folgen: staffeln(26) }, 8: { tmdbId: 30, folgen: staffeln(12, 12) } })
writeFileSync(join(kulisse, 'data', 'kino-ankuendigungen.yaml'), '[]\n') // Der Import des Bauschritts liest sie beim Laden
process.env.AK_ROOT = kulisse
const { bannerEntscheidung, bannerNachRegel, mitProduktFeldern, setzeProduktFelder } = await import('./bau/produkt-regel.ts')
const tmdb = (p: string) => `https://image.tmdb.org/t/p/w1280${p}`

pruefe('JoJo 2012: eigenes AniList-Banner statt Serienbild', bannerNachRegel(14719, AL, 26) === AL, bannerNachRegel(14719, AL, 26))
pruefe('JoJo 2012 ohne AniList-Banner: Serienbild bleibt, gezählt als „fremd-bleibt“', bannerEntscheidung(14719, undefined, 26).art === 'fremd-bleibt' && bannerEntscheidung(14719, undefined, 26).bild === tmdb('/jojo.jpg'))
pruefe('Gantz (384, 395) teilen eine TMDB-Serie: beide AniList', bannerNachRegel(384, 'a', 13) === 'a' && bannerNachRegel(395, 'b', 13) === 'b')
pruefe('Cowboy Bebop (1): Serie = Titel, TMDB bleibt', bannerEntscheidung(1, 'a', 26).art === 'tmdb' && bannerNachRegel(1, 'a', 26) === tmdb('/bebop.jpg'))
pruefe('TMDB ohne Banner: AniList bleibt (Übergang)', bannerEntscheidung(9, 'a', 12).art === 'anilist-luecke' && bannerNachRegel(9, 'a', 12) === 'a')

/* Die Schleife des Baus reicht die Folgenzahl durch: Fremdheit nur über `episodes` (JoJo: kein zweiter Titel auf der Serie). */
const lauf = (t: object) => mitProduktFeldern({ ...t } as Title, undefined).bannerImage
pruefe('Bauschleife (mitProduktFeldern): Fremdheit nur über die Folgenzahl des Titels', lauf({ id: 14719, episodes: 26, bannerImage: AL }) === AL, lauf({ id: 14719, episodes: 26, bannerImage: AL }))
pruefe('Bauschleife: gleicher Titel ohne Folgenzahl behält das Serienbild (kein Urteil ohne Zahl)', lauf({ id: 14719, bannerImage: AL }) === tmdb('/jojo.jpg'))
const titel = new Map<number, Title>([14719, 8, 1, 9].map((id) => [id, { id, episodes: id === 14719 ? 26 : 12, bannerImage: id === 8 ? undefined : AL } as Title]))
setzeProduktFelder(titel)
pruefe('setzeProduktFelder: JoJo AniList, Titel 8 Serienbild, Bebop TMDB, Titel 9 AniList', titel.get(14719)?.bannerImage === AL && titel.get(8)?.bannerImage === tmdb('/acht.jpg') && titel.get(1)?.bannerImage === tmdb('/bebop.jpg') && titel.get(9)?.bannerImage === AL)
rmSync(kulisse, { recursive: true, force: true })

if (fehler) {
  console.error(`\n✖ ${fehler} Zusicherung(en) verletzt`)
  process.exit(1)
}
console.log('\n✓ Serienbild nur für den Titel, den die TMDB-Serie ganz umfasst')
