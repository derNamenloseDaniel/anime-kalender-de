/**
 * Zusicherungen: Die Sprache eines Akibapass-Wegs kommt aus der Produktseite (Daniel, 28.11.2026, Call of the Night S1: „Sprache offen“,
 * die Seite sagt „mit deutscher Synchronisation. Sprache: Deutsch / Untertitel: keine“; S2 ist OmU und bleibt es). Läuft in `check:logic`, kein Netz.
 */
import type { Title } from '../shared/types.ts'
import { robotsErlaubt, setzeAkibapassSprache, spracheAusSeite } from './lib/akibapass-sprache.ts'

let fehler = 0
function pruefe(name: string, ok: boolean, ist?: unknown): void {
  if (ok) return
  fehler++
  console.error(`FEHLER: ${name}`, ist === undefined ? '' : JSON.stringify(ist))
}

const SEITE_DE = '<html><head><style>.a{}</style></head><body><p>Die Nacht ruft, <b>mit deutscher Synchronisation</b>.</p><ul><li>Sprache: Deutsch / Untertitel: keine</li></ul></body></html>'
const SEITE_OMU = '<body><p>Sprache: Japanisch</p><p>Untertitel: Deutsch</p></body>'
pruefe('Seite „Sprache: Deutsch / Untertitel: keine“ → de', spracheAusSeite(SEITE_DE) === 'de', spracheAusSeite(SEITE_DE))
pruefe('Seite „Sprache: Japanisch / Untertitel: Deutsch“ → omu, nicht de', spracheAusSeite(SEITE_OMU) === 'omu', spracheAusSeite(SEITE_OMU))
pruefe('Seite ohne Sprachangabe → offen', spracheAusSeite('<body>Staffel 1, 12 Folgen</body>') === 'offen')
pruefe('Deutsch nur als Untertitel zählt nicht', spracheAusSeite('<li>Sprache: Japanisch / Untertitel: Deutsch</li>') !== 'de')

/* Echte Textausschnitte (Dirigent, 28.11.2026, curl) */
const ECHT: [string, string, string][] = [
  ['call-of-the-night-de-season-1', 'Sprache: Deutsch / Untertitel: keine', 'de'],
  ['fruits-basket-omu-season-1-1', 'Sprache: Japanisch / Untertitel: Deutsch', 'omu'],
  ['beelzebub-omu-season-1-5', 'Sprache: Japanisch / Untertitel: Deutsch', 'omu'],
  ['wolf-s-rain-de-season-1-2', 'Sprache: Deutsch / Untertitel: Keine', 'de'],
  ['sword-of-the-stranger-de', 'Sprache: Deutsch / Untertitel: keine', 'de'],
]
for (const [seite, text, soll] of ECHT) {
  const ist = spracheAusSeite(`<div class="meta"><p>${text}</p></div>`)
  pruefe(`echte Seite ${seite} → ${soll}`, ist === soll, ist)
}

const cotn = (id: number, url: string, episodes = 13): Title =>
  ({ id, episodes, watchLinks: [{ name: 'Akibapass', url, kind: 'stream', zugang: 'abo' }] }) as unknown as Title
const s1 = cotn(141391, 'https://www.akibapass.tv/products/call-of-the-night-de-season-1')
const s2 = cotn(175914, 'https://akibapassshop.de/products/25d006-omu-call-of-the-night-season2-digital')
const befund = { seiten: { [s1.watchLinks![0].url]: { sprache: 'de' as const, am: '2026-11-28' }, [s2.watchLinks![0].url]: { sprache: 'de' as const, am: '2026-11-28' } } }
const n = setzeAkibapassSprache([s1, s2], befund)
pruefe('COTN S1: Akibapass trägt Deutsch für alle 13 Folgen', JSON.stringify(s1.watchLinks![0].dubRanges) === JSON.stringify([{ from: 1, to: 13, dub: true }]), s1.watchLinks![0])
pruefe('COTN S2 (OmU-Pfad): bleibt ohne Deutsch, auch bei fremdem Befund', !s2.watchLinks![0].dubRanges && n === 1, s2.watchLinks![0])
const ohne = cotn(1, 'https://www.akibapass.tv/products/x-de-season-1')
pruefe('ohne Befund in der Datei: kein Deutsch geraten (Slug ist nur Vorfilter)', setzeAkibapassSprache([ohne], { seiten: {} }) === 0 && !ohne.watchLinks![0].dubRanges)
const omuBefund = cotn(2, 'https://www.akibapass.tv/products/y-de-season-1')
pruefe('Befund „omu“ setzt nichts', setzeAkibapassSprache([omuBefund], { seiten: { [omuBefund.watchLinks![0].url]: { sprache: 'omu', am: '2026-11-28' } } }) === 0)
const eigene = cotn(3, 'https://www.akibapass.tv/products/z-de-season-1')
eigene.watchLinks![0].dubRanges = [{ from: 1, to: 2, dub: false }]
pruefe('eigene Angabe am Weg bleibt', setzeAkibapassSprache([eigene], { seiten: { [eigene.watchLinks![0].url]: { sprache: 'de', am: '2026-11-28' } } }) === 0 && eigene.watchLinks![0].dubRanges![0].dub === false)

const ROBOTS = 'User-agent: *\nDisallow: /admin\nDisallow: /cart\nAllow: /admin/ok\n\nUser-agent: BadBot\nDisallow: /'
pruefe('robots: Produktseite erlaubt', robotsErlaubt(ROBOTS, '/products/a', 'anime-kalender-de'))
pruefe('robots: /admin gesperrt', !robotsErlaubt(ROBOTS, '/admin/x', 'anime-kalender-de'))
pruefe('robots: längere Allow-Regel gewinnt', robotsErlaubt(ROBOTS, '/admin/ok/1', 'anime-kalender-de'))
pruefe('robots: namentlicher Block eines anderen Bots gilt nicht für uns', robotsErlaubt(ROBOTS, '/products/a', 'anime-kalender-de'))
pruefe('robots: namentlicher Block für uns gilt', !robotsErlaubt('User-agent: anime-kalender-de\nDisallow: /', '/products/a', 'anime-kalender-de'))

if (fehler) {
  console.error(`${fehler} Fehler`)
  process.exit(1)
}
console.log('check-akibapass-sprache: ok')
