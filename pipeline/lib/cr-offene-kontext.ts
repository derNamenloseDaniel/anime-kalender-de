/**
 * Gemeinsame Teile der Crunchyroll-Auflösung (`fetch-crunchyroll-offene.ts`): Befund, Kontext
 * (alles, was ein Urteil an Daten braucht) und die kleinen Helfer darunter. Aus dem Lauf
 * herausgelöst; die Regeln stehen unverändert in `cr-offene-urteil.ts` und `cr-offene-staffel.ts`.
 */
import type { Title } from '../../shared/types.ts'
import { todayIso } from '../../shared/time.ts'
import type { Handpruefung } from './jw-handpruefung.ts'

export interface Befund {
  /** Woher das Urteil stammt — für den Leser wichtiger als das Urteil selbst. */
  herkunft: 'video' | 'katalog' | 'tot' | 'offen'
  dub?: boolean
  /** Die Serienkennung, sofern eine gefunden wurde. */
  seriesId?: string
  /** Was Crunchyroll dort führt — zum Nachlesen, wenn eine Zuordnung strittig ist. */
  titel?: string
  audio?: string[]
  grund?: string
  geprueftAm: string
}

export interface Katalogeintrag {
  id: string
  titel: string
  typ?: string
  slug?: string | null
  audio?: string[]
  folgen?: number | null
}

export interface JustwatchEintrag {
  erstAm?: string
  geprueftAm?: string
  jwPfad?: string
  angebote?: { anbieter?: string; url?: string }[]
}

/** Eine Staffel einer Crunchyroll-Serie mit ihren Tonspuren. */
export interface Staffel {
  id: string
  titel: string
  folgen: number | null
  audio: string[]
  jahre: number[]
}

/** Das Objekt einer Videokennung (`cms/objects/<id>`), soweit der Lauf es liest. */
export interface VideoObjekt {
  title?: string
  episode_metadata?: {
    audio_locale?: string
    series_id?: string
    /* Alle Fassungen derselben Folge — der Schlüssel, siehe unten. */
    versions?: { audio_locale?: string }[]
  }
}

export type Hol = (u: string) => Promise<{ status: number; body: unknown }>

/** Alles, was ein Urteil an Daten braucht — vom Lauf gebaut, von den Urteilen nur gelesen (`zurHand` wird gefüllt). */
export interface Kontext {
  hol: Hol
  titles: Title[]
  katalogNachId: Map<string, Katalogeintrag>
  katalogNachSlug: Map<string, Katalogeintrag>
  anisearch: Record<string, unknown>
  justwatch: Record<string, JustwatchEintrag>
  heuteIso: string
  zurHand: Handpruefung[]
}

/** Vergleichbare Form eines Titels: ohne Satzzeichen, klein, Wörter durch ein Leerzeichen. */
export const norm = (s: string | undefined | null): string =>
  String(s ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()

/**
 * **Gleich geschrieben ist nicht gleich geschrieben.**
 *
 * Unsere Adresse trägt `free-iwatobi-swim-club`, der Katalog führt
 * `free---iwatobi-swim-club` — dieselbe Serie, drei Bindestriche
 * Unterschied. Und `-prelude-` trägt sie am Anfang und am Ende. Normalisiert
 * wird deshalb auf beiden Seiten gleich: mehrfache Bindestriche zu einem,
 * Ränder weg.
 */
export const slugKern = (s: string): string =>
  String(s).toLowerCase().replace(/-+/g, '-').replace(/^-|-$/g, '')

/**
 * **Die Geschwister eines Werks in derselben Reihe, nach Art getrennt.**
 *
 * Crunchyroll hängt Nebenausgaben gern an die Staffel, zu der sie gehören:
 * „Love, Chunibyo & Other Delusions - Heart Throb - (German Dub)" hat 13
 * Folgen — die Staffel mit 12 plus die OVA als S2 E13; bei Durarara führt die
 * Serie 25 Folgen, 24 plus das Special Tenka Taihei (aniSearch 6986; Daniel,
 * 13.09.2026, beide mit Bild). Wer nur nach genau gleicher Folgenzahl sucht, findet in beiden Fällen
 * keinen Block. Diese Liste liefert die Zahlen, mit denen sich die Summe
 * rechnen lässt.
 */
export const reiheVon = (t: Title): number => (t.franchiseId as number | undefined) ?? t.id
export function geschwister(titles: Title[], werk: Title): { haupt: number[]; neben: number[] } {
  const haupt: number[] = []
  const neben: number[] = []
  for (const t of titles) {
    if (t.id === werk.id || reiheVon(t) !== reiheVon(werk) || !Number.isFinite(t.episodes)) continue
    if (t.format === 'TV' || t.format === 'ONA') haupt.push(Number(t.episodes))
    else if (t.format === 'OVA' || t.format === 'SPECIAL') neben.push(Number(t.episodes))
  }
  return { haupt, neben }
}

/** Tot laut frischen JustWatch-Daten — erst Daniels Blick, dann entfernt (17.09.2026). */
export function zurHandpruefung(ctx: Kontext, werk: Title, url: string, grund: string, jwPfad?: string): Befund {
  ctx.zurHand.push({
    titleId: werk.id,
    titel: werk.titleDe ?? werk.titleEn ?? werk.titleRomaji ?? String(werk.id),
    plattform: 'crunchyroll',
    url,
    folgerung: `nicht mehr da (${grund})`,
    ...(jwPfad ? { jwPfad } : {}),
    seit: ctx.heuteIso,
  })
  return { herkunft: 'offen', geprueftAm: todayIso(), grund: `zur Handprüfung: ${grund}` }
}

/**
 * **JustWatch nennt die Adresse, die unser Bestand nicht hat — mit Kennung.**
 *
 * Ein Verweis aus der Frühzeit trägt einen Slug (`/de/sword-art-online`),
 * und aus einem Slug wird kein Urteil: Er zeigt auf die Reihe, nicht auf die
 * Ausgabe. JustWatch führt zu denselben Titeln eine kanonische
 * Crunchyroll-Adresse, und die trägt eine **Videokennung**
 * (`/watch/GVWU0Q527`). Damit greift der Zweig, der ohnehin der beste ist:
 * Crunchyroll selbst wird nach den Fassungen dieser Folge gefragt.
 *
 * **Genommen wird nur die Kennung, nie die Sprachangabe.** Dass JustWatch
 * daneben `audio: ["de", …]` führt, bleibt unbenutzt — die Entscheidung vom
 * 07.09.2026 („die Tonspurangabe gilt der Serie, nicht der Folge") steht
 * unberührt. Das Urteil kommt aus erster Hand; JustWatch weist nur den Weg
 * dorthin. Dieselbe Rolle spielt seit dem 09.09.2026 die aniSearch-Adresse
 * ein paar Zeilen weiter unten, nur liefert die eine Serien-, keine
 * Videokennung.
 *
 * Gemessen am 10.09.2026: 3 der 9 Verweise ohne Sprachurteil bekommen so
 * eine Kennung — „Sword Art Online EXTRA EDITION", „Okko's Inn" und
 * „Sound! Euphonium".
 */
export function videoAusJustwatch(ctx: Kontext, werkId: number | string): string | undefined {
  for (const a of ctx.justwatch[String(werkId)]?.angebote ?? []) {
    if (!/crunchyroll/i.test(String(a?.anbieter ?? ''))) continue
    const treffer = /crunchyroll\.com\/(?:[a-z-]+\/)?watch\/([A-Z0-9]{6,})/i.exec(String(a?.url ?? ''))
    if (treffer) return treffer[1]
  }
  return undefined
}
