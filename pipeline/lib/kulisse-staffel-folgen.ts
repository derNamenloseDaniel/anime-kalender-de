/**
 * Kindprozess von `check-staffel-titel.ts`: fährt `schreibeFolgenDateien` mit einem Sammeltitel vor dem Schnitt (`staffelSammel`) in der
 * Kulisse (`AK_ROOT`) und druckt Index, Zählung und Zeilen je Datei.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Release, Title } from '../../shared/types.ts'
import { schreibeFolgenDateien } from '../bau/folgen-dateien.ts'
import { staffelPlaene } from './staffel-titel.ts'

const wurzel = process.env.AK_ROOT
if (!wurzel) throw new Error('AK_ROOT fehlt — der Lauf würde ins echte Repo schreiben')
const titel = (id: number, extra: object = {}) => ({ id, jpYear: 2023, jpEnd: '2026-12-31', streams: [], ...extra }) as unknown as Title
const [plan] = staffelPlaene([{ anilistId: 900501, titel: 'Probe', basis: 2, staffeln: [{ nr: 1, von: 1, bis: 3, kennung: 7_000_001 }, { nr: 2, von: 4 }] }])
/* Nach dem Schnitt: Staffel 1 (eigene Kennung) und die Basis; dazu ein gewöhnlicher Titel. Vor dem Schnitt: der Sammeltitel mit RTL+ 1–5. */
const nachSchnitt = [titel(900502), titel(7_000_001), titel(900501)]
const sammel = titel(900501, { streams: [{ platform: 'rtlplus', url: 'x', dub: true, dubRanges: [{ from: 1, to: 3, dub: true }] }] })
/* Folgen 4–5 belegt nur ein erschienener Stapel-Termin der Basis-Staffel (`mitStapelFolgen`, Grenzen aus der Kulissen-Yaml). */
const stapel = { slug: 'probe-s2', titleId: 900501, name: 'Probe', platform: 'rtlplus', releaseType: 'batch', schedule: { firstEpisodeDate: '2023-04-14', firstEpisodeNumber: 4, episodeCount: 2 }, sources: ['https://quelle.example/beleg'] } as unknown as Release
schreibeFolgenDateien(nachSchnitt, [], [{ plan: plan!, titel: sammel, releases: [stapel] }])
const ordner = join(wurzel, 'public/data/folgen')
const lies = (n: string) => JSON.parse(readFileSync(join(ordner, n), 'utf8'))
const index = lies('index.json') as number[]
console.log(JSON.stringify({ index, zaehlung: lies('zaehlung.json'), dateien: Object.fromEntries(index.map((id) => [id, lies(`${id}.json`)])) }))
