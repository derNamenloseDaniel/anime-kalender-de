/**
 * Zusicherungen: Die Sprache eines Akibapass-Wegs kommt aus der Produktseite (Daniel, 28.11.2026, Call of the Night S1: „Sprache offen“,
 * die Seite sagt „mit deutscher Synchronisation. Sprache: Deutsch / Untertitel: keine“; S2 ist OmU und bleibt es). Läuft in `check:logic`, kein Netz.
 */
import type { Title } from '../shared/types.ts'
import { type Abruf, folgenAusSeite, holeAkibapassSeiten, robotsAusAntwort, robotsErlaubt, setzeAkibapassSprache, spracheAusSeite } from './lib/akibapass-sprache.ts'

let fehler = 0
function pruefe(name: string, ok: boolean, ist?: unknown): void {
  if (ok) return
  fehler++
  console.error(`FEHLER: ${name}`, ist === undefined ? '' : JSON.stringify(ist))
}

const SEITE_DE = '<html><head><style>.a{}</style></head><body><p>Die Nacht ruft, <b>mit deutscher Synchronisation</b>.</p><ul><li>Sprache: Deutsch / Untertitel: keine</li></ul></body></html>'
const SEITE_OMU = '<body><p>Sprache: Japanisch / Untertitel: Deutsch</p></body>'
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
const n = setzeAkibapassSprache([s1, s2], befund).gesetzt
pruefe('COTN S1: Akibapass trägt Deutsch für alle 13 Folgen', JSON.stringify(s1.watchLinks![0].dubRanges) === JSON.stringify([{ from: 1, to: 13, dub: true }]), s1.watchLinks![0])
pruefe('COTN S2 (OmU-Pfad): bleibt ohne Deutsch, auch bei fremdem Befund', !s2.watchLinks![0].dubRanges && n === 1, s2.watchLinks![0])
const ohne = cotn(1, 'https://www.akibapass.tv/products/x-de-season-1')
pruefe('ohne Befund in der Datei: kein Deutsch geraten (Slug ist nur Vorfilter)', setzeAkibapassSprache([ohne], { seiten: {} }).gesetzt === 0 && !ohne.watchLinks![0].dubRanges)
const omuBefund = cotn(2, 'https://www.akibapass.tv/products/y-de-season-1')
pruefe('Befund „omu“ setzt nichts', setzeAkibapassSprache([omuBefund], { seiten: { [omuBefund.watchLinks![0].url]: { sprache: 'omu', am: '2026-11-28' } } }).gesetzt === 0)
const eigene = cotn(3, 'https://www.akibapass.tv/products/z-de-season-1')
eigene.watchLinks![0].dubRanges = [{ from: 1, to: 2, dub: false }]
pruefe('eigene Angabe am Weg bleibt', setzeAkibapassSprache([eigene], { seiten: { [eigene.watchLinks![0].url]: { sprache: 'de', am: '2026-11-28' } } }).gesetzt === 0 && eigene.watchLinks![0].dubRanges![0].dub === false)

const ROBOTS = 'User-agent: *\nDisallow: /admin\nDisallow: /cart\nAllow: /admin/ok\n\nUser-agent: BadBot\nDisallow: /'
pruefe('robots: Produktseite erlaubt', robotsErlaubt(ROBOTS, '/products/a', 'anime-kalender-de'))
pruefe('robots: /admin gesperrt', !robotsErlaubt(ROBOTS, '/admin/x', 'anime-kalender-de'))
pruefe('robots: längere Allow-Regel gewinnt', robotsErlaubt(ROBOTS, '/admin/ok/1', 'anime-kalender-de'))
pruefe('robots: namentlicher Block eines anderen Bots gilt nicht für uns', robotsErlaubt(ROBOTS, '/products/a', 'anime-kalender-de'))
pruefe('robots: namentlicher Block für uns gilt', !robotsErlaubt('User-agent: anime-kalender-de\nDisallow: /', '/products/a', 'anime-kalender-de'))

