import { readJson, log } from '../lib/util.ts'
import { type Title, type WatchLink } from '../../shared/types.ts'

/** TOGGO-Fenster je Folge an die TOGGO-Wege der Titel (aus `schreibeSynopsenUndReichereAn` herausgelöst, Verhalten unverändert). */
export function setzeToggoFenster(allTitles: Title[]): void {

  /*
    **TOGGO: die Fenster je Folge an den TOGGO-Weg** (19.09.2026, `pipeline/fetch-toggo.ts`).
    Zusammengefasst zu Blöcken gleicher Fenster: Boruto hat 30 Folgen mit demselben Fenster
    bis 31.12.2026 (ein Block), Daima fünf Folgen mit je eigenem 7-Tage-Fenster (fünf Blöcke).
  */
  {
    const toggo = readJson<{
      titel?: Record<string, { adresse?: string; folgen: { staffel: number; folge: number; ab: string; bis: string }[] }>
    }>(
      'data/toggo.json',
      {},
    ).titel ?? {}
    let mitFenster = 0
    for (const t of allTitles) {
      const folgen = toggo[String(t.id)]?.folgen
      if (!folgen) continue
      const bloecke: NonNullable<WatchLink['toggo']> = []
      for (const f of [...folgen].sort((a, b) => a.staffel - b.staffel || a.folge - b.folge)) {
        const letzter = bloecke[bloecke.length - 1]
        if (letzter && letzter.staffel === f.staffel && letzter.bis === f.folge - 1 && letzter.ab === f.ab && letzter.ende === f.bis) letzter.bis = f.folge
        else bloecke.push({ staffel: f.staffel, von: f.folge, bis: f.folge, ab: f.ab, ende: f.bis })
      }
      const adresse = toggo[String(t.id)]?.adresse
      /*
        Kein TOGGO-Weg bekannt, aber die Serie steht im TOGGO-Katalog und hat gerade freie
        Folgen: Weg anlegen. TOGGO zeigt nur deutsche Fassungen.
      */
      if (adresse && folgen.length && !(t.watchLinks ?? []).some((w) => /(^|\.)toggo\.de\//i.test(w.url.replace(/^https?:\/\//, ''))))
        (t.watchLinks ??= []).push({ name: 'TOGGO', url: adresse, kind: 'stream', zugang: 'kostenlos' })
      for (const w of t.watchLinks ?? []) {
        if (!/(^|\.)toggo\.de\//i.test(w.url.replace(/^https?:\/\//, ''))) continue
        /* Figuren- oder Übersichtsseite → Serienseite (Beyblade X, Daniel 19.09.2026). */
        if (adresse && /toggo\.de\/[a-z0-9-]+\/?$/i.test(w.url)) w.url = adresse
        w.toggo = bloecke
        mitFenster++
      }
    }
    if (mitFenster) log(`${mitFenster} TOGGO-Weg(e) mit Abruffenstern je Folge`)
  }
}
