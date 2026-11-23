/**
 * Rückrechnung der Chip-Zahlen am Bestand (`public/data`, Filterkonzept S5, 23.11.2026): Jede Zahl des Filterfensters muss der Trefferzahl entsprechen,
 * die `filterTitles` mit genau diesem einen Filter liefert (ungruppiert: Titel, gruppiert: Karten wie `groupByFranchise`). Pflichtfall: `auto-544-disc` hat
 * Plattform disc und Art movie — die Art-Zahl „Disc" zählt ihn mit, wie der Filter (`istDiscWeg`). Liest `public/data`, daher `check:bestand`.
 * Mutationsprobe: Status-Chips, „kostenlos" oder `istDiscWeg` aus der Zählung nehmen macht die Zeilen rot.
 */
import { readFileSync } from 'node:fs'
import { PLATFORMS, RELEASE_TYPES, type PlatformId, type Release, type ReleaseType, type Title } from '../shared/types.ts'
import { todayIso } from '../shared/time.ts'
import { EMPTY_FILTERS, filterTitles, type FilterState } from '../web/src/lib/filters.ts'
import { groupByFranchise } from '../web/src/lib/db-gruppen.ts'
import { zaehleFilterGen, type FilterZaehlung } from '../web/src/lib/filter-zaehlung.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const lies = <T>(datei: string) => JSON.parse(readFileSync(new URL(`../public/data/${datei}`, import.meta.url), 'utf8')) as T
const titel = lies<Title[]>('titles.json')
const releasesByTitle = new Map<number, Release[]>()
for (const r of lies<Release[]>('releases.json')) releasesByTitle.set(r.titleId, [...(releasesByTitle.get(r.titleId) ?? []), r])
const data = { releasesByTitle } as never
const heute = todayIso()

function zaehle(gruppiert: boolean): FilterZaehlung {
  const gen = zaehleFilterGen(titel, releasesByTitle, heute, gruppiert)
  for (;;) {
    const r = gen.next()
    if (r.done) return r.value
  }
}

/** Die Trefferzahl nach dem Antippen: derselbe Filter wie der Chip, durch `filterTitles`. */
const treffer = (f: Partial<FilterState>, gruppiert: boolean) => {
  const liste = filterTitles(titel, data, { ...EMPTY_FILTERS, ...f }, heute, new Set())
  return gruppiert ? groupByFranchise(liste).length : liste.length
}

const CHIPS: { name: string; filter: Partial<FilterState>; zahl: (z: FilterZaehlung) => number | undefined }[] = [
  ...(Object.keys(PLATFORMS) as PlatformId[]).map((p) => ({ name: `Plattform ${p}`, filter: { platforms: [p] }, zahl: (z: FilterZaehlung) => z.platforms.get(p) })),
  ...(Object.keys(RELEASE_TYPES) as ReleaseType[]).map((a) => ({ name: `Art ${a}`, filter: { releaseTypes: [a] }, zahl: (z: FilterZaehlung) => z.releaseTypes.get(a) })),
  ...(['airing', 'tba', 'abgeschlossen', 'erschienen', 'unbekannt'] as const).map((s) => ({ name: `Status ${s}`, filter: { statuses: [s] }, zahl: (z: FilterZaehlung) => z.statuses.get(s) })),
  { name: 'Schnell kostenlos', filter: { kostenlosOnly: true }, zahl: (z) => z.schnell.kostenlos },
  { name: 'Schnell Cartoon', filter: { keywords: ['Cartoon'] }, zahl: (z) => z.schnell.cartoon },
  { name: 'Schnell Disc', filter: { releaseTypes: ['disc'] }, zahl: (z) => z.schnell.disc },
  { name: 'Schnell TV', filter: { platforms: ['tv'] }, zahl: (z) => z.schnell.tv },
]

for (const gruppiert of [false, true]) {
  console.log(`\nChip-Zahl = Treffer des einen Filters (${gruppiert ? 'Karten, Staffeln zusammengefasst' : 'Titel'}), ${titel.length} Titel:`)
  const z = zaehle(gruppiert)
  for (const c of CHIPS) {
    const soll = treffer(c.filter, gruppiert)
    const ist = c.zahl(z)
    pruefe(`${c.name}: ${soll}`, ist === soll, { gezaehlt: ist, filter: soll })
  }
}

console.log('\nDisc-Zahl unabhängig von der Weg-Logik, direkt aus den Releases (Plattform disc ODER Art disc):')
{
  const direkt = new Set<number>()
  for (const [id, rs] of releasesByTitle) if (rs.some((r) => r.platform === 'disc' || r.releaseType === 'disc')) direkt.add(id)
  const z = zaehle(false)
  pruefe(`Art Disc zählt ${direkt.size} Titel`, z.releaseTypes.get('disc') === direkt.size, z.releaseTypes.get('disc'))
  pruefe('Plattform Disc und Schnell-Chip Disc zählen dasselbe', z.platforms.get('disc') === direkt.size && z.schnell.disc === direkt.size, [z.platforms.get('disc'), z.schnell.disc])
}

console.log('\nPflichtfall: Disc-Plattform mit Art movie')
/* Nur Beleg: Verschwindet der Titel aus dem Bestand, fällt der Fall weg, der Lauf bleibt grün (kein Titelurteil, steht in `bestand-ohne-marke.json`). */
if (titel.some((t) => t.id === 544)) {
  pruefe('Titel 544 (auto-544-disc): der Filter „Art Disc" lässt ihn durch', filterTitles(titel, data, { ...EMPTY_FILTERS, releaseTypes: ['disc'] }, heute, new Set()).some((t) => t.id === 544))
} else console.log('  Titel 544 nicht mehr im Bestand, Pflichtfall entfällt')

if (verletzt) {
  console.error(`\n${verletzt} Zusicherung(en) verletzt.`)
  console.log(`VERSTÖSSE: ${verletzt}`)
  process.exit(1)
}
console.log('\nAlle Zusicherungen halten.')
console.log('VERSTÖSSE: 0')
