/**
 * **Die Crunchyroll-Verweise ohne Sprachurteil auflösen — über die Kennung, nicht den Namen.**
 *
 * Daniel am 07.09.2026 zur „Wo sehen?"-Liste: „39 Fragezeichen? wir haben
 * crunchyroll automatisiert, es sollte 0 fragezeichen geben, wieso funktioniert
 * unser automatismus nicht perfekt..."
 *
 * Gemessen am 09.09.2026: 34 Verweise ohne Urteil, und sie zerfallen nach dem,
 * was ihre **Adresse** hergibt:
 *
 *     7   tragen eine Kennung (`/watch/<ID>` oder `/series/<ID>`)
 *     27  tragen nur einen Slug (`crunchyroll.com/de/kaguya-sama-love-is-war`)
 *
 * Für die erste Gruppe beantwortet Crunchyroll die Frage direkt. Für die zweite
 * muss die Serie erst gefunden werden — und genau dort liegt die Falle, an der
 * jeder Namensvergleich in diesem Projekt bisher gescheitert ist.
 *
 * ## Was dieser Lauf **nicht** tut
 *
 * Er ordnet nicht über den Namen zu. Ein Namensteil trifft immer den
 * Reihenkopf: „Free! the Final Stroke" träfe „Free! - Iwatobi Swim Club", die
 * Chunibyo-OVA ihre Serie, „The Promised Neverland Staffel 2" die erste. Fünf
 * der 27 zeigen sogar wörtlich auf die Serienadresse ihrer Reihe. Ein Treffer
 * zählt deshalb nur, wenn **Name und Folgenzahl** zusammenpassen — dieselbe
 * Regel, die `fetch-cr-katalog.mjs` seit dem 29.08.2026 anwendet, und aus
 * demselben Anlass.
 *
 * ## Und was ein Nein sein darf
 *
 * `de-DE` an einer Videofassung ist ein sicheres **Ja**. Ein fehlendes `de-DE`
 * ist **kein** Nein: Die deutsche Fassung hat bei Crunchyroll eine eigene
 * Videokennung, und dass wir sie nicht kennen, sagt nichts über sie (die 975
 * Falschangaben vom 15.08.2026 stammen genau aus dieser Verwechslung). Ein Nein
 * entsteht hier nur, wenn der **Serieneintrag im deutschen Katalog** ebenfalls
 * kein `de-DE` führt — dann haben zwei Stellen unabhängig geschwiegen.
 *
 * Ein HTTP 404 sagt nichts über die Tonspur und viel über den Verweis: Die
 * Videokennung ist abgelaufen, die Adresse führt ins Leere.
 *
 * ## Ergebnis
 *
 * `data/crunchyroll-offene.json` — je Adresse ein Befund mit seiner Herkunft.
 * `build.ts` liest ihn in der Anbieterrunde; was hier kein Urteil bekommt,
 * bleibt „🇩🇪 ?" und damit die ehrliche Antwort.
 *
 * Aufruf: npx tsx pipeline/fetch-crunchyroll-offene.ts [--limit 40] [--trocken]
 */
import { pathToFileURL } from 'node:url'
import type { Title } from '../shared/types.ts'
import { log, readJson, sleep, warn, writeJson } from './lib/util.ts'
import { recordSource } from './lib/health.ts'
import { handpruefungSchreiben, type Handpruefung } from './lib/jw-handpruefung.ts'
import { todayIso } from '../shared/time.ts'
import { slugKern, videoAusJustwatch, type Befund, type Kontext } from './lib/cr-offene-kontext.ts'
import { beurteileNebenausgabe, beurteileOhneKandidat, beurteileVideo, filmUrteil } from './lib/cr-offene-urteil.ts'
import { beurteileStaffel, sucheSerie } from './lib/cr-offene-staffel.ts'


const DATEI = 'data/crunchyroll-offene.json'
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36'

