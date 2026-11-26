/**
 * Bestandsteil von `check-reihen-reiter.ts` (Daniel 25.11.2026): Keine Reiterliste im ausgelieferten Bestand trägt dieselbe Beschriftung
 * für zwei Titel; Pokémon „16“/„25“ und Ookami to Koushinryou „1“/„2“ standen doppelt. Liest `public/data` und gehört deshalb in
 * `check:bestand`, nicht in `check:logic`. Aufruf: npx tsx pipeline/check-reihen-reiter-bestand.ts
 */
import { readFileSync } from 'node:fs'
import type { FranchiseMember, Title } from '../shared/types.ts'
import type { Dataset } from '../web/src/lib/data.ts'
import { reihenTeileVon } from '../web/src/components/detail/reihen-daten.ts'
import { reihenNameVon } from '../web/src/components/detail/reihen-namen.ts'
import { reihenReiterVon } from '../web/src/components/detail/reihen-reiter-liste.ts'
import { reihenOrdnung } from '../web/src/components/detail/reihen-inhalt.tsx'
import { todayIso } from '../shared/time.ts'
import { melde } from './lib/quarantaene.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

/** Die Gruppen der Reihenliste, wie das Panel sie den Reitern gibt (Überschriften als Schlüssel). */
const gruppenVon = (teile: FranchiseMember[], name: string) => reihenOrdnung(teile, name, ((k: string) => k) as never).gruppen

const echt = (datei: string) => JSON.parse(readFileSync(`public/data/${datei}`, 'utf8'))
const titel = echt('titles.json') as Title[]
const reihen = echt('franchises.json') as Record<string, FranchiseMember[]>
const daten = { titles: titel, titleById: new Map(titel.map((t) => [t.id, t])), releasesByTitle: new Map() } as unknown as Dataset
/* Bestand: der echte Tag, wie das Panel ihn nimmt. */
const heute = todayIso()
const doppelte: string[] = []
let listen = 0
for (const t of titel) {
  const reihe = reihen[t.franchiseId ?? t.id] ?? []
  const [teile, name] = [reihenTeileVon(t, reihe, daten), reihenNameVon(t, reihe, daten)]
  const marken = reihenReiterVon(t, teile, name, titel, gruppenVon(teile, name), heute).map((r) => r.label)
  if (marken.length) listen++
  if (new Set(marken).size === marken.length) continue
  doppelte.push(`${t.id}: ${marken.join()}`)
  melde(t.id, 'reihen-reiter-bestand', 'Reiterliste trägt dieselbe Beschriftung zweimal')
}
pruefe(`Bestand (${listen} Reiterlisten): keine doppelte Beschriftung`, listen > 100 && doppelte.length === 0, doppelte.slice(0, 3))

console.log(verletzt ? `\n${verletzt} Zusicherung(en) verletzt.` : '\nAlle Zusicherungen halten.')
console.log(`VERSTÖSSE: ${verletzt}`)
process.exit(verletzt ? 1 : 0)
