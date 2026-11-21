/**
 * Zusicherung: Der aniSearch-Sprecherlauf holt zuerst den Hauptbestand (mit Synchro-Marke vor dem Rest), danach den Katalog; jede Kennung einmal.
 * Er pausiert nach einer Sperre statt abzubrechen, vermerkt nur endgültige Auskünfte (404/410), speichert eine Folge leerer Seiten nicht als Befund
 * und archiviert die rohe Seite vor der Auswertung. Regel und Anlass: `lib/anisearch-sprecher-reihe.ts`, `lib/anisearch-sprecher-lauf.ts`.
 *
 * Aufruf: npm run check:logic (steckt darin) oder `tsx pipeline/check-anisearch-sprecher.ts`
 */
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'
import type { WegListe } from './lib/anisearch-archiv-vorrang.ts'
import { legeArchivAb, zeilenAus } from './lib/anisearch-sprecher-archiv.ts'
import { arbeiteAb, type Abruf, type Lauf } from './lib/anisearch-sprecher-lauf.ts'
import { sprecherLuecken, verzahne, type Eintrag } from './lib/anisearch-sprecher-reihe.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const JETZT = Date.parse('2026-10-10T12:00:00Z')
const TAG = 86_400_000
const frisch = (): Eintrag => ({ de: [], ja: 1, fetchedAt: new Date(JETZT - TAG).toISOString(), stand: 1 })

console.log('\naniSearch-Sprecherseiten: Reihenfolge:')
{
  // 1 und 2 im Hauptbestand (1 ohne Marke, 2 mit), 3 im Hauptbestand ohne Eintrag im Katalog, 4 hat schon eine Seite, 5 ist weg, 6 doppelt genannt.
  const katalog = new Map<number, boolean>([[1, false], [2, true], [4, true], [5, true], [6, true], [7, true], [8, false], [9, false]])
  const weg: WegListe = { 5: { code: 404, am: new Date(JETZT - TAG).toISOString() } }
  const l = sprecherLuecken({ haupt: [1, 2, 3, 4, 5, 6, 6], katalog, bestand: { 4: frisch() }, weg, jetztMs: JETZT })
  pruefe('Hauptbestand: Titel mit Marke zuerst, dann der Rest in der Reihenfolge der Titelliste', l.haupt.join() === '2,6,1,3', l.haupt)
  pruefe('Hauptbestand: Kennung mit Seite oder endgültiger Auskunft (404) ist keine Lücke', !l.haupt.includes(4) && !l.haupt.includes(5), l.haupt)
  pruefe('Katalog: ohne Marke zuerst, nichts aus dem Hauptbestand doppelt', l.katalog.join() === '8,9,7', l.katalog)
  const spaet = sprecherLuecken({ haupt: [5], katalog, bestand: {}, weg, jetztMs: JETZT + 61 * TAG })
  pruefe('Nach Ablauf der Frist ist die Kennung wieder dran', spaet.haupt.includes(5), spaet.haupt)
  const alt = sprecherLuecken({ haupt: [4], katalog, bestand: { 4: { ...frisch(), fetchedAt: new Date(JETZT - 181 * TAG).toISOString() } }, weg: {}, jetztMs: JETZT })
  pruefe('Eine Seite über 180 Tage alt ist wieder fällig', alt.haupt.join() === '4', alt.haupt)
  const vor = (tage: number, de: Eintrag['de'], ja: number): Eintrag => ({ de, ja, fetchedAt: new Date(JETZT - tage * TAG).toISOString(), stand: 1 })
  const rolle = [{ figur: 'A', sprecher: 'B' }] as Eintrag['de']
  const leer = sprecherLuecken({
    haupt: [10, 11, 12, 13, 14, 15],
    katalog: new Map([[20, true]]),
    bestand: { 10: vor(15, [], 3), 11: vor(13, [], 3), 12: vor(15, rolle, 3), 13: vor(20, [], 0), 14: vor(30, [], 0), 15: vor(15, [], 2), 20: vor(30, [], 3) },
    weg: { 15: { code: 404, am: new Date(JETZT - TAG).toISOString() } },
    jetztMs: JETZT,
  })
  pruefe('Hauptbestand-Seite ohne deutsche Rolle ab 14 Tagen nachholen; je Seite mit Besetzung eine ohne, die älteste zuerst (14 vor 13)', leer.nachholen.join() === '14,10', leer.nachholen)
  // Zyklus 2 (Prüfer #4508): die Seiten mit Besetzung haben inzwischen Rollen, übrig sind 20 ohne Besetzung gegen 3 mit.
  const bestand2: Record<string, Eintrag> = {}
  for (let id = 100; id < 120; id++) bestand2[id] = vor(15 + (id - 100), [], 0)
  for (const id of [200, 201, 202]) bestand2[id] = vor(15, [], 4)
  const z2 = sprecherLuecken({ haupt: Object.keys(bestand2).map(Number), katalog: new Map(), bestand: bestand2, weg: {}, jetztMs: JETZT })
  const folge = z2.nachholen.reduce((s, id) => (bestand2[id]!.ja ? { n: 0, max: s.max } : { n: s.n + 1, max: Math.max(s.max, s.n + 1) }), { n: 0, max: 0 })
  pruefe('Überhang ohne Besetzung (20 gegen 3): nur 3 davon kommen dran, nie zwei hintereinander, die ältesten zuerst', z2.nachholen.length === 6 && folge.max === 1 && z2.nachholen[0] === 119, z2.nachholen)
  pruefe('Verzahnen: Überhang ohne Besetzung wartet', verzahne([1], [7, 8, 9]).join() === '7,1', verzahne([1], [7, 8, 9]))
  pruefe('Nachholen: jünger als 14 Tage, mit deutscher Rolle, Katalog oder zurückgestellt bleibt liegen', !leer.nachholen.some((id) => [11, 12, 15, 20].includes(id)) && leer.haupt.length === 0, leer)
  pruefe('Verzahnen: nie zwei Seiten ohne Besetzung hintereinander, solange eine mit Besetzung bleibt', verzahne([1, 2, 3], [7, 8]).join() === '7,1,8,2,3', verzahne([1, 2, 3], [7, 8]))
}

