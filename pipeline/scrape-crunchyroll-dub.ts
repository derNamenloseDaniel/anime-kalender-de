/**
 * Liest bei Crunchyroll nach, welche Folgen deutsch vertont sind.
 *
 * Warum überhaupt: Ein Stream-Verweis sagt nur, **dass** ein Titel dort läuft.
 * Für 1.156 Crunchyroll-Verweise stand deshalb dauerhaft „🇩🇪 ?" — und die von
 * Hand abzuarbeiten hieße, jede einzelne Seite selbst zu öffnen.
 *
 * ## Der Regelweg: der deutsche Katalog über die beta-api
 *
 * Abgefragt wird `beta-api.crunchyroll.com/cms/v2<bucket>` mit einem
 * **Zugangspaket** aus `CR_ZUGANG` — einer CloudFront-Signatur, die an einer
 * deutschen Leitung entstanden ist und deshalb den deutschen Katalog öffnet,
 * auch von einem Rechner in den USA. Aufrufe, Felder und Grenzen stehen in
 * `lib/crunchyroll-api.ts`, der Ablauf je Serie in `lib/crunchyroll-lesen.ts`.
 *
 * **Ohne gültiges Paket läuft gar nichts.** Kein stilles Ausweichen auf den
 * US-Katalog: Ein Lauf, der unbemerkt die falsche Region liest, ist schlimmer
 * als keiner. Er schreibt Befunde in den Datensatz, die für Deutschland nichts
 * belegen, und niemand sieht es der Datei an. Das Paket gilt 24 Stunden und
 * wird mit `node tools/cr-zugang-holen.mjs --secret` erneuert.
 *
 * Maßgeblich ist ausschließlich `de-DE` in `versions`. `is_dubbed` steht schon
 * auf `true`, wenn es irgendeine Synchronfassung gibt — wer danach ginge, hielte
 * jede Folge für deutsch synchronisiert.
 *
 * ## Die erste Rückfallebene: die Content-API im Browser (`--browser`)
 *
 * Der Weg von vor dem 22.08.2026: Token von der Aufwärmseite mitnehmen, danach
 * über `page.evaluate(fetch(…))` abfragen. Er kommt ohne Zugangspaket aus und
 * ist damit die Antwort auf „das Paket ist abgelaufen und niemand in
 * Deutschland kann gerade ein neues holen". Was er liest, ist der Katalog der
 * Region, in der der Rechner steht — deshalb trägt sein Ergebnis **kein**
 * `katalog`, und ein fehlendes `de-DE` belegt daraus nichts.
 *
 * ## Die zweite Rückfallebene: die gerenderte Seite lesen (`--seitenanzeige`)
 *
 * Der alte Weg steht weiter unten und bleibt aufrufbar, falls Crunchyroll die
 * Schnittstelle ändert. Er ist **langsam** — 17 bis 23 Sekunden je Serie gegen
 * 70 bis 250 Millisekunden — und gröber: Er liest Textmuster („Audio: Deutsch",
 * „Synchro | Untertitel"), hängt damit an Crunchyrolls Übersetzungen und kennt
 * die Folgen nur als Kacheln. Er wird nicht gepflegt, sondern verwahrt.
 *
 * ## Zur Kennung — eine bewusste Ausnahme
 *
 * Dieser Abruf gibt sich als Chrome aus. Bei ADN und aniSearch haben wir genau
 * das abgeräumt, weil eine gefälschte Kennung dem Betreiber die Möglichkeit
 * nimmt, uns anzuschreiben statt auszusperren. Hier ist es eine gemessene
 * Entscheidung, keine Nachlässigkeit: Mit der ehrlichen Kennung antwortet
 * Crunchyroll zwar mit HTTP 200, liefert aber eine leere Hülle von 1,4 KB ohne
 * Titel und ohne Inhalt (geprüft am 12.08.2026). Es gibt also keinen ehrlichen
 * Weg zu diesen Daten, sondern nur diesen oder gar keinen.
 *
 * Was dafür spricht, ihn zu gehen: `robots.txt` erlaubt `/series/`, `/content/`
 * und `/auth/` ausdrücklich (gesperrt sind Suche, Konto, Merkliste,
 * Bezahlseiten — geprüft am 21.08.2026), es gibt kein Crawl-delay, und der
 * Abruf bleibt getaktet: Auch 200 Millisekunden je Aufruf werden nicht
 * ausgereizt, es bleibt eine Pause dazwischen.
 *
 * Aufruf: npm run data:cr-dub [-- --limit 10] [-- --nur <urlteil>]
 *                             [-- --browser] [-- --seitenanzeige] [-- --pause 400]
 */
