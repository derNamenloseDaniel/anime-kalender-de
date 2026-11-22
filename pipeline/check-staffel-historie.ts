/**
 * Zusicherung: **eine Staffel aus einem Sammeltitel erbt dessen Gedächtnis** (`pipeline/lib/staffel-historie.ts`), sonst gälte sie am Tag der
 * Aktivierung als neu (Meldung „erstmals mit deutscher Synchro“, „Im Angebot seit“). Fixtures wie Horizonte: Sammeltitel 158871, Staffel 1 = 7000001.
 * Verdrahtung in `news.ts` und `nebendateien.ts` wird am Quelltext geprüft. Läuft in `check:logic`.
 */
import { readFileSync } from 'node:fs'
import { geerbterAnbieterTag, geerbterSeitTag } from './lib/staffel-historie.ts'

let fehler = 0
let faelle = 0
function pruefe(name: string, ok: boolean, info = ''): void {
  faelle++
  if (ok) return
  fehler++
  console.error(`✖ ${name}${info ? ` — ${info}` : ''}`)
}

const s1 = { id: 7000001, staffelTitel: { sammel: 158871, nr: 1, ab: 1 } }
const basis = { id: 158871, staffelTitel: { sammel: 158871, nr: 4, ab: 137 } }
const gewoehnlich = { id: 20 }
const seit = { 158871: '2026-08-13' }
const anbieter = { '158871:rtlplus': '2026-11-20', '158871:netflix': '0000-00-00' }

pruefe('Staffel erbt den Tag des Sammeltitels (seit)', geerbterSeitTag(seit, s1) === '2026-08-13')
pruefe('Basis-Staffel erbt nichts (seit)', geerbterSeitTag(seit, basis) === undefined)
pruefe('gewöhnlicher Titel erbt nichts (seit)', geerbterSeitTag(seit, gewoehnlich) === undefined)
pruefe('Sammeltitel ohne Eintrag: nichts zu erben (seit)', geerbterSeitTag({}, s1) === undefined)
pruefe('Staffel erbt den Tag je Anbieter', geerbterAnbieterTag(anbieter, s1, 'rtlplus') === '2026-11-20' && geerbterAnbieterTag(anbieter, s1, 'netflix') === '0000-00-00')
pruefe('Anbieter ohne Eintrag beim Sammeltitel: nichts zu erben', geerbterAnbieterTag(anbieter, s1, 'joyn') === undefined)
pruefe('Basis-Staffel erbt nichts (Anbieter)', geerbterAnbieterTag(anbieter, basis, 'rtlplus') === undefined)
pruefe('gewöhnlicher Titel erbt nichts (Anbieter)', geerbterAnbieterTag(anbieter, gewoehnlich, 'rtlplus') === undefined)

const quelle = (datei: string): string => readFileSync(new URL(datei, import.meta.url), 'utf8')
pruefe('news.ts: neuer Anbieter-Schlüssel nimmt zuerst den geerbten Tag', quelle('./lib/news.ts').includes('anbieterSeit[k] = geerbterAnbieterTag(anbieterSeit, t, p) ??'))
pruefe('nebendateien.ts: neuer seit-Eintrag nimmt zuerst den geerbten Tag', quelle('./bau/nebendateien.ts').includes('historie.seit[t.id] = geerbterSeitTag(historie.seit, t) ?? heute'))

console.log(`check-staffel-historie: ${faelle} Fälle, ${fehler} Fehler`)
process.exit(fehler ? 1 : 0)
