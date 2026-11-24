/**
 * Zusicherung (F157, 24.11.2026): **Die Bauschleife schreibt `staffelFolge` an Horizonte-Fernsehtermine** — `rolleTermineAus`
 * (`pipeline/bau/10-termine.ts`) ruft `schreibeTvStaffelFolgen` wirklich auf. Ein Termin am Sendeplatz einer echten Sendung aus
 * `data/tv-programm.json`, deren Folgentitel die Wikipedia-Liste eindeutig zuordnet, läuft durch die ganze Schleife und muss mit
 * Staffel und Folge herauskommen. Läuft in `check:bestand` (liest den gebauten Titel aus `public/data/titles.json`).
 */
import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Release, Title } from '../shared/types.ts'

/* Die Schleife schreibt nach `data/` (Sprecher-Zählung): Sie läuft gegen eine Kulisse (`AK_ROOT`) mit nur den gelesenen Eingaben. */
if (!process.env.AK_ROOT) {
  const repo = join(dirname(fileURLToPath(import.meta.url)), '..')
  const wo = mkdtempSync(join(tmpdir(), 'staffel-folge-tv-schleife-'))
  let status = 1
  try {
    for (const d of ['data/tv-programm.json', 'data/wikipedia-folgen.json', 'data/curated/horizonte-staffeln.yaml', 'data/curated/pokemon-staffeln.yaml', 'data/kino-ankuendigungen.yaml', 'data/ankuendigungen.yaml', 'data/ohne-synchro-von-hand.yaml']) {
      mkdirSync(dirname(join(wo, d)), { recursive: true })
      cpSync(join(repo, d), join(wo, d))
    }
    const r = spawnSync(process.execPath, [...process.execArgv, fileURLToPath(import.meta.url)], { env: { ...process.env, AK_ROOT: wo }, stdio: 'inherit', timeout: 120_000 })
    status = r.status ?? 1
  } finally {
    rmSync(wo, { recursive: true, force: true })
  }
  if (status !== 0) console.error(`✖ check-staffel-folge-tv-schleife: Lauf in der Kulisse endete mit ${status}`)
  process.exit(status)
}
const { rolleTermineAus } = await import('./bau/10-termine.ts')
const { ladeTvStaffelEingaben, schreibeTvStaffelFolgen } = await import('./bau/staffel-folge-tv.ts')

const ID = 158871
const lies = <T>(datei: string): T => JSON.parse(readFileSync(new URL(`../${datei}`, import.meta.url), 'utf8')) as T
const titelRoh = lies<Title[] | { titles: Title[] }>('public/data/titles.json')
const titel = (Array.isArray(titelRoh) ? titelRoh : titelRoh.titles).find((t) => t.id === ID)

/** Die erste Sendung der Serie, deren Folgentitel eindeutig ist: Sender, Tag, Uhrzeit und die Staffel/Folge, die die Regel ihr gibt. */
function ersteZuordenbare(): { sender: string; date: string; time: string; staffelFolge: [number, number]; episode: number } | undefined {
  const eingaben = ladeTvStaffelEingaben()
  const g = eingaben.grenzen.find((x) => x.anilistId === ID)!
  for (const s of eingaben.sendungen.filter((x) => x.titleId === ID)) {
    const probe = { id: 'p', releaseSlug: 'p', titleId: ID, platform: 'tv', sender: s.sender, date: s.start.slice(0, 10), time: s.start.slice(11, 16) } as never
    schreibeTvStaffelFolgen([probe], eingaben)
    const sf = (probe as { staffelFolge?: [number, number] }).staffelFolge
    if (sf) return { sender: s.sender, date: s.start.slice(0, 10), time: s.start.slice(11, 16), staffelFolge: sf, episode: g.staffeln.find((x) => x.nr === sf[0])!.von - 1 + sf[1] }
  }
  return undefined
}

const fall = ersteZuordenbare()
if (!titel || !fall) {
  console.error(`✖ check-staffel-folge-tv-schleife: ${titel ? 'keine zuordenbare Horizonte-Sendung in data/tv-programm.json' : `Titel ${ID} fehlt in public/data/titles.json`}`)
  process.exit(1)
}
const release = {
  slug: 'probe-horizonte-tv',
  titleId: ID,
  name: 'Pokémon Horizonte',
  platform: 'tv',
  sender: fall.sender,
  releaseType: 'weekly',
  sources: ['https://www.tv.de/'],
  schedule: { firstEpisodeDate: fall.date, time: fall.time, episodeCount: 1, firstEpisodeNumber: fall.episode },
} as unknown as Release
const { events } = rolleTermineAus({ releases: [release], titles: new Map([[ID, titel]]), jpStart: new Map() })
const ev = events.find((e) => e.releaseSlug === 'probe-horizonte-tv' && e.platform === 'tv')
const ok = JSON.stringify(ev?.staffelFolge) === JSON.stringify(fall.staffelFolge)
if (!ok) {
  console.error(`✖ check-staffel-folge-tv-schleife: Termin ${fall.date} ${fall.time} ${fall.sender} kam ohne staffelFolge ${JSON.stringify(fall.staffelFolge)} aus rolleTermineAus (${JSON.stringify(ev)})`)
  process.exit(1)
}
console.log(`check-staffel-folge-tv-schleife: ok (Folge ${fall.episode} am ${fall.date} → Staffel ${fall.staffelFolge.join(' Folge ')})`)