import { chromium, type Page } from 'playwright'
import { log, readJson, writeJson } from './lib/util.ts'
import { recordSource } from './lib/health.ts'
import { fortschrittsMelder } from './lib/lauf-fortschritt.ts'
import { browserHolerMit } from './lib/cr-browser-start.ts'
import type { Title } from '../shared/types.ts'
import { todayIso } from '../shared/time.ts'
import type { CrSerie, CrStaffel } from './lib/crunchyroll-dub.ts'
import { offenMelden } from './lib/cr-offen.ts'
import { waehleAdressen, type AuswahlSchalter } from './lib/cr-dub-auswahl.ts'
import { ladeKennungen, kennungenSichern } from './lib/cr-dub-kennungen.ts'
import { bearbeiteAdresse, type AdressErgebnis, type AdressKontext } from './lib/cr-dub-adresse.ts'
import { leseAlleSeitenanzeige } from './lib/cr-dub-seitenanzeige.ts'
import {
  CrunchyrollApi,
  CrunchyrollCms,
  CrunchyrollSeiten,
  ZugangspaketFehlt,
  beschaffeZugang,
  bucketLand,
  type CrQuelle,
  type CrZugang,
  type Tonspur,
} from './lib/crunchyroll-api.ts'

const CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'

const args = process.argv.slice(2)
const zahl = (name: string, fallback: number) => {
  const i = args.indexOf(name)
  return i >= 0 ? Number(args[i + 1]) : fallback
}
const LIMIT = zahl('--limit', 0)
const NUR = args.indexOf('--nur') >= 0 ? args[args.indexOf('--nur') + 1] : undefined
/** Ignoriert den vorhandenen Stand und holt alles neu. */
const NEU = args.includes('--neu')
/** Nur die Seiten, bei denen der letzte Lauf einen Fehler vermerkt hat. */
const NUR_FEHLER = args.includes('--nur-fehler')
/**
 * **Nur die Serien, bei denen `fetch-crunchyroll-neu.ts` heute etwas gefunden hat.**
 *
 * Der Neuzugangs-Lauf sieht täglich nach, was auf Deutsch dazugekommen ist, und
 * hebt damit die Wiedervorlage der betroffenen Serien auf — nur greift das
 * erst, wenn dieser Lauf das nächste Mal läuft, und das ist montags. Bei den
 * „Lord of Mysteries"-Specials (erschienen Donnerstag, den 10.09.2026) wären
 * das fünf Tage gewesen: besser als die vier Wochen vorher, aber nicht gut.
 *
 * Mit diesem Schalter kostet derselbe Lauf **täglich** fast nichts: Am
 * 12.09.2026 standen in den 400 jüngsten Crunchyroll-Folgen 20 Serien mit
 * neuen deutschen Folgen, gegenüber rund 1.100 Serien im vollen Durchlauf. Der
 * Rest bleibt dem Wochenlauf überlassen — die Frage „hat sich bei einer Serie
 * unbemerkt etwas geändert" ist eine andere als „ist heute etwas erschienen".
 */
const NUR_NEU = args.includes('--nur-neu')
/** Zählt nur, wie viele Serien dran wären (ohne Zugangspaket, ohne Abruf); der Stundenlauf holt das Paket danach nur bei > 0. */
const OFFEN_PRUEFEN = args.includes('--offen-pruefen')
/**
 * Ab wann eine gelesene Seite erneut drankommt.
 *
 * Der Grund für die Wiedervorlage: Bis zum 15.08.2026 entstand die
 * Kandidatenliste aus `stream.dub === undefined` — also aus „noch nie
 * beantwortet". Was einmal als `false` im Datensatz stand, fiel damit dauerhaft
 * aus der Warteschlange, und ein Falschnegativ konnte sich nie mehr korrigieren.
 * Genau das ist der wahrscheinlichere Fall, seit klar ist, dass Crunchyroll
 * Gästen weniger zeigt als Angemeldeten.
 *
 * Vier Wochen sind ein Kompromiss: Eine Synchro erscheint nicht wöchentlich neu,
 * und 917 Seiten wöchentlich zu holen wäre Last ohne Gegenwert.
 */
const ALTER_GESETZT = args.includes('--alter')
const WIEDERVORLAGE_TAGE = zahl('--alter', 28)
/**
 * Wie lange eine **Nichtauskunft** ihre eigene Wiederholung blockiert.
 *
 * Ein Eintrag mit `fehler` ist keine Antwort — er sagt, dass gerade nichts zu
 * erfahren war. Die Wiedervorlage von vier Wochen gilt trotzdem für ihn, und
 * das ist am 21.08.2026 teuer geworden: Ein Lauf mit noch fehlender
 * Wiederholung schrieb 371-mal „keine Serienkennung hinter dieser Adresse" und
 * 204-mal „Staffelliste hat nicht geantwortet". Der Lauf danach — mit der
 * Wiederholung — rührte diese 575 Adressen nicht mehr an: Sie galten als frisch
 * geprüft. Eine einmalige Störung hätte damit 575 Serien für vier Wochen
 * stillgelegt, und zwar genau die, über die wir nichts wissen.
 *
 * Sieben Tage statt eines Tages, weil manche Adressen dauerhaft nichts hergeben
 * (tote Slugs ohne Fehlerseite). Die kosten dann einen Seitenaufruf je Woche
 * statt einen je Lauf.
 */
