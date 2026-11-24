/**
 * Zusicherung: **Die Bauphase 09-4-2 (`ordneCrBloeckeZu`, dazu `ordneGeschwisterBloeckeZu`) gibt Verweisen Folgenbereiche und
 * Geschwistertiteln ihren Block** — als Lauf gegen eine Kulisse (`AK_ROOT`), nicht als Textsuche im Quelltext. Ersetzt in
 * `check-logic.ts` die Zusicherungen „ein deutscher Block ohne Titel geht an den Geschwistertitel", „Crunchyrolls Folgenwissen
 * landet als Bereich am Verweis" und „ein Handbeleg wird dabei nie überschrieben". Läuft in `check:logic`.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Title } from '../shared/types.ts'
import type { CrDubData } from './lib/crunchyroll-dub.ts'
import type { KatalogEintrag } from './lib/anilist.ts'

const kulisse = mkdtempSync(join(tmpdir(), 'cr-bloecke-laufzeit-'))
process.env.AK_ROOT = kulisse
const fehler: string[] = []
let pruefungen = 0
const erwarte = (name: string, ist: unknown, soll: unknown) => {
  pruefungen++
  if (JSON.stringify(ist) !== JSON.stringify(soll)) fehler.push(`${name}: ${JSON.stringify(ist)} statt ${JSON.stringify(soll)}`)
}
const adresse = (kennung: string) => `https://www.crunchyroll.com/de/series/${kennung}/serie`
const folgen = (...nummern: unknown[]) => nummern.map((nummer) => ({ nummer, guid: 'g' }))
/** Ein Block mit den gegebenen deutschen Folgen; `deutsch` zählt sie (Blöcke ohne Folgen heißen hier „leer"). */
const block = (name: string, gesamt: number, ...nummern: unknown[]) => ({ name, folgen: gesamt, kacheln: gesamt, deutsch: nummern.length, fremd: 0, deutscheFolgen: folgen(...nummern) })

interface BereichFall {
  id: number
  name: string
  kennung: string
  episodes?: number
  stream?: { dub?: boolean; dubRanges?: { from: number; to: number; dub: boolean }[] }
  bloecke: object[]
  /** Ein zweiter Titel an derselben Adresse. */
  zweiterTitel?: boolean
  soll: { from: number; to: number; dub: boolean }[] | undefined
}
const r = (from: number, to: number) => ({ from, to, dub: true })
const BEREICHE: BereichFall[] = [
  { id: 900601, name: 'Kontrolle: Lücke in den deutschen Folgen gibt zwei Bereiche', kennung: 'BKONTR001', episodes: 12, bloecke: [block('S1', 12, 1, 2, 3, 5, 6)], soll: [r(1, 3), r(5, 6)] },
  { id: 900602, name: 'Verweis ohne Urteil bekommt keine Bereiche', kennung: 'BOHNEDUB1', episodes: 12, stream: { dub: undefined }, bloecke: [block('S1', 12, 1, 2)], soll: undefined },
  { id: 900603, name: 'Verweis mit Nein bekommt keine Bereiche', kennung: 'BNEIN0001', episodes: 12, stream: { dub: false }, bloecke: [block('S1', 12, 1, 2)], soll: undefined },
  { id: 900604, name: 'Ein vorhandener Bereich (Handbeleg) wird nie überschrieben', kennung: 'BHANDBEL1', episodes: 12, stream: { dub: true, dubRanges: [r(1, 8)] }, bloecke: [block('S1', 12, 1, 2)], soll: [r(1, 8)] },
  { id: 900605, name: 'Zwei Titel an der Adresse: keine Bereiche', kennung: 'BZWEITIT1', episodes: 12, zweiterTitel: true, bloecke: [block('S1', 12, 1, 2)], soll: undefined },
  { id: 900606, name: 'Zwei Blöcke mit deutschen Folgen: keine Bereiche', kennung: 'BZWEIBLO1', episodes: 12, bloecke: [block('S1', 12, 1, 2), block('S2', 12, 1)], soll: undefined },
  { id: 900607, name: 'Ein Block ohne deutsche Folge neben dem einen mit: Bereiche', kennung: 'BLEERBLO1', episodes: 12, bloecke: [block('S1', 12, 1, 2), block('S2', 12)], soll: [r(1, 2)] },
  { id: 900608, name: 'Folgennummer über dem Titelende: keine Bereiche', kennung: 'BUEBERENDE', episodes: 12, bloecke: [block('S1', 13, 1, 13)], soll: undefined },
  { id: 900609, name: 'Folgennummer genau am Titelende: Bereiche', kennung: 'BAMENDE001', episodes: 12, bloecke: [block('S1', 12, 1, 12)], soll: [r(1, 1), r(12, 12)] },
  { id: 900610, name: 'Laufende Nummer hinter dem Titelende: keine Bereiche', kennung: 'BLAUFEND01', episodes: 12, bloecke: [{ ...block('S1', 12, 1, 2), deutscheFolgen: [{ nummer: 1, laufend: 53, guid: 'g' }, { nummer: 2, laufend: 54, guid: 'g' }] }], soll: undefined },
  { id: 900611, name: 'Alle Folgen 1 bis Ende deutsch: kein Bereich nötig', kennung: 'BALLEDEUT1', episodes: 3, bloecke: [block('S1', 3, 1, 2, 3)], soll: undefined },
  { id: 900612, name: 'Nummern ungeordnet und doppelt: ein Bereich', kennung: 'BUNGEORDN1', episodes: 12, bloecke: [block('S1', 12, 3, 1, 2, 2)], soll: [r(1, 3)] },
  { id: 900613, name: 'Nummern 0, negativ und Text zählen nicht', kennung: 'BSCHROTT01', episodes: 12, bloecke: [block('S1', 12, 0, -2, 'x', 4)], soll: [r(4, 4)] },
  { id: 900614, name: 'Block ohne verwertbare Nummer: keine Bereiche', kennung: 'BKEINENUM1', episodes: 12, bloecke: [block('S1', 12, 0, 'x')], soll: undefined },
  { id: 900615, name: 'Titel ohne Folgenzahl: Bereiche trotzdem', kennung: 'BOHNEZAHL1', bloecke: [block('S1', 12, 1)], soll: [r(1, 1)] },
  { id: 900616, name: 'Ein einzelner Bereich, der nicht bei 1 beginnt, bleibt stehen', kennung: 'BNICHTAB01', episodes: 3, bloecke: [block('S1', 3, 2, 3)], soll: [r(2, 3)] },
]

