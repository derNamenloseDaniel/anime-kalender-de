/**
 * Crunchyroll-Auflösung, Staffelseite: Staffelliste holen, Serie suchen, die Staffel zum Werk
 * wählen. Aus `fetch-crunchyroll-offene.ts` herausgelöst (Umbau ohne Verhaltensänderung).
 */
import type { Title } from '../../shared/types.ts'
import { todayIso } from '../../shared/time.ts'
import { sleep } from './util.ts'
import { jahrPasst, reiheFuehrtEsNicht as reiheFuehrtEsNichtRein } from './cr-reihe.ts'
import { geschwister, norm, type Befund, type Katalogeintrag, type Kontext, type Staffel } from './cr-offene-kontext.ts'

/**
 * **Und beurteilt wird die Staffel, nicht die Serie.**
 *
 * Der Serieneintrag im Katalog bündelt, was AniList trennt: „Kaguya-sama"
 * steht dort mit 43 Folgen für fünf Staffeln, „Fruits Basket" mit 63 für
 * drei. Ein Vergleich auf Serienebene kann deshalb **nie** aufgehen — im
 * ersten Anlauf am 09.09.2026 fiel jede der elf Serien mit „Folgenzahl
 * weicht ab (12 gegen 43)" durch.
 *
 * Die Staffelliste beantwortet dieselbe Frage sauber, und sie
 * unterscheidet, worauf es ankommt (gemessen am selben Tag):
 *
 *     seq 1 | 12 Fg | Kaguya-sama: Love is War   | ja, es, pt, en, fr
 *     seq 2 | 12 Fg | Kaguya-sama: Love is War?  | ja, en, es, pt, fr, de-DE
 *
 * Staffel 1 ohne Deutsch, Staffel 2 mit — auf Serienebene wäre beides ein
 * „die Serie führt Deutsch" gewesen, und für Staffel 1 falsch.
 */
export async function beurteileStaffel(ctx: Kontext, werk: Title, kandidat: Katalogeintrag): Promise<Befund> {
  const staffeln = await holeStaffeln(ctx, kandidat.id)
  if (!staffeln.length) {
    return {
      herkunft: 'offen',
      seriesId: kandidat.id,
      titel: kandidat.titel,
      geprueftAm: todayIso(),
      grund: `„${kandidat.titel}" gibt keine Staffelliste heraus`,
    }
  }
  const nachName = staffelnNachName(werk, staffeln)
  const { treffer, nachZahl, nachSumme } = waehleStaffel(ctx, werk, staffeln, nachName)
  if (!treffer) return await beurteileOhneTreffer(ctx, werk, kandidat, staffeln, { nachName, nachZahl, nachSumme })
  const deutsch = treffer.audio.includes('de-DE')
  return {
    herkunft: 'katalog',
    dub: deutsch,
    seriesId: kandidat.id,
    titel: treffer.titel,
    audio: treffer.audio,
    geprueftAm: todayIso(),
    grund: `Staffel „${treffer.titel}" mit ${treffer.folgen ?? '?'} Folgen`,
  }
}

/** Name und Folgenzahl müssen beide treffen — hier die Namensseite (wörtlich, dann normalisiert). */
function staffelnNachName(werk: Title, staffeln: Staffel[]): Staffel[] {
  /*
    **Name und Folgenzahl müssen beide treffen, und der Treffer muss eindeutig sein.**

    Kaguya-sama Staffel 1 und 2 haben beide zwölf Folgen; sie unterscheiden
    sich nur im Namen („Love is War" gegen „Love is War?"). Umgekehrt tragen
    manche Staffeln bei Crunchyroll einen anderen Namen als bei uns — dann
    entscheidet die Folgenzahl allein, aber nur, wenn keine zweite Staffel
    dieselbe hat. Bleiben zwei übrig, gibt es kein Urteil.
  */
  /*
    **Erst wörtlich, dann normalisiert — sonst frisst die Normalisierung das
    unterscheidende Zeichen.**

    Crunchyroll trennt „Kaguya-sama: Love is War" (Staffel 1) und
    „Kaguya-sama: Love is War**?**" (Staffel 2) allein durch das Fragezeichen,
    und beide haben zwölf Folgen. `norm()` streicht Satzzeichen — damit trafen
    beide Werke beide Staffeln, und keines bekam ein Urteil (gemessen
    09.09.2026: „2 über den Namen, 2 über die Zahl von 5").

    Der wörtliche Vergleich ignoriert nur Groß- und Kleinschreibung und
    Leerraum. Trifft er genau eine Staffel, ist die Sache entschieden; sonst
    geht es wie bisher weiter.
  */
  const rohNamen = [werk.titleDe, werk.titleEn, werk.titleRomaji]
    .filter(Boolean)
    .map((n) => String(n).trim().toLowerCase())
  const woertlich = staffeln.filter((s) => rohNamen.includes(s.titel.trim().toLowerCase()))
  const namen = [werk.titleDe, werk.titleEn, werk.titleRomaji].filter(Boolean).map((n) => norm(n as string))
  const nachName = woertlich.length === 1 ? woertlich : staffeln.filter((s) => namen.includes(norm(s.titel)))
  return nachName
}

