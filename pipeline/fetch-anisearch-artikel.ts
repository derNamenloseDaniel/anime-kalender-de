/**
 * **Disc-Artikelseiten von aniSearch: Tonspur, EAN und enthaltene Titel je Ausgabe.**
 *
 * Quelle der Artikel-Adressen ist `data/disc-ausgaben.json` (8.727 Seiten, Stand 03.10.2026).
 * Ergebnis liegt in `data/anisearch-artikel.json`, Schlüssel ist die Artikelnummer. Die Rohseiten
 * werden nicht archiviert — bei ~50 KB je Seite würde das Repo um Hunderte MB wachsen.
 *
 * Reihenfolge: zuerst Ausgaben von Titeln **ohne** Synchro-Marke bei aniSearch — dort entscheidet
 * die Tonspur der Disc —, danach der Rest. Takt und Abbruch wie `fetch-anisearch-titel.ts`.
 *
 * Aufruf: `tsx pipeline/fetch-anisearch-artikel.ts [--limit N]`
 */
import { artikelAus, type Artikel } from './lib/anisearch-artikel.ts'
import { todayIso } from '../shared/time.ts'
import { artikelFaellig } from './lib/anisearch-faellig.ts'
import { KENNUNG } from './lib/kennung.ts'
import { log, readJson, sleep, warn, writeJson } from './lib/util.ts'

const TAKT_MS = 6000
const MAX_FEHLER_IN_FOLGE = 5
const ALTER_TAGE = 180
/** Hochzählen, sobald `artikelAus()` ein Feld mehr liest. */
const PARSER_STAND = 1
/** Zeitbudget: Der Workflow bricht bei 120 Minuten ab und verwirft dann alles, was noch nicht geschrieben ist (03.10.2026: 1.100 Seiten × ~6,7 s ≈ 123 Minuten). */
const MINUTEN = Number(/--minuten[= ](\d+)/.exec(process.argv.join(' '))?.[1] ?? 100)
const START = Date.now()
const GRENZE = Number(/--limit[= ](\d+)/.exec(process.argv.join(' '))?.[1] ?? 400)
const ZIEL = 'data/anisearch-artikel.json'

interface Eintrag extends Artikel {
  fetchedAt: string
  stand: number
}
interface Ausgabe {
  url?: string
  datum?: string
}

const bestand = readJson<Record<string, Eintrag>>(ZIEL, {})
const ausgaben = readJson<Record<string, Ausgabe[]>>('data/disc-ausgaben.json', {})
const anisearch = readJson<Record<string, { info?: { languages?: { language: string; dubbed?: boolean }[] } }>>(
  'data/anisearch.json',
  {},
)

const mitMarke = (titelId: string): boolean =>
  !!anisearch[titelId]?.info?.languages?.some((l) => l.language === 'Deutsch' && l.dubbed)

/** Artikelnummer → (Adresse, vordringlich). Vordringlich: mindestens ein Titel ohne Marke. */
const artikel = new Map<string, { url: string; vorn: boolean; datum?: string }>()
for (const [titelId, liste] of Object.entries(ausgaben)) {
  const vorn = !mitMarke(titelId)
  for (const a of liste) {
    const nr = /\/article\/(\d+),/.exec(a.url ?? '')?.[1]
    if (!nr || !a.url) continue
    const alt = artikel.get(nr)
    artikel.set(nr, { url: a.url, vorn: vorn || !!alt?.vorn, datum: a.datum })
  }
}

/* Artikel einer künftigen Ausgabe binnen der Frist kommen früher wieder: Tonspur und Inhalt werden oft erst vor dem Termin nachgetragen. */
const faellig = (nr: string): boolean =>
  artikelFaellig(bestand[nr], {
    jetzt: Date.now(),
    alterTage: ALTER_TAGE,
    parserStand: PARSER_STAND,
    termin: { heute: todayIso(), tage: [artikel.get(nr)?.datum ?? ''] },
  })

const warteschlange = [...artikel.entries()]
  .filter(([nr]) => faellig(nr))
  .sort((a, b) => Number(b[1].vorn) - Number(a[1].vorn))

log(`${warteschlange.length} von ${artikel.size} Artikelseiten offen, davon kommen ${Math.min(GRENZE, warteschlange.length)} dran`)

let geholt = 0
let fehlerInFolge = 0
for (const [nr, { url }] of warteschlange.slice(0, GRENZE)) {
  if (Date.now() - START > MINUTEN * 60_000) {
    log(`Zeitbudget von ${MINUTEN} Minuten erreicht — der Rest kommt im nächsten Lauf.`)
    break
  }
  try {
    const antwort = await fetch(url, {
      headers: { 'User-Agent': KENNUNG, 'Accept-Language': 'de-DE,de;q=0.9' },
      redirect: 'follow',
    })
    if (!antwort.ok) {
      warn(`aniSearch Artikel ${nr}: HTTP ${antwort.status}`)
      if (antwort.status === 403 || antwort.status === 423 || antwort.status === 429) {
        warn('Abbruch: aniSearch weist ab. Der Rest kommt im nächsten Lauf.')
        break
      }
      if (++fehlerInFolge >= MAX_FEHLER_IN_FOLGE) {
        warn(`Abbruch: ${MAX_FEHLER_IN_FOLGE} Fehlschläge in Folge.`)
        break
      }
      await sleep(TAKT_MS)
      continue
    }
    fehlerInFolge = 0
    const fund = artikelAus(await antwort.text())
    /* Eine Seite ohne Produktfelder wird trotzdem vermerkt, sonst käme sie in jedem Lauf wieder vorn dran. */
    bestand[nr] = { ...(fund ?? { enthalten: [] }), fetchedAt: new Date().toISOString(), stand: PARSER_STAND }
    geholt++
    if (geholt % 100 === 0) log(`  ${geholt}/${Math.min(GRENZE, warteschlange.length)}`)
  } catch (err) {
    warn(`aniSearch Artikel ${nr}: ${(err as Error).message}`)
    if (++fehlerInFolge >= MAX_FEHLER_IN_FOLGE) {
      warn(`Abbruch: ${MAX_FEHLER_IN_FOLGE} Fehlschläge in Folge — aniSearch ist nicht erreichbar.`)
      break
    }
  }
  await sleep(TAKT_MS)
}

writeJson(ZIEL, bestand, true)
log(`${geholt} Seiten geholt, ${Object.keys(bestand).length} insgesamt`)
