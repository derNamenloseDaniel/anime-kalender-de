import { schreibeCartoons } from './nebendateien.ts'
import { type Release, type Schedule, type Title } from '../../shared/types.ts'
import { warn, ROOT } from '../lib/util.ts'
import { ankuendigungenLaden, type Ankuendigung } from '../lib/ankuendigungen.ts'
import { angekuendigterTermin } from './ankuendigungs-termin.ts'
import { quellenUndTermin } from '../lib/quellen-bindung.ts'
import { nachgereichteFolgen, verpasstAmTermin } from './verpasst-am-termin.ts'
import { verpassteTermine } from './grundlagen.ts'
import { crQuelleUrl } from './cr-quelle.ts'
import { slotAufStaffelzaehlung } from '../lib/cr-zaehlung.ts'
import { pickPlatformUrl, derivedStart, observedEpisodes, overlapsWindow, werkTitel } from './titel-hilfen.ts'
import {
  normalizeTitle,
  beobachtungenZusammenfuehren,
  durchlaufendeZaehlung,
  type CrunchyrollEntry,
  type CrunchyrollData,
} from '../lib/crunchyroll.ts'
import { ohneWocheUeberAnzahl } from '../lib/woche-ueber-anzahl.ts'
import { todayIso } from '../../shared/time.ts'
import { discIndexLaden, discKaufUrl, type DiscIndex } from '../lib/disc-ean.ts'
import { type TmdbInfo } from '../lib/tmdb.ts'
import { kuratierteZusaetze, type CuratedEntry } from '../lib/curated.ts'

/** Eingaben von `baueReleases`; Funktionen und Kataloge kommen vom Aufrufer, die Phase liest nichts selbst nach. */
export interface ReleaseEingaben {
  curated: CuratedEntry[]
  curatedIds: Record<string, number>
  titles: Map<number, Title>
  tmdb: Record<string, TmdbInfo>
  anisearchEpisodes: (titleId: number | undefined) => { count: number; estimated: boolean; } | undefined
  findCrunchyroll: (entryUrl: string | undefined, name: string) => CrunchyrollEntry | undefined
  crKalenderBis: string | undefined
  crunchyroll: CrunchyrollData
}

type KuratierterPlan = NonNullable<CuratedEntry['schedule']>

/** Folgenzahl eines Wochentakt-Eintrags ergänzen: AniList (nur zeitlich passend), dann aniSearch, zuletzt Standardstaffel. */
function ergaenzeFolgenzahl(
  entry: CuratedEntry,
  schedule: Schedule,
  title: Title | undefined,
  releaseYear: number,
  anisearchEpisodes: ReleaseEingaben['anisearchEpisodes'],
): void {
  // Folgenzahl nur übernehmen, wenn der verknüpfte AniList-Eintrag zeitlich
  // zum deutschen Termin passt — sonst stammt sie aus der falschen Staffel.
  const jpYear = title?.jpYear
  if (title?.episodes && jpYear && Math.abs(jpYear - releaseYear) <= 1) {
    schedule.episodeCount = title.episodes
  } else if (title?.episodes) {
    warn(
      `"${entry.slug}": Folgenzahl von AniList verworfen (Titel von ${jpYear}, Release ${releaseYear})`,
    )
  }
  // Zweiter Versuch bei aniSearch, bevor geraten wird.
  const ausAnisearch = schedule.episodeCount ? undefined : anisearchEpisodes(title?.id)
  if (ausAnisearch) {
    schedule.episodeCount = ausAnisearch.count
    schedule.episodeCountSource = 'anisearch'
    if (ausAnisearch.estimated) schedule.episodeCountAssumed = true
  }
  // Ohne belegte Folgenzahl wird eine Standardstaffel angenommen — das steht
  // als Flag im Datensatz, damit die Oberfläche es nicht als Fakt ausgibt.
  if (!schedule.episodeCount) {
    schedule.episodeCount = 12
    schedule.episodeCountAssumed = true
  }
}

