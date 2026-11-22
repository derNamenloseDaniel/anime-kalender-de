/** Test der Mängelart `tv-sichtung-ohne-folge` an der eingefrorenen Sichtung vom 13.11.2026 (Pokémon Horizonte, „Ein Lied im Nebel“). */
import type { Release } from '../shared/types.ts'
import { tvSichtungOhneFolge } from './lib/maengel-tv-folge.ts'
import { REGELN } from './lib/maengel-regeln.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}`)
}

const sendung = (folge: string, nr?: number) => ({ start: '2026-11-13T17:15', ende: '2026-11-13T17:45', folge, ...(nr ? { nr } : {}) })
const termin = (sendungen: Release['sendungen']): Release => ({ platform: 'tv', sendungen }) as unknown as Release

pruefe('Fixture „Ein Lied im Nebel“ ohne Nummer: Mangel', tvSichtungOhneFolge([termin([sendung('Ein Lied im Nebel')])]))
pruefe('mit Nummer (Wikipedia „Lied im Nebel“, 1265): kein Mangel', !tvSichtungOhneFolge([termin([sendung('Lied im Nebel', 1265)])]))
pruefe('eine Sendung ohne Nummer unter gezählten genügt', tvSichtungOhneFolge([termin([sendung('A', 1), sendung('Ein Lied im Nebel')])]))
pruefe('Sendung ohne Folgentitel: kein Mangel (nichts zuzuordnen)', !tvSichtungOhneFolge([termin([sendung('')])]))
pruefe('Streaming-Termin zählt nicht', !tvSichtungOhneFolge([{ platform: 'netflix', sendungen: [sendung('X')] } as unknown as Release]))
pruefe('Art steht in der Regeltabelle', REGELN.some((r) => r.art === 'tv-sichtung-ohne-folge'))

process.exit(verletzt ? 1 : 0)
