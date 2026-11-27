import { addDays } from '@shared/time.ts'
import { expandEvents, istErschienen, istAusgeblieben, titleStatus } from '@shared/logic.ts'
import { titelSynchroAngekuendigt, widerlegterTermin } from '@shared/ankuendigung.ts'
import { dubAbdeckung } from '@shared/dub-grenze.ts'
import { type Title, type Release, type ReleaseEvent } from '@shared/types.ts'
import { belegteBereiche, zaehleErschienenJeAnbieter, ohneSchonErschienene, angekuendigteLaenge, fertigAntwort, gesamtIstBelegt, kopfReleases } from './antwort-regeln.ts'
import { filmAntwort, kuenftigeAntwort } from './antwort-zweige.ts'
import { folgenVorDemStart } from './antwort-davor.ts'

/** `jetzt` ist die Uhr für „erschienen“ (`istErschienen`); Pflicht, damit kein Test mit festem `today` an der echten Uhr hängt. */
type AntwortEingabe = { title: Title | undefined; releases: Release[]; today: string; jetzt: Date }

/** Was der Kasten über die belegte deutsche Abdeckung weiß (Ergebnis von `dubBelegung`). */
interface DubBelegung {
  vereint: Set<number>
  vollstaendig: boolean
  teilOhneZahl: boolean
  belegteFolgen: number
  restBelegt: boolean
}

/*
  **Synchro belegt heißt nicht nur „ein Stream mit DE ✓".** „Undefeated Bahamut Chronicle"
  stand als „Noch keine deutsche Fassung" da — mit belegten deutschen Sprechrollen und
  einer Blu-ray-Gesamtausgabe seit 2020 im Disc-Reiter. Belegt ist
  sie auch durch die Sprechrollen und durch einen Kaufweg mit deutscher Folgenspanne.

  Und durch aniSearchs Marke „Synchronisiert" am deutschen Block (18.09.2026, Stichprobe
  1809): „Niklaas: Der Junge aus Flandern" und „Jakobus Nimmersatt" standen als „Noch
  keine deutsche Fassung" da, während der Kasten daneben ihre deutsche Ausgabe nannte.
  Gemessen 253 Titel mit Marke ohne jeden anderen Beleg, 180 davon Filme und Specials.
*/
const hatDeutscheSynchro = (title: Title): boolean =>
  (title.streams ?? []).some((s) => s.dub === true) ||
  Boolean(title.hasVoices) ||
  Boolean(title.deErstausgabe?.synchro) ||
  (title.watchLinks ?? []).some((w) => belegteBereiche(w).some((r) => r.dub))

/*
  **Was der Kino-Banner zeigt, ist für den Kasten erledigt** (17.09.2026). Sonst liest
  er den Kinotermin als Folge und schreibt „Erste Folge erscheint am … · Wöchentlich ·
  0 von 1 Folgen" über einen Film — derselbe Fehler wie bei Madoka am selben Tag.
*/
const imKinoBanner = (r: Release, today: string): boolean =>
  r.platform === 'kino' &&
  (r.cinemaUntil ? r.cinemaUntil >= today : (r.schedule?.firstEpisodeDate ?? '') >= addDays(today, -60))

/*
  **Der Kopf beantwortet die Streaming-Frage, nicht die Disc-Frage** (Daniel, 03.09.2026, „Die
  Tagebücher der Apothekerin" Staffel 1: komplett auf Deutsch bei Crunchyroll, der Kopf zeigte
  einen Blu-ray-Termin als „23 von 24 Folgen"). Gibt es kein Streaming-Release, zählt die Disc
  wieder — ein leerer Kopf wäre schlechter als ein Kaufdatum.

  **Eine TV-Sichtung ist keine Erstausstrahlung, wenn es die Synchro schon gibt** (Daniel,
  19.09.2026, „Beyblade X": der RTL+-Import machte aus zwei TOGGO-plus-Sendungen „Folge 1 und 2
  am 19.09." und blendete alle Stream-Pillen aus). Gibt es einen belegten deutschen Stream, ist
  er die Antwort; die Sichtung steht als TV-Pille daneben. Ein Handeintrag (`automatisch` fehlt)
  bleibt Termin.
*/
const releasesOhneDisc = (releases: Release[], today: string, hatSynchro: boolean): Release[] =>
  releases.filter((r) => r.releaseType !== 'disc' && !imKinoBanner(r, today) && !(hatSynchro && r.platform === 'tv' && r.automatisch))

