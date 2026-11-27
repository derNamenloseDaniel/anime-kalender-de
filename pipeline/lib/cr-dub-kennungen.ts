/**
 * Das Gedächtnis des Dub-Abrufs (`scrape-crunchyroll-dub.ts`) zu Serienkennungen: laden, mit den deutschen Kennungen
 * abgleichen, schreiben. Aus dem Lauf unverändert herausgelöst.
 */
import { readJson, writeJson } from './util.ts'
import { todayIso } from '../../shared/time.ts'

/**
 * Was zu einer Adresse an Serienkennung bekannt ist.
 *
 * Die Datei ist ein Gedächtnis, kein Zwischenspeicher: Eine Slug-Adresse in die
 * `/series/`-Form aufzulösen kostet einen vollen Seitenaufruf, und das Ergebnis
 * ändert sich nie — eine Serienkennung ist stabil. Ohne diese Datei zahlte
 * jeder Lauf denselben Preis erneut, und zwar auf einem fremden Server.
 *
 * **Ein Fehlschlag ist dagegen nicht endgültig.** Steht kein `seriesId` darin,
 * kommt die Adresse nach der Wiedervorlagefrist erneut dran. Sonst wäre die
 * Datei genau der Filter, vor dem `CLAUDE.md` warnt: „hole, was noch fehlt"
 * macht jede Antwort endgültig, und ein Falschbefund kann sich nicht mehr
 * korrigieren. Bei der Kennung selbst ist das unbedenklich, beim Nicht-Finden
 * nicht.
 */
export interface KennungsEintrag {
  seriesId?: string
  /** Wohin die Adresse geführt hat — bei einem Fehlschlag der Beleg dafür. */
  ziel?: string
  geprueftAm: string
  fehler?: string
  /**
   * Was die Seite selbst gesagt hat: `weg` das Banner, `fehlt` die 404-Seite.
   *
   * Ohne dieses Feld ging der Befund beim zweiten Lesen verloren. Der Ablauf
   * dahinter: Eine Adresse ohne Serienkennung wird nicht bei jedem Lauf neu
   * aufgerufen — geschieht das nicht, stand vom letzten Mal nur die Textzeile
   * da, und aus „Crunchyroll sagt selbst, es gibt die Seite nicht" wurde ein
   * „keine Auskunft" (37 Adressen am 21.08.2026). Die Zeile ist der Beleg, das
   * Feld ist der Befund.
   */
  art?: 'weg' | 'fehlt'
}
export interface KennungsDatei {
  aufgeloestAm: string
  adressen: Record<string, KennungsEintrag>
}
const KENNUNGS_DATEI = 'data/crunchyroll-series-ids.json'

/**
 * Die **im deutschen Katalog gesuchte** Serienkennung — sie schlägt die aus der
 * Adresse.
 *
 * Eine Adresse aufzulösen liefert die Kennung des Eintrags, auf den sie zeigt.
 * Das ist nicht dieselbe wie die der deutschen Serie: „Detektiv Conan" steht bei
 * uns als `crunchyroll.com/de/case-closed`, das ist `G6JQVM3ER` — ein Block mit
 * 33 Folgen und `ja-JP`. Die deutsche Serie liegt unter `GW4HM7NV3` und führt
 * 405 deutsche Folgen in neun Blöcken.
 *
 * `tools/cr-kennungen-suchen.mjs` sucht sie über `content/v2/discover/search`
 * und legt sie hier ab. Der Lauf am 26.08.2026 fand zu 391 offenen Adressen 51
 * Kennungen, **39 davon mit `de-DE`** — Titel, deren deutsche Fassung sonst
 * unauffindbar geblieben wäre.
 *
 * Die Suche braucht eine deutsche Leitung (Crunchyroll liest die Region aus der
 * IP), läuft also nicht in der Cloud. Deshalb dieser Umweg über eine Datei:
 * gesucht wird hier, gelesen wird überall.
 */
interface DeKennung {
  seriesId: string
  crTitel?: string
  sprachen?: string[]
  folgen?: number
  staffeln?: number
  gesuchtAm?: string
}
const DE_KENNUNGS_DATEI = 'data/crunchyroll-de-kennungen.json'

/**
 * Lädt das Gedächtnis und legt die deutschen Kennungen darüber.
 *
 * Die deutschen Kennungen überschreiben, was die Adressauflösung ergeben hat.
 * Der Schlüssel ist dort die AniList-Kennung des Titels, hier die Adresse —
 * verbunden über `unserTitel` gibt es nicht, also über die Adresse, die im
 * Eintrag steht.
 */
export function ladeKennungen(): KennungsDatei {
  const kennungen = readJson<KennungsDatei>(KENNUNGS_DATEI, { aufgeloestAm: '', adressen: {} })
  const deKennungen = readJson<{ kennungen: Record<string, DeKennung & { url?: string }> }>(
    DE_KENNUNGS_DATEI,
    { kennungen: {} },
  )
  let deUebernommen = 0
  for (const eintrag of Object.values(deKennungen.kennungen ?? {})) {
    if (!eintrag.url || !eintrag.seriesId) continue
    const bisher = kennungen.adressen[eintrag.url]
    if (bisher?.seriesId === eintrag.seriesId) continue
    kennungen.adressen[eintrag.url] = {
      seriesId: eintrag.seriesId,
      geprueftAm: eintrag.gesuchtAm ?? todayIso(),
      ziel: 'aus der Suche im deutschen Katalog',
    }
    deUebernommen++
  }
  if (deUebernommen) console.log(`${deUebernommen} Kennungen aus der deutschen Suche übernommen`)
  return kennungen
}

export function kennungenSichern(kennungen: KennungsDatei): void {
  writeJson(KENNUNGS_DATEI, { aufgeloestAm: new Date().toISOString(), adressen: kennungen.adressen }, true)
}
