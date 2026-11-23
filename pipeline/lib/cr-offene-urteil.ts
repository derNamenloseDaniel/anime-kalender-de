/**
 * Crunchyroll-Auflösung, Urteilsseite: je Verweis über Videokennung, fehlenden Treffer, Film oder
 * Nebenausgabe ein Befund. Aus `fetch-crunchyroll-offene.ts` herausgelöst (Umbau ohne Verhaltensänderung);
 * die Staffelwahl steht in `cr-offene-staffel.ts`.
 */
import type { Title } from '../../shared/types.ts'
import { todayIso } from '../../shared/time.ts'
import { jwFrisch } from './jw-handpruefung.ts'
import {
  geschwister,
  zurHandpruefung,
  type Befund,
  type Katalogeintrag,
  type Kontext,
  type VideoObjekt,
} from './cr-offene-kontext.ts'
import { holeStaffeln, reiheFuehrtEsNicht } from './cr-offene-staffel.ts'

/** Beurteilt einen Verweis über seine Videokennung (eigene oder von JustWatch geliehene). */
export async function beurteileVideo(ctx: Kontext, videoId: string, eigeneVideoId: string | undefined): Promise<Befund> {
  const { status, body } = await ctx.hol(
    `https://beta-api.crunchyroll.com/content/v2/cms/objects/${videoId}?locale=de-DE`,
  )
  /**
   * **Ein 404 belegt nur den Verweis, der ihn selbst trägt.**
   *
   * Steht die Kennung in **unserer** Adresse, führt sie ins Leere und der
   * Verweis fliegt raus. Ist sie von JustWatch geliehen, sagt ihr Ende
   * nichts über unsere Adresse — sie kann längst veraltet sein, während
   * unser Slug weiterhin trägt. Gemessen am 10.09.2026 an „Okko's Inn":
   * JustWatch nennt `GWDU8PMGG`, Crunchyroll kennt die Kennung nicht mehr,
   * und unser Verweis auf `/okkos-inn/…` ist davon unberührt.
   */
  if (status === 404) {
    return eigeneVideoId
      ? { herkunft: 'tot', geprueftAm: todayIso(), grund: `Videokennung ${videoId} gibt es nicht mehr` }
      : {
          herkunft: 'offen',
          geprueftAm: todayIso(),
          grund: `die von JustWatch genannte Kennung ${videoId} gibt es nicht mehr`,
        }
  }
  const o = (body as { data?: VideoObjekt[] })?.data?.[0]
  const md = o?.episode_metadata
  if (md?.audio_locale === 'de-DE') {
    return { herkunft: 'video', dub: true, titel: o?.title, seriesId: md.series_id, geprueftAm: todayIso() }
  }
  return urteilAusVideo(ctx, o)
}

/** Kein Deutsch an diesem Video: Fassungsliste der Folge, dann der Serieneintrag. */
function urteilAusVideo(ctx: Kontext, o: VideoObjekt | undefined): Befund {
  const md = o?.episode_metadata
  /**
   * **Die Folge nennt ihre sämtlichen Fassungen selbst — und das ist ein
   * Beleg.**
   *
   * `audio_locale` sagt, in welcher Sprache **dieses** Video vorliegt;
   * daraus folgt nichts, denn die deutsche Fassung hat eine eigene
   * Kennung. `versions[]` ist die andere Auskunft: Dort listet Crunchyroll
   * **alle** Fassungen derselben Folge — genau der Schlüssel, den CLAUDE.md
   * seit dem 25.08.2026 als den tragfähigen benennt („er hängt an der
   * Folge, nicht am Block").
   *
   * Gemessen am 10.09.2026 an beiden „Rascal"-Filmen: `audio_locale: ja-JP`,
   * `versions: en-US, ja-JP, fr-FR` — kein Deutsch, und zwar nicht als
   * Schweigen, sondern als vollständige Liste. Der Serieneintrag führt
   * `de-DE` (aus anderen Staffeln), der Zweig darunter kam deshalb nie zu
   * einem Urteil.
   *
   * Der Abruf kommt aus Deutschland (`country: DE`, sonst bricht der Lauf
   * ab) — die Einschränkung vom 22.08.2026 („ein fehlendes de-DE aus
   * US-Sicht belegt nichts") greift hier nicht.
   */
  const fassungen = [...new Set((md?.versions ?? []).map((v) => v?.audio_locale).filter(Boolean))]
  if (fassungen.length && !fassungen.includes('de-DE')) {
    return {
      herkunft: 'video',
      dub: false,
      titel: o?.title,
      seriesId: md?.series_id,
      audio: fassungen as string[],
      geprueftAm: todayIso(),
      grund: `die Folge nennt ihre Fassungen selbst (${fassungen.join(', ')}) — kein Deutsch darunter`,
    }
  }
  /*
    Kein Deutsch an **diesem** Video und keine Fassungsliste — das ist kein
    Nein. Gefragt wird deshalb der Serieneintrag: Führt auch er kein
    `de-DE`, haben zwei Stellen unabhängig geschwiegen, und daraus wird
    eins.
  */
  const serie = md?.series_id ? ctx.katalogNachId.get(md.series_id) : undefined
  if (serie && !(serie.audio ?? []).includes('de-DE')) {
    return {
      herkunft: 'katalog',
      dub: false,
      titel: serie.titel,
      seriesId: md?.series_id,
      audio: serie.audio,
      geprueftAm: todayIso(),
      grund: `Video ${md?.audio_locale ?? '—'}, Serie „${serie.titel}" ohne de-DE`,
    }
  }
  return {
    herkunft: 'offen',
    seriesId: md?.series_id,
    geprueftAm: todayIso(),
    grund: serie
      ? `Video ${md?.audio_locale ?? '—'}, aber die Serie führt Deutsch — eine andere Fassung kann es geben`
      : `Video ${md?.audio_locale ?? '—'}, Serie ${md?.series_id ?? '?'} nicht im deutschen Katalog`,
  }
}