/*
  **Eine ausgebliebene Folge mit Ersatztermin steht zweimal da — gezählt wird sie einmal.**

  `expandEvents` führt den verstrichenen Tag weiter (durchgestrichen im
  Kalender) und legt die Folge zusätzlich auf ihren recherchierten neuen
  Termin. Für „noch X bis zum Finale" ist das eine Folge, nicht zwei.
*/
function kuenftigeEreignisse(alleEvents: ReleaseEvent[], jetzt: Date) {
  const offen = alleEvents.filter((e) => !istErschienen(e, jetzt))
  const kuenftig = ohneSchonErschienene(offen, alleEvents, jetzt)
    .filter((e) => !istAusgeblieben(e) || !offen.some((o) => o.episode === e.episode && !istAusgeblieben(o)))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.episode ?? 0) - (b.episode ?? 0))
  return { offen, kuenftig }
}

/*
  **Keine Folgenzahl aus der Zahl der Termine.** Bei „One Piece" stand „Alle 1 Folgen auf Deutsch":
  AniList führt dort keine Folgenzahl, und der Rückfall zählte die **Termine**. Ein Termin ist
  keine Folge — außer bei einer Wochenserie, wo jede Folge ihren eigenen trägt. Nur dort zählt
  der Rückfall noch.

  **Die Releases kennen die Zählung besser als AniList, solange die Staffel läuft.**
  „Steel Ball Run": AniList führt eine Folge, die Releases belegen Folge 1 und 2–12 (Stichprobe
  17.09.2026). Nur **lückenlos ab Folge 1 aneinandergereihte** Teile zählen, mit belegter
  Stückzahl: Eine einfache Höchstzahl hätte acht Titel verfälscht — ADN-Pakete mit OVAs
  (Wolf's Rain 30 statt 26) und Staffeln mit durchlaufender Zählung (Wistoria 13–24 als „24").
*/
function gesamtFolgen(title: Title, fuerKopf: Release[], alleEvents: ReleaseEvent[]): number | undefined {
  // Eine TV-Sichtung zählt Sendungen, keine Folgen der Serie (Pokémon Horizonte: „Alle 2 Folgen", 16.09.2026).
  const nurWochen = fuerKopf.every((r) => r.releaseType === 'weekly' && !r.tvLetzteSichtung)
  const teile = fuerKopf
    .filter((r) => r.schedule?.episodeCount && !r.schedule.episodeCountAssumed)
    .map((r) => {
      const von = r.schedule!.firstEpisodeNumber ?? 1
      return { von, bis: von + r.schedule!.episodeCount! - 1 }
    })
    .sort((x, y) => x.von - y.von)
  const aneinander =
    teile.length > 1 && teile[0]!.von === 1 && teile.every((x, i) => i === 0 || x.von === teile[i - 1]!.bis + 1)
  const ausReleases = aneinander ? teile[teile.length - 1]!.bis : 0
  return (
    Math.max(title.episodes ?? 0, ausReleases, angekuendigteLaenge(title, fuerKopf)) ||
    (nurWochen && alleEvents.length > 1 ? alleEvents.length : undefined)
  )
}

