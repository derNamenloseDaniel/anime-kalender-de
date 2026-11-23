/**
 * Eine Crunchyroll-Adresse im Regelweg des Dub-Abrufs (`scrape-crunchyroll-dub.ts`): Serienkennung finden, Serie lesen, ablegen.
 * Aus der Schleife in `main()` unverändert herausgelöst: Die Zähler kommen je Adresse als Ergebnis zurück.
 */
import { warn } from './util.ts'
import { todayIso } from '../../shared/time.ts'
import type { CrSerie } from './crunchyroll-dub.ts'
import { crunchyrollSeriesId } from './crunchyroll.ts'
import { serieAblegen } from './cr-frisch.ts'
import { serieHinterFolge, serieLesen } from './crunchyroll-lesen.ts'
import type { KennungsDatei } from './cr-dub-kennungen.ts'
import {
  CrunchyrollGesperrt,
  ZugangspaketFehlt,
  type CrQuelle,
  type CrunchyrollSeiten,
} from './crunchyroll-api.ts'

/** Alles, was der Lauf einer Adresse mitgibt; nichts davon gehört der Funktion. */
export interface AdressKontext {
  quelle: CrQuelle
  kennungen: KennungsDatei
  bestand: Map<string, CrSerie>
  /** Eine Serie wird je Lauf **einmal** geholt, nicht einmal je Adresse. */
  jeSerie: Map<string, CrSerie>
  neuFolgen: Map<string, string[]>
  seitenHolen: () => Promise<CrunchyrollSeiten>
  nurFehler: boolean
  fehlerGrenze: string
  melden: (i: number, kurz: string, serie: CrSerie) => void
  melde: (jetzt: number, text?: string) => void
  sichern: () => void
  kennungenSichern: () => void
}

/** Was eine Adresse zu den Zählern des Laufs beiträgt; `gesperrt` beendet den Lauf. */
export interface AdressErgebnis {
  neuAufgeloest: number
  ohneKennung: number
  ohneDeutsch: number
  gestoert: number
  gesperrt: boolean
}

/**
 * Schritt 1: die Serienkennung.
 *
 * Steht sie in der Adresse, ist nichts zu tun. Sonst kostet sie einen
 * Seitenaufruf — und der wird festgehalten, damit er einmalig bleibt.
 * Eine Adresse, die schon als „nicht verfügbar" im Bestand steht, wird
 * dabei nicht noch einmal angefasst: Sie hat ihre Antwort.
 *
 * Liefert `undefined`, wenn nichts aufzulösen war; sonst die Kennung (oder keine) und, wenn die Seite selbst gesagt hat,
 * dass es die Serie nicht gibt, den Befund `weg` bzw. `fehlt`.
 */
async function loeseAuf(url: string, k: AdressKontext): Promise<{ seriesId?: string; art?: 'weg' | 'fehlt'; zeile?: string } | undefined> {
  const bekannt = k.kennungen.adressen[url]
  // Ein gefundener Eintrag hält ewig, ein Fehlschlag nur bis zur
  // Wiedervorlage — siehe `KennungsEintrag`. Und weil ein Fehlschlag keine
  // Auskunft ist, gilt für ihn die kurze Frist.
  const nochmal = !bekannt || (!bekannt.seriesId && (k.nurFehler || bekannt.geprueftAm < k.fehlerGrenze))
  if (!nochmal || k.bestand.get(url)?.nichtVerfuegbar) return undefined
  const befund = await (await k.seitenHolen()).seitenBefund(url)
  // Zeigt der Verweis auf eine einzelne Folge, steht die Serie nicht auf
  // der Seite, aber in der Folgenkennung.
  const seriesId =
    befund.seriesId ?? (await serieHinterFolge(k.quelle, befund.ziel)) ?? (await serieHinterFolge(k.quelle, url))
  k.kennungen.adressen[url] = {
    seriesId,
    ziel: befund.ziel,
    geprueftAm: todayIso(),
    fehler: seriesId ? undefined : (befund.zeile ?? 'keine Serienkennung hinter dieser Adresse'),
    art: seriesId ? undefined : befund.art,
  }
  return { seriesId, art: befund.art, zeile: befund.zeile }
}

/** Lesen und Ablegen einer Serie; `behalten` heißt: Ein Fehlersatz hat einen guten Eintrag nicht überschrieben. */
async function leseUndLege(url: string, seriesId: string, k: AdressKontext): Promise<{ serie: CrSerie; behalten: boolean }> {
  const schon = k.jeSerie.get(seriesId)
  const serie = schon ? { ...schon, url } : await serieLesen(k.quelle, url, seriesId, k.seitenHolen)
  if (!schon) k.jeSerie.set(seriesId, serie)
  /*
    **Ein Fehlersatz überschreibt keinen guten Eintrag** (17.09.2026). Antwortet die
    Content-API einmal nicht, trug der Eintrag danach keine Staffeln — und der Bau
    entfernte den Verweis als „deutscher Katalog führt keine Staffel". Der alte Stand
    bleibt stehen, samt Prüfdatum: So kommt die Serie beim nächsten Lauf gleich wieder dran.
  */
  const behalten = serieAblegen(k.bestand, url, serie, seriesId, k.neuFolgen) === 'behalten'
  return { serie, behalten }
}

