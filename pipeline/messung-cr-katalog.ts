/**
 * Was ändert sich, wenn Crunchyroll aus deutscher Sicht antwortet?
 *
 * Eine Stichprobe, kein Volllauf: Der Zweck ist der **Beleg** dafür, dass der
 * Umbau die Auskunft ändert, und die Zahl dazu. Geschrieben wird nichts außer
 * dem Rohdatenarchiv — `data/crunchyroll-dub.json` bleibt unangetastet, den
 * neuen Stand holt der nächste Nachtlauf.
 *
 * Gelesen wird mit demselben Code wie im Abruf (`lib/crunchyroll-lesen.ts`).
 * Eine nachgebaute zweite Fassung würde messen, was sie selbst tut, und nicht,
 * was der Abruf tut.
 *
 * ## Wie die Stichprobe entsteht
 *
 * **Geschichtet und systematisch**, nicht zufällig und nicht handverlesen: Die
 * Serien des Bestands werden nach ihrem bisherigen Befund gruppiert („kein
 * Deutsch", „Deutsch", „nicht verfügbar", „keine Auskunft"), jede Gruppe nach
 * Kennung sortiert und daraus jede k-te genommen — anteilig zur Gruppengröße.
 * So bildet die Stichprobe den Bestand ab, sie ist ohne Zufallszahl
 * wiederholbar, und niemand kann sich die Fälle aussuchen, die das gewünschte
 * Ergebnis liefern.
 *
 * Aufruf: npx tsx pipeline/messung-cr-katalog.ts [--limit 60] [--pause 400]
 */
import { readJson, log, ROOT } from './lib/util.ts'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { gunzipSync } from 'node:zlib'
import type { Title } from '../shared/types.ts'
import { todayIso } from '../shared/time.ts'
import { beurteile, type CrDubData, type CrSerie } from './lib/crunchyroll-dub.ts'
import { KEINE_STAFFEL, serieLesen } from './lib/crunchyroll-lesen.ts'
import {
  CrunchyrollCms,
  beschaffeZugang,
  ZugangspaketFehlt,
  type CrApiFolge,
  type CrApiObjekt,
  type CrApiStaffel,
  type CrQuelle,
} from './lib/crunchyroll-api.ts'

const args = process.argv.slice(2)
const zahl = (name: string, fallback: number) => {
  const i = args.indexOf(name)
  return i >= 0 ? Number(args[i + 1]) : fallback
}
const LIMIT = zahl('--limit', 60)
const PAUSE_MS = zahl('--pause', 400)
/**
 * Aus dem Archiv rechnen statt neu abzurufen.
 *
 * Derselbe Gedanke wie bei `npm run data:anisearch:check`: Ändert sich die
 * **Auswertung**, muss nicht die Quelle noch einmal belastet werden. Die
 * Rohantworten liegen in `data/crunchyroll-raw/<id>.de.json.gz`, vollständig.
 * Ein Bericht, der aus einer Regeländerung neu entsteht, kostet so null
 * Anfragen — und die Zahlen bleiben dieselben, weil dieselben Antworten
 * dieselbe Auswertung durchlaufen.
 */
const ARCHIV = args.includes('--archiv')

/** Der Befund einer Serie, in fünf Töpfe. */
type Befund = 'kein Deutsch' | 'Deutsch' | 'nicht verfügbar' | 'nicht im Katalog' | 'keine Auskunft'
function befundVon(s: CrSerie | undefined): Befund {
  if (!s) return 'keine Auskunft'
  if (s.nichtVerfuegbar) return 'nicht verfügbar'
  if (s.deutschImAngebot === true) return 'Deutsch'
  if (s.deutschImAngebot === false) return 'kein Deutsch'
  // Eigener Topf, weil es eine Auskunft ist und keine Störung: HTTP 200 mit
  // `total: 0` heißt „diese Serie führt dieser Katalog nicht".
  if (s.fehler === KEINE_STAFFEL) return 'nicht im Katalog'
  return 'keine Auskunft'
}

/**
 * Jede k-te aus einer sortierten Liste — so viele, wie gefordert.
 *
 * Systematisch statt „die ersten n": Die Kennungen sind nach Kennung sortiert,
 * und die ersten n wären damit ein Ausschnitt aus einem einzigen Buchstaben.
 */
function jedeKte<T>(liste: T[], anzahl: number): T[] {
  if (anzahl >= liste.length) return liste
  const schritt = liste.length / anzahl
  return Array.from({ length: anzahl }, (_, i) => liste[Math.floor(i * schritt)])
}

/**
 * Die Rohantworten einer Serie, so wie `serieLesen` sie gelesen hat.
 *
 * Kein Abruf, keine Pause, keine Last. Die `objects`-Antworten liegen als Liste
 * vor und werden hier nach Kennung aufgeschlüsselt, damit derselbe Bündelabruf
 * wieder aufgeht.
 */
