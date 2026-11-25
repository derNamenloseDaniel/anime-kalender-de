/** Kennzahlen im Kopf der Übersicht: offene Punkte je Abschnitt, Label-Zählung, offene PRs mit Alter, Merges je Tag und Topf. */
import { labelZaehlung } from './uebersicht-modell.mjs'
import { mergesJeTag } from './uebersicht-regeln.mjs'

const STUNDE_MS = 3_600_000

/** `gh`: `{offene:{liste,abgeschnitten}, merges:{liste,vollstaendig}}` oder null (gh fehlt: Abschnitte entfallen). */
export function kennzahlen(modell, gh, jetzt) {
  const k = {
    abschnitte: modell.abschnitte.map((a) => ({ id: a.id, titel: a.titel, anzahl: a.anzahl })),
    labels: labelZaehlung(modell),
    streichkandidaten: modell.streichkandidaten.length,
    prs: null,
    merges: null,
  }
  if (gh?.offene) {
    const liste = gh.offene.liste.map((p) => ({ number: p.number, title: p.title, stunden: Math.max(0, Math.floor((jetzt - Date.parse(p.createdAt)) / STUNDE_MS)), labels: p.labels }))
    k.prs = { liste: liste.sort((a, b) => b.stunden - a.stunden), abgeschnitten: gh.offene.abgeschnitten }
  }
  if (gh?.merges) k.merges = { tage: mergesJeTag(gh.merges.liste, jetzt), vollstaendig: gh.merges.vollstaendig }
  return k
}
