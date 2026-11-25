/**
 * Zusicherungen zu `lib/titel-termin-frist.ts` und seiner Verdrahtung in den drei Titel-Sammlern (TMDB-Titel 60 Tage, aniSearch-Titel
 * und -Artikel je 180): Termin binnen Grundfrist + Lesung älter als `FRISCH_TAGE` = fällig. Keine Netzabrufe, „heute“ fest.
 * Aufruf: `npm run check:logic`.
 */
import { readFileSync } from 'node:fs'
import { addDays } from '../shared/time.ts'
import { artikelFaellig, titelFaellig, type FaelligOptionen } from './lib/anisearch-faellig.ts'
import { faelligeTitel } from './lib/tmdb-faellig.ts'
import { terminNahFaellig } from './lib/titel-termin-frist.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const heute = '2026-11-24'
const jetzt = Date.parse(`${heute}T12:00:00Z`)
const vor = (tage: number): string => `${addDays(heute, -tage)}T05:00:00.000Z`
const in_ = (tage: number): string => addDays(heute, tage)

console.log('\nTerminregel')
pruefe('Termin in 10 Tagen, Lesung vor 40 Tagen, Frist 60: fällig', terminNahFaellig(vor(40), [in_(10)], heute, 60))
pruefe('Termin in 10 Tagen, Lesung vor 3 Tagen: nicht fällig', !terminNahFaellig(vor(3), [in_(10)], heute, 60))
pruefe('Lesung genau 6 Tage alt: fällig', terminNahFaellig(vor(6), [in_(10)], heute, 60))
pruefe('Lesung 5 Tage alt: nicht fällig', !terminNahFaellig(vor(5), [in_(10)], heute, 60))
pruefe('Termin in 100 Tagen, Frist 60: nicht fällig', !terminNahFaellig(vor(40), [in_(100)], heute, 60))
pruefe('Termin genau am Ende der Frist: fällig', terminNahFaellig(vor(40), [in_(60)], heute, 60))
pruefe('Termin einen Tag hinter der Frist: nicht fällig', !terminNahFaellig(vor(40), [in_(61)], heute, 60))
pruefe('Termin heute zählt', terminNahFaellig(vor(40), [heute], heute, 60))
pruefe('Termin gestern zählt nicht', !terminNahFaellig(vor(40), [in_(-1)], heute, 60))
pruefe('ein naher Termin unter mehreren genügt', terminNahFaellig(vor(40), [in_(-300), in_(500), in_(10)], heute, 60))
pruefe('Termin ohne Tag („2026-12-00“) zählt nicht', !terminNahFaellig(vor(40), ['2026-12-00'], heute, 60))
pruefe('ohne Termine nicht fällig', !terminNahFaellig(vor(40), [], heute, 60) && !terminNahFaellig(vor(40), undefined, heute, 60))
pruefe('ohne Lesungszeit keine Aussage', !terminNahFaellig(undefined, [in_(10)], heute, 60) && !terminNahFaellig('kaputt', [in_(10)], heute, 60))

console.log('\nTMDB-Titel (Frist 60): Kinostart in `kinoDe`')
const eintrag = (fetchedAt: string, kinoDe: string[]) => ({ tmdbId: 1, kind: 'movie', genreIds: [16], kinoDe, fetchedAt })
const opt = { handIds: new Set<number>(), nurOhneEintrag: false, force: false, grenze: vor(60), grenzeFehlschlag: vor(7) }
const ids = (cache: Record<string, ReturnType<typeof eintrag>>, terminNah: boolean): number[] =>
  faelligeTitel([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }], cache, {
    ...opt,
    terminNah: terminNah ? (e) => terminNahFaellig(e.fetchedAt, e.kinoDe, heute, 60) : undefined,
  }).map((t) => t.id)
const tmdb = {
  1: eintrag(vor(40), [in_(10)]), // Termin binnen Frist, Lesung alt
  2: eintrag(vor(3), [in_(10)]), // Termin binnen Frist, Lesung frisch
  3: eintrag(vor(40), [in_(100)]), // Termin außerhalb, Lesung alt
  4: eintrag(vor(40), [in_(-30)]), // Termin vorbei, Lesung alt
}
pruefe('mit Regel: nur Titel 1 fällig', JSON.stringify(ids(tmdb, true)) === '[1]', ids(tmdb, true))
pruefe('ohne Regel (Stand vor B3): niemand fällig', ids(tmdb, false).length === 0, ids(tmdb, false))
pruefe('Titel ohne Cache-Eintrag: kein Absturz, bleibt fällig (nach dem Titel mit Termin)', (() => {
  const f = faelligeTitel([{ id: 1 }, { id: 5 }], { 1: tmdb[1] }, { ...opt, terminNah: (e) => terminNahFaellig(e.fetchedAt, e.kinoDe, heute, 60) })
  return JSON.stringify(f.map((x) => x.id)) === '[1,5]'
})())
pruefe('Kinostart-Titel steht vor einem älteren Titel ohne Termin', (() => {
  const c = { ...tmdb, 3: eintrag(vor(70), [in_(100)]), 1: eintrag(vor(40), [in_(10)]) }
  return JSON.stringify(ids(c, true)) === '[1,3]'
})(), ids({ ...tmdb, 3: eintrag(vor(70), [in_(100)]) }, true))

