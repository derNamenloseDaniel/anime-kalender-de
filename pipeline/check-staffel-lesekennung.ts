/**
 * Zusicherung: **nach dem Schnitt in Staffel-Titel finden Auslieferung und TOGGO ihre Quelldaten unter dem Sammeltitel** (`lesekennung`,
 * `toggoFolgenDerStaffel`, `pruefeToggoVerteilung`). Ohne das hätten Staffel 1–3 keine Handlung, keine Sprecher und keine TOGGO-Fenster, und die
 * Basis-Staffel trüge die TOGGO-Fenster aller Staffeln (Bau-Vergleich 22.11.2026). Die Verdrahtung prüfen die echten Aufrufer
 * (`baueAuslieferung`, `schreibeZusatzdateien`, `setzeToggoFenster`) in einem Wegwerf-Ordner (`AK_ROOT`); ohne ihren Aufruf von
 * `lesekennung` werden die Fälle rot. Läuft in `check:logic`.
 */
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Title } from '../shared/types.ts'

/* `ROOT` (`lib/util.ts`) wird beim ersten Import festgelegt: Der Wegwerf-Ordner steht vor jedem Import der Bau-Module. */
const wurzel = mkdtempSync(join(tmpdir(), 'staffel-lesekennung-'))
mkdirSync(join(wurzel, 'data'), { recursive: true })
mkdirSync(join(wurzel, 'public', 'data'), { recursive: true })
for (const datei of ['ohne-synchro-von-hand.yaml', 'kino-ankuendigungen.yaml', 'fanservice-urteil.yaml', 'folgen-hinweise.yaml']) copyFileSync(join(import.meta.dirname, '..', 'data', datei), join(wurzel, 'data', datei))
writeFileSync(join(wurzel, 'data', 'ankuendigungen.yaml'), 'eintraege: []\n')
process.env.AK_ROOT = wurzel
const { lesekennung } = await import('../shared/staffel-titel.ts')
const { pruefeToggoVerteilung, toggoFolgenDerStaffel } = await import('./lib/staffel-titel.ts')
const { fehlendes } = await import('./bau/luecken-titel.ts')
const { mitStaffelTiteln } = await import('./bau/cartoon-reihen.ts')
const { baueAuslieferung } = await import('./bau/13-2-auslieferung.ts')
const { schreibeZusatzdateien } = await import('./bau/13-4-zusatzdateien.ts')
const { setzeToggoFenster } = await import('./bau/13-1-toggo-fenster.ts')

let fehler = 0
let faelle = 0
function pruefe(name: string, ok: boolean, info = ''): void {
  faelle++
  if (ok) return
  fehler++
  console.error(`✖ ${name}${info ? ` — ${info}` : ''}`)
}

pruefe('Staffel liest unter dem Sammeltitel', lesekennung({ id: 7000002, staffelTitel: { sammel: 158871 } }) === 158871)
pruefe('Basis-Staffel liest unter der eigenen Kennung', lesekennung({ id: 158871, staffelTitel: { sammel: 158871 } }) === 158871)
pruefe('gewöhnlicher Titel liest unter der eigenen Kennung', lesekennung({ id: 20 }) === 20)

const f = (staffel: number, folge: number) => ({ staffel, folge, ab: '2026-01-01T00:00', bis: '2026-12-31T23:59' })
const folgen = [f(1, 1), f(1, 2), f(2, 1), f(3, 1), f(4, 1)]
const je = (nr: number) => toggoFolgenDerStaffel(folgen, { staffelTitel: { sammel: 158871, nr } }).map((x) => `${x.staffel}/${x.folge}`).join(',')
pruefe('TOGGO: Staffel 1 bekommt nur ihre Folgen', je(1) === '1/1,1/2', je(1))
pruefe('TOGGO: Staffel 2 bekommt nur ihre Folgen', je(2) === '2/1', je(2))
pruefe('TOGGO: Basis-Staffel (4) bekommt nur Staffel 4', je(4) === '4/1', je(4))
pruefe('TOGGO: Staffel ohne Folgen bekommt keine', je(9) === '')
pruefe('TOGGO: gewöhnlicher Titel behält alle Folgen', toggoFolgenDerStaffel(folgen, {}).length === folgen.length)

const wirft = (vorhanden: number, verteilt: number): boolean => {
  try {
    pruefeToggoVerteilung(158871, vorhanden, verteilt)
    return false
  } catch {
    return true
  }
}
pruefe('Riegel: gleiche Zahl geht durch', !wirft(5, 5))
pruefe('Riegel: verlorene Folge bricht ab', wirft(5, 4))
pruefe('Riegel: doppelt verteilte Folge bricht ab', wirft(5, 6))

const ohneMal = (ueber: object) => fehlendes({ id: 7000001, titleDe: 'T', jpYear: 2023, coverImage: 'c', ...ueber }, undefined, undefined)
pruefe('Lücken: Staffel-Titel ohne MAL-Kennung ist keine Lücke (MAL liegt an der Basis)', ohneMal({ staffelTitel: { sammel: 158871 } }) === '')
pruefe('Lücken: gewöhnlicher Titel ohne MAL-Kennung bleibt eine Lücke', ohneMal({}) === 'm')

const eigene = mitStaffelTiteln([{ ids: [158871, 5], grund: 'g', quelle: 'https://x' }], [{ id: 7000001, staffelTitel: { sammel: 158871 } }, { id: 158871, staffelTitel: { sammel: 158871 } }, { id: 7000009, staffelTitel: { sammel: 99 } }, { id: 20 }])
pruefe('Eigene Werke: Staffel-Titel eines gelisteten Sammeltitels zählen mit, ohne Doppelte', JSON.stringify(eigene[0]!.ids) === '[158871,5,7000001]', JSON.stringify(eigene))