const FEHLER_TAGE = zahl('--fehler-alter', 7)
/**
 * **`--offen`: nur Adressen ohne Sprachurteil, für einen gezielten Lauf.**
 *
 * Die Warteschlange geht bewusst über **alle** Adressen und sortiert nach dem
 * Alter — ein `dub === undefined` als Kriterium wäre eine Einbahnstraße, siehe
 * die Begründung weiter unten. Daran ändert dieser Schalter nichts: Er ist
 * kein anderer Regelweg, sondern eine Auswahl für den Fall, dass man **jetzt**
 * eine bestimmte Lücke schließen will.
 *
 * Anlass (07.09.2026): 47 Crunchyroll-Verweise trugen kein Urteil, und ein
 * Lauf über 120 Adressen nach Alter berührte keinen einzigen davon — er
 * arbeitete die ältesten Prüfungen ab, und die waren längst beantwortet. Mit
 * `--offen` kostet dieselbe Lücke 47 Abrufe statt eines vollen Durchlaufs.
 */
const NUR_OFFENE = args.includes('--offen')
/** Rückfallebene: die gerenderte Seite lesen statt der Content-API. */
const SEITENANZEIGE = args.includes('--seitenanzeige')
/**
 * Rückfallebene: die Content-API im Browser statt der beta-api mit Signatur.
 *
 * Der Schalter existiert für den einen Fall, in dem der Regelweg nicht geht —
 * kein gültiges Zugangspaket und niemand in Deutschland, der eins holen kann.
 * Er liest dann den Katalog der Region, in der der Rechner steht, und sagt das
 * auch: Das Ergebnis trägt kein `katalog`, und `beurteile()` macht daraus kein
 * `dub: false`.
 */
const BROWSER = args.includes('--browser')
/**
 * Pause zwischen zwei Aufrufen. Die Taktung bleibt rücksichtsvoll.
 *
 * 400 statt 250 Millisekunden, und das ist gemessen, nicht geschätzt: Mit 250
 * lief der Lauf vom 21.08.2026 nach rund 300 Serien in 25 Minuten in
 * Crunchyrolls Bot-Sperre (HTTP 403, danach kein Token mehr). Die Sperre löste
 * sich nach einer Viertelstunde von selbst. Schneller zu fahren, als der
 * Betreiber es duldet, bringt nichts ein — der Lauf endet dann früher, statt
 * mehr zu schaffen.
 */
const PAUSE_MS = zahl('--pause', 500)

// Die Typen stehen in `lib/crunchyroll-dub.ts` — dort, wo auch die Auswertung
// wohnt. Zwei Fassungen desselben Typs laufen unweigerlich auseinander.
export type { CrStaffel, CrSerie } from './lib/crunchyroll-dub.ts'

// ─────────────────── Rückfallebene: die gerenderte Seite lesen ───────────────
//
// Alles ab hier ist der Weg von vor dem 21.08.2026 und wird nur noch mit
// `--seitenanzeige` aufgerufen. Er bleibt, weil er ohne die Content-API
// auskommt: Ändert Crunchyroll die Schnittstelle, ist er die einzige Auskunft,
// die noch da ist. Zu wissen ist über ihn zweierlei — er braucht 17 bis 23
// Sekunden je Serie statt 70 bis 250 Millisekunden, und er liest Textmuster
// („Audio: Deutsch"), hängt also an Crunchyrolls Übersetzungen.

/**
 * Liest die Tonspur einer Folgenkachel.
 *
 * Die Unterscheidung steckt im Sprachzusatz: „Synchro" allein ist die deutsche
 * Fassung, „Synchro English" eine fremde. Ohne diese Trennung zählte man die
 * englische Fassung als deutsche mit — bei „Slime" wäre das eine Folge zu viel.
 */
function tonspurAus(text: string): Tonspur {
  const teile = text.split('|').map((t) => t.trim())
  const synchro = teile.find((t) => /^Synchro\b/i.test(t))
  if (!synchro) return 'keine'
  return /^Synchro$/i.test(synchro) ? 'deutsch' : 'fremd'
}

/**
 * Lädt alle Folgenkacheln einer Staffel nach.
 *
 * Die Liste zeigt zunächst **zwanzig** Kacheln und lädt weitere erst auf einen
 * Klick auf „Mehr anzeigen" — Scrollen allein bewirkt nichts. Genau das hat
 * beim ersten Versuch drei Staffeln von „Slime" einträchtig als „20/20"
 * gemeldet, obwohl keine von ihnen zwanzig Folgen hat (12.08.2026). Eine
 * abgeschnittene Zählung ist schlimmer als gar keine: Sie sieht vollständig aus.
 *
 * Abbruch, wenn der Knopf verschwindet **oder** ein Klick keine neue Kachel
 * mehr bringt — der zweite Fall fängt ab, dass „Mehr anzeigen" auch am
 * Serientext hängt und dort nichts nachlädt.
 */
