/**
 * Joyn-Lücke (04.11.2026): Titel, bei denen JustWatch ein Joyn-Angebot mit Adresse nennt und die bei uns keinen Joyn-Weg tragen. Gemessen
 * wurden 41 (Naruto-Filme mit toter Adresse, vier aniSearch-Filme, 35 Cartoons); übrig dürfen nur Einzelfälle mit Grund bleiben
 * (`data/joyn-luecke-ausnahmen.json`). Der Bestandswächter `check-joyn-luecke-bestand.ts` ruft das auf.
 */

type JwBefunde = Record<string, { angebote?: { anbieter?: string; url?: string }[] }>
type MitWegen = { id: number; streams?: { platform: string }[] }
export type Ausnahme = { id: number; grund: string }

/** Erste Joyn-Adresse, die JustWatch für den Titel nennt (der Beleg der Lücke), sonst undefined. */
export function joynBeleg(jw: JwBefunde, id: number): string | undefined {
  return (jw[String(id)]?.angebote ?? []).find((a) => a.url && /joyn/i.test(a.anbieter ?? ''))?.url
}

/** Kennungen der Titel mit JustWatch-Joyn-Angebot (mit Adresse) ohne Joyn-Weg, in der Reihenfolge der Titel. */
export function joynLuecken(titel: MitWegen[], jw: JwBefunde): number[] {
  return titel.filter((t) => joynBeleg(jw, t.id) && !(t.streams ?? []).some((s) => s.platform === 'joyn')).map((t) => t.id)
}

/** Meldezeile einer Lücke: AniList-ID (Cartoons negativ), Titel und JustWatch-Beleg, damit die Ursache ohne Nachschlagen prüfbar ist. */
export function beschreibeLuecke(t: MitWegen & { titleDe?: string; titleEn?: string; titleRomaji?: string }, jw: JwBefunde): string {
  return `Titel ${t.id} „${t.titleDe ?? t.titleEn ?? t.titleRomaji ?? '?'}“ — JustWatch: ${joynBeleg(jw, t.id) ?? 'kein Beleg'}`
}

/** `offen`: Lücken ohne Ausnahme; `veraltet`: Ausnahmen, deren Lücke nicht mehr besteht (die Liste darf nur schrumpfen, also raus damit). */
export function ordneAusnahmen(luecken: number[], ausnahmen: Ausnahme[]): { offen: number[]; veraltet: number[] } {
  const erlaubt = new Set(ausnahmen.map((a) => a.id))
  const lueckenSet = new Set(luecken)
  return { offen: luecken.filter((id) => !erlaubt.has(id)), veraltet: ausnahmen.map((a) => a.id).filter((id) => !lueckenSet.has(id)) }
}