/** Runden 2 bis 5 (Kennung statt Adresse): je Runde mindestens zwei Fälle mit Adressvariante, Folgenzahl, Jahr und Namen. */
interface RundenFall {
  name: string
  kennung: string
  titel: { id: number; episodes: number; jpYear: number; format?: string; name: string; adresse?: string }[]
  bloecke: object[]
  soll: Record<number, boolean | undefined>
}
const von1 = (bis: number) => Array.from({ length: bis }, (_, i) => i + 1)
const RUNDEN: RundenFall[] = [
  { name: 'Runde 2: durchgezählte Nummern geben beiden Staffeln Deutsch', kennung: 'RNUMMER01', titel: [{ id: 900901, episodes: 3, jpYear: 2019, name: 'Alpha Eins' }, { id: 900902, episodes: 2, jpYear: 2020, name: 'Beta Zwei' }], bloecke: [block('Bl A', 3, 1, 2, 3), block('Bl B', 2, 4, 5)], soll: { 900901: true, 900902: true } },
  { name: 'Runde 2: dieselbe Kennung unter zwei Adressen kommt zusammen', kennung: 'RNUMMER02', titel: [{ id: 900903, episodes: 2, jpYear: 2019, name: 'Gamma Eins' }, { id: 900904, episodes: 3, jpYear: 2020, name: 'Delta Zwei', adresse: 'http://www.crunchyroll.com/rnummer02' }], bloecke: [block('X1', 2, 1, 2), block('X2', 3, 3, 4, 5)], soll: { 900903: true, 900904: true } },
  { name: 'Runde 2: eine Staffel ganz ohne deutsche Folgen bekommt Nein', kennung: 'RNUMMER03', titel: [{ id: 900905, episodes: 2, jpYear: 2018, name: 'Epsilon Eins' }, { id: 900906, episodes: 2, jpYear: 2019, name: 'Zeta Zwei' }, { id: 900907, episodes: 2, jpYear: 2020, name: 'Eta Drei' }], bloecke: [block('Y1', 2, 1, 2), block('Y2', 2, 5, 6)], soll: { 900905: true, 900906: false, 900907: true } },
  { name: 'Runde 3: einzige Serie an der Adresse bekommt Deutsch', kennung: 'RJEBLOCK01', titel: [{ id: 900910, episodes: 12, jpYear: 2020, name: 'Theta Einzel' }], bloecke: [block('Namenlos', 12, ...von1(12))], soll: { 900910: true } },
  { name: 'Runde 3: zwei OVAs füllen den OVA-Block', kennung: 'RJEBLOCK02', titel: [{ id: 900911, episodes: 1, jpYear: 2020, format: 'OVA', name: 'Iota Sonder' }, { id: 900912, episodes: 1, jpYear: 2021, format: 'OVA', name: 'Kappa Sonder' }], bloecke: [block('OVAs', 2, 1, 2)], soll: { 900911: true, 900912: true } },
  { name: 'Runde 4: ein Block deckt zwei Staffeln', kennung: 'RKETTE001', titel: [{ id: 900920, episodes: 11, jpYear: 2019, name: 'Lambda Eins' }, { id: 900921, episodes: 11, jpYear: 2019, name: 'My Zwei' }, { id: 900925, episodes: 1, jpYear: 2020, name: 'Pi Sonder' }], bloecke: [block('Kette', 22, ...von1(22)), block('Nachtrag', 1, 1)], soll: { 900920: true, 900921: true, 900925: true } },
  { name: 'Runde 4: Block 10 deckt zwei, Block 5 die dritte', kennung: 'RKETTE002', titel: [{ id: 900922, episodes: 5, jpYear: 2018, name: 'Ny Eins' }, { id: 900923, episodes: 5, jpYear: 2018, name: 'Xi Zwei' }, { id: 900924, episodes: 5, jpYear: 2019, name: 'Omikron Drei' }], bloecke: [block('Z1', 10, ...von1(10)), block('Z2', 5, ...von1(5))], soll: { 900922: true, 900923: true, 900924: true } },
  { name: 'Runde 5: Titel und Teil 2 füllen einen Block', kennung: 'RTEILBLO01', titel: [{ id: 900930, episodes: 12, jpYear: 2020, name: 'Aurora Welt' }, { id: 900931, episodes: 12, jpYear: 2021, name: 'Aurora Welt Teil 2' }], bloecke: [block('Aurora Welt', 24, ...von1(24)), block('Alicization', 25, ...von1(24))], soll: { 900930: true, 900931: true } },
  { name: 'Runde 5: zweites Paar aus Titel und Teil 2', kennung: 'RTEILBLO02', titel: [{ id: 900932, episodes: 6, jpYear: 2020, name: 'Mondlicht Chronik' }, { id: 900933, episodes: 6, jpYear: 2021, name: 'Mondlicht Chronik Teil 2' }], bloecke: [block('Mondlicht Chronik', 12, ...von1(12)), block('Sonnenwende', 13, ...von1(12))], soll: { 900932: true, 900933: true } },
]