async function bisAnsEnde(page: Page): Promise<void> {
  const zaehlen = () => page.evaluate(() => document.querySelectorAll('[data-t^="episode-card"]').length)
  let vorher = await zaehlen()
  for (let runde = 0; runde < 40; runde++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2))
    await page.waitForTimeout(400)
    const knopf = page.locator('button:has-text("Mehr anzeigen"), button:has-text("Show more")').last()
    if (!(await knopf.count())) break
    await knopf.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => undefined)
    await knopf.click({ timeout: 4000 }).catch(() => undefined)
    await page.waitForTimeout(900)
    const jetzt = await zaehlen()
    if (jetzt === vorher) break
    vorher = jetzt
  }
}

/**
 * Zählt die Folgen der gerade sichtbaren Staffel.
 *
 * Bewusst über die Kacheln selbst (`[data-t^="episode-card"]`) statt über
 * `innerText` der Seite: Im Fließtext steht dieselbe Zeichenfolge auch im Kopf
 * der Serie („Untertitel | Synchro" neben den Genres), und die zählte sonst als
 * Folge mit — bei „Slime" ergaben sich so 50 Badges auf 40 Kacheln.
 *
 * Der Name der Staffel steht im Auswahlfeld selbst (`.erc-seasons-select
 * .season-info`), nicht in einer Überschrift. Das ist der Unterschied zwischen
 * „12/12" und „Staffel 4: 12/12" — und ohne ihn ist die Zahl wertlos, weil
 * niemand weiß, worauf sie sich bezieht.
 */
async function staffelZaehlen(page: Page): Promise<{ name: string; karten: { nummer: string; badge: string }[] }> {
  return page.evaluate(() => {
    const karten = [...document.querySelectorAll('[data-t^="episode-card"]')].map((k) => {
      const zeilen = [...k.querySelectorAll('*')]
        .filter((e) => e.children.length === 0)
        .map((e) => (e.textContent || '').trim())
      return {
        // „E12 – Die Entwicklung von Tempest" → „E12"
        nummer: (zeilen.find((t) => /^E\d+\b/.test(t)) ?? '').match(/^E\d+/)?.[0] ?? '',
        badge: zeilen.find((t) => /^(Synchro|Untertitel)\b/.test(t)) ?? '',
      }
    })
    const feld = document.querySelector('.erc-seasons-select .season-info')
    // Der Knopf doppelt seinen Text („Staffel 1Staffel 1"); die erste Hälfte
    // genügt.
    const roh = (feld?.textContent || '').replace(/\s+/g, ' ').trim()
    const haelfte = roh.length > 1 && roh.slice(0, roh.length / 2) === roh.slice(roh.length / 2)
    return { name: (haelfte ? roh.slice(0, roh.length / 2) : roh) || 'einzige Staffel', karten }
  })
}

/**
 * Blättert zur nächsten Staffel. Gibt false zurück, wenn es keine mehr gibt.
 *
 * Über die Vor/Zurück-Knöpfe statt über die aufklappende Liste: Die Liste
 * verlangt einen Klick zum Öffnen, einen zum Auswählen und lässt sich schwerer
 * daraufhin prüfen, ob sie überhaupt offen ist. Der Wechsel gilt erst als
 * vollzogen, wenn sich der angezeigte Name geändert hat — sonst zählt man
 * dieselbe Staffel zweimal.
 */
async function naechsteStaffel(page: Page, bisher: string): Promise<boolean> {
  const knopf = page.locator('[data-t="next-season"]').first()
  if (!(await knopf.count())) return false
  const klickbar = await knopf.isEnabled().catch(() => false)
  if (!klickbar) return false
  await knopf.click({ timeout: 4000 }).catch(() => undefined)
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(500)
    const { name } = await staffelZaehlen(page)
    if (name && name !== bisher) return true
  }
  return false
}

