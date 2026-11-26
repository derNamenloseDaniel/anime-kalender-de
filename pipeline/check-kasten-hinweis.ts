/**
 * Zusicherung (Umbau AntwortBereich, 25.11.2026): Die Hinweiszeile unter dem Kasten wählt zwischen
 * Folgenlücke, „ohne Synchro“-Hinweis (verbunden/offen, gemerkt) und Kino-Hinweis.
 * Gerendert wird der echte `AntwortBereich`. Aufruf: `npm run check:logic`.
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Title } from '../shared/types.ts'
import { AntwortBereich } from '../web/src/components/detail/antwort-bereich.tsx'
import { sortiereNachZugang } from '../web/src/components/detail/wege-sortieren.ts'
import { berechneAntwort } from '../web/src/components/detail/antwort-berechnen.ts'
import { translate } from '../web/src/lib/i18n.tsx'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const HEUTE = '2026-10-21'
const JETZT = new Date('2026-10-21T12:00:00Z')
const text = (html: string): string => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
const OFFEN = 'Interessiert dich dieser Titel'
const VERBUNDEN = 'wir schreiben dir an probe@example.org'
const GEMERKT = 'Gemerkt. Du bekommst Bescheid'

interface Fall {
  format: string
  ohneSynchro: boolean
  gemerkt: boolean
  verbunden: boolean
  luecke: string | null
  kino?: boolean
}

function bereich(f: Fall): string {
  const t = { id: 900102, slug: 'x', format: f.format, jpYear: 2025, hasVoices: !f.kino, jpStatus: f.kino ? 'NOT_YET_RELEASED' : undefined, streams: [], watchLinks: [], titleDe: 'Probe', episodes: 12, ohneSynchro: f.ohneSynchro } as unknown as Title
  const antwort = berechneAntwort({ title: t, releases: [], today: HEUTE, jetzt: JETZT })
  const eingabe = {
    antwort,
    sortiertNachZugang: sortiereNachZugang({ title: t }),
    streamReleases: [],
    terminReleases: [],
    title: t,
    t: translate,
    today: HEUTE,
    wegeHinweis: undefined,
    tvVorbei: [],
    kastenNotiz: undefined,
    folgenLuecke: f.luecke,
    verbindung: f.verbunden ? { verbunden: true, mail: 'probe@example.org' } : { verbunden: false },
    favorites: f.gemerkt ? new Set([900102, 900103]) : new Set([900103, 900104]),
    onToggleFavorite: () => {},
    folgenAngabeFuer: () => '',
    dubZeilen: () => [],
    releaseJePlattform: new Map(),
    releases: [],
    discAusgaben: [],
    discReleases: [],
  }
  return text(renderToStaticMarkup(createElement(AntwortBereich, eingabe as never)))
}
const basis: Fall = { format: 'TV', ohneSynchro: true, gemerkt: false, verbunden: false, luecke: null }

console.log('\nHinweiszeile des Kastens:')
const offen = bereich(basis)
pruefe('ohne Synchro, nicht verbunden: Aufforderung zum Merken', offen.includes(OFFEN) && !offen.includes('wir schreiben dir'), offen)
pruefe('ohne Synchro, nicht gemerkt: kein „Gemerkt“', !offen.includes(GEMERKT))
const verbunden = bereich({ ...basis, verbunden: true })
pruefe('ohne Synchro, verbunden: Adresse genannt', verbunden.includes(VERBUNDEN), verbunden)
pruefe('ohne Synchro, gemerkt: „Gemerkt“ steht da', bereich({ ...basis, gemerkt: true }).includes(GEMERKT))
pruefe('Kinofilm ohne Synchro: kein Merk-Hinweis', !bereich({ ...basis, format: 'MOVIE', kino: true }).includes(OFFEN))
pruefe('mit Synchro: kein Merk-Hinweis', !bereich({ ...basis, ohneSynchro: false }).includes(OFFEN))
const luecke = bereich({ ...basis, luecke: '3–5' })
pruefe('Folgenlücke mehrere: Mehrzahl-Text, kein Merk-Hinweis', luecke.includes('Für Folgen 3–5 kennen wir keinen deutschen Anbieter.') && !luecke.includes(OFFEN), luecke)
pruefe('Folgenlücke eine: Einzahl-Text', bereich({ ...basis, ohneSynchro: false, luecke: '7' }).includes('Für Folge 7 kennen wir keinen deutschen Anbieter.'))

if (verletzt) {
  console.error(`\n${verletzt} Prüfung(en) verletzt`)
  process.exit(1)
}
console.log('\nkasten-hinweis: 8 von 8 Prüfungen grün')