/** Geschwisterblock: Serie mit Titel A (12 Folgen) und einem deutschen Block von 3 Folgen. */
interface GeschwisterFall {
  /** Kennung der Serie, `A` ist der Titel an der Adresse. */
  a: number
  name: string
  kennung: string
  serie?: object
  block?: object
  /** Titel im Bestand, die als Geschwister in Frage kommen. */
  bestand?: { id: number; episodes: number; cr?: boolean; franchise?: boolean }[]
  katalog?: { id: number; folgen: number; eltern: number[]; t?: [string | null, string | null, string | null]; latein?: string }[]
  /** Soll: [Titel, der den Weg bekommt] oder `undefined` (kein Geschwister bekommt etwas). */
  geht?: number
}
const DREI = { name: 'Special', folgen: 3, kacheln: 3, deutsch: 3, fremd: 0 }
const geschwister: GeschwisterFall[] = [
  { a: 900701, name: 'Kontrolle: ein Bestandstitel mit 3 Folgen in der Reihe bekommt den Block', kennung: 'GKONTR001', bestand: [{ id: 900702, episodes: 3, franchise: true }, { id: 900703, episodes: 5, franchise: true }], geht: 900702 },
  { a: 900710, name: 'Geschwister aus dem Katalog (Eltern nennen den Titel) wird angelegt', kennung: 'GKATALOG1', katalog: [{ id: 900711, folgen: 3, eltern: [900710], t: ['Romaji', 'English', null] }, { id: 900712, folgen: 5, eltern: [900710] }], geht: 900711 },
  { a: 900720, name: 'Katalogtitel mit anderen Eltern: kein Geschwister', kennung: 'GFREMDEL1', katalog: [{ id: 900721, folgen: 3, eltern: [1] }] },
  { a: 900730, name: 'Katalogtitel ohne Elternangabe: kein Geschwister', kennung: 'GOHNEELT1', katalog: [{ id: 900731, folgen: 3, eltern: undefined as unknown as number[] }] },
  { a: 900740, name: 'Bestand und Katalog zugleich: nicht eindeutig, kein Geschwister', kennung: 'GZWEIFEL1', bestand: [{ id: 900741, episodes: 3, franchise: true }], katalog: [{ id: 900742, folgen: 3, eltern: [900740] }] },
  { a: 900750, name: 'Block nicht vollständig deutsch: kein Geschwister', kennung: 'GUNVOLL01', block: { ...DREI, deutsch: 2 }, bestand: [{ id: 900751, episodes: 3, franchise: true }] },
  { a: 900760, name: 'Bestandstitel in einer anderen Reihe: kein Geschwister', kennung: 'GANDEREIH1', bestand: [{ id: 900761, episodes: 3 }] },
  { a: 900770, name: 'Katalog nicht deutsch: kein Geschwister', kennung: 'GUSKATAL01', serie: { katalog: 'us' }, bestand: [{ id: 900771, episodes: 3, franchise: true }] },
  { a: 900780, name: 'Serie nicht im deutschen Angebot: kein Geschwister', kennung: 'GNICHTANG1', serie: { deutschImAngebot: false }, bestand: [{ id: 900781, episodes: 3, franchise: true }] },
  { a: 900790, name: 'Geschwister hat schon einen Crunchyroll-Weg: nichts doppelt', kennung: 'GSCHONWEG1', bestand: [{ id: 900791, episodes: 3, franchise: true, cr: true }] },
  { a: 900800, name: 'Handbeleg verneint den Weg: kein Geschwister', kennung: 'GHANDNEIN1', bestand: [{ id: 900801, episodes: 3, franchise: true }] },
  { a: 900810, name: 'Block hat so viele Folgen wie unser Titel: kein Geschwister', kennung: 'GGLEICHZA1', block: { ...DREI, folgen: 12, deutsch: 12 }, bestand: [{ id: 900811, episodes: 12, franchise: true }] },
  { a: 900820, name: 'Block ohne Folgen und ohne deutsche Folge: kein Geschwister', kennung: 'GNULLBLOC1', block: { ...DREI, folgen: 0, deutsch: 0 }, bestand: [{ id: 900821, episodes: 0, franchise: true }] },
  { a: 900830, name: 'Katalogtitel, den der Bestand schon führt, zählt nicht doppelt', kennung: 'GSCHONBES1', bestand: [{ id: 900831, episodes: 3, franchise: true }], katalog: [{ id: 900831, folgen: 3, eltern: [900830] }], geht: 900831 },
  { a: 900840, name: 'Katalogtitel nur mit lateinischem Namen: der Name wird englischer Titel', kennung: 'GLATEIN01', katalog: [{ id: 900841, folgen: 3, eltern: [900840], t: ['Romaji', null, null], latein: 'Latin Name' }], geht: 900841 },
]