export async function serieLesenSeitenanzeige(page: Page, url: string): Promise<CrSerie> {
  const heute = todayIso()
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })

  /**
   * Erst warten, bis die Audio-Zeile **da** ist — nicht stur 4,5 Sekunden.
   *
   * `domcontentloaded` feuert, sobald das erste HTML geparst ist: vor der
   * Weiterleitung von der alten Slug-Adresse auf `/series/<id>/` und vor dem
   * Aufbau der Anwendung. Der feste Schlaf danach traf das Ziel oft nicht, und
   * dann las der Scraper die Zeile der **vorherigen** Seite.
   *
   * Die Zahlen dazu, gemessen am Lauf vom 20.08.2026: Über die Slug-Form fand
   * er auf nur 12 Prozent der Seiten Deutsch, über die `/series/`-Form auf 39
   * Prozent. Dieselben Seiten, dreifacher Unterschied — der Verdacht kam von
   * Daniel („wartet der Scraper evtl. die Weiterleitung nicht ab?"), und er
   * stimmte.
   */
  /**
   * Auf das Erste warten, was die Seite zu sagen hat — Banner oder Audio-Zeile.
   *
   * Beides erscheint erst, wenn die Seite fertig gerendert ist; die Seite wird
   * mit `domcontentloaded` geladen, und zu dem Zeitpunkt steht keines von
   * beiden da. Ein erster Versuch am 21.08.2026 fragte den Banner direkt nach
   * dem Laden ab und fand nie einen — der Abruf lief weiter in den
   * Zwanzig-Sekunden-Ablauf der Audio-Zeile, genau wie vorher. Aufgefallen ist
   * es nur, weil Daniel fragte, ob der Lauf überhaupt geprüft sei; zu dem
   * Zeitpunkt arbeitete er bereits seit zwei Stunden an 594 Seiten für nichts.
   *
   * Ein einziges Warten auf beide Möglichkeiten ist die Antwort — und nebenbei
   * schneller als zwei nacheinander.
   */
  const befund = await page
    .waitForFunction(
      () => {
        const text = document.body.innerText
        const weg = text.match(/^.*nicht mehr verfügbar.*$/m)
        if (weg) return { art: 'weg', zeile: weg[0] }
        // Crunchyrolls eigene Fehlerseite. Sie steht sofort da und ist an ihrer
        // Länge zu erkennen — rund 1.160 Zeichen, immer derselbe Text.
        const fehlt = text.match(/^404 - Seite nicht gefunden.*$/m)
        if (fehlt) return { art: 'fehlt', zeile: fehlt[0] }
        const ton = text.match(/^Audio:.*$/m)
        if (ton) return { art: 'audio', zeile: ton[0] }
        return null
      },
      undefined,
      { timeout: 20000 },
    )
    .then((h) => h.jsonValue() as Promise<{ art: string; zeile: string }>)
    .catch(() => null)

  /**
   * Crunchyroll sagt selbst, dass es die Serie nicht mehr gibt.
   *
   * Das ist `available: false` und nicht `dub: false`: Es fehlt das Angebot,
   * nicht die deutsche Fassung (Daniel, 21.08.2026, an „Dragon Ball" gezeigt).
   */
  if (befund?.art === 'weg' || befund?.art === 'fehlt') {
    /**
     * Zwei Wege, dasselbe Ergebnis — und der Unterschied gehört trotzdem
     * festgehalten.
     *
     * „Leider sind die Videos dieser Serie nicht mehr verfügbar" heißt: Es gab
     * ein Angebot, es ist weg. „404 - Seite nicht gefunden" heißt: Diese
     * Adresse führt ins Nichts, meist eine veraltete Slug-Form aus AniList.
     * Beides ist `available: false`, aber die Notiz sagt, welches von beidem.
     *
     * Die 404-Erkennung kam am 21.08.2026 dazu, nachdem der Reparaturlauf mit
     * 23 Sekunden je Serie hochgerechnet 216 Minuten gebraucht hätte — bei
     * einem Timeout von 180. Fünf Stichproben zeigten: immer 1.508 Zeichen,
     * nie eine Audio-Zeile, nie ein Banner. Es waren Fehlerseiten, und die
     * stehen nach 250 Millisekunden fest.
     */
    return { url, quelle: 'seitenanzeige', nichtVerfuegbar: true, geprueftAm: heute, fehler: befund.zeile.trim() }
  }

  const audio = befund?.art === 'audio' ? befund.zeile : ''


  /**
   * Keine Zeile heißt **nicht gesehen**, nicht „kein Deutsch".
   *
   * Hier stand `deutschImAngebot: false` — ein Fehlschlag als Befund, und damit
   * genau der Fehler, den dieses Projekt an drei anderen Stellen schon einmal
   * gemacht hat. Daniel am 20.08.2026: „dann mach dass er erst prüft ob er das
   * Element überhaupt findet, und dann ‚Nicht gefunden' statt ‚nicht auf
   * deutsch'."
   */
  if (!audio) return { url, quelle: 'seitenanzeige', geprueftAm: heute, fehler: 'keine Audio-Zeile gefunden' }

  // Stufe 1 — und für die meisten Seiten schon das Ende.
  if (!/\bDeutsch\b/.test(audio)) return { url, quelle: 'seitenanzeige', deutschImAngebot: false, geprueftAm: heute }

  /**
   * Stufe 2: jede Staffel einzeln zählen.
   *
   * Nötig, weil die Audio-Zeile schon dasteht, wenn eine **einzige** Folge
   * deutsch ist. Bei „That Time I Got Reincarnated as a Slime" fehlt den
   * letzten beiden Folgen der vierten Staffel die deutsche Fassung, und
   * einzelne Einträge des Wählers — Filme, OVAs — sind gar nicht vertont.
   * Ohne das Durchblättern würde aus „ein Teil ist
   * deutsch" ein „alles ist deutsch".
   */
  const staffeln: CrStaffel[] = []
  const gesehen = new Set<string>()
  for (let runde = 0; runde < 20; runde++) {
    await bisAnsEnde(page)
    const { name, karten } = await staffelZaehlen(page)
    if (gesehen.has(name)) break
    gesehen.add(name)

    /**
     * Je Folgennummer nur einmal zählen.
     *
     * Crunchyroll führt dieselbe Folge mehrfach auf, und es gibt sogar zwei
     * Einträge im Wähler mit derselben Staffel. Wer
     * Kacheln zählt statt Folgennummern, holt sich diese Fehler in den eigenen
     * Datensatz — und genau das soll nicht passieren: Die Staffelstruktur
     * bleibt unsere, Crunchyroll liefert hier nur die Tonspur.
     *
     * Kacheln ohne erkennbare Nummer (Filme, Specials) bekommen einen eigenen
     * Schlüssel, damit sie nicht alle zu einer verschmelzen.
     */
    const jeFolge = new Map<string, Tonspur>()
    karten.forEach((k, i) => {
      const schluessel = k.nummer || `#${i}`
      const ton = tonspurAus(k.badge)
      // Eine deutsche Fassung schlägt eine fremde: Steht dieselbe Folge zweimal
      // da, einmal mit und einmal ohne Synchro, gibt es sie deutsch.
      const bisher = jeFolge.get(schluessel)
      if (bisher === 'deutsch') return
      if (bisher === 'fremd' && ton === 'keine') return
      jeFolge.set(schluessel, ton)
    })
    const tonspuren = [...jeFolge.values()]
    staffeln.push({
      name,
      folgen: jeFolge.size,
      kacheln: karten.length,
      deutsch: tonspuren.filter((t) => t === 'deutsch').length,
      fremd: tonspuren.filter((t) => t === 'fremd').length,
    })
    if (!(await naechsteStaffel(page, name))) break
    await page.evaluate(() => window.scrollTo(0, 0))
  }

  return { url, quelle: 'seitenanzeige', deutschImAngebot: true, staffeln, geprueftAm: heute }
}

