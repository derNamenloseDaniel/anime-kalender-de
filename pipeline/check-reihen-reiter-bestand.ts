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
import { hauptstaffeln, staffelStaende } from '../shared/titles.ts'
import { todayIso } from '../shared/time.ts'
import { melde } from './lib/quarantaene.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const echt = (datei: string) => JSON.parse(readFileSync(`public/data/${datei}`, 'utf8'))
const titel = echt('titles.json') as Title[]
const reihen = echt('franchises.json') as Record<string, FranchiseMember[]>
const daten = { titles: titel, titleById: new Map(titel.map((t) => [t.id, t])), releasesByTitle: new Map() } as unknown as Dataset
/* Bestand: der echte Tag, wie das Panel ihn nimmt. */
const heute = todayIso()
const doppelte: string[] = []
/* Klasse zu Daniels Meldung 27.11.2026: Reiter nur bei der Hauptserie (Kishibe Rohan, OVA, hatte sechs), und jede nummerierte Hauptstaffel
   hat welche (Tokyo Revengers: Staffeln mit eigenem Namen hatten keine). */
const ohneHaupt: string[] = []
const hauptOhne: string[] = []
let listen = 0
for (const t of titel) {
  const reihe = reihen[t.franchiseId ?? t.id] ?? []
  const [teile, name] = [reihenTeileVon(t, reihe, daten), reihenNameVon(t, reihe, daten)]
  const marken = reihenReiterVon(t, teile, name, titel, heute).map((r) => r.label)
  const istHaupt = hauptstaffeln(teile).some((m) => m.id === t.id)
  if (marken.length && !istHaupt && !t.staffelTitel) ohneHaupt.push(`${t.id} ${name}`)
  const stand = staffelStaende(hauptstaffeln(teile), name)
  if (!marken.length && stand.size >= 2 && stand.has(t.id)) hauptOhne.push(`${t.id} ${name}`)
  if (marken.length) listen++
  if (new Set(marken).size === marken.length) continue
  doppelte.push(`${t.id}: ${marken.join()}`)
  melde(t.id, 'reihen-reiter-bestand', 'Reiterliste trägt dieselbe Beschriftung zweimal')
}
pruefe(`Bestand (${listen} Reiterlisten): keine doppelte Beschriftung`, listen > 100 && doppelte.length === 0, doppelte.slice(0, 3))
pruefe('Bestand: kein Film, Special oder eigenes Werk mit Reitern', ohneHaupt.length === 0, ohneHaupt.slice(0, 3))
pruefe('Bestand: jede nummerierte Hauptstaffel hat Reiter', hauptOhne.length === 0, hauptOhne.slice(0, 3))

console.log(verletzt ? `\n${verletzt} Zusicherung(en) verletzt.` : '\nAlle Zusicherungen halten.')
console.log(`VERSTÖSSE: ${verletzt}`)
process.exit(verletzt ? 1 : 0)
