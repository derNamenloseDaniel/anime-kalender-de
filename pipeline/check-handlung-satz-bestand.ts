/**
 * Ein-Satz-Handlung gegen den gebauten Bestand (`check:bestand`, 26.11.2026): Titel im Bestand (oder hinter dem Toggle), Satz ist nicht der Titel,
 * kein 5-Wort-Abschnitt wie in einem ausgelieferten Text (`de`/`en`) des Titels. Ein Satz ohne Titel ist nur eine Warnung, nichts davon geht live.
 */
import { SYNOPSIS_GROUPS, type Title } from '../shared/types.ts'
import { readJson } from './lib/util.ts'
import { zurueckgestellt } from './lib/quarantaene.ts'
import { ladeSaetze, satzBestandFehler } from './lib/handlung-satz.ts'
import { bestandWarnzeile } from './lib/bestand-warnzeile.ts'

type Synopse = { de?: string; en?: string }

const gruppen = new Map<number, Record<string, Synopse>>()
function ausgeliefert(id: number): Synopse | undefined {
  const g = id % SYNOPSIS_GROUPS
  if (!gruppen.has(g)) gruppen.set(g, readJson<Record<string, Synopse>>(`public/data/synopses/${g}.json`, {}))
  return gruppen.get(g)![String(id)]
}

const titelVon = new Map<number, string[]>()
for (const t of [...readJson<Title[]>('public/data/titles.json', []), ...readJson<Title[]>('public/data/ohne-synchro.json', [])]) {
  titelVon.set(t.id, [t.titleDe, t.titleRomaji, t.titleEn, t.titleNative].filter((x): x is string => !!x))
}
for (const id of zurueckgestellt().ids) if (!titelVon.has(id)) titelVon.set(id, [])

const texteVon = (id: number) => {
  const s = ausgeliefert(id)
  return [{ name: 'de', text: s?.de ?? '' }, { name: 'en', text: s?.en ?? '' }].filter((q) => q.text)
}
const alle = satzBestandFehler(ladeSaetze(), titelVon, texteVon)
const verwaist = alle.filter((f) => f.endsWith('Titel nicht im Bestand'))
const verstoesse = alle.filter((f) => !verwaist.includes(f))

if (verwaist.length) console.log(bestandWarnzeile('Ein-Satz-Handlung', 'ohne Titel im Bestand (nichts davon live; Eintrag löschen)', verwaist.map((f) => Number(/Titel (\d+)/.exec(f)![1]))))
for (const v of verstoesse) console.log(`✖ ${v}`)
console.log(`Ein-Satz-Handlung gegen den Bestand: ${verwaist.length} verwaist (Warnung), ${verstoesse.length} Verstöße.`)
console.log(`VERSTÖSSE: ${verstoesse.length}`)
process.exit(verstoesse.length ? 1 : 0)