/** Die Schalter der Adressauswahl (`lib/cr-dub-auswahl.ts`), aus der Kommandozeile gelesen. */
const AUSWAHL: AuswahlSchalter = {
  nur: NUR,
  neu: NEU,
  nurFehler: NUR_FEHLER,
  nurNeu: NUR_NEU,
  nurOffene: NUR_OFFENE,
  alterGesetzt: ALTER_GESETZT,
  wiedervorlageTage: WIEDERVORLAGE_TAGE,
  fehlerTage: FEHLER_TAGE,
  limit: LIMIT,
}

/**
 * Ein Zeilenprotokoll je Serie, damit ein Abbruch nachvollziehbar bleibt.
 *
 * Bei „3 von 8" steht die Zahl hier, nicht nur in der Datei — das ist die
 * Angabe, die es vorher nirgends gab.
 */
function serienZeile(i: number, gesamt: number, kurz: string, serie: CrSerie): string {
  return (
    `  ${i + 1}/${gesamt} ${serie.nichtVerfuegbar ? '✕' : serie.deutschImAngebot ? '🇩🇪' : serie.fehler ? '?' : '—'} ${kurz.slice(0, 52)}` +
    (serie.staffeln?.length
      ? ` (${serie.staffeln.map((s) => `${s.name}: ${s.deutsch}/${s.folgen}`).join(', ')})`
      : serie.fehler
        ? ` — ${serie.fehler.slice(0, 60)}`
        : '')
  )
}

/** Das Schlussprotokoll des Regelwegs. */
function schlussProtokoll(bestand: Map<string, CrSerie>, jeSerie: Map<string, CrSerie>, z: AdressErgebnis): void {
  const termine = [...jeSerie.values()].reduce(
    (n, s) => n + (s.staffeln ?? []).reduce((m, st) => m + (st.deutscheFolgen ?? []).filter((f) => f.verfuegbarAb).length, 0),
    0,
  )
  log(
    `Fertig: ${bestand.size} Adressen im Bestand, ${jeSerie.size} Serien in diesem Lauf gelesen, ` +
      `${z.ohneDeutsch} davon ohne deutsche Tonspur` +
      (z.gestoert ? `, ${z.gestoert} Fehlersatz/Fehlersätze verworfen (alter Stand behalten)` : ''),
  )
  if (z.neuAufgeloest) log(`${z.neuAufgeloest} Adressen neu in eine Serienkennung aufgelöst, ${z.ohneKennung} ohne Kennung`)
  log(`${termine} deutsche Folgen mit belegtem Termin aus der Content-API`)
  // Kein Fehler-Exit: Die Sperre ist kein kaputter Lauf, sondern ein früh
  // beendeter. Ein roter Lauf für etwas, das sich von selbst wieder öffnet,
  // wäre eine Warnung, auf die man aufhört hinzusehen.
  if (z.gesperrt) log('Abgebrochen wegen Crunchyrolls Bot-Sperre — der Rest steht beim nächsten Lauf wieder offen.')
}