function waehleStaffel(
  ctx: Kontext,
  werk: Title,
  staffeln: Staffel[],
  nachName: Staffel[],
): { treffer: Staffel | undefined; nachZahl: Staffel[]; nachSumme: Staffel[] } {
  /*
    **Die Folgenzahl allein trifft auch fremde Staffeln — das Jahr hält dagegen.**
    Stone Ocean (2021, 26 Folgen) traf am 16.09.2026 JoJo Staffel 1 (2012, 26
    Folgen) und bekam deren „Deutsch". Kennen beide Seiten ein Jahr, muss es passen.
  */
  const nachZahl = staffeln.filter(
    (s) =>
      werk.episodes != null &&
      s.folgen === werk.episodes &&
      (!werk.jpYear || !s.jahre.length || jahrPasst(s.jahre, Number(werk.jpYear))),
  )
  /**
   * **Bleiben mehrere übrig, entscheidet das Jahr.**
   *
   * Bei „Sound! Euphonium" heißen zwei Staffeln gleich und zwei haben
   * dreizehn Folgen — über Name und Zahl ist nichts zu holen. Unser Bestand
   * führt `jpYear: 2015`, und Crunchyrolls Staffel-Tags nennen
   * `Frühling-2015`. Ein Jahr ist kein Namensvergleich: Es steht auf beiden
   * Seiten als Zahl und stammt aus der japanischen Ausstrahlung.
   *
   * Angewandt nur, wenn es **genau eine** Staffel trifft — sonst bleibt es
   * beim bisherigen Ergebnis, also meist bei keinem Urteil.
   */
  const nachJahr = werk.jpYear
    ? staffeln.filter((st) => (st.jahre ?? []).includes(Number(werk.jpYear)))
    : []
  /*
    **Führt eine Staffel ihre Nebenausgabe mit, geht die Folgenzahl als Summe auf.**

    Heart Throb hat bei uns 12 Folgen, Crunchyrolls Dub-Block 13 — die OVA
    steckt als E13 darin. Gesucht wurde bisher nur nach genau 12, und so blieb
    die Staffel am 10.09.2026 offen („0 über den Namen, 0 über die Zahl").
    Die Summe gilt nur mit einer Nebenausgabe **derselben Reihe** und nur,
    wenn genau eine Staffel sie trifft.
  */
  const { neben } = geschwister(ctx.titles, werk)
  const nachSumme =
    werk.episodes != null && nachZahl.length === 0
      ? staffeln.filter((s) => s.folgen != null && neben.some((k) => s.folgen === werk.episodes! + k))
      : []
  const treffer =
    nachName.length === 1 && (nachZahl.length === 0 || nachZahl.some((s) => s.id === nachName[0]!.id))
      ? nachName[0]
      : nachZahl.length === 1
        ? nachZahl[0]
        : nachJahr.length === 1
          ? nachJahr[0]
          : nachSumme.length === 1
            ? nachSumme[0]
            : undefined
  return { treffer, nachZahl, nachSumme }
}