class ArchivQuelle implements CrQuelle {
  readonly ausArchiv = true
  private seasons: unknown
  private episodes: Record<string, unknown> = {}
  private objects = new Map<string, CrApiObjekt>()

  constructor(
    seriesId: string,
    readonly katalog: string,
  ) {
    const pfad = resolve(ROOT, `data/crunchyroll-raw/${seriesId}.${katalog}.json.gz`)
    if (!existsSync(pfad)) throw new Error(`kein Archiv zu ${seriesId} im Katalog ${katalog}`)
    const j = JSON.parse(gunzipSync(readFileSync(pfad)).toString()) as {
      seasons: unknown
      episodes: Record<string, unknown>
      objects: { items?: CrApiObjekt[] }[]
    }
    this.seasons = j.seasons
    this.episodes = j.episodes ?? {}
    for (const antwort of j.objects ?? []) for (const o of antwort.items ?? []) this.objects.set(o.id, o)
  }

  private aus<T>(x: unknown): { roh: string; data: T[] } | undefined {
    if (x === undefined) return undefined
    const j = x as { items?: T[]; data?: T[] }
    return { roh: JSON.stringify(x), data: j.items ?? j.data ?? [] }
  }

  staffeln(): Promise<{ roh: string; data: CrApiStaffel[] } | undefined> {
    return Promise.resolve(this.aus<CrApiStaffel>(this.seasons))
  }

  folgen(staffelId: string): Promise<{ roh: string; data: CrApiFolge[] } | undefined> {
    return Promise.resolve(this.aus<CrApiFolge>(this.episodes[staffelId]))
  }

  objekte(guids: string[]): Promise<{ roh: string; data: CrApiObjekt[] } | undefined> {
    const items = guids.map((g) => this.objects.get(g)).filter((o): o is CrApiObjekt => !!o)
    return Promise.resolve({ roh: JSON.stringify({ total: items.length, items }), data: items })
  }
}

interface Urteile {
  ja: number
  nein: number
}

interface Zeile {
  id: string
  name: string
  alt: Befund
  neu: Befund
  altDeutsch: number
  neuDeutsch: number
  altUrteile: Urteile
  neuUrteile: Urteile
  widerspruch?: string
}

interface Bestandssicht {
  bestand: CrDubData
  /** Je Serienkennung ein Eintrag — der Bestand ist nach Adresse geschlüsselt. */
  jeSerie: Map<string, CrSerie>
  /** Alle unsere Adressen zu einer Kennung — an ihnen hängen die Verweise. */
  adressenJeSerie: Map<string, string[]>
  titelJeAdresse: Map<string, Title[]>
}

function bestandLesen(): Bestandssicht {
  const titles = readJson<Title[]>('public/data/titles.json', [])
  const bestand = readJson<CrDubData>('data/crunchyroll-dub.json', { scrapedAt: '', serien: [] })
  const jeSerie = new Map<string, CrSerie>()
  for (const s of bestand.serien) {
    if (!s.seriesId || jeSerie.has(s.seriesId)) continue
    jeSerie.set(s.seriesId, s)
  }
  const adressenJeSerie = new Map<string, string[]>()
  for (const s of bestand.serien) {
    if (!s.seriesId) continue
    adressenJeSerie.set(s.seriesId, [...(adressenJeSerie.get(s.seriesId) ?? []), s.url])
  }
  const titelJeAdresse = new Map<string, Title[]>()
  for (const t of titles) {
    for (const stream of t.streams) {
      if (stream.platform !== 'crunchyroll') continue
      titelJeAdresse.set(stream.url, [...(titelJeAdresse.get(stream.url) ?? []), t])
    }
  }
  return { bestand, jeSerie, adressenJeSerie, titelJeAdresse }
}

/** Geschichtet ziehen: je Topf so viele, wie sein Anteil hergibt. */
function stichprobeZiehen(jeSerie: Map<string, CrSerie>): string[] {
  const toepfe = new Map<Befund, string[]>()
  for (const [id, s] of jeSerie) {
    const b = befundVon(s)
    toepfe.set(b, [...(toepfe.get(b) ?? []), id])
  }
  const gesamt = jeSerie.size
  const stichprobe: string[] = []
  for (const [, ids] of [...toepfe].sort((a, b) => b[1].length - a[1].length)) {
    const anteil = Math.round((ids.length / gesamt) * LIMIT)
    stichprobe.push(...jedeKte(ids.slice().sort(), Math.min(anteil, LIMIT - stichprobe.length)))
  }
  return stichprobe
}

