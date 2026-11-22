import type { PlatformId, Release, ReleaseStatus, ReleaseType, Title } from '@shared/types.ts'
import { releaseStatus, titleStatus } from '@shared/logic.ts'
import type { FilterState, ModusFeld } from './filters.ts'

/**
 * **Weg-Filter: Die Einheit der Entscheidung ist der Weg, nicht der Titel** (Daniel, 22.11.2026: „⊘ Disc" warf
 * Yaiba aus der Datenbank, obwohl es als Stream läuft). Ein Weg ist eine Stelle, an der man einen Titel
 * bekommt: ein Release (Plattform, Art, Status, Jahr), ein Stream oder ein Stream-Link.
 * Einziger Ort dieser Logik (`check-filter-wege.ts`, `check-filter-ebenen.ts`); `passtTitel` ruft nur `passtWege`.
 *
 * Titel-Eigenschaften (Genre, FSK, Herkunft …) entscheiden über den Titel, Weg-Eigenschaften über Wege.
 */

export type ModusVon = (feld: ModusFeld) => 'und' | 'oder'

export interface Weg {
  /** Plattform-Kennung; bei `link` der Anzeigename des Anbieters; bei `titel` leer. */
  plattform: string
  art?: ReleaseType
  status?: ReleaseStatus
  jahr?: number
  /** Der Zugang ist kostenlos (Stream oder Stream-Link). */
  frei?: boolean
  /** `titel`: Platzhalter für Titel ganz ohne Weg, trägt nur Jahr und Status des Titels. */
  quelle: 'release' | 'stream' | 'link' | 'titel'
}

const wegeMerker = new WeakMap<Title, { releases: Release[]; heute: string; wege: Weg[] }>()

/**
 * Die Wege eines Titels, einmal je Titel und Stichtag berechnet. Streams und Links erben `movie`
 * vom Werk (`format: MOVIE`); Kauflinks sind kein Weg („Disc aus" blendet den Handel aus).
 */
export function wegeVon(t: Title, releases: Release[], heute: string): Weg[] {
  const alt = wegeMerker.get(t)
  if (alt && alt.releases === releases && alt.heute === heute) return alt.wege
  const ohneRelease = releases.length === 0
  const art: ReleaseType | undefined = t.format === 'MOVIE' ? 'movie' : undefined
  /* Ohne Release trägt der Titel Jahr und Status selbst; die Streams erben sie. */
  const jahr = ohneRelease ? t.jpYear || undefined : undefined
  const status = ohneRelease ? titleStatus([], heute, t) : undefined
  const wege: Weg[] = releases.map((r) => ({
    plattform: r.platform,
    art: r.releaseType,
    status: releaseStatus(r, heute),
    jahr: r.year,
    quelle: 'release',
  }))
  for (const s of t.streams) wege.push({ plattform: s.platform, art, status, jahr, frei: s.zugang === 'kostenlos', quelle: 'stream' })
  for (const w of t.watchLinks ?? []) {
    if (w.kind === 'stream') wege.push({ plattform: w.name, art, status, jahr, frei: w.zugang === 'kostenlos', quelle: 'link' })
  }
  const ergebnis = wege.length || !ohneRelease ? wege : [{ plattform: '', status, jahr, quelle: 'titel' as const }]
  wegeMerker.set(t, { releases, heute, wege: ergebnis })
  return ergebnis
}

/** Ein Disc-Weg: Plattform `disc` oder Art `disc` (zwei Releases tragen nur die Plattform). */
export const istDiscWeg = (w: Weg) => w.plattform === 'disc' || w.art === 'disc'

const hatArt = (w: Weg, a: ReleaseType) => (a === 'disc' ? istDiscWeg(w) : w.art === a)
const hatPlattform = (w: Weg, p: PlatformId) => w.quelle !== 'link' && w.plattform === p

/** Trifft ein Ausschluss (Plattform, Anbieter, Art) diesen Weg? */
export function trifftAusschluss(w: Weg, x: FilterState['excluded']): boolean {
  if (x.platforms.some((p) => hatPlattform(w, p))) return true
  if (w.quelle === 'link' && x.providers.includes(w.plattform)) return true
  return x.releaseTypes.some((a) => hatArt(w, a))
}

/** Die Wege, die alle Ausschlüsse bestehen — Grundlage des Einschlusses und der Karte (`wege` leer: der Titel hat keinen). */
export const bestehendeWege = (wege: Weg[], x: FilterState['excluded']): Weg[] =>
  wege.filter((w) => !trifftAusschluss(w, x))

const jahreVon = (t: Title, releases: Release[]) => (releases.length ? releases.map((r) => r.year) : t.jpYear ? [t.jpYear] : [])