console.log('\naniSearch-Sprecherseiten: Lauf, Sperre, Archiv:')
const SEITE = '<table><tr><th data-title="Figur"><td><span class="seiyuuItem seiyuu_ja">x</span><span class="seiyuuItem seiyuu_de"><a href="person/1,x">Sprecher</a></span></td></tr></table>'
const LEER = '<table><tr><th data-title="Figur"><td>-</td></tr></table>'

interface Probe {
  lauf: Lauf
  bestand: Record<string, Eintrag>
  geholt: number[]
  gewartet: number[]
  archiviert: number[]
  gesichert: { n: number }
}
function probe(antwort: (id: number) => Abruf, ende = Date.now() + 10 * 3_600_000): Probe {
  const geholt: number[] = []
  const gewartet: number[] = []
  const archiviert: number[] = []
  const gesichert = { n: 0 }
  const lauf: Lauf = {
    hole: async (id) => {
      geholt.push(id)
      return antwort(id)
    },
    warte: async (ms) => void gewartet.push(ms),
    archiviere: (id) => void archiviert.push(id),
    sichern: () => void gesichert.n++,
    weg: {},
    taktMs: 6000,
    ende,
    minuten: 100,
  }
  return { lauf, bestand: {}, geholt, gewartet, archiviert, gesichert }
}
const ids = (von: number, bis: number): number[] => Array.from({ length: bis - von + 1 }, (_, i) => von + i)