type BrowserHalter = ReturnType<typeof browserHolerMit>

/** Was Auswahl und Protokoll eines Laufs den beiden Lesewegen mitgeben. */
interface LaufStand {
  adressen: string[]
  bestand: Map<string, CrSerie>
  neuFolgen: Map<string, string[]>
  fehlerGrenze: string
  melden: (i: number, kurz: string, serie: CrSerie) => void
  melde: (jetzt: number, text?: string) => void
  sichern: () => void
}

/** Die zweite Rückfallebene: jede Adresse über die gerenderte Seite lesen. */
async function leseSeitenanzeige(browserHalter: BrowserHalter, stand: LaufStand): Promise<void> {
  const { adressen, bestand, melden, melde, sichern } = stand
  const page = await (await browserHalter.holen('--seitenanzeige')).newPage({
    userAgent: CHROME,
    locale: 'de-DE',
    viewport: { width: 1600, height: 1200 },
  })
  const ohneDeutsch = await leseAlleSeitenanzeige(page, adressen, { bestand, lese: serieLesenSeitenanzeige, melden, melde, sichern })
  await browserHalter.aktuell()?.close()
  sichern()
  recordSource('crunchyroll-dub', bestand.size, bestand.size ? undefined : 'keine Seite gelesen')
  log(`Fertig: ${bestand.size} Seiten im Bestand, davon ${ohneDeutsch} in diesem Lauf ohne deutsche Tonspur`)
}

/**
 * Der Regelweg ist die beta-api mit Signatur; `--browser` ist die Rückfallebene.
 *
 * Der Unterschied ist nicht bloß technisch: Die eine kennt ihre Region und
 * belegt damit auch ein Nein, die andere kennt sie nicht. Was daraus folgt,
 * steht in `beurteile()` — hier wird nur festgehalten, welcher Weg es war.
 * Gibt die Quelle und, wenn der Browser sie trägt, dessen Seite für die Seitenaufrufe zurück.
 */
async function baueQuelle(zugang: CrZugang | undefined, browserHalter: BrowserHalter): Promise<{ quelle: CrQuelle; api?: CrunchyrollApi }> {
  if (zugang) return { quelle: new CrunchyrollCms(zugang, PAUSE_MS) }
  const api = new CrunchyrollApi(await browserHalter.holen('kein Zugangspaket'), PAUSE_MS)
  await api.oeffnen()
  return { quelle: api, api }
}

async function leseRegelweg(zugang: CrZugang | undefined, browserHalter: BrowserHalter, stand: LaufStand): Promise<void> {
  const { adressen, bestand, sichern } = stand
  let seiten: CrunchyrollSeiten | undefined
  const seitenHolen = async (): Promise<CrunchyrollSeiten> => {
    if (!seiten) {
      seiten = new CrunchyrollSeiten(await browserHalter.holen('Adresse ohne Serienkennung'), PAUSE_MS)
      await seiten.oeffnen()
    }
    return seiten
  }
  const { quelle, api } = await baueQuelle(zugang, browserHalter)
  // Dieselbe Seite tut es auch für die Seitenaufrufe — ein zweites Fenster
  // wäre ein zweites Fenster für nichts.
  if (api) seiten = api
  log(`Katalog: ${quelle.katalog ?? 'unbelegt (Region des Rechners)'}`)

  const kennungen = ladeKennungen()
  const kontext: AdressKontext = {
    ...stand,
    quelle,
    kennungen,
    jeSerie: new Map<string, CrSerie>(),
    seitenHolen,
    nurFehler: NUR_FEHLER,
    kennungenSichern: () => kennungenSichern(kennungen),
  }
  const zaehler: AdressErgebnis = { neuAufgeloest: 0, ohneKennung: 0, ohneDeutsch: 0, gestoert: 0, gesperrt: false }
  for (const [i, url] of adressen.entries()) {
    const e = await bearbeiteAdresse(i, url, kontext)
    zaehler.neuAufgeloest += e.neuAufgeloest
    zaehler.ohneKennung += e.ohneKennung
    zaehler.ohneDeutsch += e.ohneDeutsch
    zaehler.gestoert += e.gestoert
    if (e.gesperrt) {
      zaehler.gesperrt = true
      break
    }
  }

  await seiten?.schliessen()
  await browserHalter.aktuell()?.close()

  sichern()
  kontext.kennungenSichern()
  recordSource('crunchyroll-dub', bestand.size, bestand.size ? undefined : 'keine Serie gelesen')
  schlussProtokoll(bestand, kontext.jeSerie, zaehler)
}

