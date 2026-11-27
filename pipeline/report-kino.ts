/**
 * Kinostarts aus den Anime2You-Vorschlägen — mit Sprachfassung.
 *
 * ## Warum ausgerechnet diese Quelle
 *
 * Am 25.08.2026 wurden für die Frage „läuft dieser Kinofilm auf Deutsch?" sechs
 * Quellen geprüft. Fünf fallen aus:
 *
 * | Quelle | warum nicht |
 * |---|---|
 * | **TMDB** | Termin ja, Fassung nein — über fünf Endpunkte und alle vier Parameterkombinationen geprüft, `iso_639_1` bleibt leer |
 * | **KinoCheck** | nur Trailer und Clips |
 * | **MovieGlu** | `version_type` ist das Bildformat (3D, IMAX), nicht die Sprache; kostenpflichtig, Doku nur UK |
 * | **InsideKino** | gepflegter Startplan, aber null Treffer für „OmU", „OV", „Fassung" |
 * | **Deutsche Synchronkartei** | `robots.txt` sperrt `/suche` **und** `/json/`, keine Sitemap — ohne Suchpfad lässt sich kein Titel zu einer Kennung auflösen |
 * | **kinoheld** | führt die Fassung (`languageFlags`: `deutsch`, `OmU`), lädt die Vorstellungen aber nach, und `/ajax/` ist gesperrt |
 *
 * **Die sechste liegt im Haus.** `scrape-anime2you.ts` liest die Meldungen
 * ohnehin und trägt seit Langem ein Feld `dub: 'ja' | 'offen' | 'unklar'` —
 * gespeist aus Formulierungen wie „mit deutscher Synchronisation sowie im
 * japanischen Originalton mit Untertiteln". Genau der Satz, um den es geht.
 * Ausgewertet hat ihn für Kinostarts nur nie jemand.
 *
 * Gemessen am 25.08.2026 an den vorliegenden Vorschlägen: acht Kino-Artikel,
 * bei **vier** davon steht die deutsche Fassung ausdrücklich zugesagt.
 *
 * ## Warum ein Bericht und kein Automatismus
 *
 * Ein Kinostart ist ein Einzeltermin, und die Zuordnung zu unserem Titel läuft
 * über einen Artikelnamen — beides verträgt keine stille Übernahme. Der Bericht
 * legt vor, ein Mensch trägt ein. Dieselbe Trennung wie bei den
 * Anbieter-Prüfungen.
 *
 * Aufruf: `npm run data:kino-report`
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { readJson, log } from './lib/util.ts'
import type { Title, Release } from '../shared/types.ts'
import { todayIso } from '../shared/time.ts'

const QUELLE = 'data/proposals/anime2you.json'
const ZIEL = 'daniel-zum-abarbeiten/listen/10-kinostarts.md'

interface Vorschlag {
  articleTitle: string
  articleUrl: string
  publishedAt: string
  platforms?: string[]
  dates?: Array<{ iso?: string; month?: string; context?: string }>
  dub: 'ja' | 'offen' | 'unklar'
}

/** Was zwischen den Anführungszeichen einer Anime2You-Überschrift steht. */
function titelAusUeberschrift(zeile: string): string | null {
  return /»([^«]{2,80})«/.exec(zeile)?.[1] ?? null
}

function heute(): string {
  return todayIso()
}

/** Alle künftigen Tage des Artikels, die noch nicht im Kalender stehen; leer = nichts zu tun. */
function offeneTage(v: Vorschlag, jetzt: string, bekannt: Set<string>): string[] {
  /**
   * **Alle genannten Tage, keiner davon geraten.**
   *
   * Der erste Anlauf nahm den spätesten — mit der Begründung, bei einer
   * Verschiebung sei der neue Termin meist der spätere. Der erste Lauf hat
   * das widerlegt: „Nintendo verschiebt den Zelda-Film erneut … statt am
   * 7. Mai 2027 soll er nun am 30. April 2027 anlaufen." Hier ist der
   * **frühere** der neue, und der Bericht nannte den alten.
   *
   * Welcher gilt, steht im Satzbau, nicht in der Reihenfolge. Das ist eine
   * Frage für einen Leser, nicht für eine Regel — deshalb stehen jetzt alle
   * künftigen Tage in der Zeile, und der Zusammenhang aus dem Artikel
   * daneben.
   */
  const tage = [...new Set((v.dates ?? []).map((d) => d.iso).filter((d): d is string => Boolean(d)))]
    .filter((d) => d >= jetzt)
    .sort()
  // Steht **jeder** genannte Tag schon im Kalender, gibt es nichts zu tun.
  if (tage.every((d) => bekannt.has(d))) return []
  return tage
}

