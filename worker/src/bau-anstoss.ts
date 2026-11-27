import type { Env } from './env.ts'
import { KOPF, STANDARD_REPO, letzteLaeufe } from './wecker.ts'
import { fehlerLog } from './werte.ts'

/**
 * **Eine gemeldete Prime-Seite stößt den Bestandsbau an** (Daniel, 26.11.2026: „sobald ich über die Erweiterung die richtige Seite melde, muss der Fix sofort live sein“).
 * Vorher holte erst der nächste Sammel-Lauf (stündlich, danach `workflow_run`) die Meldung in den Bau; gemessen am 26.11.2026 lagen zwischen den Bau-Starts 60 Minuten
 * (17:07, 18:08, 19:09 UTC). Die Website liest weiter keine D1: der Bau arbeitet die Meldung ein, committet, der Deploy veröffentlicht.
 *
 * Gemeint ist die Meldung aus einer Suche (`suchUrl`), also eine Seite, die ein Suchauftrag liefert. Entprellt wird über die Läufe: steht schon ein wartender Bau, arbeitet der die
 * neue Meldung mit ein (Gruppe `bau` hält einen laufenden und einen wartenden Lauf); ein laufender Bau zählt nicht, er kann die Meldung verpasst haben. Das Token ist das des Weckers.
 */
const BAU = 'bestand-bauen.yml'
const WARTEND = new Set(['queued', 'pending', 'waiting', 'requested'])

/** Trägt die Meldung eine Prime-Seite aus einer Suche? Ein Stapel zählt, sobald eine seiner Meldungen es tut. */
export function stoesstBauAn(daten: unknown): boolean {
  const einzeln = (m: unknown): boolean => {
    const d = m as { plattform?: unknown; suchUrl?: unknown; stapel?: unknown } | null
    return !!d && d.plattform === 'primevideo' && typeof d.suchUrl === 'string' && d.suchUrl.length > 0
  }
  const stapel = (daten as { stapel?: unknown } | null)?.stapel
  return Array.isArray(stapel) ? stapel.some(einzeln) : einzeln(daten)
}

export type AnstossErgebnis = 'gestartet' | 'wartet-schon' | 'ohne-token' | 'abgelehnt'

export async function stosseBauAn(env: Env): Promise<AnstossErgebnis> {
  if (!env.GITHUB_WECKER_TOKEN) return 'ohne-token'
  const laeufe = await letzteLaeufe(env, STANDARD_REPO, BAU).catch((e) => {
    fehlerLog('[bau-anstoss] Läufe nicht lesbar, Bau wird trotzdem gestartet', e)
    return null
  })
  if (laeufe?.some((l) => WARTEND.has(String(l.status)))) return 'wartet-schon'
  const r = await fetch(`https://api.github.com/repos/${STANDARD_REPO}/actions/workflows/${BAU}/dispatches`, {
    method: 'POST',
    headers: KOPF(env),
    body: JSON.stringify({ ref: 'main' }),
  })
  if (r.status !== 204) {
    console.error(`[bau-anstoss] ${BAU}: HTTP ${r.status}`)
    return 'abgelehnt'
  }
  return 'gestartet'
}
