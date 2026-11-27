/**
 * Wellen in der Sammelzeile von liegegut (27.11.2026, Issue 5209): Zwölf PRs `fix/handlung-satz-teil-01…12` mit demselben Signal (rot seit 12 h)
 * waren zwölf Zeilen und ein Fall; als Welle steht jede Gruppe gleichen Zweigstamms und gleicher Signalnummern ab WELLE_AB PRs einmal da.
 * Schlüssel ist der Zweigstamm (Name ohne die laufende Nummer am Ende), nicht die Fehlerzeile des Kettenlogs: die kostete einen Logabruf je PR.
 */
export const WELLE_AB = 3

/** `fix/handlung-satz-teil-07` → `fix/handlung-satz-teil-`; ohne Ziffer am Ende (oder ohne Zweig) leer: kein Wellenkandidat. */
export const zweigStamm = (zweig) => (/\d$/.test(zweig ?? '') ? zweig.replace(/\d+$/, '') : '')

const signalNummern = (fund) => fund.signale.map((s) => s.nr).sort((a, b) => a - b).join(',')

/** Zerlegt Funde `{ nr, repo, zweig, signale }` in { wellen: [{ stamm, funde }], einzeln: [Fund] }; die Reihenfolge der Einzelfunde bleibt. */
export function gruppiereWellen(funde) {
  const gruppen = new Map()
  for (const fund of funde) {
    const stamm = zweigStamm(fund.zweig)
    if (stamm === '') continue
    const schluessel = `${fund.repo ?? ''}|${stamm}|${signalNummern(fund)}`
    gruppen.set(schluessel, [...(gruppen.get(schluessel) ?? []), fund])
  }
  const wellen = [...gruppen.values()].filter((g) => g.length >= WELLE_AB)
  const inWelle = new Set(wellen.flat())
  return { wellen: wellen.map((g) => ({ stamm: zweigStamm(g[0].zweig), funde: g })), einzeln: funde.filter((f) => !inWelle.has(f)) }
}
