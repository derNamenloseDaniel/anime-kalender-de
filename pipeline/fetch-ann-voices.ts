/**
 * Holt die deutschen Sprechrollen von Anime News Network und führt sie mit den
 * bereits vorhandenen AniList-Rollen zusammen.
 *
 * Das Warum steht in `lib/ann.ts`. Hier steht nur, wie der Lauf sich verhält —
 * und das ist bei einer fremden Schnittstelle mit hartem Limit die eigentliche
 * Arbeit:
 *
 * - **Eine Anfrage pro Sekunde**, wie ANN es vorschreibt. Nicht „ungefähr":
 *   Zwischen zwei Anfragen wird die tatsächlich verstrichene Zeit gemessen und
 *   der Rest abgewartet. Ein Lauf über 2.112 Titel dauert damit rund 35 Minuten,
 *   und das ist der Preis dafür, dass wir dort weiter abrufen dürfen.
 * - **Rohantworten werden archiviert** (`data/ann-raw/<annId>.xml.gz`, rund 8 KB
 *   je Titel). Ein später gebrauchtes Feld ist dann eine Änderung am Parser,
 *   kein zweiter Lauf über 2.112 Seiten — dieselbe Lehre wie bei aniSearch und
 *   ADN, siehe CLAUDE.md „Beim Scrapen nichts wegwerfen".
 * - **Nach jedem Titel wird geschrieben.** Ein Lauf ohne Zwischenstand ist ein
 *   Lauf ohne Netz; beim Crunchyroll-Lauf am 12.08.2026 wären nach einem Abbruch
 *   anderthalb Stunden Fremdlast umsonst gewesen.
 *
 * Aufruf: npm run data:ann:voices [-- --limit 50] [-- --force]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { gzipSync, gunzipSync } from 'node:zlib'
import { annUrl, deutscheRollen, rollenZusammenfuehren, type AnnRolle } from './lib/ann.ts'
import { log, readJson, warn, writeJson } from './lib/util.ts'
import { ohneAnisearchAbgedeckte } from './bau/sprecher-zusammen.ts'
import { recordSource } from './lib/health.ts'
import type { Title } from '../shared/types.ts'

const args = process.argv.slice(2)
const zahl = (name: string, fallback: number) => {
  const i = args.indexOf(name)
  return i >= 0 ? Number(args[i + 1]) : fallback
}
const LIMIT = zahl('--limit', 0)
const FORCE = args.includes('--force')
/** Die Sprecherdateien aus den gesicherten Rohantworten neu ableiten, ohne Netz und ohne den Holstand zu ändern (Wiederherstellung 05.10.2026). */
const AUS_ARCHIV = args.includes('--aus-archiv')
/**
 * Nach wie vielen Tagen ein Titel erneut abgefragt wird.
 *
 * **60 Tage**, weil die Sache sich langsam bewegt: Eine Synchronrolle wird
 * eingetragen, wenn eine Fassung erscheint, nicht wöchentlich. Bei rund 2.100
 * zugeordneten Titeln und einer Anfrage je Sekunde sind das etwa 35 am Tag —
 * ein Tageslauf schafft sie nebenbei.
 */
const ALTER_TAGE = zahl('--alter', 60)
/** Wann welche ANN-Kennung zuletzt abgefragt wurde — siehe Warteschlange. */
const HOLSTAND = 'data/ann-holstand.json'

const VOICES = 'public/data/voices'
const RAW = 'data/ann-raw'
const API = 'https://cdn.animenewsnetwork.com/encyclopedia/api.xml?anime='

/** Eine Sekunde, wie ANN sie verlangt — plus ein Schluck Sicherheitsabstand. */
const ABSTAND_MS = 1100

interface VoiceRole {
  character: string
  actor: string
  role?: string
  /** Woher die Rolle stammt. Fehlt = AniList, so wie vor dem 15.08.2026. */
  von?: 'ann' | 'anisearch'
}

interface VoiceFile {
  titleId: number
  updatedAt: string
  roles: VoiceRole[]
  /** Adresse des Encyclopedia-Eintrags — ANN verlangt den Link, wo die Daten stehen. */
  annUrl?: string
}

/** Ob ein Titel noch unter der Frist liegt (aus dem Holstand, nicht aus dem Dateisystem). */
type Frisch = (annId: number) => boolean

