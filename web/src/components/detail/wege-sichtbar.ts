import type { Release, Title } from '@shared/types.ts'
import { streamStatus, streamWegStatus } from './legende-zeilen.ts'
import type { sortiereNachZugang } from './wege-sortieren.ts'

type Wege = ReturnType<typeof sortiereNachZugang>

/** „Amazon Prime (Aniverse)“ — der Bezugsweg über einen Prime-Kanal; Gruppe 1 ist der Kanal. */
const PRIME_KANAL_WEG = /^(?:Amazon Prime|Prime Video) \((.+)\)$/i

const kanalVon = (shop: string): string | undefined => PRIME_KANAL_WEG.exec(shop)?.[1].toLowerCase()

/** Trägt die Zeile eine Sprachaussage (Beleg, JustWatch, laut Anbieter) — nicht offen, nicht nur Untertitel, nicht abgeleitet? */
const belegt = (art: ReturnType<typeof streamStatus>): boolean => art !== 'offen' && art !== 'omu' && art !== 'schwester'

/**
 * **Welche Stream-Wege als Pille stehen** (Daniel, 26.11.2026, Most Heretical Last Boss Queen: Akibapass „nur Untertitel“,
 * dazu „Prime Video (Aniverse)“ und „Amazon Prime (Aniverse)“ nebeneinander).
 *
 * 1. Nur Untertitel ist nie eine Pille: Synchro, nicht Untertitel ist das Projektziel.
 * 2. Ein Kanal ist eine Pille: Verweis („Prime Video (X)“) und Bezugsweg („Amazon Prime (X)“) desselben Kanals sind einer; der Weg mit
 *    Sprachbeleg gewinnt, sonst der Verweis. Gestrichen wird nur diese Dublette, nie ein Weg ohne Widerlegung (Projektregel).
 */
export function sichtbareWege(gruppen: Wege, title: Title, releases: Release[]): Wege {
  /* Erst die Wege ohne Untertitel-Befund; der Kanalabgleich gilt nur zwischen Zeilen, die selbst stehen bleiben. */
  const ohneOmu = gruppen.map((g) => ({
    ...g,
    plattformen: g.plattformen.filter((s) => streamStatus(title, s, releases) !== 'omu'),
    streamWege: g.streamWege.filter((w) => streamWegStatus(w, title) !== 'omu'),
  }))
  const verweise = ohneOmu.flatMap((g) => g.plattformen).filter((s) => s.kanal)
  const verweisBelegt = new Set(verweise.filter((s) => belegt(streamStatus(title, s, releases))).map((s) => s.kanal!.toLowerCase()))
  const verweisKanaele = new Set(verweise.map((s) => s.kanal!.toLowerCase()))
  const wegBelegt = new Set(ohneOmu.flatMap((g) => g.streamWege).filter((w) => belegt(streamWegStatus(w, title))).map((w) => kanalVon(w.shop)))
  return ohneOmu
    .map((g) => ({
      ...g,
      /* Der Verweis weicht nur einem belegten Bezugsweg, dessen Verweis keinen Beleg trägt. */
      plattformen: g.plattformen.filter((s) => {
        const kanal = s.kanal?.toLowerCase()
        return !(kanal && wegBelegt.has(kanal) && !verweisBelegt.has(kanal) && streamStatus(title, s, releases) === 'offen')
      }),
      /* Der Bezugsweg weicht dem Verweis desselben Kanals, außer er trägt den Beleg und der Verweis nicht. */
      streamWege: g.streamWege.filter((w) => {
        const kanal = kanalVon(w.shop)
        return !(kanal && verweisKanaele.has(kanal) && (verweisBelegt.has(kanal) || !belegt(streamWegStatus(w, title))))
      }),
    }))
    .filter((g) => g.plattformen.length || g.shops.length || g.streamWege.length)
    .map((g, _i, alle) => ({ ...g, zeigeUeberschrift: alle.length > 1 || g.art === 'kauf' }))
}

/** Die Kanäle, die nach `sichtbareWege` noch als Pille stehen (Verweis oder Bezugsweg). */
const sichtbareKanaele = (wege: Wege): Set<string> =>
  new Set(wege.flatMap((g) => [...g.plattformen.map((s) => s.kanal?.toLowerCase()), ...g.streamWege.map((w) => kanalVon(w.shop))]).filter((k): k is string => Boolean(k)))

/**
 * **Ein Termin ist keine Verfügbarkeit.** Nur Untertitel steht nie da; ein Kanal-Termin entfällt, wo der Kanal schon als Weg dasteht.
 */
export function sichtbareTermine(termine: Release[], wege: Wege): Release[] {
  const kanaele = sichtbareKanaele(wege)
  return termine.filter((r) => r.platform === 'tv' || (r.sprache !== 'omu' && !(r.kanal && kanaele.has(r.kanal.toLowerCase()))))
}