/**
 * Dieselbe durchlaufende Zählung wie bei den automatisch ergänzten Simuldubs:
 * Ein Start, der ohnehin nur abgeleitet ist (`estimated`), darf nicht auf einer
 * Folge 1 stehen, die es in diesem Release gar nicht gibt.
 *
 * Angerührt wird nur, was der Kalender selbst hergeleitet hat. Eine von
 * Hand gesetzte Startnummer bleibt, wie überall in diesem Projekt.
 * Liefert den Herkunftshinweis, wenn durchgezählt wurde.
 */
function durchzaehleAbgeleitetenStart(
  plan: KuratierterPlan,
  schedule: Schedule,
  seen: Record<number, string> | undefined,
  crKalenderBis: string | undefined,
): string | undefined {
  if (!plan.estimated || plan.firstEpisodeNumber) return undefined
  const durchgezaehlt = durchlaufendeZaehlung(
    seen,
    schedule.episodeCountAssumed ? undefined : schedule.episodeCount,
    crKalenderBis,
  )
  if (!durchgezaehlt) return undefined
  schedule.firstEpisodeNumber = durchgezaehlt.firstEpisodeNumber
  schedule.firstEpisodeDate = durchgezaehlt.firstEpisodeDate
  schedule.episodeCount = durchgezaehlt.episodeCount
  delete schedule.episodeCountAssumed
  delete schedule.episodeCountSource
  return durchgezaehlt.note
}

/**
 * Angaben aus dem Crunchyroll-Kalender einsetzen. Sie kommen direkt vom
 * Anbieter und schlagen deshalb jede abgeleitete Angabe. Liefert den
 * Herkunftshinweis der Durchzählung.
 */
function uebernehmeCrSlot(
  slot: CrunchyrollEntry,
  entry: CuratedEntry,
  plan: KuratierterPlan,
  schedule: Schedule,
  sources: string[],
  verpasst: ReturnType<typeof verpasstAmTermin>,
  crKalenderBis: string | undefined,
): string | undefined {
  if (!plan.time) schedule.time = slot.time

  // Der wichtigste Teil: Die deutsche Synchro startet oft Wochen NACH
  // dem Simulcast. Die kuratierten Daten stammen aus Saisonübersichten
  // und nennen nur den Simulcast-Start — real gemessen bis zu drei
  // Wochen zu früh (08.08.2026 vom Nutzer gemeldet: „Though I Am an
  // Inept Villainess" stand auf dem 12.07., Folge 1 lief am 02.08.).
  // Ist der Termin nur abgeleitet, gewinnt der beobachtete Sendeplan.
  const observed = derivedStart(slot)
  if (observed && plan.estimated) {
    schedule.firstEpisodeDate = observed.date
    schedule.estimated = observed.assumed
    if (!observed.assumed) delete schedule.estimated
  }
  // Gesehene Einzeltermine gewinnen gegen jede Hochrechnung — und der
  // Mensch gegen den Kalender, der von einem Mehrfachstart nur eine
  // Kachel zeigt.
  const seen = beobachtungenZusammenfuehren({ ...nachgereichteFolgen(verpasst), ...observedEpisodes(ohneWocheUeberAnzahl(slot, schedule, entry.slug)) }, plan.observed)
  if (seen) schedule.observed = seen
  const hinweis = durchzaehleAbgeleitetenStart(plan, schedule, seen, crKalenderBis)
  sources.push(crQuelleUrl(slot))
  return hinweis
}

/**
 * Fehlt der deutsche Eintrag im abgesuchten Kalenderfenster, gibt es die Synchro
 * nicht — ein erfundener Sendeplan wäre schlimmer als gar keiner. Warnt und
 * liefert `true`, wenn der Eintrag verworfen werden muss.
 *
 * **Aber nur für einen Start, der schon war** (21.09.2026). Das Kalenderfenster
 * reicht zwei Wochen in die Zukunft, und Crunchyroll trägt deutsche Termine oft
 * erst kurz vorher ein; zwei Bauläufe brachen deshalb ab (Black Clover Staffel 2,
 * Apothekerin Staffel 3). Ein künftiger Termin, den noch niemand zeigt, ist nicht
 * widerlegt — er bleibt als Schätzung stehen.
 */
