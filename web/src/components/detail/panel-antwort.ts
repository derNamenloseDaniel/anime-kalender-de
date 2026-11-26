import { useMemo } from 'react'
import type { Release, Title } from '@shared/types.ts'
import type { Synopsis } from '../../lib/data.ts'
import type { Translate } from '../../lib/i18n.tsx'
import type { NewsletterVerbindung } from '../../lib/newsletterSync.ts'
import { useTvVorbei } from './tv-vorbei.tsx'
import { useTerminReleases } from './termin-releases.ts'
import { folgenAuskunft } from './folgen-angabe.ts'
import { lueckeOhneAnbieter } from './folgen-ohne-anbieter.ts'
import { dubZeilenVon } from './dub-zeilen.ts'
import { berechneAntwortMitDeFolgen } from './antwort-de-folgen.ts'
import { sortiereNachZugang } from './wege-sortieren.ts'
import { sichtbareTermine, sichtbareWege } from './wege-sichtbar.ts'
import { kastenNotizVon, wegeHinweisVon } from './kasten-hinweise.ts'
import { useReleaseSichten } from './release-sichten.ts'

/** Alles, was der Antwortkasten und die Wege des Panels aus Titel und Terminen ableiten. */
export function usePanelAntwort({ title, releases, today, synopsis, favorites, verbindung, t }: {
  title: Title | undefined
  releases: Release[]
  today: string
  synopsis: Synopsis | undefined
  favorites: Set<number>
  verbindung: NewsletterVerbindung
  t: Translate
}) {
  /**
   * Streaming, aufgeteilt nach dem, was es kostet.
   *
   * Daniel am 23.08.2026: „wir brauchen bereich streaming und disc, und unter
   * streaming die kategorien kostenlos, abo, kauf/leih." Für einen Besucher ist
   * genau das der Unterschied — wer kein Netflix hat, dem nützt ein
   * Netflix-Eintrag nichts, und wer eine Folge frei sehen kann, will das oben
   * stehen haben.
   *
   * Die Reihenfolge ist deshalb kostenlos → Abo → Kauf: von „sofort" zu „kostet".
   *
   * `unbekannt` steht am Ende, weil es keine Preisstufe ist, sondern eine
   * fehlende Auskunft — dort landen die Amazon-Suchadressen, die nur zur Suche
   * führen und über das Angebot nichts aussagen. **Die Art muss in dieser Liste
   * stehen:** Was hier fehlt, fällt aus allen Gruppen und verschwindet
   * kommentarlos aus der Anzeige.
   */
  const sortiertNachZugang = useMemo(() => {
    return title ? sichtbareWege(sortiereNachZugang({ title }), title, releases) : sortiereNachZugang({ title })
  }, [title, releases])
  const { discReleases, releaseJePlattform, kinoRelease } = useReleaseSichten(releases, today)
  const alleTermine = useTerminReleases(releases, title, kinoRelease?.slug, today)
  const terminReleases = useMemo(() => sichtbareTermine(alleTermine, sortiertNachZugang, today), [alleTermine, sortiertNachZugang, today])
  /* Führt der Titel den Anbieter schon als Link, steht dort dessen Pille; der Termin allein erst vor der ersten Folge. */
  const streamReleases = useMemo(
    () => terminReleases.filter((r) => !(title?.streams ?? []).some((s) => s.platform === r.platform)),
    [terminReleases, title],
  )

  /*
    **Die Pille nennt, wie viele Folgen es dort gibt.**

    Daniel am 13.09.2026: „in den pills muss überall drin stehen wieviele
    episoden bei dem jeweiligen anbieter sind. einfaches de ✅ reicht nicht, und
    seit datum ist uninteressant." Am 14.10.2026 kehrte er das um: „seit" steht in der Pille (`pilleUnten`).

    Vier Quellen, gemessen am 14.09.2026 über 1.982 deutsche Verweise (517 Filme,
    783 mit Einzelbeleg je Anbieter, 682 abgeschlossene Serien, 0 laufende ohne
    Beleg), von Daniel so bestätigt:

    1. **Film:** keine Zahl — ein Film ist eine Folge.
    2. **Belegte Bereiche:** was sie sagen — „nur Fg. 1" (Date a Live auf
       YouTube, 07.09.2026: „was da ist, nicht was fehlt"), eine Lücke, eine
       Grenze oder die Summe.
    3. **Laufende Wochenserie:** die bei diesem Anbieter erschienenen Folgen,
       gezählt wie im Kasten darüber.
    4. **Abgeschlossene Serie:** die Folgen des Titels — dieselbe Rechnung wie
       „Alle 12 Folgen auf Deutsch".

    Eine laufende Serie ohne Wochenplan und ohne Beleg bekommt keine Zahl — dort
    wüssten wir sie nicht. Ein Bezugsweg („Amazon Prime (Crunchyroll)") erbt die
    Angaben des Verweises mit derselben Adresse; ohne ihn gilt die Regel des Titels.
  */
  /**
   * **Der Hinweis an der Pille: zeilenweise, Deutsch zuerst**.
   *
   * Drei Mengen, drei Zeilen, und keine davon steht da, wenn sie leer ist: wie viele Folgen
   * auf Deutsch (und wovon), welche das sind, welche nur fremdsprachig dort liegen, und
   * welche der Anbieter gar nicht führt. Deckt ein Weg alles auf Deutsch ab, sagt das
   * Häkchen daneben schon alles — dann bleibt der Hinweis leer.
   */
  const dubZeilen = dubZeilenVon({ title, t, releases, today })
  /* Die Folgenangabe kommt aus `detail/folgen-angabe.ts` (Zerlegung, 29.09.2026) — einmal gebunden. */
  const folgenAngabeFuer = folgenAuskunft({ releases, title, t, releaseJePlattform, today })

  /**
   * Die Antwort auf die Frage, wegen der jemand dieses Panel öffnet.
   *
   * *Wann kommt die nächste Folge, wie weit bin ich, wo kann ich gucken.* Bis
   * zum 24.08.2026 standen die Bausteine dafür verstreut: `Start`, `Folgen` und
   * `Nächste Folge` in drei Zeilen eines Kastens, der als vierter Block kam —
   * nach Bildergalerie, Bewertung und sechs Genre-Chips. Wer die Antwort wollte,
   * musste sie sich zusammensetzen.
   *
   * Hier entsteht sie als **ein** Satz, aus denselben Terminen, die auch die
   * Liste darunter füllt. Vier Fälle, und jeder bekommt dieselben vier Zeilen —
   * Überschrift, Nebenzeile, Balken, Zählzeile. Ungleich hohe Kästen ließen beim
   * Wechseln des Reihenteils alles darunter springen (Daniel, 24.08.2026:
   * „solche element verrückungen sollten möglichst vermieden werden").
   *
   * Der vierte Fall ist der Film: 697 der 2.762 Titel. Ein Folgenzähler ergibt
   * dort keinen Sinn, und ein Balken, der immer voll ist, misst nichts. Statt
   * seiner stehen drei Angaben, die es bei einem Film wirklich gibt.
   */
  const antwort = useMemo(() => {
    return berechneAntwortMitDeFolgen({ title, releases, today, deFolgen: synopsis?.deFolgen })
    // `today` steht in der Abhängigkeitsliste, weil `titleStatus` es benutzt.
  }, [title, releases, today, synopsis?.deFolgen])

  const wegeHinweis = wegeHinweisVon({ title, antwort, favorites, verbindung, releases, today, t })

  const tvVorbei = useTvVorbei(wegeHinweis, streamReleases, releases, today)

  const kastenNotiz = useMemo(() => kastenNotizVon(releases, today), [releases, today])

  /* Welche Folgen bei keinem bekannten Anbieter liegen — Begründung in `lueckeOhneAnbieter`. */
  const folgenLuecke = useMemo(
    () => lueckeOhneAnbieter({ title, antwort, releaseJePlattform, today }),
    [title, antwort, releaseJePlattform, today],
  )
  /* Zeigt der Kasten eine Zählzeile („2 von 13 Folgen erschienen", „Alle 24 Folgen"), steht die Folgenzahl nicht noch einmal auf dem Cover. */
  const folgenImKasten =
    (antwort?.art === 'laeuft' && Boolean(antwort.gesamt)) || (antwort?.art === 'fertig' && (antwort.gesamt ?? 0) > 1) || antwort?.art === 'teilweise'

  return {
    sortiertNachZugang,
    discReleases,
    releaseJePlattform,
    kinoRelease,
    terminReleases,
    streamReleases,
    dubZeilen,
    folgenAngabeFuer,
    antwort,
    wegeHinweis,
    tvVorbei,
    kastenNotiz,
    folgenLuecke,
    folgenImKasten,
  }
}
