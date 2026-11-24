import { type ReactNode, useState } from 'react'
import { ankuendigungOhneTermin } from '@shared/ankuendigung.ts'
import { useKopfZahlen, useStaffelZiele } from './folgen-bereich.tsx'
import { mitStaffelKnoepfen } from './staffel-knoepfe.tsx'
import { gruppeVon as gruppeVonPille, sichtbareStreamPillen } from './stream-pillen.ts'
import { erstausgabeAlsNeuigkeit } from './antwort-regeln.ts'
import { abstandImSatz } from '../../lib/abstand.ts'
import { deSeitZeigen } from './de-seit.ts'
import { kostenlosKopfVon } from './kasten-texte.ts'
import { antwortKopf, deSeitZeile } from './antwort-kopf.tsx'
import { type AntwortKastenProps } from './antwort-kasten-props.ts'

type Uebersetzer = (k: string, v?: Record<string, string | number>) => string

/** Wählbare Seite (Stream/Disc), sichtbare Pillen und Bereiche des Kastens (aus `AntwortKasten` herausgelöst). */
export function useKastenZustand(p: Required<Pick<AntwortKastenProps, 'stream' | 'disc' | 'pillenGruppen' | 'terminPillen' | 'discZuerst'>> & Pick<AntwortKastenProps, 'antwort' | 'title' | 't'>) {
  const { antwort, title, t, stream, disc, pillenGruppen, terminPillen, discZuerst } = p
  /*
    **Der Umschalter sitzt oben rechts — nicht über den Pillen.**

    Über ihnen kostete er eine Zeile, und die gab es nur bei Titeln mit beidem:
    Staffel 1 war dadurch höher als Staffel 2 (Daniel, 03.09.2026, mit zwei
    Bildern: „toggle oben rechts in box packen, sodass keine height änderung
    passiert"). Oben rechts liegt er in einer Zeile, die ohnehin da ist — und
    kostet keine Höhe mehr.
  */
  const [zeigeDisc, setZeigeDisc] = useState(discZuerst); const { folgenZahl, staffeln } = useKopfZahlen(title.id)
  const staffelZiele = useStaffelZiele(title.id)
  /*
    **Wo noch nichts erschienen ist, gibt es nichts zu sehen.**

    Bei „Apothekerin" Staffel 3 stand „01.10.2026 — Folge 1 … 0 von 12 Folgen
    erschienen" und darunter eine Crunchyroll-Pille mit „DE ✓" (Daniel,
    04.09.2026: „trotzdem crunchy pill? wenn 0, dann keine pill"). Die Pille
    sagt „dort läuft es auf Deutsch" — dort läuft aber noch gar nichts, und der
    Klick führt auf eine Seite ohne eine einzige Folge.

    **Kaufwege und Termin-Pillen bleiben:** Vorbestellung und Ankündigung sagen, wo es kommt.
  */
  const nochNichts = (antwort.art === 'laeuft' && antwort.raus === 0) || antwort.art === 'widerlegt'
  const gruppeVon = (q: ReactNode) => gruppeVonPille(pillenGruppen, q)
  const streamPillen = sichtbareStreamPillen(stream, antwort.art === 'widerlegt' ? [] : terminPillen, nochNichts)
  const beides = streamPillen.length > 0 && disc.length > 0
  /* Der Umschalter zeigt nur Seiten mit Pillen; eine einzelne bleibt als Etikett (Kaufpille = „Disc"). */
  const aktivDisc = beides ? zeigeDisc : streamPillen.length === 0
  const pillen = aktivDisc ? disc : mitStaffelKnoepfen(streamPillen, staffelZiele, t as unknown as Uebersetzer)
  const T = t as unknown as Uebersetzer
  /*
    **Kostenlos ist ein eigener Bereich** (Daniel, 19.09.2026: „trenn die bereiche, sodass es
    besser visuell sichtbar ist"; aus drei Entwürfen in drei Szenarien gewählt: der grüne
    Block). Das kehrt die Entscheidung vom 03.09.2026 um, die Zugangsart nur an der Pille zu
    nennen — ausdrücklich gewünscht. Gegliedert wird nur, wenn es einen kostenlosen Weg gibt;
    sonst bleibt die Reihe wie sie war. Ob „kostenlos" oder „teilweise kostenlos":
    `shared/kostenlos.ts`, verglichen mit den deutschen Folgen (laufend: den erschienenen; ohne
    Gesamtzahl: den meisten belegten eines Anbieters — Beyblade X: Disney+ 100, TOGGO 117).
  */
  /*
    **Die Bereiche stehen immer**. Bis dahin gliederte
    das Panel nur, wenn es einen kostenlosen Weg gab — bei Gachiakuta stand „Kostenlos / Abo / TV",
    bei One Piece lagen Netflix, ADN und die TV-Pille ohne Überschrift beieinander. Zwei Panels,
    zwei Ordnungen, und beim zweiten sah es nach Fehler aus.
  */
  const mitBereichen = !aktivDisc && pillen.length > 0
  const kostenlosKopf = mitBereichen && pillen.some((q) => gruppeVon(q) === 'frei') ? kostenlosKopfVon({ title, antwort, T }) : undefined
  return { setZeigeDisc, folgenZahl, staffeln, gruppeVon, streamPillen, aktivDisc, pillen, T, mitBereichen, kostenlosKopf }
}