/**
 * Wiedervorlage über das **Alter**, nicht über „schon geholt".
 *
 * Bis zum 25.08.2026 filterte die Warteschlange auf `!existsSync(<Rohdatei>)`.
 * Nach dem ersten vollständigen Durchlauf war sie damit für immer leer: Ein
 * Titel, der einmal geholt wurde, kam nie wieder dran — und ANN trägt
 * deutsche Sprechrollen laufend nach. Der Lauf meldete seit dem 15.08.
 * „0 Treffer" und machte den Tageslauf rot.
 *
 * Dieselbe Konstruktion hat am 15.08.2026 bei Crunchyroll und aniSearch dazu
 * geführt, dass 975 Titel ein unbelegtes „keine deutsche Synchro" trugen;
 * `CLAUDE.md` führt sie seither als eigene Regel.
 *
 * **Und sie gehört an beide Stellen.** `holeXml` liest das Archiv,
 * wenn es existiert — eine Warteschlange allein hätte den Titel zwar wieder
 * vorgelegt, aber dieselbe alte Antwort noch einmal geparst.
 *
 * Die Reihenfolge ist nicht beliebig: Titel **ohne** deutsche Stimmen zuerst.
 * Dort liegt der ganze Gewinn — bei den übrigen bestätigt ANN meist nur, was
 * AniList schon weiß. Bricht der Lauf vorzeitig ab, ist damit das Wertvollste
 * bereits geholt.
 */
function warteschlange(titles: Title[], ann: Record<string, number>, frisch: Frisch): Title[] {
  const queue = titles
    .filter((t) => ann[String(t.id)])
    .filter((t) => FORCE || AUS_ARCHIV || !frisch(ann[String(t.id)]))
    .sort((a, b) => Number(Boolean(a.hasVoices)) - Number(Boolean(b.hasVoices)))
  return LIMIT > 0 ? queue.slice(0, LIMIT) : queue
}

/** Zeitpunkt der letzten echten Anfrage — Grundlage des Sekundentakts. */
interface Takt {
  letzte: number
}

/** Rohantwort eines Titels: aus dem Archiv oder per Anfrage (dann archiviert und gestempelt); `null` = keine Antwort. */
async function holeXml(annId: number, frisch: Frisch, holstand: Record<string, string>, takt: Takt): Promise<string | null> {
  const archiv = `${RAW}/${annId}.xml.gz`
  if (!FORCE && (frisch(annId) || AUS_ARCHIV) && existsSync(archiv)) {
    return gunzipSync(readFileSync(archiv)).toString('utf8')
  }
  const wartezeit = ABSTAND_MS - (Date.now() - takt.letzte)
  if (wartezeit > 0) await new Promise((r) => setTimeout(r, wartezeit))
  takt.letzte = Date.now()
  try {
    const antwort = await fetch(API + annId, {
      headers: { 'User-Agent': 'anime-kalender.de (nicht-kommerziell, 1 Anfrage/s)' },
    })
    if (!antwort.ok) {
      warn(`ANN ${annId}: HTTP ${antwort.status}`)
      return null
    }
    const xml = await antwort.text()
    writeFileSync(archiv, gzipSync(xml))
    holstand[String(annId)] = new Date().toISOString()
    return xml
  } catch (e) {
    warn(`ANN ${annId}: ${String(e).slice(0, 80)}`)
    return null
  }
}

/** Was die Rohantwort für die Sprecherdatei eines Titels ergab. */
type Ergebnis = 'ohne' | 'gleich' | 'neu' | 'ergaenzt'

/** Führt die deutschen ANN-Rollen in die Sprecherdatei des Titels ein; geschrieben wird nur bei Zuwachs. */
function schreibeRollen(title: Title, annId: number, xml: string): Ergebnis {
  const rollen = deutscheRollen(xml)
  if (!rollen.length) return 'ohne'

  const pfad = `${VOICES}/${title.id}.json`
  const vorher: VoiceFile = existsSync(pfad)
    ? (JSON.parse(readFileSync(pfad, 'utf8')) as VoiceFile)
    : { titleId: title.id, updatedAt: new Date().toISOString(), roles: [] }

  const vorherZahl = vorher.roles.length
  const zusammen = rollenZusammenfuehren<VoiceRole>(
    vorher.roles,
    ohneAnisearchAbgedeckte(vorher.roles, rollen).map((r: AnnRolle) => ({ ...r, von: 'ann' as const })),
  )
  if (zusammen.length === vorherZahl) return 'gleich'

  writeFileSync(
    pfad,
    JSON.stringify({ ...vorher, updatedAt: new Date().toISOString(), roles: zusammen, annUrl: annUrl(annId) }, null, 1),
  )
  return vorherZahl === 0 ? 'neu' : 'ergaenzt'
}

