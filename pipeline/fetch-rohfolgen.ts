/**
 * Die gemeldeten Rohfolgen abholen und unseren Folgen zuordnen.
 *
 * **Der Kern des Umbaus vom 28.08.2026.** Bis dahin entschied die Erweiterung im
 * Browser, welche Amazon-Folge welche unserer ist — und konnte es nicht: Prime
 * führt in einer Liste die deutsche Zählung neben der japanischen, Amazon mischt
 * in einer Staffel 26, 27, 28 und 105, Haikyu Staffel 1 hat dort 44 Folgen und
 * bei uns 25. Neununddreißig Fassungen an einem Abend gingen darauf zurück.
 *
 * Hier passiert es an der richtigen Stelle: Der Bau kennt TMDBs Folgentitel und
 * Erstausstrahlungsdaten (`data/tmdb-folgen.json`) und kann dagegen abgleichen.
 *
 * **Was nicht zugeordnet werden kann, bleibt offen.** `data/prime-unzugeordnet.json`
 * führt die Fälle mit Grund. Eine offene Frage bleibt damit sichtbar, statt zu
 * einer falschen Antwort zu werden — das ist der ganze Unterschied zu vorher.
 *
 * Die Zuordnung je Adresse steht in `lib/rohfolgen-titelwahl.ts` (welcher Titel?) und
 * `lib/rohfolgen-ordnen.ts` (welche Folgen?); hier laufen Abruf, Schleife und Abschluss.
 *
 * Aufruf: `npx tsx pipeline/fetch-rohfolgen.ts`
 */
import { resolve } from 'node:path'
import { log, readJson, ROOT, warn } from './lib/util.ts'
import { recordSource } from './lib/health.ts'
import { schliesseRohfolgenAb, type Offen, type Zugeordnet } from './lib/rohfolgen-abschluss.ts'
import { sortiereKanalGruppenAus, type ZugeordneteSeiten } from './lib/kanal-aussortieren.ts'
import { leseZugeordnet } from './lib/prime-meldung-riegel.ts'
import { ladeHandbelege } from './lib/dub-confirmed.ts'
import { kanalWissen } from './lib/kanal-wissen.ts'
import { bereinigeAltbestand } from './lib/rohfolgen-staffelmisch.ts'
import { ladeFremdeMeldungen } from './lib/netflix-fremde-meldung.ts'
import { teileNachNetflixStaffel } from './lib/netflix-staffeln.ts'
import {
  animeZugehoerigkeit,
  handbelegAdressen,
  ordneCartoonsZu,
  type CartoonFolgenDatei,
} from './lib/rohfolgen-cartoons.ts'
import { baueFolgenKarten, baueSuchZuTitel } from './lib/rohfolgen-titelwahl.ts'
import { bearbeiteAlle } from './lib/rohfolgen-ordnen.ts'
import type { Rohfolge, TmdbEintrag } from './lib/rohfolgen-zeile.ts'
import { readFileSync } from 'node:fs'
import yaml from 'js-yaml'
import { gruppiereNachAusgabe, type AsFolgeRoh } from '../shared/folgen-zuordnung.ts'
import { sammleAnker, tmdbFuerTitel } from '../shared/folgen-anker.ts'
import type { Title } from '../shared/types.ts'

const WORKER = process.env.LAUF_WORKER ?? 'https://newsletter.animekalender.workers.dev'
const TOKEN = process.env.LAUF_TOKEN ?? ''

/** Holt die offenen Rohfolgen; `null`, wenn es nichts zu tun gibt (kein Token, Fehler, leerer Briefkasten). */
async function holeRohfolgen(): Promise<Rohfolge[] | null> {
  if (!TOKEN) {
    warn('LAUF_TOKEN fehlt — ohne Token gibt der Worker die Rohfolgen nicht heraus.')
    recordSource('rohfolgen', 0, 'kein Token')
    return null
  }

  /*
    **Seitenweise, nicht in einem Zug.** Der Worker gibt höchstens 5.000 Zeilen
    je Antwort heraus; am 29.08.2026 lagen 5.620 offen, und die 620 dahinter
    hätten den Bau nie erreicht — sie wären erst nach der Übernahme der älteren
    nachgerückt, also nach einem Lauf, den es ohne sie gar nicht gegeben hätte.

    `weiter` trägt die letzte gelesene Kennung, oder `null`, wenn nichts mehr
    aussteht. Die Obergrenze von zwanzig Seiten ist ein Notausgang gegen einen
    Endlos-Lauf, keine Mengenbegrenzung: Bei 5.000 Zeilen je Seite sind das
    100.000 Folgen.
  */
  const folgen: Rohfolge[] = []
  let nach = 0
  for (let seite = 0; seite < 20; seite++) {
    const antwort = await fetch(`${WORKER}/pruefung?rohfolgen=1&nach=${nach}`, { headers: { Authorization: `Bearer ${TOKEN}` } })
    if (!antwort.ok) {
      warn(`Rohfolgen nicht abrufbar: HTTP ${antwort.status}`)
      recordSource('rohfolgen', 0, `HTTP ${antwort.status}`)
      return null
    }
    const teil = (await antwort.json()) as { folgen: Rohfolge[]; weiter?: number | null }
    folgen.push(...teil.folgen)
    nach = teil.weiter ?? 0
    if (!nach) break
  }
  if (!folgen.length) {
    log('keine offenen Rohfolgen')
    /*
      **Ein leerer Briefkasten ist der Idealzustand, kein Ausfall.**

      Sobald Daniel ein paar Tage nichts meldet, steht hier 0 — und ohne
      `leerIstOk` gaelte die Quelle nach drei Tagen als stumm und machte den
      Tageslauf rot. Am 29.08.2026 ist genau das `youtube-check` zweimal
      passiert.
    */
    recordSource('rohfolgen', 0, undefined, undefined, true)
    return null
  }
  /* Nach der letzten Seite steht noch eine Fortsetzung aus: die Seitengrenze greift. */
  if (nach) {
    warn('weitere Rohfolgen nicht geholt — die Seitengrenze greift, der nächste Lauf holt sie')
  }
  log(`${folgen.length} Rohfolgen geholt`)
  return folgen
}

