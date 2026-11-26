/**
 * Klasse „Folgenzahl steigt, die früheren Folgen haben keinen Termin“ (The Mighty Nein, 26.11.2026: Sammler hob `episodes` auf 16, der einzige
 * Termin beginnt bei Folge 9, der Kasten schrieb „Alle 16 Folgen“ und „0 von 16 Folgen erschienen“). Rechnet `berechneAntwort` und rendert den
 * echten `AntwortKasten`; die Fixture hat die Gestalt des echten Titels (episodes 16, dubRanges 1–8, Termin ab Folge 9 als Abwurf).
 * Aufruf: npx tsx pipeline/check-folgen-vor-start.ts
 */
import { act, createElement as h } from 'react'
import { createRoot } from 'react-dom/client'
import type { Release, Title } from '../shared/types.ts'
import { berechneAntwort } from '../web/src/components/detail/antwort-berechnen.ts'
import { davorOhneBeleg } from './lib/folgen-vor-start.ts'
import { abwurfBereich, folgenVorDemStart } from '../web/src/components/detail/antwort-davor.ts'
import { attrappeUhr, ignoriereCss, installiereMiniDom, type MiniKnoten } from '../tools/mini-dom.ts'
ignoriereCss()
const { AntwortKasten } = await import('../web/src/components/detail/antwort-kasten.tsx')
const { translate } = await import('../web/src/lib/i18n.tsx')

let verletzt = 0
let gezaehlt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  gezaehlt++
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const HEUTE = '2026-11-26'
const JETZT = new Date('2026-11-26T12:00:00Z')
const echteAbfrage = globalThis.fetch
globalThis.fetch = (async () => ({ ok: false, status: 404, json: async () => ({}) })) as unknown as typeof fetch

const titel = (id: number, episodes: number, dubBis?: number): Title =>
  ({
    id,
    slug: `x${id}`,
    format: 'TV',
    jpYear: 2025,
    jpStart: '2025-11-19',
    titleEn: `Probe ${id}`,
    episodes,
    streams: [{ platform: 'primevideo', url: 'https://x/p', dub: true, ...(dubBis ? { dubRanges: [{ from: 1, to: dubBis, dub: true }] } : {}) }],
  }) as unknown as Title
const abwurf = (id: number, ab: number, anzahl: number, art = 'batch'): Release =>
  ({ slug: `p${id}-s2`, titleId: id, name: 'Probe', platform: 'primevideo', releaseType: art, year: 2027, sources: ['https://example.org/a'], schedule: { firstEpisodeDate: '2027-03-24', firstEpisodeNumber: ab, episodeCount: anzahl } }) as unknown as Release

async function kastenText(t: Title, rs: Release[]): Promise<string> {
  const uhr = attrappeUhr()
  const dom = installiereMiniDom({ ...uhr, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) }, () => ({ src: '', srcset: '', sizes: '', decode: () => Promise.resolve() }))
  const antwort = berechneAntwort({ title: t, releases: rs, today: HEUTE, jetzt: JETZT })!
  const wurzel = createRoot(dom.wurzel as unknown as Element)
  await act(async () => {
    wurzel.render(h(AntwortKasten, { antwort, title: t, t: translate as never, today: HEUTE, releases: rs }))
  })
  await act(async () => {
    await Promise.resolve()
  })
  const text = (k: MiniKnoten): string => (k.textContent ?? '').replace(/\s+/g, ' ')
  const ergebnis = text(dom.wurzel)
  await act(async () => wurzel.unmount())
  dom.entferne()
  return ergebnis
}

/* Anlassfall: Folgen 1–8 belegt deutsch im Angebot, Termin für 9–16 am 24.03.2027. */
const nein = await kastenText(titel(900401, 16, 8), [abwurf(900401, 9, 8)])
pruefe('Mighty Nein: „8 von 16 Folgen erschienen“', nein.includes('8 von 16 Folgen erschienen'), nein)
pruefe('Mighty Nein: Kopf „Folgen 9–16“, nicht „Alle 16 Folgen“', nein.includes('Folgen 9–16') && !nein.includes('Alle 16 Folgen'), nein)
pruefe('Mighty Nein: nicht „0 von 16“', !nein.includes('0 von 16'), nein)

/* Ohne Beleg für 1–8 wird nichts behauptet: weder „8 von 16“ noch „Alle 16“. */
const ohneBeleg = await kastenText({ ...titel(900402, 16), streams: [{ platform: 'primevideo', url: 'https://x/p' }] } as Title, [abwurf(900402, 9, 8)])
pruefe('ohne Beleg für Folgen davor: kein „8 von 16“, kein „Alle 16“, Kopf „Folgen 9–16“', !ohneBeleg.includes('8 von 16') && !ohneBeleg.includes('Alle 16 Folgen') && ohneBeleg.includes('Folgen 9–16'), ohneBeleg)