/** Keine Serie gefunden: zwei schweigende Stellen heißen tot, sonst bleibt der Verweis offen. */
export function beurteileOhneKandidat(ctx: Kontext, url: string, werk: Title): Befund {
  /**
   * **Zwei Stellen, die unabhängig schweigen — dann führt die Adresse ins Leere.**
   *
   * „Kennt der deutsche Katalog nicht" war bis heute **kein** Beleg, und der
   * Grund dafür ist entfallen: Der Katalog holte nur Serien, Filme fehlten
   * bauartbedingt. Seit dem 09.09.2026 holt er auch `movie_listing` (69
   * Stück, laut `total` vollständig) — ein Film, der dort fehlt, fehlt
   * wirklich.
   *
   * Ein Beleg wird daraus trotzdem erst mit einer **zweiten** Quelle:
   * JustWatch muss den Titel kennen, Angebote führen **und** Crunchyroll
   * nicht darunter haben. Kennt JustWatch gar nichts, ist sein Schweigen
   * keine Auskunft (5 von 9 Fällen tragen so, 1 widerspricht — „Okko und
   * ihre Geisterfreunde" läuft dort sehr wohl, nur unter anderem Slug).
   *
   * Der Befund gilt der **Adresse**, nicht der Sprache: Der Bau macht daraus
   * `available: false` und entfernt den Verweis, der niemanden mehr
   * irgendwohin führt.
   */
  const jwEintrag = ctx.justwatch[String(werk.id)]
  const anbieter = (jwEintrag?.angebote ?? []).map((a) => String(a?.anbieter ?? ''))
  if (anbieter.length && !anbieter.some((n) => /crunchyroll/i.test(n))) {
    if (jwFrisch(jwEintrag, ctx.heuteIso))
      return zurHandpruefung(ctx, werk, url, `nicht im deutschen Katalog, JustWatch ohne Crunchyroll`, jwEintrag?.jwPfad)
    return {
      herkunft: 'tot',
      geprueftAm: todayIso(),
      grund:
        `im deutschen Katalog nicht geführt, und JustWatch nennt ${anbieter.length} Anbieter ohne Crunchyroll ` +
        `(${[...new Set(anbieter)].slice(0, 3).join(', ')})`,
    }
  }
  /*
    **Eine Altadresse der Form „…-unbekannt-NNNNNN" ist tot.** Crunchyroll hat
    diese Medienseiten mit dem Umbau abgeschaltet; beide, die am 13.09.2026
    geöffnet wurden (Cencoroll Connect, Your Voice), führten auf „404 – Seite
    nicht gefunden“ (Daniel, mit Bildern). Okko trug dieselbe Form und fand
    sich nur noch unter neuer Serienkennung. Der Befund gilt
    der Adresse, nicht der Sprache — er entfernt einen Weg, der nirgends
    mehr hinführt.
  */
  if (/-unbekannt-\d+(?:[/?#]|$)/i.test(url)) {
    return {
      herkunft: 'tot',
      geprueftAm: todayIso(),
      grund: 'Altadresse der Form „…-unbekannt-N" ohne Serienkennung; diese Seiten führen seit dem Umbau auf 404',
    }
  }
  return { herkunft: 'offen', geprueftAm: todayIso(), grund: 'keine Kennung in der Adresse, kein sicherer Treffer' }
}

/** Der Treffer ist selbst ein Film: seine Tonspuren gelten unmittelbar. */
export function filmUrteil(kandidat: Katalogeintrag): Befund {
  const deutschImFilm = (kandidat.audio ?? []).includes('de-DE')
  return {
    herkunft: 'katalog',
    dub: deutschImFilm,
    seriesId: kandidat.id,
    titel: kandidat.titel,
    audio: kandidat.audio ?? [],
    geprueftAm: todayIso(),
    grund: `Filmeintrag „${kandidat.titel}" im deutschen Katalog${deutschImFilm ? ' mit' : ' ohne'} de-DE`,
  }
}

/** Film, OVA oder Special, dessen Adresse auf die Reihe zeigt. */
export async function beurteileNebenausgabe(
  ctx: Kontext,
  url: string,
  werk: Title,
  kandidat: Katalogeintrag,
): Promise<Befund> {
  /**
   * **Zeigt die Adresse auf die Reihe, ist die Sprachfrage offen — die
   * Angebotsfrage nicht.**
   *
   * Fünf „Free!"-Filme, eine Chunibyo-OVA, zwei Specials: Ihre Adresse
   * nennt den Slug der Serie. Ob der **Film** dort läuft, sagt das nicht,
   * und die Serie vererbt ihre Sprache nicht.
   *
   * Beantwortbar bleibt die Frage daneben: Der deutsche Katalog führt seit
   * dem 09.09.2026 auch Filme (69, laut `total` vollständig) — steht das
   * Werk dort nicht und nennt JustWatch Angebote **ohne** Crunchyroll, dann
   * gibt es dort kein Angebot, und der Verweis führt für dieses Werk ins
   * Leere.
   *
   * Gemessen am 10.09.2026: fünf von neun tragen das. „Sword Art Online:
   * Extra Edition" widerspricht — JustWatch führt dort einen
   * Crunchyroll-Kanal, also bleibt der Verweis offen.
   */
  /**
   * **Erst nachsehen, ob Crunchyroll die Ausgabe selbst führt.**
   *
   * Der Riegel oben stellt richtig fest, dass eine OVA nicht die Reihe ist.
   * Daraus folgt aber nicht, dass sie unauffindbar wäre: Crunchyroll legt
   * Nebenausgaben regelmäßig als **eigene Staffel** unter derselben Reihe
   * an und schreibt die Art in den Staffeltitel.
   *
   * Gemessen am 10.09.2026 an „Love, Chunibyo & Other Delusions - Heart
   * Throb -": Die Reihe führt zwei Staffeln, `GYP8CXW2Q` („(German Dub)",
   * 13 Folgen, `de-DE`) und `GR2PCVZM5` („(OVA)", 1 Folge, `ja-JP`). Unser
   * Werk ist die OVA — und die gibt es dort nur auf Japanisch.
   *
   * Zwei Bedingungen, beide notwendig: **genau eine** Staffel trägt die
   * Ausgabenart im Titel (bei mehreren entscheidet nichts), und sie nennt
   * überhaupt Fassungen. Eine leere Fassungsliste ist Schweigen, kein Nein.
   */
  const ausgabenMuster =
    werk.format === 'OVA' ? /\bOVA\b/i : werk.format === 'SPECIAL' ? /\bspecials?\b/i : undefined
  if (ausgabenMuster) {
    const eigene = await ausgabeInStaffel(ctx, werk, kandidat, ausgabenMuster)
    if (eigene) return eigene
  }
  const nichtDabei = await reiheFuehrtEsNicht(ctx, werk, kandidat, await holeStaffeln(ctx, kandidat.id))
  if (nichtDabei) {
    return { herkunft: 'tot', seriesId: kandidat.id, titel: kandidat.titel, geprueftAm: todayIso(), grund: nichtDabei }
  }
  const jwEintrag2 = ctx.justwatch[String(werk.id)]
  const anbieter2 = (jwEintrag2?.angebote ?? []).map((a) => String(a?.anbieter ?? ''))
  if (anbieter2.length && !anbieter2.some((n) => /crunchyroll/i.test(n))) {
    if (jwFrisch(jwEintrag2, ctx.heuteIso))
      return zurHandpruefung(ctx, werk, url, `Reihe „${kandidat.titel}", Werk nicht im Katalog, JustWatch ohne Crunchyroll`, jwEintrag2?.jwPfad)
    return {
      herkunft: 'tot',
      seriesId: kandidat.id,
      titel: kandidat.titel,
      geprueftAm: todayIso(),
      grund:
        `die Adresse zeigt auf die Reihe „${kandidat.titel}", das ${werk.format} steht nicht im deutschen Katalog, ` +
        `und JustWatch nennt ${anbieter2.length} Anbieter ohne Crunchyroll (${[...new Set(anbieter2)].slice(0, 3).join(', ')})`,
    }
  }
  return {
    herkunft: 'offen',
    seriesId: kandidat.id,
    titel: kandidat.titel,
    geprueftAm: todayIso(),
    grund: `„${kandidat.titel}" ist die Reihe, ${werk.format} ist eine eigene Ausgabe`,
  }
}

/** Steckt die Nebenausgabe in einer Hauptstaffel oder hat sie eine eigene Staffel? */
async function ausgabeInStaffel(
  ctx: Kontext,
  werk: Title,
  kandidat: Katalogeintrag,
  ausgabenMuster: RegExp,
): Promise<Befund | undefined> {
  const derReihe = await holeStaffeln(ctx, kandidat.id)
  /*
    **Steckt die Nebenausgabe synchronisiert in einer Hauptstaffel?**

    Chunibyo Heart Throb: Der Block „(OVA)" hat eine Folge nur mit
    Untertiteln, und daraus wurde am 10.09.2026 ein Nein. Im Block
    „(German Dub)" steht dieselbe Folge als S2 E13 mit Synchro — 13 Folgen
    = Staffel 12 + OVA 1. Bei Durarara führt die Serie 25 deutsche Folgen,
    24 plus das Special Tenka Taihei (aniSearch 6986).

    Gerechnet wird mit den Folgenzahlen aus unserem Bestand: Ein deutscher
    Block, dessen Folgenzahl eine Hauptserie der Reihe um **mindestens
    eine und höchstens so viele** Folgen übersteigt, wie dieses Werk hat,
    trägt es mit. **Genau ein** solcher Block, sonst kein Urteil.
  */
  const { haupt } = geschwister(ctx.titles, werk)
  const eigene = Number.isFinite(werk.episodes) ? Number(werk.episodes) : 1
  const mitgefuehrt = derReihe.filter(
    (st) =>
      st.audio.includes('de-DE') &&
      st.folgen != null &&
      /*
        Ein Block, der selbst so viele Folgen hat wie eine unserer
        Hauptserien, ist diese Hauptserie und trägt nichts mit: DxD „Hero"
        hat bei uns wie bei Crunchyroll 13 Folgen, 13 − 12 hätte sonst die
        Mini-Episoden hineingerechnet (16.09.2026).
      */
      !haupt.includes(st.folgen) &&
      haupt.some((n) => st.folgen! - n >= 1 && st.folgen! - n <= eigene),
  )
  if (mitgefuehrt.length === 1) {
    const st = mitgefuehrt[0]!
    return {
      herkunft: 'katalog',
      dub: true,
      seriesId: st.id,
      titel: st.titel,
      audio: st.audio,
      geprueftAm: todayIso(),
      grund: `„${st.titel}" führt ${st.folgen} deutsche Folgen, mehr als die Hauptserie — das ${werk.format} steckt darin`,
    }
  }
  const passend = derReihe.filter((st) => ausgabenMuster.test(st.titel))
  if (passend.length === 1 && passend[0]!.audio.length) {
    const st = passend[0]!
    const deutsch = st.audio.includes('de-DE')
    return {
      herkunft: 'katalog',
      dub: deutsch,
      seriesId: st.id,
      titel: st.titel,
      audio: st.audio,
      geprueftAm: todayIso(),
      grund: `Crunchyroll führt „${st.titel}" als eigene Staffel${deutsch ? ' mit' : ' ohne'} de-DE`,
    }
  }
  return undefined
}