pruefe('robots 200: Text bleibt', robotsAusAntwort(200, 'Disallow: /x', 'h') === 'Disallow: /x')
pruefe('robots 404: keine Datei, alles erlaubt', robotsAusAntwort(404, 'Not found', 'h') === '' && robotsErlaubt(robotsAusAntwort(404, 'x', 'h'), '/products/a', 'anime-kalender-de'))
for (const s of [403, 500, 503]) {
  let geworfen = false
  try { robotsAusAntwort(s, '', 'h') } catch { geworfen = true }
  pruefe(`robots ${s}: Fehler (Host wird nicht geholt), nicht „erlaubt“`, geworfen)
}
pruefe('Sprachwahl in der Navigation („Sprache: Englisch“ ohne Untertitel) zählt nicht', spracheAusSeite('<nav>Sprache: Deutsch</nav><p>Staffel 1</p>') === 'offen')
pruefe('abweichendes „Sprache:“ vor dem Produkttext: kein Urteil, Titel bleibt offen', spracheAusSeite('<nav>Sprache: Englisch / Untertitel: keine</nav><p>Sprache: Deutsch / Untertitel: keine</p>') === 'offen')
pruefe('abweichendes „Sprache:“ ohne „/ Untertitel“ davor: offen', spracheAusSeite('<nav>Sprache: Deutsch</nav><p>Sprache: Deutsch / Untertitel: keine</p>') === 'offen')

/* Echter HTML-Ausschnitt: https://www.akibapass.tv/products/call-of-the-night-de-season-1, Dirigent, 28.11.2026 11:31, curl, HTTP 200, 151 kB; „Sprache:“ steht dort 17-mal, hier drei der Stellen (Meta-Tag, Beschreibung, Kasten). */
const SEITE_ECHT = `  <meta name="description" content="Enthält alle 13 Episoden der Season 1 mit deutscher Synchronisation.
Sprache: Deutsch / Untertitel: keine / Laufzeit: ca. 24 Minuten pro Episode
...
      <p>Enthält alle 13 Episoden der Season 1 mit deutscher Synchronisation.
<br>Sprache: Deutsch / Untertitel: keine / Laufzeit: ca. 24 Minuten pro Episode
<br>---
...
        <div class="transparent padding-top-medium">
          <p>Sprache: Deutsch / Untertitel: keine / Laufzeit: ca. 24 Minuten</p>`
pruefe('echte Seite COTN S1 → de', spracheAusSeite(SEITE_ECHT) === 'de', spracheAusSeite(SEITE_ECHT))
pruefe('echte Seite COTN S1: Folgenzahl 13 aus „Enthält alle 13 Episoden“', folgenAusSeite(SEITE_ECHT) === 13, folgenAusSeite(SEITE_ECHT))
pruefe('Seite ohne „Enthält alle N Episoden“: keine Zahl', folgenAusSeite('<p>Sprache: Deutsch / Untertitel: keine</p>') === undefined)

const ohneZahl = cotn(5, 'https://www.akibapass.tv/products/q-de-season-1', 0)
const beide = { seiten: { [ohneZahl.watchLinks![0].url]: { sprache: 'de' as const, am: '2026-11-28' } } }
pruefe('fehlende Folgenzahl: kein dubRanges erfunden', setzeAkibapassSprache([ohneZahl], beide).gesetzt === 0 && !ohneZahl.watchLinks![0].dubRanges)