/* Die echten Aufrufer: Sammeltitel 158871 mit Quelldaten, Staffel 1 (7000001) und Basis (158871) als Staffel-Titel. */
const staffelTitel = (id: number, nr: number, ab: number, extra: object = {}) => ({ id, titleDe: `T${id}`, slug: `t-${id}`, franchiseId: 158871, jpYear: 2023, streams: [], keywords: [], genres: [], staffelTitel: { sammel: 158871, nr, ab }, ...extra }) as unknown as Title
{
  const titel = [staffelTitel(7000001, 1, 1), staffelTitel(158871, 4, 137)]
  const synopsen: Record<number, unknown> = {}
  const { slim } = baueAuslieferung({
    allTitles: titel,
    anisearch: { 158871: { descriptionDe: 'Handlung der Serie' } } as never,
    tmdbTitles: {},
    trenneQuelle: (text: string) => ({ text }),
    synopses: synopsen as never,
    mitStimmen: new Set([158871]),
    annKennungen: { '158871': 99 },
    trailer: { '158871': { video: 'v', titel: 'Trailer' } },
    releases: [],
    verschoben: [],
    verweiseEntfernt: [],
  })
  const s1 = slim.find((s) => s.id === 7000001) as { hasVoices?: boolean; annId?: number; trailer?: { video: string } } | undefined
  pruefe('13-2: Staffel 1 bekommt Handlung unter der Lesekennung', JSON.stringify(synopsen[7000001]).includes('Handlung der Serie'), JSON.stringify(synopsen))
  pruefe('13-2: Staffel 1 bekommt Sprecher, ANN-Kennung und Trailer unter der Lesekennung', s1?.hasVoices === true && s1.annId === 99 && s1.trailer?.video === 'v', JSON.stringify(s1))
}
{
  const titel = new Map([7000001, 158871].map((id) => [id, staffelTitel(id, id === 158871 ? 4 : 1, id === 158871 ? 137 : 1)]))
  for (const datei of ['cartoon-eigene-serien.yaml', 'spinoff-von-hand.yaml']) copyFileSync(join(import.meta.dirname, '..', 'data', datei), join(wurzel, 'data', datei))
  schreibeZusatzdateien({ titles: titel, anisearch: { 158871: { info: { synonyms: ['Anderer Name'] } } } as never, slim: [...titel.values()] as never, verschoben: [], releases: [], synopses: {} as never, jpStartAnzeige: new Map([[158871, '2023-04-14']]) })
  const lies = (datei: string) => JSON.parse(readFileSync(join(wurzel, 'public', 'data', datei), 'utf8')) as Record<string, unknown>
  pruefe('13-4: Synonyme der Staffel 1 aus der Lesekennung', JSON.stringify(lies('synonyme.json')['7000001']) === '["Anderer Name"]', JSON.stringify(lies('synonyme.json')))
  const reihe = lies('franchises.json')['158871'] as { id: number; jpStart?: string; eigenesWerk?: boolean }[]
  pruefe('13-4: AniList-Start der Staffel 1 aus der Lesekennung', reihe?.find((m) => m.id === 7000001)?.jpStart === '2023-04-14', JSON.stringify(reihe))
  pruefe('13-4: Staffel-Titel eines eigenen Werks sind selbst eigene Werke', reihe?.every((m) => m.eigenesWerk === true) === true, JSON.stringify(reihe))
}
{
  const f = (staffel: number, folge: number) => ({ staffel, folge, ab: '2026-01-01T00:00', bis: '2026-12-31T23:59' })
  writeFileSync(join(wurzel, 'data', 'toggo.json'), JSON.stringify({ titel: { 158871: { adresse: 'https://www.toggo.de/x', folgen: [f(1, 1), f(1, 2), f(4, 1)] } } }))
  const toggoWeg = [{ name: 'TOGGO', url: 'https://www.toggo.de/x', kind: 'stream' }]
  const titel = [staffelTitel(7000001, 1, 1, { watchLinks: structuredClone(toggoWeg) }), staffelTitel(158871, 4, 137, { watchLinks: structuredClone(toggoWeg) })]
  setzeToggoFenster(titel)
  const bloecke = (id: number) => JSON.stringify(titel.find((t) => t.id === id)?.watchLinks?.[0]?.toggo?.map((b) => [b.staffel, b.von, b.bis]))
  pruefe('13-1: Staffel 1 trägt nur ihre TOGGO-Fenster, gelesen unter der Lesekennung', bloecke(7000001) === '[[1,1,2]]', bloecke(7000001))
  pruefe('13-1: die Basis-Staffel trägt nur Staffel 4', bloecke(158871) === '[[4,1,1]]', bloecke(158871))
  /* Riegel im Aufrufer: Eine TOGGO-Folge, die keine Staffel bekommt, bricht den Bau ab. */
  writeFileSync(join(wurzel, 'data', 'toggo.json'), JSON.stringify({ titel: { 158871: { adresse: 'https://www.toggo.de/x', folgen: [f(1, 1), f(4, 1), f(9, 1)] } } }))
  let gebrochen = false
  try {
    setzeToggoFenster([staffelTitel(7000001, 1, 1, { watchLinks: structuredClone(toggoWeg) }), staffelTitel(158871, 4, 137, { watchLinks: structuredClone(toggoWeg) })])
  } catch {
    gebrochen = true
  }
  pruefe('13-1: eine TOGGO-Folge ohne Staffel bricht den Bau ab (Riegel im Aufrufer)', gebrochen)
}

rmSync(wurzel, { recursive: true, force: true })

console.log(`check-staffel-lesekennung: ${faelle} Fälle, ${fehler} Fehler`)
process.exit(fehler ? 1 : 0)