/** Unsere Titel, in denen alle bedeutungstragenden Wörter des Filmnamens vorkommen. */
function passendeTitel(name: string, titles: Title[]): Title[] {
  /**
   * **Wortweise, nicht über die ersten vierzehn Zeichen.**
   *
   * Der erste Anlauf schnitt den Namen auf 14 Zeichen und suchte diesen
   * Ausschnitt in jedem Titel. Das ordnete „The Legend of Zelda" unter
   * anderem „Hokuto no Ken: Raoh Gaiden" zu — ein Ausschnitt fester Länge
   * trifft irgendwann irgendetwas.
   *
   * Jetzt müssen **alle** bedeutungstragenden Wörter des Filmnamens im
   * Titel vorkommen. Das ist streng, und das ist die richtige Seite zum
   * Irren: „kein Titel im Bestand" kostet einen Blick, eine falsche
   * Zuordnung einen falschen Kalendereintrag.
   */
  const woerter = name
    .toLowerCase()
    .split(/[^a-zä-ü0-9]+/i)
    .filter((w) => w.length > 2 && !['the', 'der', 'die', 'das', 'und', 'von'].includes(w))
  return woerter.length
    ? titles.filter((t) =>
        [t.titleRomaji, t.titleEn, t.titleDe].some((n) => {
          if (!n) return false
          const klein = n.toLowerCase()
          return woerter.every((w) => klein.includes(w))
        }),
      )
    : []
}

function fassungText(dub: Vorschlag['dub']): string {
  return dub === 'ja'
    ? '**deutsche Fassung zugesagt**'
    : dub === 'offen'
      ? 'Fassung ausdrücklich offen'
      : 'Fassung im Artikel nicht genannt'
}

/** Der Satz aus dem Artikel — er entscheidet bei einer Verschiebung. */
function zusammenhangAus(v: Vorschlag): string | undefined {
  return (v.dates ?? [])
    .map((d) => d.context ?? '')
    .find((c) => c.length > 20)
    ?.replace(/\s+/g, ' ')
    .replace(/\|/g, '/')
    .slice(0, 130)
}

function berichtZeile(v: Vorschlag, tage: string[], titles: Title[]): string {
  const termin = tage.join(' oder ')
  const name = titelAusUeberschrift(v.articleTitle) ?? v.articleTitle
  const treffer = passendeTitel(name, titles)
  const fassung = fassungText(v.dub)
  const zuordnung = treffer.length
    ? treffer.map((t) => `${t.id} (${t.titleRomaji ?? t.titleEn})`).join(', ')
    : '— kein Titel im Bestand'
  const zusammenhang = zusammenhangAus(v)
  return (
    `| ${termin} | ${name} | ${fassung} | ${zuordnung} | [Artikel](${v.articleUrl}) |` +
    (zusammenhang ? `\n| | _${zusammenhang}…_ | | | |` : '')
  )
}

function berichtText(zeilen: string[], jetzt: string): string {
  return [
    '# Kinostarts, die noch nicht im Kalender stehen',
    '',
    `Stand: ${jetzt}. Erzeugt aus \`${QUELLE}\` von \`pipeline/report-kino.ts\`.`,
    '',
    'Anime2You nennt die Sprachfassung im Ankündigungsartikel — und ist damit die',
    'einzige Quelle, die Termin **und** Fassung zugleich liefert. TMDB kennt den',
    'Termin, aber keine Fassung; die Deutsche Synchronkartei sperrt Suche und',
    'JSON-Pfad; kinoheld führt die Fassung, lädt die Vorstellungen aber über einen',
    'gesperrten Pfad nach.',
    '',
    '**Vor dem Eintragen in `data/curated/kino-2026.yaml`:** Steht dort „Fassung im',
    'Artikel nicht genannt", ist das ein Schweigen, kein Nein — dann gehört die',
    'Fassung nachgesehen, nicht geraten.',
    '',
    '| Termin | Film | Sprachfassung | Unser Titel | Quelle |',
    '|---|---|---|---|---|',
    ...zeilen.sort(),
    '',
  ].join('\n')
}

function main(): void {
  const daten = readJson<{ proposals?: Vorschlag[] }>(QUELLE, {})
  const vorschlaege = daten.proposals ?? []
  const kino = vorschlaege.filter(
    (v) => v.platforms?.includes('kino') || /\bkino/i.test(v.articleTitle),
  )

  const titles = readJson<Title[]>('public/data/titles.json', [])
  const releases = readJson<Release[]>('public/data/releases.json', [])
  /** Welche Kino-Termine schon im Kalender stehen. */
  const bekannt = new Set(
    releases
      .filter((r) => r.platform === 'kino')
      .map((r) => r.schedule?.firstEpisodeDate ?? ''),
  )

  const jetzt = heute()
  const zeilen: string[] = []

  for (const v of kino) {
    const tage = offeneTage(v, jetzt, bekannt)
    if (!tage.length) continue
    zeilen.push(berichtZeile(v, tage, titles))
  }

  const text = berichtText(zeilen, jetzt)

  if (!existsSync('daniel-zum-abarbeiten/listen')) mkdirSync('daniel-zum-abarbeiten/listen', { recursive: true })
  writeFileSync(ZIEL, text)

  log(
    `Kinostarts: ${kino.length} Artikel geprüft, ${zeilen.length} Termine noch nicht im Kalender — ${ZIEL}`,
  )
  for (const z of zeilen.sort()) log(`  ${z.replace(/\|/g, '').replace(/\s+/g, ' ').trim().slice(0, 110)}`)
}

main()
