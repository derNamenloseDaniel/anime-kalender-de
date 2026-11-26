/**
 * Zusicherungen zu `urteilSchliesstLuecken` (frühe Urteilsschleife, `bau/urteil-schliesst-luecken.ts`, 24.11.2026): Trägt jeder Termin eines
 * Anbieters eine Sprachkennzeichnung (`offen`/`omu`), setzt das Urteil dort kein Deutsch, sonst bricht `deutschNurAusSpracheTermin` den Bau
 * (Anime 129874, Prime). Kulisse (`AK_ROOT`), erfundene Titel, kein Netz; dazu die Verdrahtung in `10-termine.ts` per Syntaxbaum.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Release, StreamLink, Title } from '../shared/types.ts'
import { unbedingteAufrufe } from './lib/unbedingte-aufrufe.ts'

const wurzel = mkdtempSync(join(tmpdir(), 'urteil-frueh-'))
process.env.AK_ROOT = wurzel
mkdirSync(join(wurzel, 'data', 'curated'), { recursive: true })

let fehler = 0
function pruefe(name: string, ok: boolean, ist?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  fehler++
  console.error(`  ✖ ${name}`, ist === undefined ? '' : JSON.stringify(ist))
}

try {
  const { urteilSchliesstLuecken } = await import('./bau/urteil-schliesst-luecken.ts')
  const { deutschNurAusSpracheTermin } = await import('./lib/pruefung.ts')

  const urteile = Object.fromEntries(
    [1, 2, 3, 4].flatMap((id) => [`${id}|primevideo|1`, `${id}|netflix|1`].map((k) => [k, { urteil: 'deutsch' }])),
  )
  writeFileSync(join(wurzel, 'data', 'urteile.json'), JSON.stringify(urteile))

  const weg = (platform: string, extra: Partial<StreamLink> = {}) => ({ platform, url: `https://${platform}.example/x`, ...extra }) as StreamLink
  const titel = (id: number, streams: StreamLink[]) => ({ id, streams }) as unknown as Title
  const termin = (titleId: number, platform: string, sprache?: string) => ({ titleId, platform, slug: `r${titleId}`, sprache }) as unknown as Release

  /* 1: Muster 129874 — Prime-Termine alle „offen“/„omu“. 2: Termin ohne Kennzeichnung. 3: Handbeleg deutsch. 4: Kennzeichnung nur auf Netflix. */
  const titles = [
    titel(1, [weg('primevideo')]),
    titel(2, [weg('primevideo')]),
    titel(3, [weg('primevideo', { dub: true })]),
    titel(4, [weg('primevideo'), weg('netflix')]),
  ]
  const releases = [
    termin(1, 'primevideo', 'offen'),
    termin(1, 'primevideo', 'omu'),
    termin(2, 'primevideo'),
    termin(3, 'primevideo', 'offen'),
    termin(4, 'netflix', 'omu'),
    termin(4, 'primevideo'),
  ]
  urteilSchliesstLuecken(new Map(titles.map((t) => [t.id, t])), releases)
  const dub = (id: number, i = 0) => titles.find((t) => t.id === id)!.streams![i]!
  pruefe('Alle Prime-Termine gekennzeichnet (offen, omu): kein Urteil-Deutsch (129874)', dub(1).dub !== true, dub(1))
  pruefe('Gegenprobe: Termin ohne Kennzeichnung, Urteil setzt Deutsch', dub(2).dub === true, dub(2))
  pruefe('Gegenprobe: Handbeleg deutsch bleibt true', dub(3).dub === true, dub(3))
  pruefe('Kennzeichnung auf anderer Plattform blockiert Prime nicht', dub(4, 0).dub === true, dub(4, 0))
  pruefe('… und blockiert Netflix selbst (alle Termine gekennzeichnet)', dub(4, 1).dub !== true, dub(4, 1))
  const widerspruch = deutschNurAusSpracheTermin(releases, new Map(titles.map((t) => [t.id, t])), new Set(['3|primevideo']))
  pruefe('Kein Widerspruch zur Prüfung deutschNurAusSpracheTermin', widerspruch.length === 0, widerspruch)

  /* Verdrahtung: ohne die Termine sieht das Urteil keine Kennzeichnung (Mutant `[]`, 24.11.2026). */
  const quelle = readFileSync(new URL('./bau/10-termine.ts', import.meta.url), 'utf8')
  const aufruf = unbedingteAufrufe(quelle, 'rolleTermineAus').find((x) => x.name === 'urteilSchliesstLuecken')
  pruefe('10-termine ruft urteilSchliesstLuecken(titles, releases) unbedingt auf', aufruf?.args.join('|') === 'titles|releases', aufruf)
} finally {
  rmSync(wurzel, { recursive: true, force: true })
}

if (fehler) {
  console.error(`${fehler} Prüfung(en) fehlgeschlagen`)
  process.exit(1)
}
console.log('check-urteil-frueh: ok')