/*
  **„Alle N Folgen" nur, wenn alle N belegt sind** (Kill Blue, 07.09.2026: ADN-Verweis mit
  `dubRanges` 1–4, darüber stand „Alle 12 Folgen auf Deutsch"). Nicht erfasst ist nicht dasselbe
  wie deutsch; `dubLuecken()` sieht nur Bereiche mit `dub: false`.

  **Wer Bereiche nennt, hat nachgesehen — wer keine nennt, hat es nicht.** Sobald überhaupt ein
  Verweis Bereiche belegt, entscheiden nur noch diese (der Crunchyroll-Weg trägt `dub: true`
  ohne `dubRanges` und überstimmte sonst die gemessene ADN-Angabe). Gibt es gar keine Bereiche,
  ist „alle" die beste Auskunft — 2.700 Titel hängen daran.

  **Bei einer abgeschlossenen Serie zählt ein Verweis ohne Bereiche wie in der Pille**
  (Regel 4 an `folgenAngabeFuer()`, mit Daniel am 14.09.2026 abgestimmt): Eyeshield 21, Monster
  und Death Note standen als „36 von 145" neben „ADN 145 Fg. ✓". Die Vorsicht aus Kill Blue
  gilt weiter für laufende Serien.
*/
export function belegendeStreams(title: Title, today: string) {
  const mitUrteil = (title.streams ?? []).filter((s) => s.dub === true)
  const abgeschlossenFuerKasten = title.jpEnd
    ? title.jpEnd < today
    : Boolean(title.jpYear && title.jpYear < Number(today.slice(0, 4)))
  const belegen =
    mitUrteil.some((s) => s.dubRanges?.length) && !abgeschlossenFuerKasten
      ? mitUrteil.filter((s) => s.dubRanges?.length)
      : mitUrteil
  return { mitUrteil, abgeschlossenFuerKasten, belegen }
}

/* Sind die übrigen Folgen als „ohne Deutsch" belegt, fehlt keine Angabe (Gundam GQuuuuuuX, Stichprobe 17.09.2026). */
function restIstBelegt(mitUrteil: Title['streams'] & object, gesamt: number | undefined): boolean {
  return mitUrteil.some((s) => {
    const bereiche = s.dubRanges ?? []
    if (!gesamt || !bereiche.some((b) => !b.dub)) return false
    const gedeckt = new Set<number>()
    for (const b of bereiche) for (let n = b.from; n <= Math.min(b.to, gesamt); n++) gedeckt.add(n)
    return gedeckt.size >= gesamt
  })
}

/*
  **Zwei Wege, zwei Hälften — gezählt wird die Vereinigung** (18.09.2026). Prime teilt
  „Berserk" von 1997 in zwei Staffeln; die Pillen zeigten „Fg. 1–13 ✓" und „Fg. 14–25
  ✓", der Kasten „13 von 25 Folgen", weil er je Weg das Maximum nahm. Gezählt wird über
  eine Menge, damit sich überlappende Bereiche zweier Anbieter nicht doppelt zählen.
*/
export function vereinteFolgen(title: Title, belegen: NonNullable<Title['streams']>, gesamt: number | undefined): Set<number> {
  const vereint = new Set<number>()
  for (const r of [
    ...belegen.flatMap((s) => s.dubRanges ?? []),
    ...(title.watchLinks ?? []).flatMap(belegteBereiche),
  ]) {
    if (!r.dub) continue
    for (let n = r.from; n <= Math.min(r.to, gesamt ?? r.to); n++) vereint.add(n)
  }
  return vereint
}

/*
  Auch Kaufwege mit belegter Spanne zählen — und ein Titel, dessen Synchro nur über
  Sprechrollen belegt ist, gilt als vollständig: Dort ist keine Spanne bekannt, und
  „0 von 100" stand über der Dai-Box mit allen 100 Folgen (16.09.2026).
*/
function dubBelegung(
  { title, today, hatSynchro, gesamt }: { title: Title; today: string; hatSynchro: boolean; gesamt: number | undefined },
): DubBelegung & { abgeschlossenFuerKasten: boolean } {
  const { mitUrteil, abgeschlossenFuerKasten, belegen } = belegendeStreams(title, today)
  const abdeckung = [
    ...belegen.map((s) => dubAbdeckung(s.dubRanges, gesamt)),
    ...(title.watchLinks ?? [])
      .filter((w) => belegteBereiche(w).some((r) => r.dub))
      .map((w) => dubAbdeckung(belegteBereiche(w), gesamt)),
  ]
  if (!abdeckung.length && hatSynchro) abdeckung.push(dubAbdeckung(undefined, gesamt))
  const vereint = vereinteFolgen(title, belegen, gesamt)
  const teilOhneZahl = Boolean(title.deErstausgabe?.teil) && vereint.size === 0 && !belegen.some((s) => s.dub === true) // abgebrochener Dub ohne Bereiche ist nicht „alle“ (Ranma ½ Staffel 2+)
  const vollstaendig = !teilOhneZahl && (abdeckung.some((a) => a.vollstaendig) || Boolean(gesamt && vereint.size >= gesamt))
  const belegteFolgen = Math.max(0, vereint.size, ...abdeckung.map((a) => a.belegt))
  return { vereint, vollstaendig, teilOhneZahl, belegteFolgen, restBelegt: restIstBelegt(mitUrteil, gesamt), abgeschlossenFuerKasten }
}