/**
 * Gezählt wird der **Bestand**, nicht der Zuwachs.
 *
 * „0 neue deutsche Rollen" ist bei einer Quelle, die über zweitausend Titel
 * führt und selten nachträgt, der Normalfall — und war trotzdem als
 * Fehlschlag gemeldet. Was der Wächter wissen will, ist, ob die Quelle noch
 * antwortet; das sagt die Zahl der abgefragten Titel, nicht die der neuen.
 *
 * Ein echter Ausfall sieht anders aus: Die Warteschlange hat Titel, und
 * **keiner** davon kommt durch. Dann steht `beantwortet` auf null, und genau
 * das wird gemeldet.
 */
function meldeLauf(bestand: number, zuTunZahl: number, beantwortet: number): void {
  recordSource('ann-voices', bestand, beantwortet ? undefined : `kein einziger von ${zuTunZahl} Titeln beantwortet — Quelle prüfen`)
}

async function main(): Promise<void> {
  const titles = readJson<Title[]>('public/data/titles.json', [])
  const zuordnung = readJson<{ ann?: Record<string, number> }>('data/ann-ids.json', {})
  const ann = zuordnung.ann ?? {}
  if (!Object.keys(ann).length) {
    warn('Keine ANN-Zuordnung — erst "npm run data:ann:ids" laufen lassen.')
    return
  }
  if (!existsSync(RAW)) mkdirSync(RAW, { recursive: true })
  if (!existsSync(VOICES)) mkdirSync(VOICES, { recursive: true })

  const jetzt = Date.now()
  /**
   * Wann welche ANN-Kennung zuletzt abgefragt wurde — im Repo, nicht im
   * Dateisystem.
   *
   * Das Änderungsdatum der Rohdatei taugt dafür nicht: `git checkout` setzt es
   * auf jetzt. Gemessen am 25.08.2026 waren alle 2.114 Dateien „0,4 Tage alt",
   * und in einem CI-Lauf, der frisch klont, wären es Sekunden. Eine Frist
   * darüber hätte die Warteschlange erneut für immer leer gehalten.
   *
   * Gestempelt wird nur nach einer **Antwort** — ein HTTP-Fehler oder ein
   * Netzausfall darf nicht sechzig Tage lang als erledigt gelten.
   */
  const holstand = readJson<Record<string, string>>(HOLSTAND, {})
  const frisch = (annId: number): boolean => {
    const wann = Date.parse(holstand[String(annId)] ?? '')
    return Number.isFinite(wann) && jetzt - wann <= ALTER_TAGE * 24 * 60 * 60 * 1000
  }

  const zuTun = warteschlange(titles, ann, frisch)

  if (!zuTun.length) {
    /**
     * Nichts zu tun ist kein Fehlschlag — und muss auch so gemeldet werden.
     *
     * Ohne diese Zeile verließ der Lauf die Funktion, ohne `recordSource` zu
     * rufen. Der Gesundheitsstand blieb auf dem letzten Wert stehen, alterte
     * vor sich hin und schlug nach neun Tagen Alarm — für einen Lauf, an dem
     * nichts kaputt war.
     */
    log('ANN: nichts nachzuladen — alle Rohdaten sind jünger als die Frist.')
    recordSource('ann-voices', Object.keys(ann).length)
    return
  }
  log(`ANN: ${zuTun.length} Titel werden abgefragt (~${Math.round((zuTun.length * ABSTAND_MS) / 60000)} min)`)

  let neu = 0
  let ergaenzt = 0
  let ohne = 0
  /** Wie oft ANN wirklich geantwortet hat — der einzige Ausfall, der zählt. */
  let beantwortet = 0
  const takt: Takt = { letzte: 0 }

  for (const [i, title] of zuTun.entries()) {
    const annId = ann[String(title.id)]
    const xml = await holeXml(annId, frisch, holstand, takt)
    if (xml === null) continue

    beantwortet++

    const ergebnis = schreibeRollen(title, annId, xml)
    if (ergebnis === 'ohne') {
      ohne++
      continue
    }
    if (ergebnis === 'gleich') continue
    if (ergebnis === 'neu') neu++
    else ergaenzt++

    if ((i + 1) % 50 === 0) log(`  ${i + 1}/${zuTun.length} — ${neu} neu, ${ergaenzt} ergänzt, ${ohne} ohne`)
  }

  log(`ANN fertig: ${neu} Titel erstmals mit deutschen Stimmen, ${ergaenzt} ergänzt, ${ohne} ohne deutsche Rollen`)
  writeJson(HOLSTAND, holstand)
  meldeLauf(Object.keys(ann).length, zuTun.length, beantwortet)
}

await main()
