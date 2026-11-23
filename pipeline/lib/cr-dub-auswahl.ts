/**
 * Welche Crunchyroll-Adressen der Dub-Abruf (`scrape-crunchyroll-dub.ts`) in diesem Lauf liest.
 * Aus `main()` des Laufs unverändert herausgelöst: Schalter kommen als Parameter, das Ergebnis als Rückgabe.
 */
import { log, readJson } from './util.ts'
import type { Title } from '../../shared/types.ts'
import { addDays, todayIso } from '../../shared/time.ts'
import type { CrSerie } from './crunchyroll-dub.ts'
import { crFrisch, neuFolgenJeSerie } from './cr-frisch.ts'
import { crunchyrollAdressen, crunchyrollNeinAbrufLaden } from './crunchyroll-adressen.ts'

/**
 * Wie oft eine Adresse drankommt — je nachdem, ob sich dort etwas bewegt.
 *
 * Bis zum 22.08.2026 galt für alle 959 Adressen dieselbe Frist von vier Wochen.
 * Das behandelt eine Serie von 2009, die seit Jahren unverändert dasteht,
 * genauso wie eine, die nächste Woche eine neue Folge bekommt — und weil ein
 * Lauf bei 300 Adressen gedeckelt ist, dauert ein voller Durchgang 3,2 Wochen.
 *
 * Daniels Vorschlag (22.08.2026): „es könnte sinn machen die liste auch
 * aufzuteilen nach wichtigen und weniger wichtigen titeln. und entsprechend die
 * häufigkeit der polls anpassen."
 *
 * Die Staffelung, gemessen am Bestand:
 *
 * | Gruppe                 | Titel | Frist    | Abrufe/Woche |
 * |------------------------|------:|---------:|-------------:|
 * | anstehender Termin     |    56 |   7 Tage |           56 |
 * | ab 2024 erschienen     |   139 |  14 Tage |           70 |
 * | 2015 bis 2023          |   568 |  28 Tage |          142 |
 * | vor 2015               |   355 |  90 Tage |           27 |
 * |                        |       |          |      **295** |
 *
 * Das passt unter den Deckel von 300, den Crunchyrolls Drosselung setzt — und
 * die 56 Titel, bei denen wirklich etwas passiert, sind viermal so oft dran wie
 * vorher.
 *
 * `--alter <tage>` schaltet die Staffelung ab und setzt eine feste Frist für
 * alle. Das bleibt der Weg für gezielte Läufe.
 */
const FRIST_TERMIN = 7
const FRIST_JUNG = 14
const FRIST_MITTEL = 28
const FRIST_ALT = 90

/** Titel, für die ein Termin in der Zukunft steht. */
function titelMitTermin(): Set<number> {
  const events = readJson<Array<{ titleId: number; date: string }>>('public/data/events.json', [])
  const heute = todayIso()
  const menge = new Set<number>()
  for (const e of events) if (e.date >= heute) menge.add(e.titleId)
  return menge
}

/**
 * Die Frist je Adresse. Zeigen mehrere Titel auf dieselbe Adresse — bei Demon
 * Slayer sind es fünf —, gewinnt die kürzeste: Ein Termin an einem davon macht
 * die ganze Adresse interessant.
 */
function fristenJeAdresse(titles: Title[]): Map<string, number> {
  const mitTermin = titelMitTermin()
  const fristen = new Map<string, number>()
  for (const t of titles) {
    const frist = mitTermin.has(t.id)
      ? FRIST_TERMIN
      : (t.jpYear ?? 0) >= 2024
        ? FRIST_JUNG
        : (t.jpYear ?? 0) >= 2015
          ? FRIST_MITTEL
          : FRIST_ALT
    for (const s of t.streams) {
      if (s.platform !== 'crunchyroll') continue
      const bisher = fristen.get(s.url)
      if (bisher === undefined || frist < bisher) fristen.set(s.url, frist)
    }
  }
  return fristen
}