const mitSeite = (id: number, url: string, episodes: number | undefined, episoden: number | undefined) => {
  const t = cotn(id, url, episodes ?? 0)
  return { t, datei: { seiten: { [url]: { sprache: 'de' as const, am: '2026-11-28', ...(episoden ? { episoden } : {}) } } } }
}
const seiteZahl = mitSeite(7, 'https://www.akibapass.tv/products/s-de-season-1', undefined, 13)
const z1 = setzeAkibapassSprache([seiteZahl.t], seiteZahl.datei)
pruefe('Seite nennt 13 Folgen, Titel keine Zahl: Folgen 1–13 aus der Seite', z1.gesetzt === 1 && JSON.stringify(seiteZahl.t.watchLinks![0].dubRanges) === JSON.stringify([{ from: 1, to: 13, dub: true }]), z1)
const abweichend = mitSeite(8, 'https://www.akibapass.tv/products/t-de-season-1-2', 24, 12)
const z2 = setzeAkibapassSprache([abweichend.t], abweichend.datei)
pruefe('Seite nennt 12, Titel 24: offen, gezählt (Teil einer Staffel)', z2.abweichend === 1 && z2.gesetzt === 0 && !abweichend.t.watchLinks![0].dubRanges, z2)
const keine = mitSeite(9, 'https://www.akibapass.tv/products/u-de-season-1', undefined, undefined)
pruefe('weder Seite noch Titel nennen eine Zahl: offen, in der Zählzeile', setzeAkibapassSprache([keine.t], keine.datei).ohneFolgenzahl === 1)

for (const [name, fehlerText] of [['5xx', 'robots.txt von x: HTTP 503'], ['Timeout', 'The operation was aborted due to timeout']] as const) {
  const robotsAufrufe: string[] = []
  const geholt: string[] = []
  const warnungen: string[] = []
  const abrufR: Abruf = {
    holeRobots: async (h) => { robotsAufrufe.push(h); if (h === 'kaputt.example') throw new Error(fehlerText); return '' },
    holeSeite: async (u) => { geholt.push(u); return { status: 200, text: async () => '<p>Sprache: Deutsch / Untertitel: keine</p>' } },
    pause: async () => {},
  }
  const r = await holeAkibapassSeiten(['https://kaputt.example/a', 'https://kaputt.example/b', 'https://gut.example/c'], abrufR, '2026-11-28', (t) => warnungen.push(t))
  pruefe(`robots ${name}: Host ruht, anderer Host läuft weiter`, !geholt.some((u) => u.includes('kaputt')) && geholt.includes('https://gut.example/c') && Object.keys(r.seiten).length === 1, { geholt, r })
  pruefe(`robots ${name}: Fehler wird je Host nur einmal abgerufen (auch der Fehler ist gecacht)`, robotsAufrufe.filter((h) => h === 'kaputt.example').length === 1, robotsAufrufe)
  pruefe(`robots ${name}: Warnzeile`, warnungen.some((w) => w.includes('kaputt.example') && w.includes('nicht lesbar')), warnungen)
}

const antwort = (status: number, text = '<p>Sprache: Deutsch / Untertitel: keine</p>') => ({ status, text: async () => text })
const abgerufen: string[] = []
const abrufA: Abruf = {
  holeRobots: async () => '',
  holeSeite: async (u) => { abgerufen.push(u); return antwort(u.includes('shop.example') ? 429 : 200) },
  pause: async () => {},
}
const lauf = await holeAkibapassSeiten(['https://shop.example/a', 'https://shop.example/b', 'https://tv.example/c', 'https://tv.example/d'], abrufA, '2026-11-28', () => {})
pruefe('429 auf Host A: Host B wird weiter abgerufen', Object.keys(lauf.seiten).join() === 'https://tv.example/c,https://tv.example/d', lauf.seiten)
pruefe('429 auf Host A: weitere Adressen von A übersprungen, nicht abgerufen', !abgerufen.includes('https://shop.example/b') && lauf.hosts['shop.example'].uebersprungen === 1 && lauf.hosts['shop.example'].gesperrt === 1, lauf.hosts)
pruefe('Zählung je Host', lauf.hosts['tv.example'].geholt === 2, lauf.hosts)

if (fehler) {
  console.error(`${fehler} Fehler`)
  process.exit(1)
}
console.log('check-akibapass-sprache: ok')
