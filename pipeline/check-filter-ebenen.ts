/**
 * Wächter zur Filterebene (Filterkonzept 22.11.2026): Jedes Listenfeld der Filter hat eine Ebene (`web/src/lib/filter-ebenen.ts`),
 * die Weg-Logik (Wege eines Titels, Plattform-Menge, Release-Art je Titel) steht nur in `wege-filter.ts`, nicht mehr in `filters.ts`
 * (dort lag der Fehler „⊘ Disc wirft den Titel heraus": `releases.some` entschied über den ganzen Titel), und die Schnellchips
 * kennen „bestätigt" nur im Kalender, „Streambar" nur in der Datenbank. Aufruf: `npm run check:logic`.
 */
import { readFileSync } from 'node:fs'
import { EMPTY_FILTERS, LIST_KEYS } from '../web/src/lib/filters.ts'
import { FILTER_EBENEN } from '../web/src/lib/filter-ebenen.ts'
import { schnellListe } from '../web/src/components/schnellfilter.tsx'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

console.log('\nEbenen der Listenfelder:')
const ohne = LIST_KEYS.filter((k) => !(k in FILTER_EBENEN))
const zuviel = Object.keys(FILTER_EBENEN).filter((k) => !(k in EMPTY_FILTERS))
pruefe('jedes Listenfeld hat eine Ebene', ohne.length === 0, ohne)
pruefe('keine Ebene ohne Feld', zuviel.length === 0, zuviel)

console.log('\nWeg-Logik nur im Weg-Modul:')
const quelle = readFileSync('web/src/lib/filters.ts', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
pruefe('filters.ts entscheidet nicht über Release-Arten (`releases.some`)', !/releases\.some\(/.test(quelle))
pruefe('filters.ts baut keine Plattform-Menge (`platformsOf`)', !/platformsOf/.test(quelle))
pruefe('filters.ts ruft die Weg-Prüfung', /passtWege\(/.test(quelle))

console.log('\nSchnellchips je Ansicht:')
const t = ((k: string) => k) as never
const ids = (mitTv: boolean, konfidenz: boolean) => schnellListe(t, konfidenz, mitTv).map((e) => e.id)
pruefe('Datenbank (ohne TV): kein „bestätigt"', !ids(false, true).includes('bestaetigt'), ids(false, true))
pruefe('Datenbank: „Streambar" (verfuegbar) bleibt', ids(false, true).includes('verfuegbar'))
pruefe('Kalender (mit TV): „bestätigt" und TV bleiben', ids(true, false).includes('bestaetigt') && ids(true, false).includes('tv'))
pruefe('Kalender: kein „Streambar"', !ids(true, false).includes('verfuegbar'))

if (verletzt) {
  console.error(`\ncheck-filter-ebenen: ${verletzt} Verletzung(en)`)
  process.exit(1)
}
console.log('\ncheck-filter-ebenen: alle Zusicherungen grün')
