/**
 * Namenstreffer bei „ohne Treffer“ (06.11.2026, `lib/jw-namenstreffer.ts`): Der Sammler `fetch-justwatch-audio.ts` läuft als Prozess auf einer
 * Kulisse im Temp-Ordner (`AK_ROOT`, feste Uhr, `fetch` als Attrappe). Titel 900002 (TMDB 5) findet JustWatch nur unter der Kennung 99: bleibt `ohneTreffer`,
 * der Befund trägt `namenTreffer` (nur gespeichert, nie zugeordnet). Titel 900003 (TMDB 6) hat einen Kennungstreffer: wird zugeordnet, ohne `namenTreffer`.
 * Dazu die reine Auswahl `besterNamensTreffer` mit drei Kandidaten, der richtige in der Mitte.
 * Aufruf: `npx tsx pipeline/check-jw-namenstreffer-lauf.ts`
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { besterNamensTreffer } from './lib/jw-namenstreffer.ts'

const REPO = join(import.meta.dirname, '..')

let fehler = 0
function pruefe(name: string, ok: boolean, info: unknown = ''): void {
  if (ok) return
  fehler++
  console.error(`FEHLER: ${name} ${JSON.stringify(info)}`)
}

const k = (id: string, titel: string, tmdbId: number | string | null, jahr?: number, typ?: string) => ({ id, objectType: typ, content: { title: titel, originalReleaseYear: jahr, fullPath: `/de/serie/${id}`, externalIds: { tmdbId } } })

/* Auswahl: erwartet 5; Kandidaten: erster Treffer anderer Name, Mitte gleicher Name (tmdb 99), letzter gleicher Name mit erwarteter Kennung (kein Kandidat). */
const liste = [k('A', 'Etwas ganz anderes', 11), k('B', 'Clear Card!', 99), k('C', 'Clear Card', 5)]
const gewaehlt = besterNamensTreffer(['Clear Card'], liste, 5)
pruefe('Auswahl: gleicher Name vor erstem Treffer, Kennung 99', gewaehlt?.jwId === 'B' && gewaehlt.tmdbId === 99 && gewaehlt.gleicherName === true, gewaehlt)
const ersterBester = besterNamensTreffer(['Clear Card'], [k('A', 'Etwas ganz anderes', 11), k('X', 'Noch was', 12)], 5)
pruefe('Auswahl: ohne gleichen Namen der erste fremde, gleicherName false', ersterBester?.jwId === 'A' && ersterBester.gleicherName === false, ersterBester)
pruefe('Auswahl: nur Kennungstreffer oder leer → nichts', besterNamensTreffer(['Clear Card'], [k('C', 'Clear Card', '5')], 5) === undefined && besterNamensTreffer(['x'], [], 5) === undefined)
pruefe('Auswahl: JustWatch ohne Kennung → tmdbId null', besterNamensTreffer(['Clear Card'], [k('N', 'Clear Card', null)], 5)?.tmdbId === null)

/* Zwei gleichnamige Kandidaten (wie Astro Boy 1963 gegen 1980): der erste gewinnt in der Suchreihenfolge, Jahr und Typ des Gewählten stehen im Befund. */
const zwei = besterNamensTreffer(['Juliet'], [k('S', 'Juliet', 7, 2024, 'SHOW'), k('F', 'Juliet', 8, 1999, 'MOVIE')], 5)
pruefe('Auswahl: zwei gleichnamige — Jahr und Typ des gewählten Kandidaten', zwei?.jwId === 'S' && zwei.jahr === 2024 && zwei.typ === 'SHOW', zwei)
const zweiter = besterNamensTreffer(['Juliet'], [k('S', 'Juliet', 5, 2024, 'SHOW'), k('F', 'Juliet', 8, 1999, 'MOVIE')], 5)
pruefe('Auswahl: der Kandidat mit erwarteter Kennung fällt weg, der zweite trägt seine eigenen Jahr und Typ', zweiter?.jwId === 'F' && zweiter.jahr === 1999 && zweiter.typ === 'MOVIE', zweiter)
const ohneAngabe = besterNamensTreffer(['Juliet'], [k('N', 'Juliet', 9)], 5)
pruefe('Auswahl: ohne Jahr und Typ → null', ohneAngabe?.jahr === null && ohneAngabe.typ === null, ohneAngabe)