const args = process.argv.slice(2)
const zahl = (name: string, fallback: number) => {
  const i = args.indexOf(name)
  return i >= 0 ? Number(args[i + 1]) : fallback
}
const LIMIT = zahl('--limit', 0)
const TROCKEN = args.includes('--trocken')
/**
 * `--ids 131942,11737` prüft genau diese Titel, auch mit Urteil — für
 * Gegenproben an Fällen, die ein Handbeleg längst entschieden hat. Nur mit
 * `--trocken` sinnvoll; ohne schreibt der Lauf die Befunde wie sonst.
 */
const IDS = args.includes('--ids') ? new Set(String(args[args.indexOf('--ids') + 1]).split(',').map(Number)) : null

/**
 * **In der Cloud über die Weiche in Frankfurt** (`weiche-vercel/`, 16.09.2026).
 * Ohne `CR_WEICHE_TOKEN` geht der Abruf direkt — so läuft es auf Daniels PC.
 */
const WEICHE = process.env.CR_WEICHE ?? 'https://cr-weiche.vercel.app/api/cr'
const WEICHE_TOKEN = process.env.CR_WEICHE_TOKEN
function crFetch(url: string, init: RequestInit = {}): Promise<Response> {
  if (!WEICHE_TOKEN) return fetch(url, init)
  const headers = new Headers(init.headers)
  headers.set('X-Weiche-Token', WEICHE_TOKEN)
  return fetch(`${WEICHE}?ziel=${encodeURIComponent(url)}`, { ...init, headers })
}

async function holeToken(): Promise<string> {
  const r = await crFetch('https://beta-api.crunchyroll.com/auth/v1/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from('noaihdevm_6iyg0a8l0q:').toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': UA,
    },
    body: 'grant_type=client_id',
  })
  const j = (await r.json()) as { access_token?: string; country?: string }
  /*
    **Ohne deutsche Leitung wird abgebrochen, nicht ausgewichen.**

    Crunchyroll leitet die Region aus der IP ab. Ein Lauf aus den USA liest
    einen anderen Katalog und meldet für „Fairy Tail" `ja-JP, en-US`, wo hier
    `de-DE` steht — ein Urteil daraus wäre systematisch falsch (CLAUDE.md,
    22.08.2026).
  */
  if (j.country !== 'DE') {
    warn(`Abbruch: Der Abruf kommt aus „${j.country}", nicht aus DE — der Katalog wäre der falsche.`)
    process.exit(1)
  }
  if (!j.access_token) {
    warn('Abbruch: kein Token bekommen.')
    process.exit(1)
  }
  return j.access_token
}

