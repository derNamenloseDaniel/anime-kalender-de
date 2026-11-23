import { ausstrahlungsZeit, istWerbeEintrag, staffelBeschriftungen } from '../../shared/titles.ts'

export type Reiheneintrag = { id: number; name: string; format?: string; beiwerk?: boolean; jpYear?: number; jpStart?: string }

/** Die Reihe je Titel aus `franchises.json` (Schlüssel: Kennung jedes Glieds). */
export function reiheJeTitel(reihen: Record<string, Reiheneintrag[]>): Map<number, Reiheneintrag[]> {
  const reiheVon = new Map<number, Reiheneintrag[]>()
  for (const r of Object.values(reihen)) for (const m of r) reiheVon.set(m.id, r)
  return reiheVon
}

/**
 * Staffelnummer je Hauptstaffel einer Reihe — nur wenn die Reihe mehr als eine hat.
 *
 * **Der Schlüssel ist die Reihe, nicht das Glied** (23.11.2026, Nr. 33 aus PR 4459): die Nummer hier zählt die Position in der
 * Reihe. Die „(Staffel N)" aus dem deutschen aniSearch-Titel (`staffelQuelle`) zählt dagegen innerhalb der Unterserie des
 * Eintrags („Baki Hanma: Staffel 2", „SAC_2045 Staffel 2", „Owarimonogatari: Staffel 2"). Beide Zählungen laufen in
 * `shared/titles.ts` `zaehleStaffeln()` zusammen; ein `staffelQuelle` setzt dort `aktuell` neu, die folgenden Glieder zählen von da weiter.
 * Zwei Hauptstaffeln mit gleicher Nummer in einer Reihe sind deshalb dreierlei, nicht ein Fehler:
 * 1. Neuverfilmung als eigene Zählgruppe (`remakeVon`, `zaehlgruppen()`): Ranma 1/2 (1989 gegen 2024), Spice and Wolf (2008 gegen 2024).
 * 2. Unterserien-Nummer, die der Anbieter auch so führt, die Reihe aber anders zählt: Berserk (2016/2017), Baki Hanma (Netflix 12/27 Folgen),
 *    SAC_2045 (Netflix 12/12; danach zählt „The Ghost in the Shell" 2026 als 3), Owarimonogatari (danach MONOGATARI OFF & MONSTER als 3),
 *    Bleach TYBW „The Conflict" (Disney+ führt drei Staffeln für 2022 bis 2024).
 * 3. Falsche aniSearch-Nummer gegen den Anbieter: Seven Deadly Sins „Urteil des Drachen" (aniSearch 4, Netflix 5, `data/staffel-von-hand.yaml`).
 * 4. Offen, kein Anbieterbeleg in `data/`: Fate/strange Fake (Zoku-hen), Bakemonogatari; The King's Avatar zählt die 3-Folgen-„Specials" mit.
 * Je Fall mit Beleg: PR zu Nr. 33. Neue Doppelungen gleicher `staffelQuelle` meldet `staffelquelle-widerspruch.ts`; Doppelungen nur aus
 * der Position oder dem Neuzählen nach einer Unterserien-Nummer meldet keine Prüfung, sie stehen hier.
 */
export function staffelNummern(reihe: Reiheneintrag[]): Map<number, number> {
  const haupt = reihe
    .filter((m) => (m.format === 'TV' || m.format === 'ONA') && !m.beiwerk && !istWerbeEintrag(m))
    .sort((a, b) => ausstrahlungsZeit(a).localeCompare(ausstrahlungsZeit(b)) || a.id - b.id)
  const aus = new Map<number, number>()
  if (haupt.length < 2) return aus
  const kopf = haupt[0]!.name
  const beschriftung = staffelBeschriftungen(haupt, kopf)
  haupt.forEach((m, i) => {
    const b = /^Staffel (\d+)/.exec(beschriftung.get(m.id) ?? '')
    if (b) return void aus.set(m.id, Number(b[1]))
    const rest = m.name.startsWith(kopf) ? m.name.slice(kopf.length).trim() : ''
    if (/^\d+$/.test(rest)) return void aus.set(m.id, Number(rest))
    /* Römisch wie „Mob Psycho 100 II" / „III" (18.09.2026: Daniels Meldungen blieben sonst liegen). */
    const roemisch: Record<string, number> = { II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 }
    if (roemisch[rest.toUpperCase()]) return void aus.set(m.id, roemisch[rest.toUpperCase()]!)
    if (i === 0) aus.set(m.id, 1)
  })
  /* „Final Season" ohne Nummer ist die Staffel nach der letzten bekannten (Golden Kamuy, 17.09.2026). */
  const finale = haupt.filter((m) => !aus.has(m.id) && /final season|finale staffel/i.test(m.name))
  if (finale.length === 1) aus.set(finale[0]!.id, Math.max(0, ...aus.values()) + 1)
  return aus
}
