/**
 * Zusicherung (Daniel, 26.11.2026, The Most Heretical Last Boss Queen): Eine Prime-Pille ohne Adresse führt nicht in die Amazon-Suche, wenn `watchLinks` die Titelseite
 * desselben Kanals tragen; bleibt sie bei der Suche, steht der Titel auf der Suchauftragsliste. Erfundene Titel, fester Tag, kein Netz. Läuft in `check:logic`.
 */
import { readFileSync } from 'node:fs'
import type { Release, Title } from '../shared/types.ts'
import { unbedingteAufrufe } from './lib/unbedingte-aufrufe.ts'
import { richteTerminAdressen } from './bau/13-1-termin-adressen.ts'
import { offeneTerminSuchen, suchlinksOhneAusweg } from './bau/13-3-termin-suchen.ts'

let fehler = 0
function pruefe(name: string, ok: boolean, ist?: unknown): void {
  if (ok) return
  fehler++
  console.error(`FEHLER: ${name}`, ist === undefined ? '' : JSON.stringify(ist))
}

const DIREKT = 'https://www.amazon.de/gp/video/detail/B0TESTAAAA'
const termin = (id: number, kanal: string | undefined, extra: Partial<Release> = {}): Release =>
  ({ slug: `auto-${id}-primevideo`, titleId: id, name: `Testtitel ${id}`, platform: 'primevideo', kanal, releaseType: 'batch', schedule: { firstEpisodeDate: '2026-11-26', episodeCount: 12 }, sources: ['https://example.org/a'], ...extra }) as unknown as Release
const titel = (id: number, watchLinks: Title['watchLinks']): Title => ({ id, slug: `t-${id}`, titleEn: `Testtitel ${id}`, streams: [], watchLinks }) as unknown as Title
const verweis = (name: string, url: string) => ({ name, url, kind: 'stream' as const, zugang: 'abo' as const })

/* Fall der Meldung: Termin ohne Adresse + Bezugsweg desselben Kanals in `watchLinks`, keine `streams`. */
const titel1 = [titel(1, [verweis('Amazon Prime (Aniverse)', DIREKT), verweis('Akibapass', 'https://akibapasstv.vhx.tv/products/x')])]
const r1 = [termin(1, 'Aniverse')]
pruefe('vorher: Pille ohne Adresse ist ein Suchlink ohne Ausweg', suchlinksOhneAusweg(r1, titel1, new Set()).probleme.length === 1)
richteTerminAdressen(r1, titel1)
pruefe('Direktlink desselben Kanals wird die Adresse der Pille', r1[0]!.platformUrl === DIREKT, r1[0]!.platformUrl)
pruefe('danach: keine Suche, kein Auftrag nötig', offeneTerminSuchen(r1, titel1).length === 0 && suchlinksOhneAusweg(r1, titel1, new Set()).probleme.length === 0)

/* Kontrollen: anderer Kanal, Kanal fehlt, zwei Treffer → keine Übernahme; die Pille sucht, der Auftrag muss stehen. */
const titel2 = [
  titel(2, [verweis('Amazon Prime (Crunchyroll)', DIREKT)]),
  titel(3, [verweis('Amazon Prime (Aniverse)', DIREKT)]),
  titel(4, [verweis('Amazon Prime (Aniverse)', DIREKT), verweis('Amazon Prime (Aniverse)', 'https://www.amazon.de/gp/video/detail/B0TESTBBBB')]),
  titel(8, [verweis('Amazon Prime (Aniverse)', 'https://www.amazon.de/s?k=Testtitel%208&i=instant-video')]),
]
const r2 = [termin(2, 'Aniverse'), termin(3, undefined), termin(4, 'Aniverse'), termin(8, 'Aniverse')]
richteTerminAdressen(r2, titel2)
pruefe('anderer Kanal: keine Übernahme', r2[0]!.platformUrl === undefined, r2[0]!.platformUrl)
pruefe('ohne Kanal am Termin: keine Übernahme', r2[1]!.platformUrl === undefined, r2[1]!.platformUrl)
pruefe('zwei Treffer: keine Übernahme', r2[2]!.platformUrl === undefined, r2[2]!.platformUrl)
const suchen = offeneTerminSuchen(r2, titel2)
pruefe('alle vier werden Suchaufträge', suchen.map((s) => s.id).join() === '2,3,4,8', suchen)
pruefe('Auftrag trägt die Prime-Suche', suchen.every((s) => /^https:\/\/www\.amazon\.de\/s\?k=.*&i=instant-video$/.test(s.url)), suchen)
pruefe('Wächter: ohne Liste rot', suchlinksOhneAusweg(r2, titel2, new Set()).probleme.length === 4)
pruefe('Wächter: mit Liste grün', suchlinksOhneAusweg(r2, titel2, new Set([2, 3, 4, 8])).probleme.length === 0)

const mitHandbeleg = suchlinksOhneAusweg(r2, titel2, new Set([2]), new Set([3, 4]))
pruefe('Titel mit Prime-Handbeleg zählt als ungeklärt, nicht als Verstoß', mitHandbeleg.ungeklaert.join() === '3,4' && mitHandbeleg.probleme.length === 1, mitHandbeleg)

