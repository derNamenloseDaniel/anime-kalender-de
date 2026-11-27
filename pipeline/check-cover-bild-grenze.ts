/**
 * Grenzfälle von `coverBild` (web/src/lib/cover.ts), die `check-logic.ts` (Abschnitt „Cover in Anzeigegröße“) nicht berührt:
 * AniList `extraLarge` und `small` als Obergrenze, die Kante `Breite × Dichte` genau auf einer Stufe und einen Pixel daneben,
 * TMDB-Original unter w92 oder außerhalb der Stufenliste, fremde Adresse, leere Eingabe, `sizes`.
 * Erwartete Werte stammen aus der Absicht („nie größer als gespeichert, nie über Breite × Dichte, kleinste passende Stufe“), nicht aus dem Code.
 * Aufruf: `npx tsx pipeline/check-cover-bild-grenze.ts`; Tor: `tools/check-logic-liste.txt`.
 */
import { coverBild } from '../web/src/lib/cover.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}
const ani = (stufe: string) => `https://s4.anilist.co/file/anilistcdn/media/anime/cover/${stufe}/bx9-z.png`
const tmdb = (w: string) => `https://image.tmdb.org/t/p/${w}/c.jpg`
const breiten = (srcSet?: string) => (srcSet ?? '').split(', ').filter(Boolean).map((s) => Number(s.split(' ')[1]?.replace('w', '')))

console.log('\nAniList: Obergrenze ist die gespeicherte Stufe, extraLarge lässt alle drei zu:')
const extra = coverBild(ani('extraLarge'), 300)
pruefe('extraLarge, 300 px × 2: alle drei Stufen, die größte gewählt', JSON.stringify(breiten(extra.srcSet)) === '[100,230,460]' && extra.src === ani('large'), extra)
pruefe('extraLarge, 160 px × 2: Deckel 320, medium gewählt', coverBild(ani('extraLarge'), 160).src === ani('medium') && JSON.stringify(breiten(coverBild(ani('extraLarge'), 160).srcSet)) === '[100,230]', coverBild(ani('extraLarge'), 160))
const klein = coverBild(ani('small'), 300)
pruefe('small gespeichert, 300 px: nie größer als small', klein.src === ani('small') && JSON.stringify(breiten(klein.srcSet)) === '[100]', klein)

console.log('\nAniList: Kante Breite × Dichte genau auf der Stufe und einen Pixel daneben:')
pruefe('230 px × 2 = 460 = large: large ist zulässig', coverBild(ani('large'), 230).src === ani('large'), coverBild(ani('large'), 230))
pruefe('229 px × 2 = 458 < 460: large entfällt, medium gewählt', coverBild(ani('large'), 229).src === ani('medium') && !coverBild(ani('large'), 229).srcSet?.includes('/large/'), coverBild(ani('large'), 229))
pruefe('Dichte 1: 230 px = medium zulässig, 229 px nur small', JSON.stringify(breiten(coverBild(ani('large'), 230, undefined, 1).srcSet)) === '[100,230]' && JSON.stringify(breiten(coverBild(ani('large'), 229, undefined, 1).srcSet)) === '[100]')

console.log('\nTMDB: Kante, Original unter w92 und außerhalb der Stufenliste:')
pruefe('77 px × 2 = 154 = w154: zulässig, gewählt', coverBild(tmdb('w780'), 77).src === tmdb('w154') && JSON.stringify(breiten(coverBild(tmdb('w780'), 77).srcSet)) === '[92,154]', coverBild(tmdb('w780'), 77))
pruefe('76 px × 2 = 152 < 154: w154 entfällt, w92 gewählt', coverBild(tmdb('w780'), 76).src === tmdb('w92') && JSON.stringify(breiten(coverBild(tmdb('w780'), 76).srcSet)) === '[92]', coverBild(tmdb('w780'), 76))
pruefe('Original w45 (kleiner als jede Stufe): Adresse unverändert, kein srcSet', JSON.stringify(coverBild(tmdb('w45'), 100)) === JSON.stringify({ src: tmdb('w45') }), coverBild(tmdb('w45'), 100))
pruefe('Original w92 (kleinste Stufe): nur w92', JSON.stringify(coverBild(tmdb('w92'), 400)) === JSON.stringify({ src: tmdb('w92'), srcSet: `${tmdb('w92')} 92w`, sizes: '400px' }), coverBild(tmdb('w92'), 400))
const dazwischen = coverBild(tmdb('w300'), 400)
pruefe('Original w300 (zwischen w185 und w342): höchstens w185', JSON.stringify(breiten(dazwischen.srcSet)) === '[92,154,185]' && dazwischen.src === tmdb('w185'), dazwischen)

console.log('\nFremde und leere Adresse, sizes:')
pruefe('fremde Adresse: unverändert, ohne srcSet', JSON.stringify(coverBild('https://example.org/poster.jpg', 160)) === JSON.stringify({ src: 'https://example.org/poster.jpg' }))
pruefe('TMDB ohne Breitenangabe (original): unverändert', JSON.stringify(coverBild('https://image.tmdb.org/t/p/original/c.jpg', 160)) === JSON.stringify({ src: 'https://image.tmdb.org/t/p/original/c.jpg' }))
pruefe('undefined und leere Zeichenkette: leeres Objekt', JSON.stringify(coverBild(undefined, 160)) === '{}' && JSON.stringify(coverBild('', 160)) === '{}')
pruefe('sizes: Standard ist die CSS-Breite, eine eigene Angabe wird durchgereicht', coverBild(ani('medium'), 28).sizes === '28px' && coverBild(ani('medium'), 28, '46vw').sizes === '46vw' && coverBild(tmdb('w342'), 28, '46vw').sizes === '46vw')

if (verletzt > 0) {
  console.error(`\n${verletzt} Prüfung(en) verletzt.`)
  process.exit(1)
}
console.log('\ncheck-cover-bild-grenze: ok')