function verwirftOhneCrEintrag(
  entry: CuratedEntry,
  plan: KuratierterPlan,
  schedule: Schedule,
  angekuendigt: Ankuendigung | undefined,
  window: CrunchyrollData['window'],
): boolean {
  if (
    !(
      plan.estimated &&
      !angekuendigt?.omuAb &&
      window &&
      overlapsWindow(schedule, window) &&
      (schedule.firstEpisodeDate ?? '') <= todayIso()
    )
  ) return false
  warn(
    `"${entry.slug}": kein deutscher Eintrag bei Crunchyroll im Zeitraum ` +
      `${window.from}…${window.to} (Start ${schedule.firstEpisodeDate}) — verworfen`,
  )
  return true
}

interface ReleaseTeile {
  entry: CuratedEntry
  titleId: number | undefined
  name: string
  fsk: Release['fsk']
  platformUrl: string | undefined
  schedule: Schedule
  sources: string[]
  durchzaehlungHinweis: string | undefined
  discIndex: DiscIndex
}

function releaseAusTeilen(t: ReleaseTeile): Release {
  const { entry, titleId, name, fsk, platformUrl, schedule, sources, durchzaehlungHinweis, discIndex } = t
  return {
    slug: entry.slug,
    titleId: titleId ?? -1,
    name,
    platform: entry.platform,
    ...(entry.sender ? { sender: entry.sender } : {}),
    platformUrl,
    buyUrl: discKaufUrl(entry, titleId, schedule.firstEpisodeDate, name, discIndex),
    releaseType: entry.releaseType,
    ...(entry.dateMeaning ? { dateMeaning: entry.dateMeaning } : {}),
    fsk,
    publisher: entry.publisher,
    edition: entry.edition,
    note: entry.note,
    ...kuratierteZusaetze(entry),
    herkunft: entry.herkunft ?? durchzaehlungHinweis,
    disputedDates: entry.disputedDates,
    schedule,
    // Aus dem Termin, der am Ende dasteht — nicht aus dem kuratierten. Der
    // Kalender kann ihn verschoben haben, und über den Jahresfilter der
    // Oberfläche entscheidet der ausgelieferte Termin.
    year: Number(schedule.firstEpisodeDate.slice(0, 4)),
    sources: [...new Set(sources)],
  }
}

interface EintragVorbereitung {
  titleId: number | undefined
  title: Title | undefined
  angekuendigt: Ankuendigung | undefined
  sources: string[]
  schedule: Schedule
  verpasst: ReturnType<typeof verpasstAmTermin>
}

/** Titel, Quellen, Termin und Folgenzahl eines kuratierten Eintrags — alles, was vor der Plattform-Weiche feststeht. */
function bereiteEintragVor(
  entry: CuratedEntry,
  plan: KuratierterPlan,
  { curatedIds, titles, anisearchEpisodes }: Pick<ReleaseEingaben, 'curatedIds' | 'titles' | 'anisearchEpisodes'>,
  ankuendigungen: Map<number, Ankuendigung>,
): EintragVorbereitung {
  const titleId = entry.anilistId ?? curatedIds[entry.slug]
  const title = titleId ? titles.get(titleId) : undefined
  if (!title) warn(`"${entry.slug}": kein AniList-Titel verknüpft — läuft ohne Metadaten`)
  const angekuendigt = titleId ? ankuendigungen.get(titleId) : undefined

  const { sources, schedule } = quellenUndTermin([...(entry.sources ?? []), ...(angekuendigt?.quellen ?? [])], title?.anisearchId, plan, (n) => warn(`"${entry.slug}": ${n} Quelle(n) gehören nicht zum Titel — nicht übernommen`))
  /* Der angekündigte Tag schlägt eine Schätzung (`bau/ankuendigungs-termin.ts`). */
  const angekuendigterTag = angekuendigterTermin({ platform: entry.platform, schedule }, angekuendigt)
  if (angekuendigterTag) schedule.firstEpisodeDate = angekuendigterTag
  /*
    **Was der Anbieter nicht eingehalten hat, steht am Termin.**
    Die Aufbereitung steht in `bau/verpasst-am-termin.ts`.
  */
  const verpasst = verpasstAmTermin(entry.slug, verpassteTermine, schedule.firstEpisodeDate)
  if (verpasst) schedule.verpasst = verpasst
  const releaseYear = Number(plan.firstEpisodeDate.slice(0, 4))
  if (!schedule.episodeCount && entry.releaseType === 'weekly') {
    ergaenzeFolgenzahl(entry, schedule, title, releaseYear, anisearchEpisodes)
  }
  return { titleId, title, angekuendigt, sources, schedule, verpasst }
}