{
  const p = probe(() => ({ art: 'ok', html: SEITE }))
  const z = await arbeiteAb([3, 1, 2], p.bestand, p.lauf)
  pruefe('Abruf in der Reihenfolge der Schlange, jede Seite archiviert und gespeichert', p.geholt.join() === '3,1,2' && p.archiviert.join() === '3,1,2' && z.geholt === 3 && Object.keys(p.bestand).length === 3, p.geholt)
  pruefe('Takt: sechs Sekunden nach jedem Abruf', p.gewartet.length === 3 && p.gewartet.every((ms) => ms === 6000), p.gewartet)
}
{
  const p = probe(() => ({ art: 'fehler' }))
  const z = await arbeiteAb(ids(1, 30), p.bestand, p.lauf)
  const pausen = p.gewartet.filter((ms) => ms > 6000)
  pruefe('Sperre: drei Pausen (10, 20, 40 Minuten) mit je einer Einzelanfrage, dann Ende', pausen.join() === '600000,1200000,2400000' && p.geholt.length === 5 + 3, [pausen, p.geholt.length])
  pruefe('Sperre: eine Nichtauskunft steht weder im Bestand noch in der Auskunftsliste', Object.keys(p.bestand).length === 0 && Object.keys(p.lauf.weg).length === 0 && z.geholt === 0)
}
{
  const p = probe(() => ({ art: 'fehler' }), Date.now() + 5 * 60_000)
  await arbeiteAb(ids(1, 30), p.bestand, p.lauf)
  pruefe('Frist zu knapp für die Pause: der Lauf endet sofort nach der Fehlerfolge', p.geholt.length === 5 && !p.gewartet.some((ms) => ms > 6000), p.geholt.length)
}
{
  const p = probe((id) => (id <= 5 ? { art: 'fehler' } : { art: 'ok', html: SEITE }))
  await arbeiteAb(ids(1, 8), p.bestand, p.lauf)
  pruefe('Nach der Pause kommt die Einzelanfrage durch: der Lauf geht weiter', p.geholt.join() === '1,2,3,4,5,6,7,8' && Object.keys(p.bestand).join() === '6,7,8', [p.geholt, Object.keys(p.bestand)])
}
{
  const p = probe((id) => (id === 2 ? { art: 'weg', code: 404 } : { art: 'ok', html: SEITE }))
  const z = await arbeiteAb([1, 2, 3], p.bestand, p.lauf)
  pruefe('404 wird vermerkt (mit Datum) und bricht nichts ab', z.weg === 1 && p.lauf.weg[2]?.code === 404 && Boolean(p.lauf.weg[2]?.am) && p.geholt.length === 3 && !p.bestand['2'])
}
{
  const p = probe(() => ({ art: 'ok', html: LEER }))
  const z = await arbeiteAb(ids(1, 14), p.bestand, p.lauf)
  pruefe('Vierzehn leere Seiten in Folge gelten noch als Auskunft', z.geholt === 14 && z.verdacht === 0, z)
  const q = probe(() => ({ art: 'ok', html: LEER }))
  const zq = await arbeiteAb(ids(1, 40), q.bestand, q.lauf)
  pruefe('Ab der fünfzehnten leeren Seite in Folge: kein Befund gespeichert, Pause statt Weiterlauf', zq.geholt === 14 && zq.verdacht > 0 && !q.bestand['15'] && q.gewartet.some((ms) => ms > 6000), [zq, Object.keys(q.bestand).length])
  const r = probe((id) => ({ art: 'ok', html: id % 5 === 0 ? SEITE : LEER }))
  const zr = await arbeiteAb(ids(1, 60), r.bestand, r.lauf)
  pruefe('Leere Seiten zwischen gefüllten sind unauffällig', zr.geholt === 60 && zr.verdacht === 0, zr)
}
{
  const p = probe(() => ({ art: 'ok', html: SEITE }), Date.now() - 1)
  await arbeiteAb([1, 2], p.bestand, p.lauf)
  pruefe('Zeitbudget abgelaufen: kein Abruf, Bestand wird trotzdem gesichert', p.geholt.length === 0 && p.gesichert.n === 1, p.geholt)
  const q = probe(() => ({ art: 'ok', html: SEITE }))
  await arbeiteAb(ids(1, 50), q.bestand, q.lauf)
  pruefe('Zwischensicherung alle 25 Abrufe und am Ende', q.gesichert.n === 3, q.gesichert.n)
}

console.log('\naniSearch-Sprecherseiten: Archiv:')
{
  const dir = join(mkdtempSync(join(tmpdir(), 'sprecher-archiv-')), 'raw')
  const html = `<html><head>kopf</head><body>${SEITE}<footer>fuss</footer></body></html>`
  pruefe('Archiviert die Besetzungszeilen, nicht Kopf und Fuß', zeilenAus(html).startsWith('<tr>') && !zeilenAus(html).includes('kopf') && !zeilenAus(html).includes('fuss'))
  pruefe('Eine Seite ohne Zeilen wird nicht abgelegt', !legeArchivAb(1, '<html>leer</html>', dir))
  pruefe('Legt gzip ab; entpackt stehen die Zeilen darin', legeArchivAb(7, html, dir) && gunzipSync(readFileSync(`${dir}/7.html.gz`)).toString() === zeilenAus(html))
}

if (verletzt) {
  console.error(`\n${verletzt} Zusicherung(en) verletzt.`)
  process.exit(1)
}
console.log('\naniSearch-Sprecherseiten: alle Zusicherungen halten.')