console.log('\naniSearch-Titel (Frist 180): Disc-Ausgabe')
const t = (alterTage: number, extra = {}) => ({ fetchedAt: vor(alterTage), stand: 3, quelle: 'sprachblock', synonyme: [], ...extra })
const o = (tage: string[]): FaelligOptionen => ({ jetzt, alterTage: 180, parserStand: 3, termin: { heute, tage } })
pruefe('Ausgabe in 10 Tagen, Lesung vor 40 Tagen: fällig', titelFaellig(t(40), o([in_(10)])))
pruefe('Ausgabe in 10 Tagen, Lesung vor 3 Tagen: nicht fällig', !titelFaellig(t(3), o([in_(10)])))
pruefe('Ausgabe in 200 Tagen, Lesung vor 40 Tagen: nicht fällig', !titelFaellig(t(40), o([in_(200)])))
pruefe('Ausgabe vor 30 Tagen erschienen, Lesung vor 40 Tagen: nicht fällig', !titelFaellig(t(40), o([in_(-30)])))
pruefe('ohne `termin` (Stand vor B3): Lesung vor 40 Tagen nicht fällig', !titelFaellig(t(40), { jetzt, alterTage: 180, parserStand: 3 }))
pruefe('Grundfrist wirkt weiter: Lesung vor 181 Tagen ohne Termin fällig', titelFaellig(t(181), o([])))

console.log('\naniSearch-Artikel (Frist 180): Ausgabe des Artikels')
const a = (alterTage: number) => ({ fetchedAt: vor(alterTage), stand: 1 })
const oa = (tage: string[]): FaelligOptionen => ({ jetzt, alterTage: 180, parserStand: 1, termin: { heute, tage } })
pruefe('Ausgabe in 10 Tagen, Lesung vor 40 Tagen: fällig', artikelFaellig(a(40), oa([in_(10)])))
pruefe('Ausgabe in 10 Tagen, Lesung vor 3 Tagen: nicht fällig', !artikelFaellig(a(3), oa([in_(10)])))
pruefe('Ausgabe in 200 Tagen, Lesung vor 40 Tagen: nicht fällig', !artikelFaellig(a(40), oa([in_(200)])))
pruefe('Ausgabe vor 30 Tagen erschienen, Lesung vor 40 Tagen: nicht fällig', !artikelFaellig(a(40), oa([in_(-30)])))
pruefe('ohne `termin` (Stand vor B3): Lesung vor 40 Tagen nicht fällig', !artikelFaellig(a(40), { jetzt, alterTage: 180, parserStand: 1 }))
pruefe('Grundfrist wirkt weiter: Lesung vor 181 Tagen ohne Termin fällig', artikelFaellig(a(181), oa([])))
pruefe('nie gelesen: fällig', artikelFaellig(undefined, oa([])) && titelFaellig(undefined, o([])))

/* Die Sammler laufen nie im Test (Netz); ihre Verdrahtung wird am Quelltext geprüft. */
console.log('\nVerdrahtung in den Sammlern')
const quelle = (pfad: string): string => readFileSync(new URL(pfad, import.meta.url), 'utf8')
pruefe('fetch-tmdb-titles reicht Kinostarts und die Grundfrist weiter', quelle('./fetch-tmdb-titles.ts').includes('terminNahFaellig(e.fetchedAt, e.kinoDe, todayIso(), ALTER_TAGE)'))
pruefe('fetch-anisearch-titel reicht die Disc-Termine des Titels weiter', quelle('./fetch-anisearch-titel.ts').includes('tage: (ausgaben[String(t.id)] ?? []).map((a) => a.datum)'))
pruefe('fetch-anisearch-artikel reicht das Datum des Artikels weiter', quelle('./fetch-anisearch-artikel.ts').includes("tage: [artikel.get(nr)?.datum ?? '']"))
pruefe('aniSearch-Sammler nehmen „heute“ aus shared/time', ['./fetch-anisearch-titel.ts', './fetch-anisearch-artikel.ts'].every((p) => quelle(p).includes('heute: todayIso()')))

if (verletzt) {
  console.error(`\n${verletzt} Zusicherung(en) verletzt`)
  process.exit(1)
}
console.log('\nAlle Zusicherungen erfüllt')
