/**
 * Zählt die `WARNUNG`-Zeilen des Baus dort, wo sie entstehen (`log`/`warn` in `util.ts`), und liefert am Bau-Ende die Zusammenfassung:
 * Anzahl je Art, absteigend, höchstens `MAX_ARTEN`, dazu die Gesamtzahl. Kein Parsen der Konsole, keine Dateiänderung am Datensatz.
 * Die Zusammenfassung selbst enthält kein „WARNUNG“ (`tools/commit-data.sh` macht solche Zeilen zu Annotationen).
 * Das Melden am Bau-Ende steht in `warnungen-melden.ts` (diese Datei liegt über `util.ts` im Importgraph von `fetch.ts`).
 */
export const MAX_ARTEN = 20
const ZEICHEN_ART = 40
const zaehler = new Map<string, number>()

/** Art einer Warnzeile: Text nach „WARNUNG“ bis zum ersten „:“, sonst die ersten drei Wörter; `undefined`, wenn es keine Warnzeile ist. */
export function artDerWarnung(zeile: string): string | undefined {
  const m = /WARNUNG[:\s]*(.*)/.exec(zeile)
  if (!m) return undefined
  const rest = m[1].trim()
  const bisDoppelpunkt = rest.split(':')[0]
  const art = bisDoppelpunkt.length < rest.length && bisDoppelpunkt.length <= ZEICHEN_ART ? bisDoppelpunkt : rest.split(/\s+/).slice(0, 3).join(' ')
  return art.trim().slice(0, ZEICHEN_ART) || '(ohne Text)'
}

/** Zählt jedes Textargument, das „WARNUNG“ enthält; alles andere bleibt unberührt. */
export function zaehleWarnung(...args: unknown[]): void {
  for (const a of args) {
    if (typeof a !== 'string') continue
    const art = artDerWarnung(a)
    if (art !== undefined) zaehler.set(art, (zaehler.get(art) ?? 0) + 1)
  }
}

export function setzeWarnungenZurueck(): void {
  zaehler.clear()
}

export function warnungsZusammenfassung(): string {
  const gesamt = [...zaehler.values()].reduce((s, n) => s + n, 0)
  if (!gesamt) return 'Warnungen im Bau: 0'
  const sortiert = [...zaehler].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'de'))
  const gezeigt = sortiert.slice(0, MAX_ARTEN).map(([art, n]) => `${n}× ${art}`)
  const weitere = sortiert.length - gezeigt.length
  return `Warnungen im Bau: ${gesamt} in ${sortiert.length} Arten — ${gezeigt.join('; ')}${weitere > 0 ? `; … ${weitere} weitere Arten` : ''}`
}
