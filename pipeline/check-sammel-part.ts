/**
 * Sammelartikel-Zeile mit „Part N“ (Berserk – Part 2, aniverse Dezember 2026, Artikel 1074092): `sammelVerwurf` warf sie als „Staffel unklar“
 * weg, ohne Eintrag in `nicht-zugeordnet.json`. Jetzt entscheidet `releasesAus` am Namen; ohne Titel „Part N“ steht die Zeile auf der Liste.
 * Wörtliche Zeile aus `data/proposals/anime2you.json`, Katalogtitel erfunden bis auf Berserk (33). Läuft in `check:logic`.
 */
import type { Title } from '../shared/types.ts'
import { leereVerluste, releasesAus } from './lib/meldungen.ts'
import { sammelVerwurf, vorschlaegeAusSammelartikel, type SammelEintrag } from './lib/sammelartikel.ts'
import { unzugeordnet } from './lib/sammel-unzugeordnet.ts'

let fehler = 0
function pruefe(name: string, ok: boolean, ist?: unknown): void {
  if (ok) return
  fehler++
  console.error(`FEHLER: ${name}`, ist === undefined ? '' : JSON.stringify(ist))
}

const artikel = { url: 'https://www.anime2you.de/news/1074092/aniverse-dezember-2026-neuzugaenge/', publishedAt: '2026-11-20' }
const zeile = (titel: string, zusatz?: string): SammelEintrag =>
  ({ titel, ...(zusatz ? { zusatz } : {}), datum: '2026-12-24', deutsch: true, woechentlich: false, stream: ['Prime Video'], folgen: 12 }) as SammelEintrag
const katalog = (...t: Partial<Title>[]) => t.map((x) => ({ format: 'TV', jpYear: 2000, streams: [], ...x })) as unknown as Title[]

/* Der Verwurf: nur ein einzelnes „Part N“/„Teil N“ geht weiter, jede andere unklare Angabe bleibt „Staffel unklar“. */
pruefe('Part 2 wird nicht verworfen', sammelVerwurf(zeile('Berserk', 'Part 2')) === undefined)
pruefe('Teil 3 wird nicht verworfen', sammelVerwurf(zeile('X', 'Teil 3')) === undefined)
pruefe('Part 1 und 2 bleibt unklar', sammelVerwurf(zeile('X', 'Part 1 und 2')) === 'Staffel unklar')
pruefe('Part 2 Special bleibt unklar', sammelVerwurf(zeile('X', 'Part 2 Special')) === 'Staffel unklar')
pruefe('Sonderfolgen bleibt unklar', sammelVerwurf(zeile('X', 'Special-Episoden')) === 'Staffel unklar')

/* Berserk: kein Titel der Reihe heißt „Part 2“ — kein Termin am Basistitel, aber sichtbar auf der Liste. */
const berserk = katalog({ id: 33, franchiseId: 33, titleEn: 'Berserk', titleDe: 'Berserk', jpYear: 1997, episodes: 25 })
const vorschlaege = vorschlaegeAusSammelartikel(artikel, [zeile('Berserk', 'Part 2')], 'primevideo', 'Aniverse')
const verluste = leereVerluste()
const termine = releasesAus(vorschlaege, berserk, [], '2026-11-26', [], [], [], verluste)
pruefe('Berserk Part 2: ein Vorschlag', vorschlaege.length === 1 && vorschlaege[0]?.articleTitle === '»Berserk« – Part 2', vorschlaege)
pruefe('Berserk Part 2: kein Termin am Basistitel', termine.length === 0, termine)
pruefe('Berserk Part 2: als „unklarer Teil“ gezählt', verluste.ohneTeil.length === 1, verluste)
const liste = unzugeordnet(vorschlaege, termine)
pruefe('Berserk Part 2: steht auf der Liste nicht zugeordnet', liste.length === 1 && liste[0]?.titel === 'Berserk' && liste[0].tag === '2026-12-24', liste)

/* Trägt die Reihe einen Titel „Part 2“, bekommt er den Termin — nie der Basistitel. */
const reihe = katalog(
  { id: 5, franchiseId: 5, titleEn: 'Dr. Test', titleDe: 'Dr. Test' },
  { id: 6, franchiseId: 5, titleEn: 'Dr. Test Part 2', titleDe: 'Dr. Test Part 2', jpYear: 2001 },
)
const mitTeil = releasesAus(vorschlaegeAusSammelartikel(artikel, [zeile('Dr. Test', 'Part 2')], 'primevideo', 'Aniverse'), reihe, [], '2026-11-26')
pruefe('Titel „Part 2“ in der Reihe: der Termin gehört ihm', mitTeil.length === 1 && mitTeil[0]?.titleId === 6 && mitTeil[0].schedule.firstEpisodeDate === '2026-12-24', mitTeil)

if (fehler) {
  console.error(`${fehler} Prüfung(en) fehlgeschlagen`)
  process.exit(1)
}
console.log('check-sammel-part: ok')
