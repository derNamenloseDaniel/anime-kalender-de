/**
 * **TBT-Drift-Wächter** (26.11.2026; Auftrag reste-funde-2411, Lücke aus `docs/wissen/betrieb.md`, „TBT auf den Runner normiert“):
 * Eine feste Grenze fängt eine langsame Drift nicht (21.–24.11.: Datenbank und Titel +8 bis +10 % auf gleichem Runner, 2,5–3,5 % am Tag).
 * Verglichen wird der Median der letzten 7 Tage mit dem der 7 Tage davor, je Seite und Runner-Band (die Bänder von `lighthouse-urteil.mjs`).
 */
import { grenzeFuer } from '../../tools/lighthouse-urteil.mjs'

export interface Lauf {
  zeit: number
  benchmark: number
  tbt: Record<string, number>
}

export const FENSTER_TAGE = 7
/** Mindestzahl Läufe je Fenster und Band; darunter streut der Median selbst um mehr als die Drift (Stichprobe 21.–24.11.: p95 / Median 1,3–1,5). */
export const MIN_LAEUFE = 20
export const WARN_ANTEIL = 0.1
export const FEHLER_ANTEIL = 0.15
/** Unter dieser absoluten Änderung (ms) ist eine Prozentzahl auf schnellen Seiten (Kalender 56 ms) Rauschen. */
export const MIN_MS = 20

const TAG = 86_400_000
const BAND = { tbt: 'schnell', 'tbt-mittel': 'mittel', 'tbt-langsam': 'langsam' }

export const bandVon = (benchmark: number): string => grenzeFuer('tbt', BAND, benchmark)

/** Die Läufe-Tabelle (`docs/wissen/lighthouse-laeufe-*.tsv`): Spalten „Zeit (UTC)“, „benchmark“ und je Seite „<Seite> TBT/Perf“ mit „TBT/Perf“. */
export function leseLaeufe(tsv: string): Lauf[] {
  const [kopf, ...zeilen] = tsv.trim().split('\n').map((z) => z.split('\t'))
  const spalte = (name: string) => kopf.indexOf(name)
  const iZeit = spalte('Zeit (UTC)')
  const iBench = spalte('benchmark')
  const seiten = kopf.map((k, i) => ({ i, name: k.replace(/ TBT\/Perf$/, ''), ist: / TBT\/Perf$/.test(k) })).filter((s) => s.ist)
  return zeilen.map((z) => ({
    zeit: Date.parse(`${z[iZeit]}:00Z`),
    benchmark: Number(z[iBench]),
    tbt: Object.fromEntries(seiten.map((s) => [s.name, Number(z[s.i].split('/')[0])])),
  }))
}

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export interface Befund {
  seite: string
  band: string
  vorher: number
  jetzt: number
  anteil: number
  stufe: 'ok' | 'warnung' | 'fehler' | 'zu-wenig'
  n: [number, number]
}

/** Je Seite und Band der Vergleich der beiden Wochen vor `jetzt`; zu wenige Läufe sind ein eigener Befund, nie stilles Grün. */
export function pruefeDrift(laeufe: Lauf[], jetzt: number): Befund[] {
  const fenster = (von: number, bis: number) => laeufe.filter((l) => l.zeit > von && l.zeit <= bis)
  const w = FENSTER_TAGE * TAG
  const neu = fenster(jetzt - w, jetzt)
  const alt = fenster(jetzt - 2 * w, jetzt - w)
  const seiten = [...new Set(laeufe.flatMap((l) => Object.keys(l.tbt)))].sort()
  const baender = [...new Set(laeufe.map((l) => bandVon(l.benchmark)))].sort()
  const aus: Befund[] = []
  for (const seite of seiten) {
    for (const band of baender) {
      const wert = (liste: Lauf[]) => liste.filter((l) => bandVon(l.benchmark) === band).map((l) => l.tbt[seite]).filter((x) => x >= 0)
      const [a, b] = [wert(alt), wert(neu)]
      const n: [number, number] = [a.length, b.length]
      if (a.length < MIN_LAEUFE || b.length < MIN_LAEUFE) {
        aus.push({ seite, band, vorher: 0, jetzt: 0, anteil: 0, stufe: 'zu-wenig', n })
        continue
      }
      const [vorher, heute] = [median(a), median(b)]
      const anteil = (heute - vorher) / vorher
      const gross = heute - vorher >= MIN_MS
      const stufe = gross && anteil >= FEHLER_ANTEIL ? 'fehler' : gross && anteil >= WARN_ANTEIL ? 'warnung' : 'ok'
      aus.push({ seite, band, vorher, jetzt: heute, anteil, stufe, n })
    }
  }
  return aus
}