/**
 * Eine geschlossene Tür wird nicht 200-mal angeklopft.
 *
 * Am 21.08.2026 zog Crunchyroll nach rund 300 Serien die Bot-Sperre. Der
 * Lauf machte weiter, scheiterte an jeder weiteren Adresse — und weil
 * `page.goto` fehlschlug, ohne die Seite zu wechseln, schrieb er 91
 * Adressen die Staffelliste der Aufwärmseite zu. Beides ist behoben; hier
 * steht die zweite Hälfte davon: aufhören, sichern, den Rest beim
 * nächsten Lauf holen.
 *
 * Läuft die Unterschrift mitten im Lauf ab, ist der Lauf zu Ende.
 *
 * Weiterzumachen hieße hier, ab dieser Stelle den US-Katalog zu lesen und
 * ihn in dieselbe Datei zu schreiben — genau das, was der harte Abbruch
 * beim Start verhindern soll, nur unbemerkt in der Mitte. Der Fehler
 * fliegt deshalb weiter nach oben und macht den Lauf rot: Wer die Meldung
 * sieht, holt ein frisches Paket.
 *
 * Gibt `true` zurück, wenn der Lauf hier endet (Sperre).
 */
function behandleFehler(err: unknown, i: number, url: string): boolean {
  if (err instanceof ZugangspaketFehlt) throw err
  if (err instanceof CrunchyrollGesperrt) {
    warn(`Crunchyroll hat nach ${i} Adressen dichtgemacht: ${(err as Error).message}`)
    warn('Der Lauf endet hier. Was gelesen ist, bleibt; der Rest kommt beim nächsten Lauf dran.')
    return true
  }
  // Wie beim alten Weg: Ein Fehlschlag wird nicht gespeichert. Die Adresse
  // bleibt offen und kommt beim nächsten Lauf erneut dran.
  warn(`${url}: ${(err as Error).message.slice(0, 100)}`)
  return false
}

/** Die Seite hat beim Auflösen selbst gesagt, dass es die Serie nicht gibt: derselbe Beleg wie beim alten Weg, ohne zusätzlichen Aufruf. */
function seiteSagtWeg(url: string, zeile: string | undefined): CrSerie {
  return { url, quelle: 'api', nichtVerfuegbar: true, geprueftAm: todayIso(), fehler: zeile }
}

/**
 * Ohne Kennung ist über diese Adresse nichts zu sagen — und „nichts zu
 * sagen" ist ein `fehler`, kein `deutschImAngebot: false`. Ein
 * Fehlschlag als Befund ist der Fehler, den dieses Projekt an vier
 * Stellen schon gemacht hat.
 *
 * Hat die Seite beim Auflösen selbst gesagt, dass es sie nicht gibt,
 * bleibt das ein Befund — auch dann, wenn sie diesmal nicht noch einmal
 * aufgerufen wurde.
 */
function ohneAuskunft(url: string, k: AdressKontext): CrSerie {
  return {
    url,
    quelle: 'api',
    geprueftAm: todayIso(),
    nichtVerfuegbar: k.kennungen.adressen[url]?.art ? true : undefined,
    fehler: k.kennungen.adressen[url]?.fehler ?? 'keine Serienkennung zu dieser Adresse',
  }
}

export async function bearbeiteAdresse(i: number, url: string, k: AdressKontext): Promise<AdressErgebnis> {
  const kurz = url.replace(/^https?:\/\/(www\.)?crunchyroll\.com\/de\//, '')
  const e: AdressErgebnis = { neuAufgeloest: 0, ohneKennung: 0, ohneDeutsch: 0, gestoert: 0, gesperrt: false }
  try {
    let seriesId = crunchyrollSeriesId(url) ?? k.kennungen.adressen[url]?.seriesId
    if (!seriesId) {
      const aufgeloest = await loeseAuf(url, k)
      if (aufgeloest) {
        seriesId = aufgeloest.seriesId
        e.neuAufgeloest++
        if (!seriesId && aufgeloest.art) {
          const serie = seiteSagtWeg(url, aufgeloest.zeile)
          k.bestand.set(url, serie)
          k.melden(i, kurz, serie)
          if (i % 10 === 9) {
            k.sichern()
            k.kennungenSichern()
          }
          void k.melde(i + 1, kurz)
          return e
        }
      }
    }

    if (!seriesId) {
      e.ohneKennung++
      const serie = ohneAuskunft(url, k)
      k.bestand.set(url, serie)
      k.melden(i, kurz, serie)
      if (i % 10 === 9) k.sichern()
      void k.melde(i + 1, kurz)
      return e
    }

    const { serie, behalten } = await leseUndLege(url, seriesId, k)
    if (behalten) {
      e.gestoert++
      k.melden(i, kurz, k.bestand.get(url)!)
      return e
    }
    // Gezählt wird nur, wo die Antwort auch eine ist: „nicht verfügbar" und
    // „keine Auskunft" sind kein „ohne deutsche Tonspur".
    if (serie.deutschImAngebot === false) e.ohneDeutsch++
    k.melden(i, kurz, serie)
  } catch (err) {
    if (behandleFehler(err, i, url)) {
      e.gesperrt = true
      return e
    }
  }
  if (i % 10 === 9) {
    k.sichern()
    k.kennungenSichern()
  }
  void k.melde(i + 1, kurz)
  return e
}