async function main(): Promise<void> {
  let folgen = await holeRohfolgen()
  if (!folgen) return

  const titles = readJson<Title[]>('public/data/titles.json', [])
  const tmdbFolgen = readJson<Record<string, TmdbEintrag>>('data/tmdb-folgen.json', {})
  /*
    **aniSearch zuerst.** Seine Folgen sind auf Deutsch, tragen die japanische
    Erstausstrahlung und sind **wie unser Bestand aufgeteilt** — je Eintrag eine
    eigene Zählung ab 1. Damit entfällt `findeStaffel` und mit ihm die Stelle,
    an der die Zuordnung bisher scheiterte.
  */
  const asFolgen = readJson<Record<string, { folgen: AsFolgeRoh[] }>>('data/anisearch-folgen.json', {})
  const asKennung = readJson<Record<string, { anisearchId?: number }>>('data/anisearch.json', {})

  const entdoppelt = bereinigeAltbestand(folgen, ladeFremdeMeldungen())
  const veraltet = entdoppelt.veraltet
  if (veraltet.length) {
    log(`${veraltet.length} Rohfolgen aussortiert (Doppelte vor dem 28.08.2026, Staffelwechsel-Verdacht vor dem 16.09.2026, fremde Netflix-Meldungen)`)
    folgen = entdoppelt.folgen
  }

  /* Die Regel, welche Folgen zusammengehören, steht in `shared/folgen-zuordnung.ts`. */
  const jeUrl = gruppiereNachAusgabe(folgen)

  const offen: Offen[] = []
  /**
   * Was der Bau am Ende bekommt.
   *
   * `unsere: null` heißt „gilt dem Titel, nicht einer Folge" — der Fall eines
   * einzigen Eintrags (`lib/rohfolgen-ordnen.ts`). `asin` ist der eigentliche Ertrag einer
   * Meldung von einer **Suchadresse**: Aus ihr wird damit eine echte
   * Titelseite, und die nächste Prüfung beginnt nicht wieder bei der Suche.
   *
   * `plattform` sagt, wer gemeldet hat: Der Bau legt daraus den Verweis des richtigen
   * Anbieters an (bis zum 05.09.2026 stand das Feld nur da, `build.ts` schrieb immer Prime).
   */
  const zugeordnet: Record<string, Zugeordnet> = {}
  /** Die Rohfolgen-Kennungen, die verwertet wurden — sie werden danach abgehakt. */
  const erledigt: number[] = []
  const kontext = {
    titles,
    suchZuTitel: baueSuchZuTitel(titles),
    karten: baueFolgenKarten(titles, asKennung, asFolgen, tmdbFolgen),
    /** Alle Anker eines Titels: aniSearch, dann TMDB (`shared/folgen-anker.ts`). */
    listenFuer: (t: Title) =>
      sammleAnker(asFolgen[String(asKennung[String(t.id)]?.anisearchId)]?.folgen, tmdbFuerTitel(t, tmdbFolgen), t),
  }
  /* Cartoons und Handbeleg-Adressen zuerst: sie stehen nicht in titles.json (F20, 16.10.2026). */
  const cartoonLauf = ordneCartoonsZu(
    jeUrl,
    readJson<Title[]>('public/data/cartoons.json', []),
    handbelegAdressen(yaml.load(readFileSync(resolve(ROOT, 'data/dub-confirmed.yaml'), 'utf8')) as Parameters<typeof handbelegAdressen>[0]),
    readJson<CartoonFolgenDatei>('data/cartoon-folgen.json', {}),
    animeZugehoerigkeit(titles),
  )
  Object.assign(zugeordnet, cartoonLauf.zugeordnet)
  offen.push(...cartoonLauf.offen)
  erledigt.push(...cartoonLauf.erledigt)
  log(`${Object.keys(cartoonLauf.zugeordnet).length} Cartoon-Adressen zugeordnet, ${cartoonLauf.offen.length} offen`)
  const anime = bearbeiteAlle(teileNachNetflixStaffel(cartoonLauf.uebrig, titles, readJson('data/anbieter-staffeln.json', {})), kontext)
  Object.assign(zugeordnet, anime.zugeordnet)
  offen.push(...anime.offen)
  erledigt.push(...anime.erledigt)

  const bearbeitet = new Set(erledigt)
  const offeneGruppen = [...cartoonLauf.uebrig.values()].filter((liste) => !liste.every((f) => bearbeitet.has(f.id)))
  const bisherZugeordnet = leseZugeordnet<ZugeordneteSeiten[string]>()
  const kanalWeg = sortiereKanalGruppenAus(offeneGruppen, kanalWissen(ladeHandbelege()), bisherZugeordnet)
  schliesseRohfolgenAb({ kanalWeg, zugeordnet, offen, erledigt, veraltet, zaehler: anime.zaehler })
}

await main()
