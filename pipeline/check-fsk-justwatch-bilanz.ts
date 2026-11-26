/** Zusicherungen zur Bilanz von `setzeFskAusBefunden` (`bau/11-2-1-fsk-justwatch.ts`): jeder Titel ohne Freigabe landet in genau einem Zähler. Aufruf: `npm run check:logic`. */
import type { Fsk, Title } from '../shared/types.ts'
import { fskJwBilanzZeile, setzeFskAusBefunden, type JwBefund } from './bau/11-2-1-fsk-justwatch.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean): void {
  if (!ok) verletzt++
  console.log(`  ${ok ? '✓' : '✖'} ${name}`)
}
const t = (id: number, fsk?: Fsk): Title => ({ id, fsk }) as unknown as Title

const titel = [t(1), t(2), t(3), t(4), t(5), t(6), t(7), t(8, 12), t(9, 16), t(10, 6)]
const jw: Record<string, JwBefund> = {
  1: { altersangabe: '12' },
  2: { ohneTreffer: true },
  3: { altersangabe: '' },
  4: { altersangabe: '16' },
  5: { altersangabe: 'PG-13' },
  // 6: kein Befund
  7: { altersangabe: ' FSK 6 ' },
  8: { altersangabe: '12' },
  9: { altersangabe: '12' },
  10: { altersangabe: 'PG-13' },
}
const karte = new Map(titel.map((x) => [x.id, x]))
const b = setzeFskAusBefunden(karte, jw, new Set(['4']))

pruefe('FSK-Bilanz: 7 Titel ohne Freigabe gezählt', b.offen === 7)
pruefe('FSK-Bilanz: ergänzt werden 1 und 7, mit Kennzeichnung', b.gesetzt === 2 && karte.get(1)!.fsk === 12 && karte.get(7)!.fsk === 6 && karte.get(7)!.fskQuelle === 'justwatch')
pruefe('FSK-Bilanz: ohne Treffer, ohne Altersangabe, ohne Befund je einmal', b.ohneTreffer === 1 && b.ohneAltersangabe === 1 && b.ohneBefund === 1)
pruefe('FSK-Bilanz: geteilter Film nennt die Kennung und setzt nichts', b.geteilterFilm.join() === '4' && karte.get(4)!.fsk === undefined)
pruefe('FSK-Bilanz: nicht abbildbare Angabe zählt, setzt nichts', b.nichtAbbildbar === 1 && karte.get(5)!.fsk === undefined)
pruefe('FSK-Bilanz: jeder offene Titel in genau einem Zähler', b.gesetzt + b.ohneBefund + b.ohneTreffer + b.ohneAltersangabe + b.geteilterFilm.length + b.nichtAbbildbar === b.offen)
pruefe('FSK-Bilanz: vorhandene Freigabe bleibt, Abweichung zählt', karte.get(8)!.fskQuelle === undefined && karte.get(9)!.fsk === 16 && b.abweichend === 1)
pruefe('FSK-Bilanz: „verworfen“ zählt auch Titel mit Freigabe (wie zuvor)', b.verworfen === 2)

const zeile = fskJwBilanzZeile(b)
pruefe('FSK-Bilanz: Log-Zeile nennt jede Verwerfung mit Zahl und die geteilte Kennung', /7 Titel ohne Freigabe: 2 ergänzt/.test(zeile) && /1 ohne Befund/.test(zeile) && /1 ohne JustWatch-Treffer/.test(zeile) && /1 Treffer ohne Altersangabe/.test(zeile) && /1 wegen geteiltem TMDB-Film \(4\)/.test(zeile) && /1 Angabe nicht/.test(zeile))

if (verletzt) {
  console.error(`${verletzt} Zusicherung(en) verletzt`)
  process.exit(1)
}