/** Die Schalter des Laufs, die die Auswahl betreffen (`--nur`, `--neu`, `--nur-fehler`, `--nur-neu`, `--offen`, `--alter`, `--fehler-alter`, `--limit`). */
export interface AuswahlSchalter {
  nur?: string
  neu: boolean
  nurFehler: boolean
  nurNeu: boolean
  nurOffene: boolean
  alterGesetzt: boolean
  wiedervorlageTage: number
  fehlerTage: number
  limit: number
}

export interface Auswahl {
  adressen: string[]
  /** Was schon gelesen ist, nach Adresse; wird im Lauf fortgeschrieben. */
  bestand: Map<string, CrSerie>
  /** Je Serienkennung die Folgenkennungen des Katalogfunds. */
  neuFolgen: Map<string, string[]>
  /** Frühester Tag, an dem eine Nichtauskunft noch gilt. */
  fehlerGrenze: string
  schonDa: number
  nachgefasst: number
}

/**
 * Je Serienkennung der jüngste Tag, an dem dort etwas Neues steht.
 *
 * **Eine neue deutsche Folge hebt jede Frist auf.**
 *
 * Am 10.09.2026 erschienen die drei „Lord of Mysteries"-Specials auf Deutsch,
 * einen Tag nachdem dieser Lauf die Serie gelesen hatte. Die nächste
 * Wiedervorlage wäre der 07.10. gewesen — vier Wochen, in denen die Seite
 * nichts davon wusste. `fetch-crunchyroll-neu.ts` sieht täglich nach, was
 * hinzugekommen ist; was dort steht, kommt hier sofort wieder dran.
 */
function neuSeitJeSerie(neuFunde: { serieId?: string; gesehenAm?: string }[], kachelSeit: Map<string, string>): Map<string, string> {
  const neuSeit = new Map<string, string>()
  for (const f of neuFunde) {
    if (!f.serieId || !f.gesehenAm) continue
    const bisher = neuSeit.get(f.serieId)
    if (!bisher || f.gesehenAm > bisher) neuSeit.set(f.serieId, f.gesehenAm)
  }
  /* Eine Kachel nach dem Messdatum eines Nein macht die Serie sofort fällig (`shared/nein-wiedervorlage.ts`). */
  for (const [id, am] of kachelSeit) {
    if (am > (neuSeit.get(id) ?? '')) neuSeit.set(id, am)
  }
  return neuSeit
}

/**
 * **`--nur-neu` filtert die Liste, nicht nur die Frist.**
 *
 * `frisch()` sagt zu einer Adresse, die im Bestand gar nicht steht, „nicht
 * frisch" — und das ist richtig: Eine nie geprüfte Serie muss drankommen.
 * Beim täglichen Lauf wäre es falsch. Er soll genau die Serien anfassen, bei
 * denen Crunchyroll heute etwas Neues auf Deutsch führt; alles andere ist
 * Sache des Wochenlaufs, sonst zieht der erste Lauf den ganzen Rückstand.
 */
function nurNeuzugaenge(adressen: string[], bestand: Map<string, CrSerie>, neuSeit: Map<string, string>): string[] {
  const gesucht = new Set(neuSeit.keys())
  const vorher = adressen.length
  const treffer = adressen.filter((u) => {
    const s = bestand.get(u)
    const ausAdresse = /crunchyroll\.com\/(?:[a-z-]+\/)?series\/([A-Z0-9]+)/i.exec(u)?.[1]
    return (s?.seriesId && gesucht.has(s.seriesId)) || (ausAdresse ? gesucht.has(ausAdresse) : false)
  })
  log(`Crunchyroll: nur die Neuzugänge — ${treffer.length} von ${vorher} Adressen betreffen eine Serie mit neuen deutschen Folgen`)
  return treffer
}

