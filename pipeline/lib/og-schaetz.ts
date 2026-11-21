/**
 * Bilder, die ihre geschätzte Uhrzeit mit „≈" zeigen. Der Lauf überspringt vorhandene Bilder; ein Bild, dessen „≈"
 * dazukommt oder wegfällt (belegte Uhrzeit am fortgeschriebenen Termin, 21.11.2026), wird deshalb einmal neu
 * gezeichnet (nicht alle, `OG_FASSUNG` bleibt).
 */
export const SCHAETZ_DATEI = 'schaetz.txt'

export function liesSchaetzListe(text: string | undefined): Set<string> {
  return new Set((text ?? '').split('\n').filter(Boolean))
}

export function schreibSchaetzListe(slugs: ReadonlySet<string>): string {
  return `${[...slugs].sort().join('\n')}\n`
}

/** Das „≈" im Bild weicht von der Liste der damit gezeichneten Bilder ab (neu dazu oder weggefallen). */
export function neuWegenSchaetzung(fakt: string, slug: string, bekannt: ReadonlySet<string>): boolean {
  return fakt.includes('≈') !== bekannt.has(slug)
}

/** Slugs ohne Release fallen aus der Liste, sie wuchs sonst mit jedem entfernten Release. */
export function nurVorhandene(liste: ReadonlySet<string>, vorhanden: ReadonlySet<string>): Set<string> {
  return new Set([...liste].filter((slug) => vorhanden.has(slug)))
}