try {
  mkdirSync(join(kulisse, 'data/curated'), { recursive: true })
  writeFileSync(join(kulisse, 'data/kino-ankuendigungen.yaml'), '[]\n')
  writeFileSync(join(kulisse, 'data', 'ankuendigungen.yaml'), 'eintraege: []\n')
  writeFileSync(
    join(kulisse, 'data/dub-confirmed.yaml'),
    `- anilistId: 900801\n  platform: crunchyroll\n  url: ${adresse('GHANDNEIN1')}\n  dub: false\n  checkedAt: '2026-10-30'\n`,
  )
  const { ordneCrBloeckeZu } = await import('./bau/09-4-2-bloecke.ts')
  const mk = (id: number, url: string | undefined, mehr: object = {}) =>
    [id, { id, slug: `bloecke-${id}`, titleDe: `Block ${id}`, streams: url ? [{ platform: 'crunchyroll', url }] : [], ...mehr } as unknown as Title] as const
  const titles = new Map<number, Title>()
  const serien: object[] = []
  for (const f of BEREICHE) {
    const [id, t] = mk(f.id, adresse(f.kennung), { episodes: f.episodes })
    Object.assign(t.streams[0]!, { dub: true, ...f.stream })
    if (f.stream && 'dub' in f.stream && f.stream.dub === undefined) delete t.streams[0]!.dub
    titles.set(id, t)
    if (f.zweiterTitel) titles.set(f.id + 5000, mk(f.id + 5000, adresse(f.kennung), { episodes: 12 })[1])
    serien.push({ url: adresse(f.kennung), staffeln: f.bloecke })
  }
  const katalogEintraege: KatalogEintrag[] = []
  for (const f of geschwister) {
    const [id, a] = mk(f.a, adresse(f.kennung), { episodes: 12 })
    a.streams[0]!.dub = true
    titles.set(id, a)
    for (const b of f.bestand ?? []) {
      const [bid, t] = mk(b.id, b.cr ? adresse('GANDEREKEN') : undefined, { episodes: b.episodes, ...(b.franchise ? { franchiseId: f.a } : {}) })
      titles.set(bid, t)
    }
    for (const k of f.katalog ?? []) {
      katalogEintraege.push({ id: k.id, folgen: k.folgen, eltern: k.eltern, latein: k.latein, t: k.t ?? ['Romaji', null, null], format: 'SPECIAL', jahr: 2026 } as unknown as KatalogEintrag)
    }
    serien.push({ url: adresse(f.kennung), seriesId: f.kennung, katalog: 'de', deutschImAngebot: true, ...f.serie, staffeln: [f.block ?? DREI] })
  }
  for (const f of RUNDEN) {
    const urls = new Set<string>()
    for (const t of f.titel) {
      const url = t.adresse ?? adresse(f.kennung)
      urls.add(url)
      titles.set(t.id, mk(t.id, url, { episodes: t.episodes, jpYear: t.jpYear, format: t.format ?? 'TV', titleEn: t.name, titleRomaji: t.name })[1])
    }
    for (const url of urls) serien.push({ url, seriesId: f.kennung, katalog: 'de', deutschImAngebot: true, staffeln: f.bloecke })
  }
  const crDub = { serien } as unknown as CrDubData
  const nachUrl = new Map<string, Title[]>()
  for (const t of titles.values()) for (const s of t.streams) nachUrl.set(s.url, [...(nachUrl.get(s.url) ?? []), t])
  ordneCrBloeckeZu({ crDub, nachUrl, titles, katalogEintraege })
  for (const f of BEREICHE) erwarte(f.name, titles.get(f.id)!.streams[0]!.dubRanges, f.soll)
  for (const f of geschwister) {
    const kandidaten = [...(f.bestand ?? []).map((b) => b.id), ...(f.katalog ?? []).map((k) => k.id)]
    const hat = [...new Set(kandidaten)].filter((id) => titles.get(id)?.streams.some((s) => s.platform === 'crunchyroll' && s.url === adresse(f.kennung)))
    erwarte(f.name, hat, f.geht ? [f.geht] : [])
  }
  for (const f of RUNDEN) for (const t of f.titel) erwarte(`${f.name} (${t.id})`, titles.get(t.id)!.streams[0]!.dub, f.soll[t.id])
  const neu = titles.get(900711)
  erwarte('Katalog-Geschwister: Titel angelegt mit Reihe, englischem Namen und deutschem Weg', [neu?.franchiseId, neu?.titleEn, neu?.streams[0]?.dub], [900710, 'English', true])
  erwarte('Katalog-Geschwister nur mit lateinischem Namen: Anzeige aus dem lateinischen Namen', titles.get(900841)?.titleEn, 'Latin Name')
  erwarte('Katalog-Geschwister: Folgenzahl aus dem Katalog', titles.get(900711)?.episodes, 3)
  erwarte('Bestands-Geschwister: Weg deutsch belegt', titles.get(900702)!.streams[0]!.dub, true)
  erwarte('Katalogtitel mit fremden Eltern wird nicht angelegt', titles.has(900721), false)
  erwarte('Katalogtitel ohne Eltern wird nicht angelegt', titles.has(900731), false)
} finally {
  rmSync(kulisse, { recursive: true, force: true })
}
if (fehler.length) {
  console.error(`FEHL check-09-4-2-bloecke-laufzeit:\n  ${fehler.join('\n  ')}`)
  process.exit(1)
}
console.log(`check-09-4-2-bloecke-laufzeit: ${pruefungen} Prüfungen ok.`)