async function main(): Promise<void> {
  /**
   * Das Zugangspaket wird als **Erstes** geprüft, nicht beim ersten Abruf.
   *
   * Sonst liefe der Lauf erst durch Titelliste, Bestand und Warteschlange, um
   * dann an Serie 1 abzubrechen — und in der Zwischenzeit stünde in der
   * Statusanzeige „läuft". Ein Lauf, der aus einem Grund scheitert, der schon
   * vor dem Start feststand, soll das auch vor dem Start sagen.
   */
  const zugang = SEITENANZEIGE || BROWSER || OFFEN_PRUEFEN ? undefined : await beschaffeZugang()
  if (zugang) log(`Zugangspaket für ${zugang.land}, Bucket ${zugang.bucket}, gültig bis ${zugang.gueltig_bis}`)
  /**
   * Aus welchem Katalog dieser Lauf fragt — schon hier, nicht erst bei `quelle`.
   *
   * Die Auswahl der Adressen weiter unten braucht die Antwort, und die läuft
   * lange vor dem Aufbau der Quelle. Der Bucket ist unterschrieben, `land`
   * steht nur daneben; im Zweifel gilt, was in der Signatur steht.
   */
  const katalogJetzt = zugang ? (bucketLand(zugang.bucket) ?? zugang.land).toLowerCase() : OFFEN_PRUEFEN ? 'de' : undefined

  const { adressen, bestand, neuFolgen, fehlerGrenze, schonDa, nachgefasst } = waehleAdressen(
    readJson<Title[]>('public/data/titles.json', []),
    katalogJetzt,
    AUSWAHL,
  )
  if (OFFEN_PRUEFEN) return offenMelden(adressen.length)
  log(
    `Crunchyroll: ${adressen.length} Serienadressen offen` +
      (schonDa ? (NUR_FEHLER ? ` (${schonDa} ohne Fehler beim letzten Mal, werden übersprungen)` : ` (${schonDa} innerhalb ihrer Frist gelesen, werden übersprungen)`) : '') +
      (nachgefasst ? `, darunter ${nachgefasst} ohne Auskunft aus einem früheren Lauf` : ''),
  )
  if (!adressen.length) {
    log('Nichts zu tun.')
    return
  }

  // Der Fortschritt geht an die Statusanzeige, damit von außen sichtbar ist,
  // ob dieser Lauf bei Seite 3 oder bei Seite 500 steht. Lokal ohne Token tut
  // der Melder nichts.
  const melde = fortschrittsMelder(adressen.length)

  /**
   * Der Browser wird erst angeworfen, wenn ihn jemand braucht.
   *
   * Auf dem Regelweg ist das die Ausnahme: Zwei Dinge stehen nur auf der Seite —
   * die Serienkennung hinter einer Slug-Adresse und Crunchyrolls eigene Ansage,
   * dass es eine Serie nicht mehr gibt. Alles andere kommt jetzt über einen
   * gewöhnlichen `fetch`. Ein Chromium-Start kostet mehrere Sekunden und ein
   * paar hundert Megabyte; ein Lauf über lauter bekannte Kennungen braucht ihn
   * kein einziges Mal.
   */
  const browserHalter = browserHolerMit(() => chromium.launch(), log)
  /** Schreibt den Stand — alles Bekannte plus alles gerade Gelesene. */
  const sichern = () =>
    writeJson('data/crunchyroll-dub.json', { scrapedAt: new Date().toISOString(), serien: [...bestand.values()] }, true)
  const melden = (i: number, kurz: string, serie: CrSerie) => log(serienZeile(i, adressen.length, kurz, serie))
  const stand = { adressen, bestand, neuFolgen, fehlerGrenze, melden, melde, sichern }
  if (SEITENANZEIGE) await leseSeitenanzeige(browserHalter, stand)
  else await leseRegelweg(zugang, browserHalter, stand)
}

main().catch((err) => {
  /**
   * Ein fehlendes Zugangspaket ist kein Absturz, sondern eine Anweisung.
   *
   * Ein Stapelabzug darüber macht aus „hol ein neues Paket" eine Suche nach der
   * Zeile, in der es geknallt hat. Der Satz allein sagt alles, was zu tun ist.
   */
  if (err instanceof ZugangspaketFehlt) {
    console.error(`\nCrunchyroll-Abruf nicht möglich: ${err.message}`)
    console.error('Ohne Paket geht nur `npm run data:cr-dub -- --browser` — der liest dann den US-Katalog.')
    process.exit(1)
  }
  console.error(err)
  process.exit(1)
})