/* Gegenfall: durchlaufende Staffelzählung (Wistoria: 12 Folgen im Titel, Termin ab Folge 13): die Folgen davor gehören zur Vorstaffel. */
pruefe('Staffeltitel mit durchlaufender Zählung: nichts davor zählt', folgenVorDemStart([abwurf(900403, 13, 12)], new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]), 12) === 0)
/* Grenzfälle der reinen Funktion: genau am Rand, ohne Folgenzahl, Disc, Start bei Folge 1. */
pruefe('Termin endet genau bei der Folgenzahl: zählt', folgenVorDemStart([abwurf(900404, 9, 8)], new Set([1, 2, 3, 4, 5, 6, 7, 8]), 16) === 8)
pruefe('Termin reicht eine Folge über die Zahl hinaus: zählt nicht', folgenVorDemStart([abwurf(900404, 9, 8)], new Set([1, 2, 3, 4, 5, 6, 7, 8]), 15) === 0)
pruefe('ohne Folgenzahl: nichts', folgenVorDemStart([abwurf(900404, 9, 8)], new Set([1, 2, 3, 4, 5, 6, 7, 8]), undefined) === 0)
pruefe('nur belegte Folgen zählen', folgenVorDemStart([abwurf(900404, 9, 8)], new Set([1, 2, 3]), 16) === 3)
pruefe('Disc-Termin gilt nicht als Start', folgenVorDemStart([{ ...abwurf(900404, 9, 8), releaseType: 'disc' } as Release], new Set([1, 2]), 16) === 0)
pruefe('Start bei Folge 1: nichts davor', folgenVorDemStart([abwurf(900404, 1, 8)], new Set([1, 2]), 16) === 0)
pruefe('abwurfBereich: 9–16, nicht bei Folge 1, nicht ohne Anzahl', JSON.stringify([abwurfBereich(abwurf(900405, 9, 8)), abwurfBereich(abwurf(900405, 1, 8)), abwurfBereich({ ...abwurf(900405, 9, 8), schedule: { firstEpisodeDate: '2027-03-24', firstEpisodeNumber: 9 } } as Release)]) === '[[9,16],null,null]')

/* Wochentakt ab Folge 9 bleibt „Nächste Folge“, kein Abwurf-Kopf. */
const woechentlich = await kastenText(titel(900406, 16, 8), [abwurf(900406, 9, 8, 'weekly')])
pruefe('Wochentermin ab Folge 9: kein „Folgen 9–16“ im Kopf', !woechentlich.includes('Folgen 9–16'), woechentlich)

/* Bestandsprüfung (`davorOhneBeleg`): drei Titel, der unbelegte in der Mitte. */
const titel3 = [titel(900411, 16, 8), titel(900412, 16, 4), titel(900413, 16, 8)]
const rs3 = [abwurf(900411, 9, 8), abwurf(900412, 9, 8), abwurf(900413, 9, 8)]
pruefe('Bestand: nur der Titel mit Lücke im Beleg wird gemeldet, mit den fehlenden Folgen 5–8', JSON.stringify(davorOhneBeleg(titel3, rs3, HEUTE)) === JSON.stringify([{ titleId: 900412, titel: 'Probe 900412', fehlen: [5, 6, 7, 8] }]), davorOhneBeleg(titel3, rs3, HEUTE))
pruefe('Bestand: ohne Beleg gemeldet, widerlegter Termin nicht', davorOhneBeleg([titel(900414, 16)], [{ ...abwurf(900414, 9, 8), widerlegt: { am: '2026-11-01', grund: 'x', quelle: 'https://x' } } as unknown as Release], HEUTE).length === 0 && davorOhneBeleg([titel(900414, 16)], [abwurf(900414, 9, 8)], HEUTE).length === 1)
/* Zwei Termine am selben Titel: die Folgen davor sind vom früheren gedeckt (Beyblade-Art), und ein Titel ohne Namen meldet seine Kennung. */
const zwei = [abwurf(900415, 1, 8), { ...abwurf(900415, 9, 8), slug: 'p900415-zweiter' } as Release]
pruefe('Bestand: früherer Termin ab Folge 1 deckt die Folgen davor (zwei Termine, Reihenfolge egal)', davorOhneBeleg([titel(900415, 16)], zwei, HEUTE).length === 0 && davorOhneBeleg([titel(900415, 16)], [...zwei].reverse(), HEUTE).length === 0)
const ohneNamen = { ...titel(900416, 16), titleEn: undefined } as unknown as Title
pruefe('Bestand: Titel ohne Namen meldet die Kennung als Namen', davorOhneBeleg([ohneNamen], [abwurf(900416, 9, 8)], HEUTE)[0]?.titel === '900416')

globalThis.fetch = echteAbfrage
if (verletzt) {
  console.error(`${verletzt} Zusicherung(en) verletzt.`)
  process.exit(1)
}
console.log(`check-folgen-vor-start: ${gezaehlt} Zusicherungen erfüllt (Anlassfall, ohne Beleg, Staffeltitel, Randfälle, Wochentermin)`)
