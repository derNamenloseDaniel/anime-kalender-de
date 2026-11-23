import { readJson, log } from '../lib/util.ts'
import { type Title, type WatchLink } from '../../shared/types.ts'
import { lesekennung } from '../../shared/staffel-titel.ts'
import { pruefeToggoVerteilung, toggoFolgenDerStaffel } from '../lib/staffel-titel.ts'

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
    const verteilt = new Map<number, number>()
    for (const t of allTitles) {
      const roh = toggo[String(lesekennung(t))]?.folgen
      if (!roh) continue
      const folgen = toggoFolgenDerStaffel(roh, t)
      if (t.staffelTitel) verteilt.set(t.staffelTitel.sammel, (verteilt.get(t.staffelTitel.sammel) ?? 0) + folgen.length)
      const bloecke: NonNullable<WatchLink['toggo']> = []
      for (const f of [...folgen].sort((a, b) => a.staffel - b.staffel || a.folge - b.folge)) {
        const letzter = bloecke[bloecke.length - 1]
        if (letzter && letzter.staffel === f.staffel && letzter.bis === f.folge - 1 && letzter.ab === f.ab && letzter.ende === f.bis) letzter.bis = f.folge
        else bloecke.push({ staffel: f.staffel, von: f.folge, bis: f.folge, ab: f.ab, ende: f.bis })
      }
      const adresse = toggo[String(lesekennung(t))]?.adresse
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
    for (const [sammel, n] of verteilt) pruefeToggoVerteilung(sammel, toggo[String(sammel)]?.folgen.length ?? 0, n)
    if (mitFenster) log(`${mitFenster} TOGGO-Weg(e) mit Abruffenstern je Folge`)
  }
}
