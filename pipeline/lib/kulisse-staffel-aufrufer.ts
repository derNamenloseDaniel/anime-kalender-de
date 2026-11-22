/**
 * Kindprozess von `check-staffel-aufrufer.ts`: fährt die echten Aufrufer, die nach dem Schnitt in Staffel-Titel über die Kennung nachschlagen
 * (`setzeToggoFenster`, `schreibeNeuMitSynchro`, `baueAuslieferung`), in der Kulisse (`AK_ROOT`) und druckt, was sie geschrieben haben.
 * Aufruf: `<modus>`: `toggo` | `toggo-fremd` | `seit` | `auslieferung`.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Release, Title } from '../../shared/types.ts'

const wurzel = process.env.AK_ROOT
if (!wurzel) throw new Error('AK_ROOT fehlt — der Lauf würde ins echte Repo schreiben')
const WURZEL: string = wurzel
const SAMMEL = 158871
const staffel = (id: number, nr: number, ab: number, extra: object = {}) =>
  ({ id, titleDe: `Probe – Staffel ${nr}`, jpYear: 2023, format: 'TV', streams: [], watchLinks: [], staffelTitel: { sammel: SAMMEL, nr, ab }, ...extra }) as unknown as Title
const schreibeText = (pfad: string, text: string) => {
  mkdirSync(join(WURZEL, pfad, '..'), { recursive: true })
  writeFileSync(join(WURZEL, pfad), text)
}
const schreibe = (pfad: string, inhalt: unknown) => {
  mkdirSync(join(WURZEL, pfad, '..'), { recursive: true })
  writeFileSync(join(WURZEL, pfad), JSON.stringify(inhalt))
}
const fenster = (staffelNr: number, folge: number) => ({ staffel: staffelNr, folge, ab: '2026-01-01T00:00', bis: '2026-12-31T23:59' })
const toggoLink = () => ({ name: 'TOGGO', url: 'https://www.toggo.de/pokemon/serien/probe', kind: 'stream', zugang: 'kostenlos' })

async function toggo(fremd: boolean): Promise<void> {
  const folgen = [fenster(1, 1), fenster(1, 2), fenster(2, 1), fenster(4, 1), ...(fremd ? [fenster(5, 1)] : [])]
  schreibe('data/toggo.json', { titel: { [SAMMEL]: { adresse: 'https://www.toggo.de/pokemon/serien/probe', folgen } } })
  const titel = [staffel(7_000_001, 1, 1, { watchLinks: [toggoLink()] }), staffel(7_000_002, 2, 46, { watchLinks: [toggoLink()] }), staffel(SAMMEL, 4, 137, { watchLinks: [toggoLink()] })]
  const { setzeToggoFenster } = await import('../bau/13-1-toggo-fenster.ts')
  setzeToggoFenster(titel)
  console.log(JSON.stringify(Object.fromEntries(titel.map((t) => [t.id, (t.watchLinks ?? []).flatMap((w) => w.toggo ?? []).map((b) => `${b.staffel}/${b.von}`)]))))
}

async function seit(): Promise<void> {
  schreibeText('data/fanservice-urteil.yaml', '[]\n')
  schreibeText('data/kino-ankuendigungen.yaml', '[]\n')
  schreibe('data/synchro-historie.json', { angelegtAm: '2026-08-13', seit: { [SAMMEL]: '2026-08-13', 20: '2026-08-13' } })
  const titel = [staffel(7_000_001, 1, 1), staffel(SAMMEL, 4, 137), { id: 20, streams: [], watchLinks: [] } as unknown as Title, { id: 21, streams: [], watchLinks: [] } as unknown as Title]
  const { schreibeNeuMitSynchro } = await import('../bau/nebendateien.ts')
  schreibeNeuMitSynchro(titel, [] as Release[])
  const historie = JSON.parse(readFileSync(join(WURZEL, 'data/synchro-historie.json'), 'utf8')) as { seit: Record<string, string> }
  console.log(JSON.stringify({ staffel: historie.seit['7000001'], basis: historie.seit[String(SAMMEL)], fremd: historie.seit['21'] }))
}

async function auslieferung(): Promise<void> {
  schreibeText('data/kino-ankuendigungen.yaml', '[]\n')
  const titel = [staffel(7_000_001, 1, 1), staffel(SAMMEL, 4, 137), { id: 20, titleDe: 'Gewöhnlich', jpYear: 2020, format: 'TV', streams: [], watchLinks: [] } as unknown as Title]
  const { baueAuslieferung } = await import('../bau/13-2-auslieferung.ts')
  const synopses: Record<number, unknown> = {}
  const { slim } = baueAuslieferung({
    allTitles: titel,
    anisearch: { [SAMMEL]: { descriptionDe: 'Text des Sammeltitels' } } as never,
    tmdbTitles: {},
    trenneQuelle: (text: string) => ({ text }),
    synopses: synopses as never,
    mitStimmen: new Set([SAMMEL]),
    annKennungen: { [SAMMEL]: 777 },
    trailer: { [SAMMEL]: { video: 'abc', titel: 'Trailer' } },
    releases: [],
    verschoben: [],
    verweiseEntfernt: [],
  })
  const von = (id: number) => slim.find((t) => t.id === id) as { hasVoices?: boolean; annId?: number; trailer?: { video: string } } | undefined
  console.log(JSON.stringify({
    staffel: { stimmen: von(7_000_001)?.hasVoices, ann: von(7_000_001)?.annId, trailer: von(7_000_001)?.trailer?.video, handlung: Boolean(synopses[7_000_001]) },
    gewoehnlich: { stimmen: von(20)?.hasVoices, handlung: Boolean(synopses[20]) },
  }))
}

const modus = process.argv[2]
if (modus === 'toggo') await toggo(false)
else if (modus === 'toggo-fremd') await toggo(true)
else if (modus === 'seit') await seit()
else if (modus === 'auslieferung') await auslieferung()
else throw new Error(`Modus ${modus} unbekannt`)
