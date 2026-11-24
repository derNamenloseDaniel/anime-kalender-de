/**
 * Wächter: keine ungelayerte Universalregel setzt `scrollbar-width`/`scrollbar-color` in web/src/*.css.
 * Eine ungelayerte Regel schlägt in Tailwind v4 jede Utility, `[scrollbar-width:none]` wirkte dann nie
 * (Daniel, 24.11.2026, Staffel-Reiter). Die globale Regel gehört in `@layer base`.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Selektoren der Regeln auf oberster Ebene (außerhalb jedes @layer/@media), die Scrollbar-Eigenschaften setzen und `*` enthalten. */
export function ungelayerteScrollbarRegeln(css) {
  const ohne = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const treffer = []
  let tiefe = 0
  let start = 0
  for (let i = 0; i < ohne.length; i++) {
    const z = ohne[i]
    if (z === '{') {
      if (tiefe === 0) start = i
      tiefe++
    } else if (z === '}') {
      tiefe--
      if (tiefe === 0) {
        const kopf = ohne.slice(ohne.lastIndexOf('}', start - 1) + 1, start).trim()
        const rumpf = ohne.slice(start, i)
        if (kopf.startsWith('@layer')) continue
        // @media/@supports bleiben ungelayert: ihr Inhalt zählt wie oberste Ebene.
        if (kopf.startsWith('@')) treffer.push(...ungelayerteScrollbarRegeln(rumpf.slice(1)))
        else if (kopf.includes('*') && /scrollbar-(width|color)/.test(rumpf)) treffer.push(kopf)
      }
    }
  }
  return treffer
}

const fehler = []
const pruefe = (name, ok) => {
  if (ok) return console.log(`  ✓ ${name}`)
  fehler.push(name)
  console.error(`  ✗ ${name}`)
}

const roh = '/* c */\n* {\n  scrollbar-width: thin;\n}\n*::-webkit-scrollbar { width: 8px; }\n'
pruefe('Fixture: ungelayerte `*`-Regel wird gefunden', ungelayerteScrollbarRegeln(roh).length === 1)
pruefe('Fixture: dieselbe Regel in @layer base ist frei', ungelayerteScrollbarRegeln(`@layer base {\n${roh}}\n`).length === 0)
pruefe('Fixture: Regel in @media ist ungelayert und wird gefunden', ungelayerteScrollbarRegeln(`@media screen {\n${roh}}\n`).length === 1)
pruefe('Fixture: Regel für einen Klassennamen ohne `*` bleibt erlaubt', ungelayerteScrollbarRegeln('.pn-filter { scrollbar-width: none; }').length === 0)

const ordner = join(fileURLToPath(new URL('..', import.meta.url)), 'web/src')
for (const datei of readdirSync(ordner).filter((d) => d.endsWith('.css'))) {
  const hits = ungelayerteScrollbarRegeln(readFileSync(join(ordner, datei), 'utf8'))
  pruefe(`web/src/${datei}: keine ungelayerte Universalregel mit scrollbar-*${hits.length ? ' (' + hits.join(', ') + ')' : ''}`, hits.length === 0)
}

if (fehler.length) process.exit(1)
