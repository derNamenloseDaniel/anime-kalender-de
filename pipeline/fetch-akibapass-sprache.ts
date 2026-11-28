/**
 * Holt je Akibapass-Weg die Produktseite und liest die Sprache (`lib/akibapass-sprache.ts`), Ergebnis `data/akibapass-sprache.json`.
 *
 * Nur in GitHub Actions. Höflich: robots.txt je Host vorab, eine Seite alle 3 s, erkennbarer User-Agent, 403/429 = Pause nur für diesen Host (Rest bleibt
 * für den nächsten Lauf, nichts wird als „offen“ gewertet). Seiten mit Befund bleiben 28 Tage gültig, „offen“ wird nach 7 Tagen neu geholt.
 * OmU-Pfade (`shared/omu-adresse.ts`) werden nicht geholt: sie folgen der OmU-Regel.
 */
import { readJson, writeJson, log, warn, sleep } from './lib/util.ts'
import { todayIso } from '../shared/time.ts'
import { adresseIstOmu } from '../shared/omu-adresse.ts'
import { type Abruf, type AkibapassDatei, holeAkibapassSeiten, istAkibapassWeg, robotsAusAntwort } from './lib/akibapass-sprache.ts'

const UA = 'anime-kalender-de (https://anime-kalender.de; eine Seite je Akibapass-Weg und Monat)'
const ZIEL = 'data/akibapass-sprache.json'
const PAUSE_MS = 3000
const ABRUF_MS = 15_000

const tageSeit = (iso: string, heute: string): number => (Date.parse(heute) - Date.parse(iso)) / 864e5
const veraltet = (e: AkibapassDatei['seiten'][string] | undefined, heute: string): boolean =>
  !e || tageSeit(e.am, heute) > (e.sprache === 'offen' ? 7 : 28)

async function robotsVon(host: string): Promise<string> {
  const antwort = await fetch(`https://${host}/robots.txt`, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(ABRUF_MS) })
  return robotsAusAntwort(antwort.status, await antwort.text(), host)
}

async function main(): Promise<void> {
  if (!process.env.GITHUB_ACTIONS) {
    warn('Akibapass-Sprache: nur in GitHub Actions, nie von diesem Rechner')
    process.exit(1)
  }
  const heute = todayIso()
  const roh = readJson<{ titles: { watchLinks?: { name: string; url: string }[] }[] } | { watchLinks?: { name: string; url: string }[] }[]>('public/data/titles.json', [])
  const titel = Array.isArray(roh) ? roh : roh.titles
  const adressen = [...new Set(titel.flatMap((t) => (t.watchLinks ?? []).filter((w) => istAkibapassWeg({ ...w, kind: 'stream' })).map((w) => w.url)))].filter((u) => !adresseIstOmu(u))
  const datei = readJson<AkibapassDatei>(ZIEL, { seiten: {} })
  const offen = adressen.filter((u) => veraltet(datei.seiten[u], heute))
  const abruf: Abruf = {
    holeRobots: robotsVon,
    holeSeite: (url) => fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(ABRUF_MS) }),
    pause: () => sleep(PAUSE_MS),
  }
  const { seiten, hosts } = await holeAkibapassSeiten(offen, abruf, heute, warn)
  Object.assign(datei.seiten, seiten)
  const geholt = Object.keys(seiten).length
  for (const [host, z] of Object.entries(hosts)) log(`Akibapass ${host}: ${z.geholt} geholt, ${z.gesperrt} gesperrt, ${z.uebersprungen} übersprungen`)
  // Adressen, die der Bestand nicht mehr führt, fallen heraus.
  const aktuell = new Set(adressen)
  datei.seiten = Object.fromEntries(Object.entries(datei.seiten).filter(([u]) => aktuell.has(u)))
  datei.geholtAm = heute
  writeJson(ZIEL, datei, true)
  const zahl = (s: string) => Object.values(datei.seiten).filter((e) => e.sprache === s).length
  log(`Akibapass: ${adressen.length} Adressen, ${geholt} geholt; de ${zahl('de')}, omu ${zahl('omu')}, offen ${zahl('offen')}`)
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('fetch-akibapass-sprache.ts')) await main()
