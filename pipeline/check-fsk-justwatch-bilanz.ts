/** Zusicherungen zur Bilanz von `setzeFskAusBefunden` (`bau/11-2-1-fsk-justwatch.ts`): jeder Titel ohne Freigabe landet in genau einem Zähler. Aufruf: `npm run check:logic`. */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Fsk, Title } from '../shared/types.ts'
import type { JwBefund } from './bau/11-2-1-fsk-justwatch.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean): void {
  if (!ok) verletzt++
  console.log(`  ${ok ? '✓' : '✖'} ${name}`)
}
const t = (id: number, fsk?: Fsk): Title => ({ id, fsk }) as unknown as Title

// Kulisse für die Verdrahtung: `ROOT` wird beim ersten Import festgelegt, deshalb erst danach laden.
const wurzel = mkdtempSync(join(tmpdir(), 'fsk-jw-bilanz-'))
mkdirSync(join(wurzel, 'data'))
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
  11: { altersangabe: '12' },
  12: { altersangabe: '6' },
}
writeFileSync(join(wurzel, 'data', 'justwatch-audio.json'), JSON.stringify(jw))
writeFileSync(join(wurzel, 'data', 'tmdb-titles.json'), '{}')
process.env.AK_ROOT = wurzel
const { fskJwBilanzZeile, setzeFskAusBefunden, uebernehmeFskAusJustwatch } = await import('./bau/11-2-1-fsk-justwatch.ts')

const neu = () => new Map([t(1), t(2), t(3), t(4), t(5), t(6), t(7), t(8, 12), t(9, 16), t(10, 6), t(11, 18), t(12)].map((x) => [x.id, x]))
const karte = neu()
const b = setzeFskAusBefunden(karte, jw, new Set(['4', '12']))

pruefe('FSK-Bilanz: 8 Titel ohne Freigabe gezählt', b.offen === 8)
pruefe('FSK-Bilanz: ergänzt werden 1 und 7, mit Kennzeichnung', b.gesetzt === 2 && karte.get(1)!.fsk === 12 && karte.get(7)!.fsk === 6 && karte.get(7)!.fskQuelle === 'justwatch')
pruefe('FSK-Bilanz: ohne Treffer, ohne Altersangabe, ohne Befund je einmal', b.ohneTreffer === 1 && b.ohneAltersangabe === 1 && b.ohneBefund === 1)
pruefe('FSK-Bilanz: geteilter Film nennt die Kennungen und setzt nichts', b.geteilterFilm.join('|') === '4|12' && karte.get(4)!.fsk === undefined && karte.get(12)!.fsk === undefined)
pruefe('FSK-Bilanz: nicht abbildbare Angabe zählt, setzt nichts', b.nichtAbbildbar === 1 && karte.get(5)!.fsk === undefined)
pruefe('FSK-Bilanz: jeder offene Titel in genau einem Zähler', b.gesetzt + b.ohneBefund + b.ohneTreffer + b.ohneAltersangabe + b.geteilterFilm.length + b.nichtAbbildbar === b.offen)
pruefe('FSK-Bilanz: vorhandene Freigabe bleibt, nur Abweichungen zählen (9 und 11, nicht 8)', karte.get(8)!.fskQuelle === undefined && karte.get(9)!.fsk === 16 && karte.get(11)!.fsk === 18 && b.abweichend === 2)
pruefe('FSK-Bilanz: „verworfen“ zählt auch Titel mit Freigabe (wie zuvor)', b.verworfen === 2)

const zeile = fskJwBilanzZeile(b)
pruefe(
  'FSK-Bilanz: Log-Zeile nennt jede Verwerfung mit Zahl und die geteilten Kennungen',
  /8 Titel ohne Freigabe: 2 ergänzt/.test(zeile) && /1 ohne Befund/.test(zeile) && /1 ohne JustWatch-Treffer/.test(zeile) && /1 Treffer ohne Altersangabe/.test(zeile) &&
    /2 wegen geteiltem TMDB-Film \(4, 12\)/.test(zeile) && /1 Angabe nicht/.test(zeile),
)

// Verdrahtung: der Bau-Schritt liest die Befunde aus dem Repo, ergänzt und schreibt die Bilanz ins Log
const zeilen: string[] = []
const altLog = console.log
console.log = (...a: unknown[]) => void zeilen.push(a.join(' '))
const bau = neu()
try {
  uebernehmeFskAusJustwatch({ titles: bau, tmdbMehrdeutig: new Set(['4', '12']) })
} finally {
  console.log = altLog
}
pruefe('FSK-Bilanz: der Bau-Schritt setzt aus der Befunddatei', bau.get(1)!.fsk === 12 && bau.get(7)!.fskQuelle === 'justwatch' && bau.get(4)!.fsk === undefined)
pruefe('FSK-Bilanz: der Bau-Schritt schreibt die Bilanz und die alte Zählzeile ins Log', zeilen.some((z) => z.includes('2 wegen geteiltem TMDB-Film (4, 12)')) && zeilen.some((z) => z.includes('weichen von der Freigabe ab')))

rmSync(wurzel, { recursive: true, force: true })
if (verletzt) {
  console.error(`${verletzt} Zusicherung(en) verletzt`)
  process.exit(1)
}