export function baueReleases({
  curated,
  curatedIds,
  titles,
  tmdb,
  anisearchEpisodes,
  findCrunchyroll,
  crKalenderBis,
  crunchyroll,
}: ReleaseEingaben) {
  /*
    **Der westliche Bestand — früh, weil er vom Anime-Bestand nichts braucht.**

    Er wird nicht in `titles.json` gemischt: Das ist die Datei, die jeder
    Besucher lädt, und 906 Titel darin kosteten jeden von ihnen Ladezeit. Wie
    `ohne-synchro.json` wird sie nachgeladen — nur eben immer, weil Daniel sie
    sichtbar haben will.

    **Vor dem Riegel**, der einen Titelschwund abfängt: Bricht der Bau dort ab,
    hat das mit diesen Titeln nichts zu tun, und sie sollen nicht mit ihm
    ausfallen.
  */
  schreibeCartoons()

  const releases: Release[] = []
  const seenSlugs = new Set<string>()
  const usedCrKeys = new Set<string>()
  // Kuratierte Termine, die der Crunchyroll-Kalender nicht bestätigt.
  const unverified: string[] = []
  /* Angekündigte Simulcasts (`data/ankuendigungen.yaml`) — im Bau noch nicht am Titel. */
  const ankuendigungen = ankuendigungenLaden(ROOT)
  const discIndex = discIndexLaden()

  for (const entry of curated) {
    if (seenSlugs.has(entry.slug)) {
      warn(`Doppelter Slug "${entry.slug}" — zweiter Eintrag ignoriert`)
      continue
    }
    if (!entry.schedule?.firstEpisodeDate) {
      warn(`"${entry.slug}" hat kein firstEpisodeDate — übersprungen`)
      continue
    }
    seenSlugs.add(entry.slug)

    const { titleId, title, angekuendigt, sources, schedule, verpasst } = bereiteEintragVor(entry, entry.schedule, { curatedIds, titles, anisearchEpisodes }, ankuendigungen)
    const info = tmdb[entry.slug]

    const name = entry.titleDe ?? title?.titleEn ?? title?.titleRomaji ?? entry.slug
    const fsk = entry.fsk ?? info?.fsk ?? title?.fsk
    const platformUrl = pickPlatformUrl(entry, title)

    // Der kuratierte Beleg steht vor der allgemeinen Ankündigung — er ist der genauere.
    /* `sources` ist oben bereits auf passende Quellen gefiltert. */
    let durchzaehlungHinweis: string | undefined
    if (entry.platform === 'crunchyroll') {
      const slot = findCrunchyroll(platformUrl, entry.titleDe ?? name)
      if (slot) {
        usedCrKeys.add(normalizeTitle(slot.rawTitle))
        /* Der deutsche Slot gehört dem Synchro-Eintrag, nicht dem OmU-Begleiter (der behält seinen Untertitel-Start). */
        if (entry.sprache !== 'omu') durchzaehlungHinweis = uebernehmeCrSlot(slotAufStaffelzaehlung(slot, entry.crZaehlungAb), entry, entry.schedule, schedule, sources, verpasst, crKalenderBis)
      } else if (verwirftOhneCrEintrag(entry, entry.schedule, schedule, angekuendigt, crunchyroll.window)) {
        unverified.push(entry.slug)
        continue
      }
    }

    if (title && fsk !== undefined && title.fsk === undefined) title.fsk = fsk
    if (title && entry.titleDe && !title.titleDe) title.titleDe = werkTitel(entry.titleDe)

    releases.push(releaseAusTeilen({ entry, titleId, name, fsk, platformUrl, schedule, sources, durchzaehlungHinweis, discIndex }))
  }
  return { usedCrKeys, seenSlugs, releases, unverified }
}