/**
 * Bildet die Liste der Adressen dieses Laufs: alle Crunchyroll-Verweise samt entfernten, abzüglich dessen, was noch frisch ist.
 *
 * `katalogJetzt` ist die Region des Zugangs, mit dem gefragt wird (`de`), oder keine.
 */
export function waehleAdressen(titles: Title[], katalogJetzt: string | undefined, o: AuswahlSchalter): Auswahl {
  const offen = crunchyrollAdressen(titles, o.nurOffene)
  const nein = o.nurOffene ? undefined : crunchyrollNeinAbrufLaden()
  let adressen = [...new Set([...offen, ...(nein?.adressen ?? [])])].sort()
  if (o.nur) adressen = adressen.filter((u) => u.includes(o.nur!))

  /**
   * Wiederaufsatz: Was schon gelesen ist, wird nicht noch einmal geholt.
   *
   * Der erste Volldurchlauf schrieb sein Ergebnis erst **am Ende**. Beim
   * Abbruch nach 579 von 918 Seiten wäre alles verloren gewesen — anderthalb
   * Stunden Last auf einem fremden Server für nichts (12.08.2026). Ein langer
   * Lauf ohne Zwischenstand ist ein Lauf ohne Netz.
   *
   * Mit `--neu` wird der Bestand ignoriert und alles frisch geholt.
   */
  const bestand = new Map<string, CrSerie>(
    o.neu ? [] : readJson<{ serien: CrSerie[] }>('data/crunchyroll-dub.json', { serien: [] }).serien.map((s) => [s.url, s]),
  )
  // Frisch genug ist, was innerhalb seiner eigenen Frist gelesen wurde — die
  // hängt daran, ob sich bei diesem Titel überhaupt etwas bewegt.
  const fristen = o.alterGesetzt ? new Map<string, number>() : fristenJeAdresse(titles)
  const grenzeFuer = (u: string) => addDays(todayIso(), -(fristen.get(u) ?? o.wiedervorlageTage))
  const neuFunde = readJson<{ folgen?: { serieId?: string; gesehenAm?: string; guid?: string }[] }>('data/crunchyroll-neu.json', {}).folgen ?? []
  const neuFolgen = neuFolgenJeSerie(neuFunde)
  const neuSeit = neuSeitJeSerie(neuFunde, nein?.kachelSeit ?? new Map())
  const fehlerGrenze = addDays(todayIso(), -o.fehlerTage)
  /**
   * Gezielt die Seiten erneut prüfen, bei denen der letzte Lauf nichts sagen
   * konnte.
   *
   * Anlass: Am 21.08.2026 kam die Erkennung des Banners „Leider sind die Videos
   * dieser Serie nicht mehr verfügbar" dazu. Die 472 Seiten, die vorher mit
   * „keine Audio-Zeile gefunden" endeten, haben ihre Antwort damit schon in der
   * Seite stehen — nur konnte sie niemand lesen. Sie einzeln nachzuholen
   * kostet eine knappe Stunde; alle 952 noch einmal zu holen wären zwei, und
   * die frisch geprüften brächten dabei nichts Neues.
   */
  const frisch = (u: string) => {
    const s = bestand.get(u)
    return s ? crFrisch(s, { katalogJetzt, neuSeit, neuFolgen, nurNeu: o.nurNeu, nurFehler: o.nurFehler, befundGrenze: grenzeFuer(u), fehlerGrenze }) : false
  }
  if (o.nurNeu) adressen = nurNeuzugaenge(adressen, bestand, neuSeit)
  const schonDa = adressen.filter(frisch).length
  const nachgefasst = adressen.filter((u) => !frisch(u) && bestand.get(u)?.fehler).length
  adressen = adressen.filter((u) => !frisch(u))
  if (o.limit > 0) adressen = adressen.slice(0, o.limit)
  return { adressen, bestand, neuFolgen, fehlerGrenze, schonDa, nachgefasst }
}
