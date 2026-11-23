/**
 * Die Schleife der zweiten Rückfallebene (`--seitenanzeige`) des Dub-Abrufs (`scrape-crunchyroll-dub.ts`): Seite für Seite lesen, im Bestand
 * ablegen, zwischendurch sichern. Aus `main()` unverändert herausgelöst; gezählt wird als Rückgabe.
 */
import type { Page } from 'playwright'
import { sleep, warn } from './util.ts'
import type { CrSerie } from './crunchyroll-dub.ts'

export interface SeitenanzeigeKontext {
  bestand: Map<string, CrSerie>
  lese: (page: Page, url: string) => Promise<CrSerie>
  melden: (i: number, kurz: string, serie: CrSerie) => void
  melde: (jetzt: number, text?: string) => void
  sichern: () => void
}

/** Liest alle Adressen über die gerenderte Seite und gibt zurück, bei wie vielen keine deutsche Tonspur stand. */
export async function leseAlleSeitenanzeige(page: Page, adressen: string[], k: SeitenanzeigeKontext): Promise<number> {
  let ohneDeutsch = 0
  for (const [i, url] of adressen.entries()) {
    const kurz = url.replace(/^https?:\/\/(www\.)?crunchyroll\.com\/de\//, '')
    try {
      const serie = await k.lese(page, url)
      k.bestand.set(url, serie)
      if (!serie.deutschImAngebot) ohneDeutsch++
      k.melden(i, kurz, serie)
    } catch (err) {
      /**
       * Ein Fehlschlag wird **nicht** als „keine Synchro" gespeichert.
       *
       * Sonst stünde ein Zeitüberschreitungs-Fehler später als belegtes Nein
       * im Datensatz — und der Wiederaufsatz würde die Seite nie wieder
       * anfassen. Sie bleibt offen und kommt beim nächsten Lauf erneut dran.
       */
      warn(`${url}: ${(err as Error).message.slice(0, 100)}`)
    }
    if (i % 10 === 9) k.sichern()
    void k.melde(i + 1, kurz)
    await sleep(1500)
  }
  return ohneDeutsch
}
