import type { Release } from '@shared/types.ts'

/**
 * **Folgen vor dem ersten Termin zählen, wenn sie belegt da sind.** Setzt der früheste Termin eines Titels bei Folge 9 ein
 * (`firstEpisodeNumber`) und gibt es für 1–8 keinen Termin, zählte der Kasten 0 erschienene Folgen und nannte den Stapel
 * „Alle 16“ (The Mighty Nein, 26.11.2026). Eine Folge davor gilt als erschienen, wenn ein Handbeleg sie deutsch im Angebot nennt
 * (`belegt`, die Vereinigung der `dubRanges`); ohne Beleg bleibt sie unbehauptet, und der Kopf nennt nur die Folgen des Termins.
 * Nur, wenn die Termine innerhalb der Folgenzahl des Titels liegen: Zählt ein Staffeltitel durchlaufend weiter (Wistoria: 12 Folgen,
 * Termine ab Folge 13), gehören die Folgen davor zur Vorstaffel und nicht zu diesem Titel.
 */
export function folgenVorDemStart(releases: Release[], belegt: Set<number>, gesamt: number | undefined): number {
  return folgenDavor(releases, gesamt).filter((nr) => belegt.has(nr)).length
}

/** Die Nummern vor dem frühesten Termin, die in der Zählung des Titels liegen; leer bei Start bei Folge 1, ohne Folgenzahl und bei durchlaufender Zählung. */
export function folgenDavor(releases: Pick<Release, 'releaseType' | 'schedule'>[], gesamt: number | undefined): number[] {
  const ohneDisc = releases.filter((r) => r.releaseType !== 'disc')
  if (!ohneDisc.length || !gesamt) return []
  const ende = Math.max(...ohneDisc.map((r) => (r.schedule?.firstEpisodeNumber ?? 1) + (r.schedule?.episodeCount ?? 1) - 1))
  if (ende > gesamt) return []
  const erste = Math.min(...ohneDisc.map((r) => r.schedule?.firstEpisodeNumber ?? 1))
  return Array.from({ length: Math.max(0, erste - 1) }, (_, i) => i + 1)
}

/** Folgen eines Komplettabwurfs, der nicht bei Folge 1 beginnt: `[von, bis]`; sonst nichts (der Kopf nennt dann „Alle N Folgen“). */
export function abwurfBereich(release: Release | undefined): [number, number] | undefined {
  const s = release?.schedule
  const von = s?.firstEpisodeNumber
  if (!von || von <= 1 || !s.episodeCount || s.episodeCountAssumed) return undefined
  return [von, von + s.episodeCount - 1]
}

/**
 * **Die erschienenen Folgen mit den Nummern des Anbieters, wenn die Zählung durchläuft** (Steel Ball Run 2nd & 3rd STAGE: Folge 1 liegt im
 * Vorfilm, die Termine zählen 2–12, AniList führt 11 Folgen). Statt „10 von 11“ steht „Folge 2–11 von 12“. Nur, wenn die Termine über die
 * Folgenzahl des Titels hinausreichen, nicht bei Folge 1 beginnen und weniger Folgen davor liegen als der Titel hat (ein Teilstück derselben
 * Staffel, keine Vorstaffel); sonst nichts. Gemessen 27.11.2026 an public/data: vier Titel erfüllen die ersten beiden Bedingungen, mit der
 * dritten bleiben zwei (JoJo 210482, Eighty Six Teil 2 mit Folge 12–23); Wistoria und The 100 Girlfriends Staffel 3 behalten ihre Zeile.
 */
export function zaehlSpanne(releases: Pick<Release, 'releaseType' | 'schedule'>[], raus: number, gesamt: number | undefined): { nr: string; gesamt: number } | undefined {
  return zaehlSpanneAusTermin(releases, raus, gesamt)
}

function zaehlSpanneAusTermin(releases: Pick<Release, 'releaseType' | 'schedule'>[], raus: number, gesamt: number | undefined): { nr: string; gesamt: number } | undefined {
  const ohneDisc = releases.filter((r) => r.releaseType !== 'disc' && r.schedule?.episodeCount && !r.schedule.episodeCountAssumed)
  if (!ohneDisc.length || !gesamt || raus < 1) return undefined
  const erste = Math.min(...ohneDisc.map((r) => r.schedule?.firstEpisodeNumber ?? 1))
  const ende = Math.max(...ohneDisc.map((r) => (r.schedule?.firstEpisodeNumber ?? 1) + r.schedule!.episodeCount! - 1))
  /* Liegen vor dem Start mindestens so viele Folgen, wie der Titel selbst hat, ist es eine ganze Vorstaffel (Wistoria 13–24): die zählt nicht zu diesem Titel. */
  if (erste <= 1 || ende <= gesamt || erste - 1 >= gesamt) return undefined
  const bis = erste + raus - 1
  return { nr: bis > erste ? `${erste}–${bis}` : String(erste), gesamt: ende }
}
