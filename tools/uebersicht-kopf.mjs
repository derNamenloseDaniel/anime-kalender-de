/** Kennzahlen im Kopf der Übersicht: offene Punkte je Abschnitt, Label-Zählung, offene PRs mit Alter, Merges je Tag und Topf (Berliner Tage). */
import { GH_FRIST } from './uebersicht-md.mjs'
import { labelZaehlung } from './uebersicht-modell.mjs'
import { mergesJeTag } from './uebersicht-regeln.mjs'

const STUNDE_MS = 3_600_000

/** Summe der Töpfe über die Tage. */
function summe(tage) {
  return tage.reduce((s, t) => ({ lokal: s.lokal + t.lokal, nacht: s.nacht + t.nacht, daten: s.daten + t.daten }), { lokal: 0, nacht: 0, daten: 0 })
}

/**
 * `gh`: `{offene:{liste,abgeschnitten}, merges:{liste,vollstaendig}}` oder null (gh fehlt: Abschnitte entfallen).
 * `frist` true: die Gesamtfrist war abgelaufen, der Hinweis nennt das statt „nicht erreichbar“.
 */
export function kennzahlen(modell, gh, jetzt, frist = false) {
  const k = {
    abschnitte: modell.abschnitte.map((a) => ({ id: a.id, titel: a.titel, anzahl: a.anzahl })),
    labels: labelZaehlung(modell),
    streichkandidaten: modell.streichkandidaten.length,
    prs: null,
    merges: null,
    ghText: frist ? GH_FRIST : null,
  }
  if (gh?.offene) {
    const liste = gh.offene.liste.map((p) => ({ number: p.number, title: p.title, stunden: Math.max(0, Math.floor((jetzt - Date.parse(p.createdAt)) / STUNDE_MS)), labels: p.labels }))
    k.prs = { liste: liste.sort((a, b) => b.stunden - a.stunden), abgeschnitten: gh.offene.abgeschnitten }
  }
  if (gh?.merges) {
    const tage = mergesJeTag(gh.merges.liste, jetzt)
    k.merges = { tage, summe: summe(tage), vollstaendig: gh.merges.vollstaendig }
  }
  return k
}