/* Disc und Kauf-Adresse sind keine Prime-Pille; eine Titelseite am Termin bleibt unberührt. */
const r3 = [termin(5, 'Aniverse', { releaseType: 'disc', platform: 'disc' as Release['platform'] }), termin(6, 'Aniverse', { platformUrl: 'https://www.amazon.de/gp/video/detail/B0TESTCCCC' })]
pruefe('Disc und Titelseite zählen nicht', offeneTerminSuchen(r3, [titel(5, []), titel(6, [])]).length === 0)

/* Eine Suche als platformUrl des Termins zählt wie eine fehlende Adresse. */
const r4 = [termin(7, 'Aniverse', { platformUrl: 'https://www.amazon.de/s?k=Testtitel%207&i=instant-video' })]
pruefe('Suche am Termin ist ein Auftrag', offeneTerminSuchen(r4, [titel(7, [])]).length === 1)

/* Mutanten der Prüfer-Runde 2 (PR 5105): jede Teilbedingung der Auswahl und der Inhalt des Auftrags einzeln. */
const AMAZON_SUCHE = 'https://www.amazon.de/s?k=Testtitel%209&i=instant-video'
const auswahl = [
  termin(9, 'Aniverse', { platform: 'netflix' as Release['platform'] }), // anderer Anbieter, kein Disc, keine Kauf-Adresse
  termin(9, 'Aniverse', { releaseType: 'disc' }), // Prime, aber Typ disc
  termin(9, 'Aniverse', { buyUrl: 'https://www.amazon.de/dp/B0TESTKAUF' } as Partial<Release>), // Prime mit Kauf-Adresse
  termin(99, 'Aniverse'), // Titel unbekannt: kein Absturz, kein Auftrag
  termin(9, 'Aniverse', { platformUrl: 'https://www.amazon.de/s?k=Testtitel%209&i=instant-video' }), // der erste Termin des Titels gewinnt
  termin(9, 'Aniverse', { platformUrl: 'https://www.amazon.de/s?k=ANDERE&i=instant-video' }),
]
const titel9 = [titel(9, [])]
const aus = offeneTerminSuchen(auswahl, titel9)
pruefe('Auswahl: nur der erste Prime-Termin ohne Kauf/Disc/Titelseite, je Titel ein Auftrag', aus.length === 1 && aus[0]!.id === 9, aus)
pruefe('Auftrag: Titel, Plattform und die Adresse des ersten Termins', JSON.stringify(aus[0]) === JSON.stringify({ id: 9, titel: 'Testtitel 9', plattform: 'primevideo', url: AMAZON_SUCHE, termin: true }), aus[0])
for (const [grund, t] of [['anderer Anbieter', auswahl[0]!], ['Typ disc', auswahl[1]!], ['Kauf-Adresse', auswahl[2]!]] as const) {
  pruefe(`Auswahl einzeln: ${grund} ergibt keinen Auftrag`, offeneTerminSuchen([t], titel9).length === 0)
}
const sucheAmTermin = suchlinksOhneAusweg([termin(9, 'Aniverse', { platformUrl: AMAZON_SUCHE })], titel9, new Set())
pruefe('Wächter: Suche als Adresse am Termin ist ohne Auftrag ein Verstoß', sucheAmTermin.probleme.length === 1, sucheAmTermin)
const ohneAdresse = offeneTerminSuchen([termin(9, 'Aniverse')], titel9)
pruefe('Termin ohne Adresse: Suche aus dem Anzeigenamen', ohneAdresse[0]?.url === AMAZON_SUCHE, ohneAdresse[0])
const w = suchlinksOhneAusweg(auswahl.slice(0, 4), titel9, new Set())
pruefe('Wächter: Netflix, Disc, Kauf-Adresse und unbekannter Titel sind kein Verstoß', w.probleme.length === 0, w)
pruefe('Wächter: Titelseite am Termin ist kein Verstoß', suchlinksOhneAusweg([termin(9, 'Aniverse', { platformUrl: 'https://www.amazon.de/gp/video/detail/B0TESTCCCC' })], titel9, new Set()).probleme.length === 0)
const vorrang = suchlinksOhneAusweg([termin(1, 'Aniverse')], titel1, new Set([1]))
pruefe('Wächter: Direktlink desselben Kanals ist auch mit Auftrag ein Verstoß, mit Adresse im Text', vorrang.probleme.length === 1 && vorrang.probleme[0]!.includes(DIREKT) && vorrang.probleme[0]!.includes('Direktlink desselben Kanals'), vorrang)

/* Der Aufrufer: `schreibeDatensatz` reicht `offeneTerminSuchen(releases, allTitles)` unbedingt als dritte Liste an die Suchadressen (Mutant: Aufruf weg, `[]`, `titles`). */
const schreiben = unbedingteAufrufe(readFileSync(new URL('./bau/13-schreiben.ts', import.meta.url), 'utf8'), 'schreibeDatensatz')
pruefe('13-schreiben: Suchadressen mit offeneTerminSuchen(releases, allTitles)', schreiben.find((a) => a.name === 'schreibeSuchadressenImEndzustand')?.args.join('|') === 'suchOffen|slim|offeneTerminSuchen(releases, allTitles)', schreiben.find((a) => a.name === 'schreibeSuchadressenImEndzustand')?.args)

if (fehler) process.exit(1)
console.log('check-prime-suchlink-direkt: ok')