type KopfWunsch = Pick<AntwortKastenProps, 'antwort' | 'title' | 'today' | 'ohneSprachbeleg'> & {
  T: Uebersetzer
  releases: NonNullable<AntwortKastenProps['releases']>
  folgenZahl: ReturnType<typeof useKopfZahlen>['folgenZahl']
  staffeln: ReturnType<typeof useKopfZahlen>['staffeln']
}

/** Überschrift, Nebenzeile, Anteil, Zähler und Fakten des Kastens (aus `AntwortKasten` herausgelöst). */
export function kastenKopfVon(w: KopfWunsch) {
  const { antwort, title, today, T, releases, ohneSprachbeleg, folgenZahl, staffeln } = w
  /*
    Dieselbe Angabe, aber kleingeschrieben: Sie steht jetzt mitten im Satz
    („erscheint in 2 Tagen, am …") statt am Satzanfang. Ein großes „Heute"
    dort liest sich wie ein Fehler. Der Countdown steht bei jedem Abstand (`abstandImSatz`).
  */
  const relativImSatz = (datum: string): string => abstandImSatz(today, datum, T)
  /** Was hervorgehoben wird, trägt die Akzentfarbe des Kastens. */
  const betont = (text: string): ReactNode => (
    <span className="text-sky-700 dark:text-sky-300">{text}</span>
  )

  /*
    **Überschrift und Zählzeile sind Knoten, keine Zeichenketten.**

    Daniel am 10.09.2026: „use coloring". Was hervorgehoben werden soll — die
    Folgennummer, die Zahl der erschienenen Folgen —, steht mitten im Satz;
    ohne Auszeichnung im Text ist das nicht zu machen. Alle übrigen Zustände
    setzen weiterhin schlichte Zeichenketten, die als Knoten durchgehen.
  */
  /* „Auf Deutsch seit …“ der Zustände fertig und Film: Neuigkeit, Zukunft oder eine frühere Pille ersetzen die Zeile (`de-seit.ts`). */
  const deSeitNeben = !erstausgabeAlsNeuigkeit(title, today, releases) && deSeitZeigen(title, releases, today) ? deSeitZeile(title, T) : ''
  return antwortKopf({ antwort, relativImSatz, T, betont, ohneSprachbeleg, releases, folgenZahl, staffeln, deSeitNeben, title })
}

/** Die Klassen der Kastenhülle: Mindesthöhe und Farbe (aus `AntwortKasten` herausgelöst). */
export function kastenKlassen({ antwort, title, neben, gedaempft }: Pick<AntwortKastenProps, 'antwort' | 'title'> & { neben: string; gedaempft: boolean }): string {
  return [
    /*
      **Mindesthöhe statt fester Höhe — seit dem 12.09.2026.**

      Bei „Steel Ball Run" stand die Netflix-Pille halb unter der
      Reihenliste.
      Dieser Titel bringt alles auf einmal mit: zweizeilige Überschrift,
      Rhythmuszeile, Balken, Zählzeile **und** eine zweizeilige Notiz. Das
      ist höher als 11rem, und was übersteht, schob die Pillenreihe aus dem
      Kasten heraus.

      Die feste Höhe war Daniels Vorgabe vom 03.09.2026 („height Änderung
      der Box durch feste Höhe verhindern"), und ihr Zweck bleibt gewahrt:
      Der Kasten ist für den **Regelfall** gerechnet und springt zwischen
      zwei Teilen derselben Reihe nicht. Wo der Inhalt wirklich mehr
      braucht, wächst er jetzt, statt ihn hinauszudrücken — ein Kasten, der
      seine Notiz verschluckt oder eine Pille unter die Liste schiebt,
      beantwortet die Frage schlechter als einer, der zwanzig Pixel höher
      ist.

      Am 07.09.2026 war die Antwort auf denselben Fehler, die feste Höhe von
      9,75 auf 11rem zu erhöhen. Das trägt genau bis zum nächsten Zustand,
      den niemand vorhergesehen hat — und davon gab es seitdem zwei.
    */
    `relative flex ${((antwort.art === 'fertig' || antwort.art === 'film') && !neben) || ankuendigungOhneTermin(title, antwort.art) ? '' : 'min-h-[11rem]'} flex-col rounded-2xl border p-4`,
    gedaempft
      ? 'border-slate-200 bg-[#f8fafc] [--kasten:#f8fafc] dark:border-white/10 dark:bg-[#111623] dark:[--kasten:#111623]'
      : 'border-[#f6cfc3] bg-[#fff6f3] [--kasten:#fff6f3] dark:border-[#4a2a24] dark:bg-[#1a1416] dark:[--kasten:#1a1416]',
  ].join(' ')
}
