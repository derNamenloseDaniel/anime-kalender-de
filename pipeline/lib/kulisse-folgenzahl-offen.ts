/** Kindprozess von `check-folgenzahl-offen-bau.ts`: fährt `schreibeFolgenDateien` in der Kulisse (`AK_ROOT`) und druckt `zaehlung.json`. */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Title } from '../../shared/types.ts'
import { schreibeFolgenDateien } from '../bau/folgen-dateien.ts'

const wurzel = process.env.AK_ROOT
if (!wurzel) throw new Error('AK_ROOT fehlt — der Lauf würde ins echte Repo schreiben')
const titel = (id: number) => ({ id, jpYear: 2023, jpEnd: '2026-12-31', streams: [] }) as unknown as Title
schreibeFolgenDateien([titel(900401), titel(900402), titel(900403)], [])
console.log(readFileSync(join(wurzel, 'public/data/folgen/zaehlung.json'), 'utf8').trim())
