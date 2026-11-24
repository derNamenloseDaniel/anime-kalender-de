/** Bestandsprüfer: die deutschen Staffelgrenzen (`data/curated/pokemon-staffeln.yaml`) enden bei der Folgenzahl jedes Titels in `titles.json`. */
import { readFileSync } from 'node:fs'
import { POKEMON_STAFFELN, fehlerInGrenzen, geteilteStaffeln, ladeStaffelGrenzen } from './lib/pokemon-staffeln.ts'
import { melde } from './lib/quarantaene.ts'

const titel = JSON.parse(readFileSync('public/data/titles.json', 'utf8')) as { id: number; episodes?: number }[]
const jeId = new Map(titel.map((t) => [t.id, t]))
let fehler = 0
for (const g of ladeStaffelGrenzen()) {
  const t = jeId.get(g.anilistId)
  const probleme = t ? fehlerInGrenzen(g, t.episodes) : ['steht nicht in titles.json']
  for (const p of probleme) {
    fehler++
    melde(g.anilistId, 'pokemon-staffeln', p)
    console.error(`FEHLER: ${g.anilistId} (${g.titel ?? ''}): ${p}`)
  }
}

/* Geteilte Staffeln gegen TMDB: der erste deutsche Folgentitel jedes Teils ist der Titel der Folge, bei der die Zählung innerhalb der Staffel ihn beginnen lässt. */
const tmdb = (JSON.parse(readFileSync('data/tmdb-folgen.json', 'utf8')) as Record<string, { folgen: { s: number; e: number; titel: string }[] }>)['527']!.folgen
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9äöüß]/g, '')
const geteilt = geteilteStaffeln([POKEMON_STAFFELN])
for (const g of ladeStaffelGrenzen(POKEMON_STAFFELN)) {
  const folgen = JSON.parse(readFileSync(`public/data/folgen/${g.anilistId}.json`, 'utf8')) as { f: [number, string][] }
  for (const [nr, anfang] of geteilt.get(g.anilistId) ?? []) {
    const von = g.staffeln.find((s) => s.nr === nr)!.von
    const eigen = folgen.f.find(([n]) => n === von)?.[1] ?? ''
    const fremd = tmdb.find((x) => x.s === nr && x.e === anfang)?.titel ?? ''
    if (norm(eigen) === norm(fremd) || fremd.startsWith('Folge ')) continue
    fehler++
    console.error(`FEHLER: Geteilte Staffeln: ${g.anilistId} beginnt Staffel ${nr} bei Folge ${anfang} („${eigen}“ gegen TMDB „${fremd}“)`)
  }
}
if (fehler) process.exit(1)
console.log('check-pokemon-staffeln-bestand: ok')
