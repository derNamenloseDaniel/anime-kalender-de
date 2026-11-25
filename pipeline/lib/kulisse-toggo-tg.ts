/** Kindprozess von `check-toggo-seiten-verdrahtung.ts`: schreibt die Folgenliste von Pokémon 527 in die Kulisse (`AK_ROOT`) und druckt `tg` der Detaildatei. */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Title } from '../../shared/types.ts'
import { schreibeFolgenDateien } from '../bau/folgen-dateien.ts'

const wurzel = process.env.AK_ROOT
if (!wurzel) throw new Error('AK_ROOT fehlt — der Lauf würde ins echte Repo schreiben')
const titel = { id: 527, jpYear: 2020, jpEnd: '2020-12-31', streams: [] } as unknown as Title
schreibeFolgenDateien([titel], [])
console.log(JSON.stringify(JSON.parse(readFileSync(join(wurzel, 'public/data/folgen/527.json'), 'utf8')).tg ?? null))
