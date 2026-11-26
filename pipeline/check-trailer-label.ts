/** Prüft `lib/trailer-label.ts` (Zuordnung deutscher Label-Trailer) an Fixtures und dem echten Fall 156040 — kein Netz. */
import { readJson } from './lib/util.ts'
import { ladeTrailerHand } from './lib/trailer-hand.ts'
import {
  istDeutschesVideo,
  staffelNummer,
  uebernehmeLabel,
  verwerfungenText,
  videoName,
  waehleLabelTrailer,
  type LabelTitel,
  type LabelVideo,
} from './lib/trailer-label.ts'

let fehler = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  fehler++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const HEUTE = '2026-11-26'
const v = (video: string, titel: string, am = '2026-08-13'): LabelVideo => ({ video, titel, am, kanal: 'KSM Anime' })
const wahl = (titel: LabelTitel[], videos: LabelVideo[]) => waehleLabelTrailer(titel, videos, HEUTE)

console.log('Der gemeldete Fall (AniList 156040)')
const echt = readJson<(LabelTitel & { format?: string })[]>('public/data/titles.json', []).find((t) => t.id === 156040)
const KSM = v('n5yRD1JypBU', 'THE MOST HERETICAL LAST BOSS QUEEN | Trailer HD | Deutsch | Anime | 2026')
const r = wahl(echt ? [echt] : [], [KSM])
pruefe('echter Titel 156040 liegt im Datensatz', Boolean(echt))
pruefe('KSM-Trailer n5yRD1JypBU geht an 156040', r.funde.get(156040)?.video === 'n5yRD1JypBU', [...r.funde])
pruefe('Fund ist deutsch und trägt Herkunft label', r.funde.get(156040)?.sprache === 'de' && r.funde.get(156040)?.herkunft === 'label')

console.log('Sprachriegel')
for (const t of ['X | Trailer | OmU', 'X | Trailer | German Sub', 'X Trailer JapDub GerSub', 'X Trailer Deutsche Untertitel', 'X Trailer English Dub', 'X | Trailer'])
  pruefe(`nicht deutsch: ${t}`, !istDeutschesVideo(t))
for (const t of ['X | Trailer HD | Deutsch', 'X - Trailer #01 (dt.)', 'X | Offizieller Trailer – Synchro', 'X Trailer German Deutsch'])
  pruefe(`deutsch: ${t}`, istDeutschesVideo(t))

console.log('Namensauszug')
pruefe('Kopf vor „|“', videoName('LAST BOSS | Trailer HD | Deutsch') === 'LAST BOSS')
pruefe('Name vor „Trailer“ mit Staffelhinweis und Jahr', videoName('Foo Staffel 2 Offizieller Trailer Deutsch 2026') === 'Foo')
pruefe('Staffelnummern', staffelNummer('Foo 2nd Season') === 2 && staffelNummer('Foo') === 1 && staffelNummer('Foo Staffel 3') === 3)

console.log('Riegel und Verwerfungen')
const foo: LabelTitel = { id: 1, titleEn: 'Dragon Quest Saga', jpYear: 2024 }
const foo2: LabelTitel = { id: 2, titleEn: 'Dragon Quest Saga 2nd Season', jpYear: 2025 }
const s1 = wahl([foo, foo2], [v('a1', 'DRAGON QUEST SAGA | Trailer | Deutsch')])
pruefe('ohne Staffelhinweis bekommt Staffel 1 den Trailer, nicht 2', s1.funde.get(1)?.video === 'a1' && !s1.funde.has(2), [...s1.funde])
const s2 = wahl([foo, foo2], [v('a2', 'DRAGON QUEST SAGA Staffel 2 | Trailer | Deutsch')])
pruefe('Staffel 2 im Videotitel geht an die zweite Staffel', s2.funde.get(2)?.video === 'a2' && !s2.funde.has(1), [...s2.funde])
const nurS1 = wahl([foo], [v('a3', 'DRAGON QUEST SAGA Staffel 2 | Trailer | Deutsch')])
pruefe('Staffel 2 ohne zweite Staffel im Bestand: verworfen (staffel)', nurS1.funde.size === 0 && nurS1.verworfen.staffel === 1, nurS1.verworfen)
const alt = wahl([{ id: 3, titleEn: 'Elysium', jpYear: 2003 }], [v('a4', 'ELYSIUM Trailer - Deutsch German | 2013 Official Film', '2013-10-01')])
pruefe('Elysium (2003) bekommt den Film von 2013 nicht (jahr)', alt.funde.size === 0 && alt.verworfen.jahr === 1, alt.verworfen)
const zwei = wahl([{ id: 4, titleEn: 'Same Name', jpYear: 2026 }, { id: 5, titleEn: 'Same Name', jpYear: 2026 }], [v('a5', 'SAME NAME | Trailer | Deutsch')])
pruefe('zwei gleich gute Titel: mehrdeutig, nichts zugeordnet', zwei.funde.size === 0 && zwei.verworfen.mehrdeutig === 1, zwei.verworfen)
const kurz = wahl([{ id: 6, titleEn: 'Naruto Shippuden', jpYear: 2007 }], [v('a6', 'NARUTO | Trailer | Deutsch', '2008-01-01')])
pruefe('Videoname deckt den Titel nicht (Naruto ≠ Naruto Shippuden)', kurz.funde.size === 0 && kurz.verworfen['kein-treffer'] === 1, kurz.verworfen)
const clip = wahl([foo], [v('a7', 'DRAGON QUEST SAGA | Folge 1 | Deutsch'), v('a8', 'Etwas ganz anderes | Trailer | Deutsch')])
pruefe('Folge ist kein Trailer; fremder Name trifft nichts', clip.verworfen['kein-trailer'] === 1 && clip.verworfen['kein-treffer'] === 1, clip.verworfen)
const deJahr = wahl([{ id: 7, titleEn: 'Late Show', jpYear: 2023, deErstausgabe: { von: '2023-08-10' } }], [v('a9', 'LATE SHOW | Trailer | Deutsch', '2026-08-13')])
pruefe('drei Jahre nach Erstausgabe sind noch im Fenster', deJahr.funde.has(7))

