import type { Release, Title } from '@shared/types.ts'
import { streamStatus, streamWegStatus } from './legende-zeilen.ts'
import type { sortiereNachZugang } from './wege-sortieren.ts'

type Wege = ReturnType<typeof sortiereNachZugang>

/** „Amazon Prime (Aniverse)“ — der Bezugsweg über einen Prime-Kanal; Gruppe 1 ist der Kanal. */
const PRIME_KANAL_WEG = /^(?:Amazon Prime|Prime Video) \((.+)\)$/i

const kanalVon = (shop: string): string | undefined => PRIME_KANAL_WEG.exec(shop)?.[1].toLowerCase()

/**
 * **Welche Stream-Wege überhaupt als Pille stehen** (Daniel, 26.11.2026, Most Heretical Last Boss Queen: Akibapass „nur Untertitel“,
 * dazu „Prime Video (Aniverse)“ und „Amazon Prime (Aniverse)“, obwohl es im Stream noch keine Synchro gab).
 *
 * 1. Nur Untertitel ist nie eine Pille: Synchro, nicht Untertitel ist das Projektziel.
 * 2. Ein Prime-Kanal ohne Sprachbeleg ist keine Pille: Amazons Sprachangabe belegt bei Kanaltiteln nichts (`dub-confirmed.yaml`).
 * 3. Ein Kanal ist eine Pille: Der Bezugsweg „Amazon Prime (X)“ entfällt, wo der Titel den Kanal X schon als Verweis führt.
 */
export function sichtbareWege(gruppen: Wege, title: Title, releases: Release[]): Wege {
  const verweisKanaele = new Set(gruppen.flatMap((g) => g.plattformen.map((s) => s.kanal?.toLowerCase()).filter(Boolean)))
  return gruppen
    .map((g) => ({
      ...g,
      plattformen: g.plattformen.filter((s) => {
        const art = streamStatus(title, s, releases)
        return art !== 'omu' && !(s.kanal && art === 'offen')
      }),
      streamWege: g.streamWege.filter((w) => {
        const kanal = kanalVon(w.shop)
        const art = streamWegStatus(w, title)
        return art !== 'omu' && !(kanal && (verweisKanaele.has(kanal) || art === 'offen'))
      }),
    }))
    .filter((g) => g.plattformen.length || g.shops.length || g.streamWege.length)
    .map((g, _i, alle) => ({ ...g, zeigeUeberschrift: alle.length > 1 || g.art === 'kauf' }))
}

/** Die Kanäle, die nach `sichtbareWege` noch als Pille stehen (Verweis oder Bezugsweg). */
const sichtbareKanaele = (wege: Wege): Set<string> =>
  new Set(wege.flatMap((g) => [...g.plattformen.map((s) => s.kanal?.toLowerCase()), ...g.streamWege.map((w) => kanalVon(w.shop))]).filter((k): k is string => Boolean(k)))

/**
 * **Ein Termin ist keine Verfügbarkeit.** Nur Untertitel steht nie da; ein Termin mit offener Sprache steht als Ankündigung („ab“), solange
 * er in der Zukunft liegt, nie als „seit“; ein Kanal-Termin entfällt, wo der Kanal schon als Weg dasteht.
 */
export function sichtbareTermine(termine: Release[], wege: Wege, today: string): Release[] {
  const kanaele = sichtbareKanaele(wege)
  return termine.filter((r) => {
    if (r.platform === 'tv') return true
    if (r.sprache === 'omu') return false
    if (r.sprache === 'offen' && (r.schedule?.firstEpisodeDate ?? '9999') <= today) return false
    return !(r.kanal && kanaele.has(r.kanal.toLowerCase()))
  })
}
