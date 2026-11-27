/**
 * Prozess-Test zur Verdrahtung von `jahrFremd` in `fetch-justwatch-audio.ts` (`sucheOderNachfrage`, `verbucheFehlschlag`): Das Skript läuft als eigener
 * Prozess auf einer Kulisse im Temp-Ordner (`AK_ROOT`, feste Uhr, `fetch` als Attrappe). Die Attrappe liefert für jede Suche JustWatch-Seiten von 2017 zu den
 * TMDB-Kennungen 5, 6 und 7 (Anlass: Yotsuba Succession Arc, 2026, bekam die Seite des Films von 2017).
 * 900010 (Film 2026, TMDB 5) hatte einen guten Befund und wird `ohneTreffer`; 900011 (Film 2026, TMDB 6) bleibt `ohneTreffer`;
 * 900012 (Serie 2026, TMDB 7) wird angenommen, Serien sind ausgenommen; 900013 (Film 2017, TMDB 8) und 900014 (Film 2018, TMDB 9, Abstand 1) werden angenommen (Gegenproben);
 * 900015 (Film 2026, TMDB 10) hatte einen guten Befund mit Pfad, die Suche findet ihn nicht, die Nachfrage über den Pfad (`urlV2`) liefert die Seite von 2017 und wird abgewiesen.
 * Jede Abweisung steht mit Namen und JustWatch-Jahr im Lauf-Log, das Jahr im Befund (`jahr`). Läuft in `check:logic`.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const REPO = join(import.meta.dirname, '..')
const UHR_ISO = '2026-11-23T12:00:00Z'

let fehler = 0
function pruefe(name: string, ok: boolean, info: unknown = ''): void {
  if (ok) return
  fehler++
  console.error(`FEHLER: ${name} ${JSON.stringify(info)}`)
}

const titel = (id: number, tmdbId: number, format: string, jpYear: number) => ({
  id,
  tmdbId,
  titleEn: `Werk ${tmdbId} Nr ${id}`,
  format,
  jpYear,
  episodes: format === 'MOVIE' ? 1 : 12,
  streams: [{ platform: 'netflix', url: `https://www.netflix.com/title/${id}`, dub: true }],
  watchLinks: [],
})

/** Attrappe: jede Suche findet die Seiten zu TMDB 5, 6, 7 (2017) und 8 (2017); die Namen sind absichtlich fremd, bestätigt wird nur die Kennung. */
const ATTRAPPE = `
const knoten = (tmdb) => ({ id: 'JW' + tmdb, objectType: 'MOVIE', content: { title: 'Seite ' + tmdb, originalReleaseYear: 2017, fullPath: '/de/film/s' + tmdb, ageCertification: '6', externalIds: { tmdbId: String(tmdb) } }, offers: [], seasons: [] })
globalThis.fetch = async (_url, init) => {
  const q = JSON.parse(String(init.body))
  if (String(q.query).includes('urlV2')) return new Response(JSON.stringify({ data: { urlV2: { node: knoten(Number(q.variables.p.replace('/de/film/s', ''))) } } }), { status: 200 })
  return new Response(JSON.stringify({ data: { popularTitles: { edges: [5, 6, 7, 8, 9].map((t) => ({ node: knoten(t) })) } } }), { status: 200 })
}
`

type Befund = { jwId?: string; ohneTreffer?: boolean; tmdbId?: number; jahr?: number | null }