const spaet = wahl([{ id: 8, titleEn: 'Late Show', jpYear: 2023 }], [v('b1', 'LATE SHOW | Trailer | Deutsch', '2027-01-01')])
pruefe('vier Jahre nach der Ausstrahlung liegen außerhalb des Fensters', spaet.funde.size === 0 && spaet.verworfen.jahr === 1, spaet.verworfen)
const mehrWorte = wahl([{ id: 9, titleEn: 'Dragon Quest Saga', jpYear: 2024 }], [v('b2', 'DRAGON QUEST SAGA DAWN | Trailer | Deutsch', '2024-05-01')])
pruefe('Videoname mit zusätzlichem Wort deckt den Titel nicht (kein-treffer)', mehrWorte.funde.size === 0 && mehrWorte.verworfen['kein-treffer'] === 1, mehrWorte.verworfen)

console.log('Übernahme in den Bestand')
const bestand: Record<string, { sprache?: string; video?: string }> = { '1': { sprache: 'de', video: 'alt-de' }, '2': { sprache: 'en', video: 'alt-en' } }
const ue = uebernehmeLabel(
  [{ id: 1, titleEn: 'Dragon Quest Saga', jpYear: 2024 }, { id: 2, titleEn: 'Silver Garden Tales', jpYear: 2024 }, { id: 3, titleEn: 'Crimson Harbor Stories', jpYear: 2024 }],
  bestand,
  [v('c1', 'DRAGON QUEST SAGA | Trailer | Deutsch', '2024-05-01'), v('c2', 'SILVER GARDEN TALES | Trailer | Deutsch', '2024-05-01'), v('c3', 'CRIMSON HARBOR STORIES | Trailer | Deutsch', '2024-05-01')],
  HEUTE,
)
pruefe('ein deutscher Eintrag bleibt', bestand['1']?.video === 'alt-de', bestand['1'])
pruefe('ein englischer wird ersetzt, ein fehlender neu gesetzt', bestand['2']?.video === 'c2' && bestand['3']?.video === 'c3' && ue.ersetzt === 1 && ue.neu === 1, ue)

console.log('Wahl unter mehreren Videos')
const mehr = wahl([foo], [v('t1', 'DRAGON QUEST SAGA | Teaser | Deutsch', '2026-09-01'), v('t2', 'DRAGON QUEST SAGA | Trailer | Deutsch', '2026-05-01'), v('t3', 'DRAGON QUEST SAGA | Trailer | Deutsch', '2026-07-01')])
pruefe('Trailer vor Teaser, dann der jüngste', mehr.funde.get(1)?.video === 't3', [...mehr.funde])

console.log('Handtrailer')
const hand = ladeTrailerHand()
pruefe('156040 steht in trailer-hand.yaml mit n5yRD1JypBU, deutsch', hand['156040']?.video === 'n5yRD1JypBU' && hand['156040']?.sprache === 'de', hand['156040'])
pruefe('jeder Handeintrag gehört zu einem Titel im Datensatz', Object.keys(hand).every((id) => readJson<{ id: number }[]>('public/data/titles.json', []).some((t) => String(t.id) === id)))

console.log('Logzeile')
pruefe('nennt nur Gründe mit Treffern', verwerfungenText(clip.verworfen) === '1× kein-trailer, 1× kein-treffer', verwerfungenText(clip.verworfen))
pruefe('ohne Verwerfung „keine“', verwerfungenText(r.verworfen) === 'keine')

if (fehler) {
  console.error(`\n${fehler} Prüfung(en) fehlgeschlagen`)
  process.exit(1)
}
console.log('\nAlles grün.')