export async function main(): Promise<void> {
  const token = await holeToken()
  const hol = async (u: string): Promise<{ status: number; body: unknown }> => {
    const r = await crFetch(u, { headers: { Authorization: `Bearer ${token}`, 'User-Agent': UA } })
    return { status: r.status, body: await r.json().catch(() => null) }
  }

  const roh = readJson<Title[] | Record<string, Title>>('public/data/titles.json', [])
  const titles = (Array.isArray(roh) ? roh : Object.values(roh)) as Title[]
  const katalog =
    readJson<{
      eintraege?: { id: string; titel: string; typ?: string; slug?: string | null; audio?: string[]; folgen?: number | null }[]
    }>('data/cr-katalog-de.json', {}).eintraege ?? []
  const katalogNachId = new Map(katalog.map((e) => [e.id, e]))
  /**
   * **Der Slug aus unserer Adresse führt zur Serienkennung.**
   *
   * Bis zum 09.09.2026 gab es zwei Wege: die Kennung in der Adresse
   * (`/series/G…`) oder eine Namenssuche. Der erste greift bei alten Adressen
   * nicht, der zweite scheitert an Crunchyrolls Kurznamen — von 23 Film-,
   * OVA- und Special-Verweisen war über den Titel genau **einer** zuzuordnen.
   *
   * Der Slug steht in beidem: in unserer Adresse (`/de/fruits-basket`,
   * `/mobile-suit-gundam-wing-endless-waltz/…`) und im Katalog (`slug_title`).
   * Gemessen am selben Tag ordnet er 9 der 33 offenen Verweise zu, ohne einen
   * einzigen Namensvergleich.
   */
  /* Die aniSearch-Zuordnung — sie kennt zu manchen Werken eine Adresse mit Kennung. */
  const anisearch = readJson<Record<string, unknown>>('data/anisearch.json', {})
  /* JustWatch als zweite Quelle — sie entscheidet, ob eine Adresse ins Leere führt. */
  const justwatch = readJson<
    Record<string, { erstAm?: string; geprueftAm?: string; jwPfad?: string; angebote?: { anbieter?: string; url?: string }[] }>
  >('data/justwatch-audio.json', {})
  const heuteIso = todayIso()
  /** Tot laut frischen JustWatch-Daten — erst Daniels Blick, dann entfernt (17.09.2026). */
  const zurHand: Handpruefung[] = []
  const katalogNachSlug = new Map(katalog.filter((e) => e.slug).map((e) => [slugKern(String(e.slug)), e]))
  log(`Katalog: ${katalog.length} Einträge, davon ${katalogNachSlug.size} mit Slug.`)
  const ctx: Kontext = { hol, titles, katalogNachId, katalogNachSlug, anisearch, justwatch, heuteIso, zurHand }


  /* Die offenen Verweise — Adresse, Werk und was wir über das Werk wissen. */
  const offen: { url: string; titel: Title }[] = []
  for (const t of titles) {
    if (IDS && !IDS.has(t.id)) continue
    for (const s of t.streams ?? []) {
      if (s.platform !== 'crunchyroll') continue
      if (!IDS && (s.dub === true || s.dub === false)) continue
      offen.push({ url: s.url, titel: t })
    }
  }
  log(`${offen.length} Crunchyroll-Verweise ohne Sprachurteil.`)

  const bestand = readJson<Record<string, Befund>>(DATEI, {})
  const arbeit = LIMIT > 0 ? offen.slice(0, LIMIT) : offen

  const zaehler = { video: 0, katalog: 0, tot: 0, offen: 0 }
  for (const { url, titel } of arbeit) {
    const befund = await beurteile(ctx, url, titel)
    bestand[url] = befund
    zaehler[befund.herkunft]++
    const zeichen = befund.herkunft === 'tot' ? '✕' : befund.dub === true ? '✓' : befund.dub === false ? '–' : '?'
    log(
      `  ${zeichen} ${String(titel.id).padEnd(7)} ${(titel.titleEn ?? titel.titleRomaji ?? '').slice(0, 34).padEnd(34)} ${befund.herkunft}${befund.grund ? ` — ${befund.grund}` : ''}`,
    )
    await sleep(700)
  }

  log('')
  log(
    `Ergebnis: ${zaehler.video} über die Videokennung, ${zaehler.katalog} über den Katalog, ` +
      `${zaehler.tot} tote Adressen, ${zaehler.offen} bleiben offen.`,
  )

  if (TROCKEN) {
    log('Trockenlauf — nichts geschrieben.')
    return
  }
  writeJson(DATEI, bestand)
  handpruefungSchreiben('crunchyroll', zurHand, false, heuteIso)
  recordSource('crunchyroll-offene', arbeit.length, undefined, undefined, true)
}

/**
 * Beurteilt einen Verweis über den kürzesten belastbaren Weg, den seine
 * Adresse zulässt.
 */