/** Zählt, wie viele Verweise ein belegtes Urteil bekommen. */
function urteileZu(serie: CrSerie, sicht: Bestandssicht): Urteile {
  let ja = 0
  let nein = 0
  for (const url of sicht.adressenJeSerie.get(serie.seriesId ?? '') ?? []) {
    for (const u of beurteile({ ...serie, url }, sicht.titelJeAdresse.get(url) ?? [])) {
      if (u.dub) ja++
      else nein++
    }
  }
  return { ja, nein }
}

async function serieMessen(id: string, cms: CrunchyrollCms | undefined, sicht: Bestandssicht): Promise<Zeile> {
  const alt = sicht.jeSerie.get(id) as CrSerie
  // Kein Seitenaufruf: Der Browser bliebe für eine Messung ungenutzt teuer,
  // und „nicht verfügbar" ist hier nicht die Frage.
  const neu = await serieLesen(cms ?? new ArchivQuelle(id, 'de'), alt.url, id)
  // Der Slug der Adresse, nicht der Staffelname: Der heißt oft „Staffel 1"
  // und sagt dann nichts darüber, um welche Serie es geht.
  const slug = alt.url.split(/[?#]/)[0].replace(/\/$/, '').split('/').pop() ?? id
  const name = /^[A-Z0-9]{8,}$/.test(slug) ? (neu.staffeln?.[0]?.name ?? id) : slug
  const zaehle = (s: CrSerie) => (s.staffeln ?? []).reduce((n, st) => n + st.deutsch, 0)
  return {
    id,
    name,
    alt: befundVon(alt),
    neu: befundVon(neu),
    altDeutsch: zaehle(alt),
    neuDeutsch: zaehle(neu),
    altUrteile: urteileZu(alt, sicht),
    neuUrteile: urteileZu(neu, sicht),
    widerspruch: neu.namensWiderspruch,
  }
}

async function alleMessen(
  stichprobe: string[],
  cms: CrunchyrollCms | undefined,
  sicht: Bestandssicht,
): Promise<Zeile[]> {
  const zeilen: Zeile[] = []
  for (const [i, id] of stichprobe.entries()) {
    const z = await serieMessen(id, cms, sicht)
    zeilen.push(z)
    log(
      `  ${i + 1}/${stichprobe.length} ${z.alt} → ${z.neu}  ${z.name.slice(0, 44)} ` +
        `(${z.altDeutsch} → ${z.neuDeutsch} deutsche Folgen)`,
    )
  }
  return zeilen
}

const BEFUNDE: Befund[] = ['kein Deutsch', 'Deutsch', 'nicht verfügbar', 'nicht im Katalog', 'keine Auskunft']

function kreuztabelle(zeilen: Zeile[]): string[] {
  const kreuz = new Map<string, number>()
  for (const z of zeilen) kreuz.set(`${z.alt}|${z.neu}`, (kreuz.get(`${z.alt}|${z.neu}`) ?? 0) + 1)
  const k: string[] = []
  k.push(`| bisher \\ jetzt | ${BEFUNDE.join(' | ')} | Summe |`)
  k.push(`|---|${BEFUNDE.map(() => '---').join('|')}|---|`)
  for (const a of BEFUNDE) {
    const zeile = BEFUNDE.map((b) => kreuz.get(`${a}|${b}`) ?? 0)
    if (!zeile.some(Boolean)) continue
    k.push(`| **${a}** | ${zeile.join(' | ')} | ${zeile.reduce((x, y) => x + y, 0)} |`)
  }
  return k
}

function serienTabelle(zeilen: Zeile[]): string[] {
  const t: string[] = []
  t.push('| Serie | bisher (US) | jetzt (DE) | deutsche Folgen | belegte Verweise |')
  t.push('|---|---|---|---|---|')
  for (const z of zeilen.slice().sort((a, b) => a.alt.localeCompare(b.alt) || a.name.localeCompare(b.name))) {
    const v = (u: Urteile) => `${u.ja}✓/${u.nein}✕`
    t.push(
      `| ${z.name.replace(/\|/g, '/')} | ${z.alt} | ${z.neu}${z.alt !== z.neu ? ' **↺**' : ''} | ` +
        `${z.altDeutsch} → ${z.neuDeutsch} | ${v(z.altUrteile)} → ${v(z.neuUrteile)} |`,
    )
  }
  return t
}

interface Kennzahlen {
  belastbarVorher: number
  belastbarNachher: number
  gedreht: Zeile[]
  keinDeutschAlt: Zeile[]
}

function kennzahlen(zeilen: Zeile[]): Kennzahlen {
  return {
    belastbarVorher: zeilen.reduce((n, z) => n + z.altUrteile.ja + z.altUrteile.nein, 0),
    belastbarNachher: zeilen.reduce((n, z) => n + z.neuUrteile.ja + z.neuUrteile.nein, 0),
    gedreht: zeilen.filter((z) => z.alt === 'kein Deutsch' && z.neu === 'Deutsch'),
    keinDeutschAlt: zeilen.filter((z) => z.alt === 'kein Deutsch'),
  }
}

function berichtBauen(zeilen: Zeile[], sicht: Bestandssicht, kz: Kennzahlen): string {
  const { belastbarVorher, belastbarNachher, gedreht, keinDeutschAlt } = kz
  const gesamt = sicht.jeSerie.size
  const nichtImKatalog = zeilen.filter((z) => z.neu === 'nicht im Katalog')
  const widersprueche = zeilen.filter((z) => z.widerspruch)
  return [
    '# Der deutsche Katalog gegen den alten Bestand — Stichprobe von ' + zeilen.length + ' Serien',
    '',
    `Gemessen am ${todayIso()} mit \`npx tsx pipeline/messung-cr-katalog.ts\`,`,
    `Bucket \`/DE/M2/-\`, ${PAUSE_MS} ms Pause zwischen den Abrufen. Der alte Stand stammt aus`,
    `\`data/crunchyroll-dub.json\` (Lauf vom ${sicht.bestand.scrapedAt.slice(0, 10)}, US-Katalog).`,
    '',
    `Die Stichprobe ist **geschichtet und systematisch** gezogen: ${gesamt} Serien des Bestands nach`,
    'bisherigem Befund gruppiert, je Gruppe anteilig jede k-te Kennung. Keine Zufallszahl, keine',
    'Handauswahl — der Lauf ist wiederholbar, und niemand kann sich die Fälle aussuchen.',
    '',
    '## Was sich verschiebt',
    '',
    ...kreuztabelle(zeilen),
    '',
    `**${gedreht.length} von ${keinDeutschAlt.length}** Serien, die bisher als „kein Deutsch" galten, führen im`,
    `deutschen Katalog eine deutsche Fassung — ${keinDeutschAlt.length ? Math.round((gedreht.length / keinDeutschAlt.length) * 100) : 0} Prozent.`,
    '',
    `**${nichtImKatalog.length} von ${zeilen.length}** Serien führt der deutsche Katalog überhaupt nicht (HTTP 200,`,
    '`total: 0`), während der US-Katalog volle Folgenlisten liefert. Das ist eine Auskunft und keine',
    'Störung — zu `nichtVerfuegbar` wird daraus trotzdem nichts, weil der zweite Beleg (Crunchyrolls',
    'eigene Fehlerseite) im Cloud-Lauf weiterhin aus US-Sicht gelesen wird.',
    '',
    '## Belegte Verweise',
    '',
    `| | vorher | nachher |`,
    `|---|---|---|`,
    `| Verweise mit belegtem Urteil | ${belastbarVorher} | ${belastbarNachher} |`,
    '',
    '## Widerspruch zwischen Staffelname und `versions`',
    '',
    widersprueche.length
      ? widersprueche.map((z) => `- ${z.name}: ${z.widerspruch}`).join('\n')
      : 'Kein Fall in dieser Stichprobe.',
    '',
    '## Jede Serie einzeln',
    '',
    ...serienTabelle(zeilen),
    '',
  ].join('\n')
}

async function main(): Promise<void> {
  // Ohne Abruf braucht es kein Paket — der Bucket steht im Archiv.
  const zugang = ARCHIV ? undefined : await beschaffeZugang()
  if (zugang) log(`Zugangspaket für ${zugang.land}, Bucket ${zugang.bucket}, gültig bis ${zugang.gueltig_bis}`)
  else log('Aus dem Archiv gerechnet — kein einziger Abruf.')
  const cms = zugang ? new CrunchyrollCms(zugang, PAUSE_MS) : undefined

  const sicht = bestandLesen()
  const stichprobe = stichprobeZiehen(sicht.jeSerie)
  log(`${sicht.jeSerie.size} Serien im Bestand, ${stichprobe.length} in der Stichprobe`)

  const zeilen = await alleMessen(stichprobe, cms, sicht)
  const kz = kennzahlen(zeilen)

  const pfad = resolve(ROOT, 'docs/messung-crunchyroll-de-katalog.md')
  writeFileSync(pfad, berichtBauen(zeilen, sicht, kz))
  log(`\nBericht in docs/messung-crunchyroll-de-katalog.md`)
  log(`${kz.gedreht.length} von ${kz.keinDeutschAlt.length} „kein Deutsch" haben in Wahrheit eine deutsche Fassung`)
  log(`belegte Verweise: ${kz.belastbarVorher} → ${kz.belastbarNachher}`)
}

main().catch((err) => {
  if (err instanceof ZugangspaketFehlt) {
    console.error(`\nMessung nicht möglich: ${err.message}`)
    process.exit(1)
  }
  console.error(err)
  process.exit(1)
})
