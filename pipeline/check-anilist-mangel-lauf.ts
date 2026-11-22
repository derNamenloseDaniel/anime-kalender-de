/**
 * Verdrahtung der AniList-Frische (Rang 7b): `pipeline/fetch.ts` läuft als echter Prozess gegen eine Wegwerf-Wurzel (`AK_ROOT`) mit Netz-Attrappe;
 * der Zwischenspeicher hat vier Einträge, die Attrappe zählt, welche MAL-Kennungen AniList wirklich gefragt werden. Kein Netz. Aufruf: `check:logic`.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const wurzel = mkdtempSync(join(tmpdir(), 'ak-anilist-mangel-'))
mkdirSync(join(wurzel, 'data', 'cache'), { recursive: true })
mkdirSync(join(wurzel, 'data', 'curated'), { recursive: true })
for (const y of ['kino-ankuendigungen.yaml', 'anisearch-ids-hand.yaml']) writeFileSync(join(wurzel, 'data', y), '[]') // der Lauf liest sie beim Auflösen der Handwege
writeFileSync(join(wurzel, 'data', 'curated', 'kulisse.yaml'), '- { slug: kulisse-a, anilistId: 900021 }\n- { slug: kulisse-b, anilistId: 900022 }\n- { slug: kulisse-c, anilistId: 900023 }\n')
const protokoll = join(wurzel, 'abgefragt.json')
const attrappe = join(wurzel, 'attrappe.mjs')
writeFileSync(attrappe, `
import { appendFileSync } from 'node:fs'
const antwort = (daten, status = 200) => new Response(JSON.stringify(daten), { status, headers: { 'content-type': 'application/json', 'x-ratelimit-remaining': '90' } })
globalThis.fetch = async (url, init = {}) => {
  const adresse = String(url)
  if (adresse.includes('MyDubList')) return antwort({ dubbed: [900011, 900012, 900013, 900014] })
  if (adresse.includes('graphql.anilist.co')) {
    const { variables } = JSON.parse(init.body)
    if (variables.id) {
      appendFileSync(${JSON.stringify(protokoll)}, JSON.stringify(['id', variables.id]) + '\\n')
      return antwort({ data: { Media: { id: variables.id, status: 'FINISHED', countryOfOrigin: 'JP', stats: { scoreDistribution: [] }, averageScore: 71, meanScore: 71, studios: { nodes: [{ name: 'Neu', isAnimationStudio: true }] }, title: {} } } })
    }
    appendFileSync(${JSON.stringify(protokoll)}, JSON.stringify(variables.ids ?? []) + '\\n')
    const media = (variables.ids ?? []).map((idMal) => ({ id: idMal + 1, idMal, status: 'FINISHED', countryOfOrigin: 'JP', stats: { scoreDistribution: [] }, averageScore: 71, meanScore: 71, studios: { nodes: [{ name: 'Neu', isAnimationStudio: true }] }, title: {} }))
    return antwort({ data: { Page: { media } } })
  }
  return antwort({}, 404)
}
`)

const ohneStudio = { nodes: [] }
const mitStudio = { nodes: [{ name: 'Alt', isAnimationStudio: true }] }
const eintrag = (idMal: number, studios: unknown, abgerufen: string) => ({ id: idMal + 1, idMal, status: 'FINISHED', countryOfOrigin: 'JP', stats: { scoreDistribution: [] }, averageScore: 60, meanScore: 60, studios, abgerufen })
writeFileSync(join(wurzel, 'data', 'cache', 'anilist-media.json'), JSON.stringify({
  900011: eintrag(900011, ohneStudio, '2026-01-01'), // veraltet, Mangel: wird gefragt
  900012: eintrag(900012, mitStudio, '2099-01-01'), // frisch, ohne Mangel: nicht
  900013: eintrag(900013, mitStudio, '2026-01-01'), // veraltet, ohne Mangel: nicht
  900014: eintrag(900014, ohneStudio, '2099-01-01'), // frisch, Mangel: heute schon gefragt, nicht
}))

const eintragId = (id: number, studios: unknown, abgerufen: string) => ({ ...eintrag(id - 1, studios, abgerufen), id, idMal: undefined })
writeFileSync(join(wurzel, 'data', 'cache', 'anilist-by-id.json'), JSON.stringify({
  900021: eintragId(900021, ohneStudio, '2026-01-01'), // veraltet, Mangel: wird gefragt
  900022: eintragId(900022, mitStudio, '2026-01-01'), // veraltet, ohne Mangel: nicht
  900023: eintragId(900023, ohneStudio, '2099-01-01'), // frisch, Mangel: nicht
}))

const lauf = spawnSync(process.execPath, ['--import', 'tsx', '--import', pathToFileURL(attrappe).href, 'pipeline/fetch.ts'], {
  env: { ...process.env, AK_ROOT: wurzel }, encoding: 'utf8', timeout: 100_000, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
})
let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}
pruefe('Lauf endet mit Exit 0', lauf.status === 0, { status: lauf.status, stderr: (lauf.stderr ?? '').slice(-600), stdout: (lauf.stdout ?? '').slice(-600) })
const zeilen = (existsSync(protokoll) ? readFileSync(protokoll, 'utf8') : '').trim().split('\n').filter(Boolean).map((z) => JSON.parse(z) as unknown[])
const gefragt = zeilen.filter((z) => z[0] !== 'id').flat()
const gefragtNachId = zeilen.filter((z) => z[0] === 'id').map((z) => z[1])
pruefe('MAL-Weg: AniList wird nur nach dem veralteten Eintrag mit Mangel gefragt', JSON.stringify(gefragt) === JSON.stringify([900011]), gefragt)
pruefe('Kennungs-Weg: nur der veraltete Eintrag mit Mangel wird einzeln gefragt', JSON.stringify(gefragtNachId) === JSON.stringify([900021]), gefragtNachId)
const danach = JSON.parse(readFileSync(join(wurzel, 'data', 'cache', 'anilist-media.json'), 'utf8')) as Record<string, { studios: { nodes: unknown[] }; abgerufen: string }>
pruefe('der neu geholte Eintrag trägt das Studio von AniList und einen neuen Stempel', danach[900011]?.studios.nodes.length === 1 && (danach[900011]?.abgerufen ?? '') > '2026-11-01', danach[900011])
pruefe('die übrigen Einträge bleiben unverändert', danach[900014]?.studios.nodes.length === 0 && danach[900013]?.abgerufen === '2026-01-01', [danach[900013], danach[900014]])
process.exit(verletzt ? 1 : 0)