async function beurteileOhneTreffer(
  ctx: Kontext,
  werk: Title,
  kandidat: Katalogeintrag,
  staffeln: Staffel[],
  zaehlung: { nachName: Staffel[]; nachZahl: Staffel[]; nachSumme: Staffel[] },
): Promise<Befund> {
  const { nachName, nachZahl, nachSumme } = zaehlung
  /**
   * **Sagen alle Staffeln dasselbe, braucht es keine Zuordnung.**
   *
   * „Meine Wiedergeburt als Schleim" führt sechs Staffeln, **jede** mit
   * deutscher Fassung. Welche unser Eintrag meint, ist dann gleichgültig:
   * Das Urteil fällt für jede gleich aus. Drei unserer Verweise hingen am
   * 09.09.2026 allein daran, dass die Folgenzahlen nicht aufgingen (24, 12
   * und 12 gegen 25, 25, 26, 21, 5, 3).
   *
   * **Nur bei Einstimmigkeit**, und nur mit mehr als einer Staffel — sonst
   * ist es der gewöhnliche Serienvergleich, den dieses Projekt aus gutem
   * Grund nicht macht. Ein einstimmiges **Nein** zählt ebenso: Es kommt aus
   * dem deutschen Katalog, und dort ist ein fehlendes `de-DE` ein Beleg.
   */
  const nichtDabei = nachName.length + nachZahl.length + nachSumme.length === 0 ? await reiheFuehrtEsNicht(ctx, werk, kandidat, staffeln) : undefined
  if (nichtDabei) {
    return { herkunft: 'tot', seriesId: kandidat.id, titel: kandidat.titel, geprueftAm: todayIso(), grund: nichtDabei }
  }
  const alleDeutsch = staffeln.length > 1 && staffeln.every((s) => s.audio.includes('de-DE'))
  const keineDeutsch = staffeln.length > 1 && staffeln.every((s) => !s.audio.includes('de-DE'))
  if (alleDeutsch || keineDeutsch) {
    return {
      herkunft: 'katalog',
      dub: alleDeutsch,
      seriesId: kandidat.id,
      titel: kandidat.titel,
      audio: alleDeutsch ? ['de-DE'] : [],
      geprueftAm: todayIso(),
      grund: `alle ${staffeln.length} Staffeln von „${kandidat.titel}" ${alleDeutsch ? 'führen' : 'führen kein'} Deutsch — die Zuordnung ändert daran nichts`,
    }
  }
  return {
    herkunft: 'offen',
    seriesId: kandidat.id,
    titel: kandidat.titel,
    geprueftAm: todayIso(),
    grund:
      `kein eindeutiger Staffeltreffer (${werk.episodes ?? '?'} Fg.; ` +
      `${nachName.length} über den Namen, ${nachZahl.length} über die Zahl von ${staffeln.length})`,
  }
}

/** Die Regel steht in `lib/cr-reihe.ts`; hier kommen Katalogzahl und Suche dazu. */
export async function reiheFuehrtEsNicht(
  ctx: Kontext,
  werk: Title,
  kandidat: { id: string; titel: string },
  staffeln: Staffel[],
): Promise<string | undefined> {
  const katalogFolgen = ctx.katalogNachId.get(kandidat.id)?.folgen
  /* Die Suche kostet einen Abruf — erst fragen, wenn die Liste sonst genügen würde. */
  if (!reiheFuehrtEsNichtRein(werk, staffeln, katalogFolgen, false)) return undefined
  return reiheFuehrtEsNichtRein(werk, staffeln, katalogFolgen, await andersWoMoeglich(ctx, werk, kandidat))
}

/**
 * Nennt die Suche nach dem Werk einen anderen Eintrag, der es sein könnte?
 *
 * „Könnte" heißt: Der Titel beginnt wie die Reihe (die ersten zwei Wörter,
 * „attack on …"), oder er steckt ganz im Werknamen („-prelude-" in „Fruits
 * Basket -prelude-"). Ein Namensvergleich entscheidet hier nichts — er hält
 * nur einen Befund zurück, der sonst einen Verweis entfernen würde.
 */
async function andersWoMoeglich(ctx: Kontext, werk: Title, kandidat: { id: string; titel: string }): Promise<boolean> {
  const anfang = norm(kandidat.titel).split(' ').slice(0, 2).join(' ')
  const werkNamen = [werk.titleDe, werk.titleEn, werk.titleRomaji].filter(Boolean).map((n) => norm(n as string))
  for (const name of new Set(werkNamen)) {
    if (name.length < 3) continue
    const { body } = await ctx.hol(
      `https://beta-api.crunchyroll.com/content/v2/discover/search?q=${encodeURIComponent(name)}&n=8&type=series,movie_listing&locale=de-DE`,
    )
    await sleep(700)
    for (const g of (body as { data?: { items?: { id: string; title: string }[] }[] })?.data ?? []) {
      for (const it of g.items ?? []) {
        if (it.id === kandidat.id) continue
        const t = norm(it.title)
        if ((anfang.length >= 4 && t.startsWith(anfang)) || (t.length >= 5 && werkNamen.some((w) => w.includes(t)))) {
          return true
        }
      }
    }
  }
  return false
}