/** Ausschluss: Ein Titel bleibt, wenn er keinen Weg hat oder mindestens einen, den kein Ausschluss trifft (Regel R3, docs/konzept/filter/umsetzungsplan.md). */
function passtAusschluss(t: Title, releases: Release[], wege: Weg[], f: FilterState, heute: string): boolean {
  const x = f.excluded
  /* „Film ausschließen" heißt das Werk, nicht nur den Termin (Daniel, 03.09.2026). */
  if (t.format === 'MOVIE' && x.releaseTypes.includes('movie')) return false
  if (x.years.some((y) => jahreVon(t, releases).includes(y))) return false
  if (x.statuses.includes(titleStatus(releases, heute, t))) return false
  const wegDim = x.platforms.length || x.providers.length || x.releaseTypes.length
  return !wegDim || wege.length === 0 || wege.some((w) => !trifftAusschluss(w, x))
}

interface Dimension {
  werte: readonly unknown[]
  hat: (w: Weg, v: never) => boolean
  modus: 'und' | 'oder'
}

/** Die gewählten Weg-Dimensionen des Einschlusses (Anbieter bleiben Titel-Eigenschaft: Kauflinks sind kein Weg). */
function dimensionen(t: Title, f: FilterState, modus: ModusVon): Dimension[] {
  const film = t.format === 'MOVIE'
  const alle: [readonly unknown[], Dimension['hat'], 'und' | 'oder'][] = [
    [f.platforms, hatPlattform, modus('platforms')],
    [f.releaseTypes, (w, a: ReleaseType) => hatArt(w, a) || (a === 'movie' && film), modus('releaseTypes')],
    [f.years, (w, y: number) => w.jahr === y, modus('years')],
    /* Der Status ist einwertig — ohne Modus, aus demselben Grund wie FSK. */
    [f.statuses, (w, s: ReleaseStatus) => w.status === s, 'oder'],
  ]
  return alle.filter(([werte]) => werte.length > 0).map(([werte, hat, m]) => ({ werte, hat, modus: m }))
}

/**
 * Einschluss auf gleichem Weg (Regel R4, umsetzungsplan.md): Kandidaten bestehen alle Ausschlüsse und tragen in jeder ODER-Dimension
 * einen gewählten Wert; jede UND-Dimension braucht je Wert einen Zeugen unter den Kandidaten.
 * „kostenlos" verlangt zusätzlich einen kostenlosen Weg, sobald Plattformen gewählt sind.
 */
function passtEinschluss(t: Title, wege: Weg[], f: FilterState, modus: ModusVon): boolean {
  const dims = dimensionen(t, f, modus)
  if (!dims.length) return true
  const frei = f.kostenlosOnly && f.platforms.length > 0
  const kandidaten = bestehendeWege(wege, f.excluded).filter(
    (w) =>
      (!frei || w.frei === true) &&
      dims.every((d) => d.modus === 'und' || d.werte.some((v) => d.hat(w, v as never))),
  )
  return dims.every(
    (d) => (d.modus === 'oder' ? kandidaten.length > 0 : d.werte.every((v) => kandidaten.some((w) => d.hat(w, v as never)))),
  )
}

/**
 * Alle Weg-Filter eines Titels: Plattform, Anbieter, Art, Jahr, Status. Anbieter im Einschluss
 * bleiben Titel-Eigenschaft (Wer nach „maxdome" filtert, will auch den Kauf sehen).
 */
export function passtWege(t: Title, releases: Release[], f: FilterState, heute: string, modus: ModusVon): boolean {
  const wege = wegeVon(t, releases, heute)
  if (!passtAusschluss(t, releases, wege, f, heute)) return false
  if (f.providers.length) {
    const anbieter = new Set((t.watchLinks ?? []).map((w) => w.name))
    const hat = (p: string) => anbieter.has(p)
    if (!(modus('providers') === 'und' ? f.providers.every(hat) : f.providers.some(hat))) return false
  }
  return passtEinschluss(t, wege, f, modus)
}

/**
 * Die Plattform auf der Kachel: die erste, die kein Ausschluss trifft (Regel R5, umsetzungsplan.md). Yaiba zeigt bei „Disc aus" Joyn statt Disc.
 * Ohne Ausschluss wie bisher: erstes Release, sonst erster Stream.
 */
export function kartenPlattform(t: Title, releases: Release[], x: FilterState['excluded']): PlatformId | undefined {
  const frei = (plattform: PlatformId, art?: ReleaseType) => !trifftAusschluss({ plattform, art, quelle: 'release' }, x)
  return releases.find((r) => frei(r.platform, r.releaseType))?.platform ?? t.streams.find((s) => frei(s.platform))?.platform
}