const film = (id: number, tmdbId: number) => ({
  id,
  tmdbId,
  titleEn: id === 900002 ? 'Clear Card' : 'Anderer Titel',
  format: 'MOVIE',
  streams: [{ platform: 'netflix', url: `https://www.netflix.com/title/${id}`, dub: true }],
  watchLinks: [],
})

/** Attrappe: „Clear Card“ liefert fremde Kennungen (11, 99), „Anderer Titel“ die erwartete 6. */
const ATTRAPPE = `
const knoten = (id, titel, tmdb) => ({ id, objectType: 'SHOW', content: { title: titel, originalReleaseYear: 2018, fullPath: '/de/serie/' + id, ageCertification: '6', externalIds: { tmdbId: tmdb } }, offers: [], seasons: [] })
globalThis.fetch = async (_u, opt) => {
  const q = JSON.parse(opt.body).variables.q
  const edges = q === 'Clear Card'
    ? [knoten('A', 'Etwas ganz anderes', '11'), knoten('B', 'Clear Card', '99')]
    : [knoten('D', 'Anderer Titel', '6')]
  return new Response(JSON.stringify({ data: { popularTitles: { edges: edges.map((node) => ({ node })) } } }), { status: 200 })
}
`

type B = { jwId?: string; ohneTreffer?: boolean; namenTreffer?: { jwId: string; tmdbId: number | null; gleicherName: boolean; jahr: number | null; typ: string | null } }
function lauf(): { text: string; status: number | null; bestand: Record<string, B> } {
  const wurzel = mkdtempSync(join(tmpdir(), 'jw-namen-'))
  try {
    mkdirSync(join(wurzel, 'public', 'data'), { recursive: true })
    mkdirSync(join(wurzel, 'data'), { recursive: true })
    writeFileSync(join(wurzel, 'public', 'data', 'titles.json'), JSON.stringify([film(900002, 5), film(900003, 6)]))
    writeFileSync(join(wurzel, 'public', 'data', 'releases.json'), '[]')
    writeFileSync(join(wurzel, 'data', 'justwatch-audio.json'), '{}')
    writeFileSync(join(wurzel, 'data', 'tmdb-von-hand.yaml'), '[]\n')
    const ziel = pathToFileURL(join(REPO, 'pipeline', 'fetch-justwatch-audio.ts')).href
    const uhr = pathToFileURL(join(REPO, 'tools', 'feste-uhr.ts')).href
    const huelle = join(wurzel, 'huelle.mts')
    writeFileSync(huelle, `import { festeUhr } from '${uhr}'\nfesteUhr('2026-11-06T12:00:00Z')\n${ATTRAPPE}\nawait import('${ziel}')\n`)
    const r = spawnSync(process.execPath, [join(REPO, 'node_modules', 'tsx', 'dist', 'cli.mjs'), huelle, '--limit', '5', '--alter', '0'], {
      cwd: wurzel,
      env: { ...process.env, AK_ROOT: wurzel },
      encoding: 'utf8',
      windowsHide: true,
      timeout: 120_000,
    })
    return { text: `${r.stdout}${r.stderr}`, status: r.status, bestand: JSON.parse(readFileSync(join(wurzel, 'data', 'justwatch-audio.json'), 'utf8')) }
  } finally {
    rmSync(wurzel, { recursive: true, force: true, maxRetries: 3 })
  }
}

const r = lauf()
pruefe('Lauf endet mit Exit 0', r.status === 0, r.text.slice(-500))
const a = r.bestand['900002']
pruefe('900002: bleibt ohneTreffer, ohne jwId (nicht zugeordnet)', a?.ohneTreffer === true && !a.jwId, a)
pruefe('900002: namenTreffer trägt JustWatch-Kennung B und TMDB 99 mit gleichem Namen', a?.namenTreffer?.jwId === 'B' && a.namenTreffer.tmdbId === 99 && a.namenTreffer.gleicherName === true && a.namenTreffer.jahr === 2018 && a.namenTreffer.typ === 'SHOW', a)
const b = r.bestand['900003']
pruefe('900003: Kennungstreffer wird zugeordnet, ohne namenTreffer', b?.jwId === 'D' && !b.ohneTreffer && !b.namenTreffer, b)

if (fehler) {
  console.error(`${fehler} Fehler`)
  process.exit(1)
}
console.log('check-jw-namenstreffer-lauf: ok (11 Prüfungen, Prozess auf Kulisse mit Fetch-Attrappe)')
