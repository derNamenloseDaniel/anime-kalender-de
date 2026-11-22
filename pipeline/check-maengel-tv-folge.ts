/** Test der Mängelart `tv-sichtung-ohne-folge` an der eingefrorenen Sichtung vom 13.11.2026 (Pokémon Horizonte, „Ein Lied im Nebel“). */
import type { Release, Title } from '../shared/types.ts'
import { tvSichtungOhneFolge } from './lib/maengel-tv-folge.ts'
import { REGELN, zaehleMaengel, type Kontext } from './lib/maengel-regeln.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}`)
}

const sendung = (folge: string, nr?: number) => ({ start: '2026-11-13T17:15', ende: '2026-11-13T17:45', folge, ...(nr ? { nr } : {}) })
const termin = (sendungen: Release['sendungen']): Release => ({ platform: 'tv', sendungen }) as unknown as Release

pruefe('Fixture „Ein Lied im Nebel“ ohne Nummer: Mangel', tvSichtungOhneFolge([termin([sendung('Ein Lied im Nebel')])]))
/* Nummer 1265 ist eine Fixture-Annahme, nicht belegt (Wikipedia führt die Folge als „Lied im Nebel“). */
pruefe('mit Nummer (Fixture-Annahme 1265): kein Mangel', !tvSichtungOhneFolge([termin([sendung('Lied im Nebel', 1265)])]))
pruefe('zwei Termine, einer mit, einer ohne Nummer: Mangel', tvSichtungOhneFolge([termin([sendung('A', 1)]), termin([sendung('Ein Lied im Nebel')])]))
pruefe('eine Sendung ohne Nummer unter gezählten genügt', tvSichtungOhneFolge([termin([sendung('A', 1), sendung('Ein Lied im Nebel')])]))
pruefe('Sendung ohne Folgentitel: kein Mangel (nichts zuzuordnen)', !tvSichtungOhneFolge([termin([sendung('')])]))
pruefe('Streaming-Termin zählt nicht', !tvSichtungOhneFolge([{ platform: 'netflix', sendungen: [sendung('X')] } as unknown as Release]))
const titel = { id: 1, titleDe: 'Gut', format: 'TV' } as unknown as Title
const kontext = (r: Release[]) => ({ heute: '2026-11-22', releases: new Map([[1, r]]) }) as unknown as Kontext
const treffer = (r: Release[]) => zaehleMaengel([titel], kontext(r), REGELN.filter((x) => x.art === 'tv-sichtung-ohne-folge'))
pruefe('Regel: Titel mit offener Sendung liefert den Mangel mit Wirkung 2', treffer([termin([sendung('Ein Lied im Nebel')])]).map((x) => `${x.art}:${x.wirkung}:${x.grund ?? ''}`).join() === 'tv-sichtung-ohne-folge:2:')
pruefe('Regel: Titel ohne Termin liefert nichts', treffer([]).length === 0)
pruefe('Regel: Titel mit nummerierter Sendung liefert nichts', treffer([termin([sendung('Lied im Nebel', 1265)])]).length === 0)

process.exit(verletzt ? 1 : 0)