function lauf(): { text: string; status: number | null; bestand: Record<string, Befund> } {
  const wurzel = mkdtempSync(join(tmpdir(), 'jw-jahr-'))
  try {
    mkdirSync(join(wurzel, 'public', 'data'), { recursive: true })
    mkdirSync(join(wurzel, 'data'), { recursive: true })
    const titles = [titel(900010, 5, 'MOVIE', 2026), titel(900011, 6, 'MOVIE', 2026), titel(900012, 7, 'TV', 2026), titel(900013, 8, 'MOVIE', 2017), titel(900014, 9, 'MOVIE', 2018), titel(900015, 10, 'MOVIE', 2026)]
    writeFileSync(join(wurzel, 'public', 'data', 'titles.json'), JSON.stringify(titles))
    writeFileSync(join(wurzel, 'public', 'data', 'releases.json'), '[]')
    const gut = { geprueftAm: '2026-11-01', jwId: 'JW5', tmdbId: 5, jwPfad: '/de/film/s5', altersangabe: '6', angebote: [] }
    writeFileSync(join(wurzel, 'data', 'justwatch-audio.json'), JSON.stringify({ '900010': gut, '900015': { ...gut, jwId: 'JW10', tmdbId: 10, jwPfad: '/de/film/s10' } }))
    writeFileSync(join(wurzel, 'data', 'tmdb-von-hand.yaml'), '[]\n')
    const ziel = pathToFileURL(join(REPO, 'pipeline', 'fetch-justwatch-audio.ts')).href
    const uhr = pathToFileURL(join(REPO, 'tools', 'feste-uhr.ts')).href
    const tsx = join(REPO, 'node_modules', 'tsx', 'dist', 'cli.mjs')
    const huelle = join(wurzel, 'huelle.mts')
    writeFileSync(huelle, `import { festeUhr } from '${uhr}'\nfesteUhr('${UHR_ISO}')\n${ATTRAPPE}\nawait import('${ziel}')\n`)
    const r = spawnSync(process.execPath, [tsx, huelle, '--limit', '10', '--alter', '0'], {
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

const l = lauf()
pruefe('Lauf endet mit Exit 0', l.status === 0, l.text.slice(-500))
pruefe('Film 2026 mit gutem Befund: Seite von 2017 abgewiesen, Befund wird ohneTreffer (nicht „verfehlt, alte Antwort behalten“)', l.bestand['900010']?.ohneTreffer === true && !l.bestand['900010']?.jwId, l.bestand['900010'])
pruefe('Film 2026 ohne Befund: ohneTreffer, Kennung am Befund', l.bestand['900011']?.ohneTreffer === true && l.bestand['900011']?.tmdbId === 6, l.bestand['900011'])
pruefe('Serie 2026 gegen Seite von 2017: angenommen (Serien ausgenommen)', l.bestand['900012']?.jwId === 'JW7' && !l.bestand['900012']?.ohneTreffer, l.bestand['900012'])
pruefe('Film 2017 gegen Seite von 2017: angenommen (Gegenprobe)', l.bestand['900013']?.jwId === 'JW8' && !l.bestand['900013']?.ohneTreffer, l.bestand['900013'])

pruefe('Film 2018 gegen Seite von 2017 (Abstand 1): angenommen, Jahr im Befund', l.bestand['900014']?.jwId === 'JW9' && !l.bestand['900014']?.ohneTreffer && l.bestand['900014']?.jahr === 2017, l.bestand['900014'])
pruefe('Film 2026 mit gutem Befund, Suche findet ihn nicht: die Nachfrage über den Pfad bringt die Seite von 2017, abgewiesen, Befund wird ohneTreffer', l.bestand['900015']?.ohneTreffer === true && !l.bestand['900015']?.jwId, l.bestand['900015'])
pruefe('Abgewiesene Filme tragen das JustWatch-Jahr im Befund', l.bestand['900010']?.jahr === 2017 && l.bestand['900011']?.jahr === 2017 && l.bestand['900015']?.jahr === 2017, [l.bestand['900010'], l.bestand['900011'], l.bestand['900015']])
pruefe('Angenommene Treffer speichern das JustWatch-Jahr', l.bestand['900013']?.jahr === 2017, l.bestand['900013'])
pruefe('Lauf-Log: Zähler und Namen der drei per Jahr abgewiesenen Filme', l.text.includes('3 per Jahr abgewiesen') && l.text.includes('3 Filme per Jahr abgewiesen') && ['Nr 900010', 'Nr 900011', 'Nr 900015'].every((n) => l.text.includes(n)) && l.text.includes('JW-Jahr 2017'), l.text.slice(-900))

if (fehler) {
  console.error(`${fehler} Fehler`)
  process.exit(1)
}
console.log('check-jw-jahr-fremd-lauf: ok (9 Prüfungen, Prozess auf Kulisse mit Fetch-Attrappe)')
