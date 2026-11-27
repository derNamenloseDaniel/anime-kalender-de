/**
 * Warteschlange als Ursache sichtbar machen (27.11.2026, Dirigent-Nachtrag 7218441221): Am 27.11. hingen die Prüfer-Übernahme und die
 * Abnahme-Freigabe ab 12:33Z in der Actions-Warteschlange; ohne beide kommt die vom Ruleset verworfene Freigabe nicht zurück und PRs liegen.
 * Ein Lauf dieser Workflows, der länger als QUEUE_MIN auf `queued` steht, ergibt eine Zeile der Wachphase.
 */
export const QUEUE_MIN = 30
export const FREIGABE_WORKFLOWS = new Set(['PR-Prüfer', 'PR-Prüfer — Neustart bei Nachtrag', 'Abnahme — Freigabe'])
const MAX_NENNUNGEN = 5

/** Zeile `WARTESCHLANGE: PR-Prüfer #5162 abc (45 min), …` oder null; `ghFn(args)` liefert stdout. */
export function warteschlangeMeldung(ghFn, jetzt) {
  const laeufe = JSON.parse(ghFn(['run', 'list', '--status', 'queued', '--limit', '100', '--json', 'workflowName,displayTitle,createdAt']))
  const lang = laeufe
    .filter((l) => FREIGABE_WORKFLOWS.has(l.workflowName))
    .map((l) => ({ name: l.workflowName === 'PR-Prüfer' ? l.displayTitle : `${l.workflowName} ${l.displayTitle}`.slice(0, 60), min: Math.floor((jetzt - Date.parse(l.createdAt)) / 60000) }))
    .filter((l) => l.min >= QUEUE_MIN)
    .sort((a, b) => b.min - a.min)
  if (lang.length === 0) return null
  const genannt = lang.slice(0, MAX_NENNUNGEN).map((l) => `${l.name} (${l.min} min)`)
  return `WARTESCHLANGE: ${genannt.join(', ')}${lang.length > MAX_NENNUNGEN ? ` und ${lang.length - MAX_NENNUNGEN} weitere` : ''} stehen auf queued; ohne sie kommt eine verworfene Freigabe nicht zurück`
}