async function beurteile(ctx: Kontext, url: string, werk: Title): Promise<Befund> {
const eigeneVideoId = /\/watch\/([A-Z0-9]+)/i.exec(url)?.[1]
  const videoId = eigeneVideoId ?? videoAusJustwatch(ctx, werk.id)
  if (videoId) return await beurteileVideo(ctx, videoId, eigeneVideoId)
  const serieId = /\/series\/([A-Z0-9]+)/i.exec(url)?.[1] ?? serieIdAusAnisearch(ctx.anisearch, werk)
  /*
    **Der Slug steht in der Adresse — er wird gelesen, bevor gesucht wird.**

    Reihenfolge nach Verlässlichkeit: die Kennung in der Adresse, dann ihr
    Slug, dann die Namenssuche. Die Slug-Teile sind alles, was kein Pfadwort
    und keine Kennung ist; `/de/fruits-basket` liefert `fruits-basket`,
    `/mobile-suit-gundam-wing-endless-waltz/…-732801` beide Teile.
  */
  const ausSlug = slugTeileVon(url)
    .map((s) => ctx.katalogNachSlug.get(s))
    .find(Boolean)
  const kandidat = serieId ? ctx.katalogNachId.get(serieId) : (ausSlug ?? (await sucheSerie(ctx, werk)))
  if (!kandidat) return beurteileOhneKandidat(ctx, url, werk)
  /*
    **Die Serie ist gefunden — das Werk ist damit noch nicht beurteilt.**

    Bei einem Film oder einer OVA sagt der Serieneintrag nichts: Die Serie
    vererbt ihre Sprache nicht an ihre Nebenausgaben (fünf „Free!"-Filme
    zeigen auf die Serienadresse). Ein Urteil gibt es deshalb nur, wenn das
    Werk selbst eine Serie ist.
  */
  /**
   * **Es sei denn, der Treffer ist selbst ein Film.**
   *
   * Seit dem 09.09.2026 holt der Katalogsammler auch `type=movie_listing`
   * (69 Filme, 44 mit deutschem Ton) und merkt sich den Durchlauf als `typ`.
   * Zeigt der Slug unserer Adresse auf einen **Filmeintrag**, ist das nicht
   * die Reihe, sondern das Werk — und seine Tonspuren gelten unmittelbar.
   *
   * Der Riegel darunter bleibt für alles andere: Fünf „Free!"-Filme zeigen auf
   * den Slug ihrer **Serie**, und die vererbt ihre Sprache nicht.
   */
  if (werk.format === 'MOVIE' && kandidat.typ === 'film') return filmUrteil(kandidat)
  if (werk.format !== 'TV' && werk.format !== 'ONA') return await beurteileNebenausgabe(ctx, url, werk, kandidat)
  return await beurteileStaffel(ctx, werk, kandidat)
}

  /**
   * **aniSearch kennt zu manchen Werken die bessere Adresse — mit Kennung.**
   *
   * Unser Bestand führt „Sound! Euphonium" unter einem alten Slug
   * (`crunchyroll.com/de/sound-euphonium`), aniSearch unter
   * `series/GRDQNQW9Y`. Eine Kennung schlägt jeden Slug: Sie führt ohne
   * Umweg in den Katalog und von dort in die Staffelliste.
   *
   * Gelesen wird nur, was schon im Haus liegt — dieselbe Datei, aus der der
   * Bau seit dem 06.09.2026 fehlende Anbieter ergänzt. Das ist die Klasse
   * Fehler, die CLAUDE.md als „Eine Datei zu schreiben ist nicht dasselbe wie
   * sie zu benutzen" führt: fünf Fälle an zwei Tagen.
   */
function serieIdAusAnisearch(anisearch: Record<string, unknown>, werk: Title): string | undefined {
  try {
    const e = anisearch[String(werk.id)] as { streams?: { url?: string }[] } | undefined
    for (const s of e?.streams ?? []) {
      const treffer = /crunchyroll\.com\/(?:[a-z-]+\/)?series\/([A-Z0-9]{6,})/i.exec(String(s?.url ?? ''))
      if (treffer) return treffer[1]
    }
  } catch {
    /* Ohne aniSearch-Eintrag bleibt es bei der eigenen Adresse. */
  }
  return undefined
}

/** Die Slug-Teile einer Adresse (alles, was kein Pfadwort und keine Kennung ist), normalisiert. */
function slugTeileVon(url: string): string[] {
  try {
    const pfad = new URL(url).pathname.replace(/^\/(de|de-DE)\//, '/')
    const raus = new Set(['watch', 'series', 'de'])
    return pfad
      .split('/')
      .filter(Boolean)
      .filter((t) => !raus.has(t) && !/^G[A-Z0-9]{6,}$/.test(t))
      .map((t) => slugKern(t))
  } catch {
    return []
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main()