/** Die Staffeln einer Serie mit ihren Tonspuren — je Staffel, nicht je Serie. */
export async function holeStaffeln(ctx: Kontext, serieId: string): Promise<Staffel[]> {
  const { body } = await ctx.hol(`https://beta-api.crunchyroll.com/content/v2/cms/series/${serieId}/seasons?locale=de-DE`)
  const daten =
    (
      body as {
        data?: {
          id: string
          title?: string
          number_of_episodes?: number
          audio_locale?: string
          season_tags?: string[]
          versions?: { audio_locale?: string }[]
        }[]
      }
    )?.data ?? []
  return daten.map((s) => ({
    id: s.id,
    titel: s.title ?? '',
    folgen: s.number_of_episodes ?? null,
    /*
      `versions` nennt alle Fassungen dieser Staffel; `audio_locale` nur die
      des Blocks, den wir gerade in der Hand haben. Wo es beides gibt, zählt
      die Liste — sonst hinge das Urteil daran, welchen Block Crunchyroll
      zuerst ausliefert.
    */
    audio: [...new Set((s.versions ?? []).map((v) => v.audio_locale).filter(Boolean) as string[])].length
      ? [...new Set((s.versions ?? []).map((v) => v.audio_locale).filter(Boolean) as string[])]
      : s.audio_locale
        ? [s.audio_locale]
        : [],
    /**
     * **Das Jahr steht in den Staffel-Tags — der Anker, der bisher fehlte.**
     *
     * „Sound! Euphonium" hat bei Crunchyroll zwei Staffeln desselben Namens
     * (14 und 13 Folgen) und eine dritte mit 13. Über Name und Zahl ist
     * unsere Staffel (13 Folgen) nicht zu treffen; `season_tags` sagt es in
     * einem Wort: `Frühling-2015`, `Herbst-2016`, `spring-2024`.
     *
     * Geschrieben wird mal deutsch, mal englisch — gelesen wird deshalb nur
     * die **Jahreszahl**.
     */
    jahre: [...new Set((s.season_tags ?? []).map((tag) => Number(/(\d{4})/.exec(String(tag))?.[1])).filter(Boolean))],
  }))
}

/**
 * Sucht die Serie im **deutschen** Katalog — und nimmt nur einen Treffer, der
 * im Namen übereinstimmt.
 *
 * Gesucht wird über `discover/search`, denselben Weg, der am 25.08.2026 die
 * Detektiv-Conan-Lücke gelöst hat: Unser Bestand führte den englischen Block
 * (`case-closed`, 33 Folgen, kein Deutsch), die deutsche Serie liegt unter
 * einer anderen Kennung mit 405 deutschen Folgen.
 */
export async function sucheSerie(ctx: Kontext, werk: Title): Promise<Katalogeintrag | undefined> {
  /*
    **Auch der Reihenname wird gesucht — die Staffel entscheidet danach.**

    Unser Bestand führt „The Promised Neverland Season 2", der Katalog „THE
    PROMISED NEVERLAND" mit zwei Staffeln. Ein Suchabgleich, der
    Namensgleichheit verlangt, findet die Serie deshalb nie — und ohne Serie
    gibt es keine Staffelliste (gemessen 09.09.2026: fünf Werke fielen so
    durch, darunter drei Slime-Staffeln).
  */
  const ohneStaffel = (n: string) =>
    n
      .replace(/\s*[:\-–]?\s*(season|staffel|s)\s*\d+\s*$/i, '')
      .replace(/\s+\d+(st|nd|rd|th)?\s+season\s*$/i, '')
      .trim()
  const namen = [
    ...new Set(
      [werk.titleDe, werk.titleEn, werk.titleRomaji]
        .filter(Boolean)
        .flatMap((n) => [String(n), ohneStaffel(String(n))])
        .filter((n) => n.length >= 3),
    ),
  ]
  for (const name of namen) {
    const { body } = await ctx.hol(
      `https://beta-api.crunchyroll.com/content/v2/discover/search?q=${encodeURIComponent(name)}&n=8&type=series,movie_listing&locale=de-DE`,
    )
    const gruppen = (body as { data?: { items?: { id: string; title: string }[] }[] })?.data ?? []
    for (const g of gruppen) {
      for (const it of g.items ?? []) {
        if (norm(it.title) !== norm(name)) continue
            /*
          **Auch Filme werden gesucht.** Bis zum 10.09.2026 fragte die Suche nur
          `type=series`, und ein Film liegt bei Crunchyroll als `movie_listing` —
          der Katalogsammler holt beide seit dem 09.09., die Suche tat es nicht.
        */
    /* Der Katalog kennt die Tonspuren; die Suche nennt sie nicht vollständig. */
        const ausKatalog = ctx.katalogNachId.get(it.id)
        if (ausKatalog) return ausKatalog
      }
    }
    await sleep(700)
  }
  return undefined
}
