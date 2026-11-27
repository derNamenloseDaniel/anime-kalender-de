import { useState, useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { nowHhMm } from '@shared/time.ts'
import { type ReleaseEvent } from '@shared/types.ts'
import { minutenTakt } from './minuten-takt.ts'
import { lesestelleFuehrt, starteWiederherstellungImBrowser } from './lesestelle.ts'

/**
 * Unterhalb dieser Breite steht ein Tag als einzelne senkrechte Spalte —
 * dieselbe Grenze wie Tailwinds `sm:`. Nur dort ist der Sprung sinnvoll:
 * Auf breiten Schirmen liegen die sieben Tage nebeneinander und man sieht
 * ohnehin alles.
 */
export const SINGLE_COLUMN = '(max-width: 639px)'

/**
 * Wie viel vom Vorherigen über der nächsten Folge sichtbar bleibt. Ohne diesen
 * Rest sähe die Seite aus, als begänne der Tag hier — der Vorlauf verrät, dass
 * oben noch etwas ist.
 */
export const LEAD_PX = 30

type SprungTage = { timed: ReleaseEvent[]; untimed: ReleaseEvent[]; date: string }

interface SprungEingabe {
  days: SprungTage[]
  today: string
  monday: string
}

/** Erste Uhrzeit des Hooks; vorher liest `lesestelle.ts` die gemerkte Lesestelle, damit der Sprung unten sie kennt (Zusage: `check-sprung-lesestelle.ts`). */
function ersteUhrzeit(): string {
  starteWiederherstellungImBrowser()
  return nowHhMm()
}

/** Weich scrollen, außer wer Bewegung abgestellt hat. */
function scrolleZu(ziel: HTMLElement): void {
  const offset = klebendeUnterkante() + LEAD_PX
  window.scrollTo({
    top: Math.max(0, ziel.getBoundingClientRect().top + window.scrollY - offset),
    // Wer Bewegung abgestellt hat, bekommt keine — und im versteckten Tab
    // liefe eine weiche Bewegung ohnehin nicht.
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
  })
}

/**
 * Der Tageskopf ist das Ziel, wenn die Karte die erste ihres Tages ist — sonst schnitt die
 * Kopfleiste „FR · heute" halb ab (18.09.2026) — und am Rechner immer: Dort liegt die Karte in
 * einer Reihe neben dem Tag, der Kopf steht links daneben.
 */
function sprungZiel(el: HTMLElement): HTMLElement {
  const tag = el.closest('section')
  const ersteKarte = tag?.querySelector('.ak-oeffnen')?.parentElement
  const breit = !window.matchMedia(SINGLE_COLUMN).matches
  return tag && (breit || ersteKarte === el || el.contains(ersteKarte ?? null)) ? tag : el
}

/**
 * Die aktuelle Uhrzeit trennt im heutigen Tag Vergangenes von Kommendem.
 * Zu jeder vollen Minute nachziehen, damit die Grenze nicht stehen bleibt.
 */
function useJetzt(): string {
  const [now, setNow] = useState(ersteUhrzeit)
  useEffect(() => minutenTakt(() => setNow(nowHhMm())), [])
  return now
}

/**
 * Der Termin von heute, bei dem der Blick landen soll: der nächste, der noch
 * aussteht. Ist der Tag schon durch, wird es der letzte — dann steht der
 * jüngste Eintrag oben statt der Vormittag von vor zehn Stunden.
 */
function useLandingId(days: SprungTage[], today: string, now: string): string | undefined {
  return useMemo(() => {
    const day = days.find((d) => d.date === today)
    if (!day?.timed.length) return undefined
    return (day.timed.find((e) => e.time! >= now) ?? day.timed[day.timed.length - 1]).id
  }, [days, today, now])
}

/**
 * Beim Blättern in eine andere Woche sofort an den Anfang.
 *
 * Ohne das landet man nach dem Wechsel irgendwo in der Mitte des neuen
 * Zeitraums — auf dem Handy sogar bei Donnerstag, weil die vorige Woche
 * dort gerade so weit gescrollt war. Ohne Animation, weil das kein Weg
 * ist, den man mitverfolgen will, sondern ein Zustandswechsel.
 *
 * Die Woche mit heute ist ausgenommen: Dort übernimmt der Sprung zur
 * nächsten Folge, und beides gleichzeitig wäre ein Ruckeln.
 */
function useWochenwechselNachOben({ days, today, monday }: SprungEingabe): void {
  const previousMonday = useRef(monday)
  useEffect(() => {
    if (previousMonday.current === monday) return
    previousMonday.current = monday
    if (days.some((d) => d.date === today)) return
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [monday, days, today])
}

/** Sprung zur nächsten Folge von heute, einmal je Ankunft (`jumpedFor` merkt die Woche). */
function useSprungBeiAnkunft(
  { days, today, monday }: SprungEingabe,
  landingId: string | undefined,
  landingRef: MutableRefObject<HTMLDivElement | null>,
  jumpedFor: MutableRefObject<string | undefined>,
): void {
  useEffect(() => {
    const showsToday = days.some((d) => d.date === today)
    if (!showsToday) return
    // Einmal je Ankunft. Wer innerhalb der Woche filtert, blättert oder eine
    // Karte öffnet, soll nicht wieder nach unten gerissen werden.
    if (jumpedFor.current === monday || lesestelleFuehrt(days, jumpedFor, monday)) return
    // Auf jeder Breite: Die Poster-Woche steht überall untereinander. Ohne anstehende Karte zählt der Tageskopf.
    const el = landingRef.current ?? document.querySelector<HTMLElement>('[data-heute="1"]')
    if (!el) return
    jumpedFor.current = monday

    const jump = () => scrolleZu(sprungZiel(el))

    // Im Hintergrund geöffnet? Dann läuft die weiche Bewegung nicht, und der
    // Sprung ginge lautlos verloren — die Seite stünde beim Hinschauen oben.
    // Also warten, bis wirklich jemand hinsieht.
    if (document.hidden) {
      const onVisible = () => {
        if (document.hidden) return
        document.removeEventListener('visibilitychange', onVisible)
        jump()
      }
      document.addEventListener('visibilitychange', onVisible)
      return () => document.removeEventListener('visibilitychange', onVisible)
    }
    jump()
  }, [days, monday, today, landingId, landingRef, jumpedFor])
}

/*
  **„heute" in der Kopfleiste scrollt, auch wenn die Woche schon die laufende ist** (Daniel,
  25.09.2026). Der Sprung bei Ankunft geschieht einmal je Ankunft; dieser auf Zuruf, auf jeder
  Bildschirmbreite. Ziel ist dieselbe Karte — der nächste anstehende Termin von heute —, sonst
  der Kopf des heutigen Tages.
*/
function useSprungAufZuruf(landingRef: MutableRefObject<HTMLDivElement | null>): void {
  useEffect(() => {
    const zuHeute = () => {
      const karte = landingRef.current
      const tag = document.querySelector<HTMLElement>('[data-heute="1"]')
      const ziel = karte ?? tag
      if (!ziel) return
      scrolleZu(ziel)
    }
    /* Kam der Klick aus einer anderen Woche, steht die neue erst nach dem Zeichnen. */
    const spaeter = () => window.setTimeout(zuHeute, 50)
    window.addEventListener('ak-zu-heute', spaeter)
    return () => window.removeEventListener('ak-zu-heute', spaeter)
  }, [landingRef])
}

/**
 * Die Wochenansicht springt zum nächsten Termin von heute — einmal je Ankunft und auf Zuruf
 * („heute" in der Kopfleiste). Liefert die Uhrzeit, das Sprungziel und seinen Anker.
 */
export function useSprungZuHeute({ days, today, monday }: SprungEingabe) {
  const now = useJetzt()
  const landingId = useLandingId(days, today, now)

  const landingRef = useRef<HTMLDivElement | null>(null)
  /** Für welche Woche schon gesprungen wurde — verhindert erneutes Springen. */
  const jumpedFor = useRef<string | undefined>(undefined)

  useWochenwechselNachOben({ days, today, monday })
  useSprungBeiAnkunft({ days, today, monday }, landingId, landingRef, jumpedFor)
  useSprungAufZuruf(landingRef)

  // Verlässt man die Woche mit heute, darf beim nächsten Besuch wieder
  // gesprungen werden.
  useEffect(() => {
    if (!days.some((d) => d.date === today)) jumpedFor.current = undefined
  }, [days, today])
  return { landingId, landingRef, now }
}


/** Die klebende Kopfleiste verdeckt ein Sprungziel — deren Höhe (die Steuerleiste sitzt unten). */
export function klebendeUnterkante(): number {
  return document.querySelector('header')?.getBoundingClientRect().height ?? 0
}