export function berechneAntwort({ title, releases, today, jetzt }: AntwortEingabe) {
  if (!title) return undefined

  const hatSynchro = hatDeutscheSynchro(title)
  const ohneDisc = releasesOhneDisc(releases, today, hatSynchro)
  /*
    **Eine Kaufausgabe beantwortet nicht die Frage „wann kommt es".** „Code Geass" zeigte über
    einem Titel, der seit 2023 auf Deutsch bei Crunchyroll liegt, den Termin einer neuen
    Blu-ray-Ausgabe. Der Rückfall auf die Disc bleibt richtig ohne belegten deutschen Stream;
    gibt es einen, ist er die Antwort, und die Kaufausgabe steht als eigene Zeile darunter
    (44 Titel betroffen).
  */
  const fuerKopf = kopfReleases({ ohneDisc, releases, imKino: (r) => imKinoBanner(r, today), hatSynchro, title, heute: today })
  const alleEvents = fuerKopf.flatMap((r) => expandEvents(r))
  const { offen, kuenftig } = kuenftigeEreignisse(alleEvents, jetzt)
  const raus = zaehleErschienenJeAnbieter(alleEvents, jetzt)
  /* Ein widerlegter deutscher Termin erzeugt kein Ereignis — er bekommt seine eigene Antwort (02.10.2026). */
  const widerlegt = widerlegterTermin(releases, alleEvents.length)
  if (widerlegt) {
    return { art: 'widerlegt' as const, datum: widerlegt.am, grund: widerlegt.grund, quelle: widerlegt.quelle, anbieter: widerlegt.anbieter, terminOffen: titelSynchroAngekuendigt(title) }
  }
  const gesamt = gesamtFolgen(title, fuerKopf, alleEvents)
  const { vereint, vollstaendig, teilOhneZahl, belegteFolgen, restBelegt, abgeschlossenFuerKasten } = dubBelegung({ title, today, hatSynchro, gesamt })
  const rausMitDavor = raus + folgenVorDemStart(fuerKopf, vereint, gesamt)

  /* Kino und Stream eines Films gehören in einen Kasten — `film-termine.ts`. */
  if (kuenftig.length > 0) {
    return kuenftigeAntwort({ kuenftig, hatSynchro, title, raus: rausMitDavor, today, releases, vollstaendig, abgeschlossenFuerKasten, alleEvents, jetzt, gesamt, vereint, ohneDisc, offen })
  }
  if (title.format === 'MOVIE') {
    return filmAntwort({ title, releases, today, hatSynchro, raus, gesamt })
  }
  if (hatSynchro && !vollstaendig && gesamt) {
    /*
      Teilweise synchronisiert: Der Kasten nennt die belegte Zahl statt „alle".
      `laeuft` ist der Zustand, der genau das kann — er zeigt „x von y".
    */
    return { art: 'teilweise' as const, raus: teilOhneZahl ? undefined : belegteFolgen, gesamt, gesamtBelegt: gesamtIstBelegt(title, fuerKopf, gesamt), restBelegt }
  }
  if (hatSynchro || titleStatus(releases, today, title) === 'erschienen') {
    return fertigAntwort(raus || gesamt, gesamt, vereint.size, alleEvents, today, releases)
  }
  return { art: 'ohne' as const, gesamt }
}
