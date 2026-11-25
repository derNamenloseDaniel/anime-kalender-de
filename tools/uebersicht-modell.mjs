/**
 * Modell der Übersicht: aus stand.md (Text), `jetzt` und optionalen GitHub-Daten die Abschnitte mit Gruppen
 * (Ziel → Thema → Einträge nach Rang). Jeder Eintrag der Datei steht genau einmal in genau einem Abschnitt.
 * Beide Ausgaben (Markdown, HTML) lesen dieses eine Modell.
 */
import { auswerten, rangliste } from '../.claude/mods/arbeitsliste/hooks/stand-kennzeichen.mjs'
import { alterVon, blockiertGrund, istStreichkandidat, labelsVon, markenVon, prBelege, themaVon } from './uebersicht-regeln.mjs'
import { bereinigt, leseStand, linksVon } from './uebersicht-stand.mjs'

export const ZIELE = ['Daten', 'Autonomie', 'Code', 'Live5', '-']
export const ZIEL_NAMEN = { Daten: 'Volle Daten', Autonomie: 'Autonomie', Code: 'Fehlerfrei (Code)', Live5: 'Schnell live', '-': 'Ohne Ziel' }
export const ABSCHNITT_TITEL = [
  ['jetzt', 'Jetzt für Daniel'],
  ['inArbeit', 'In Arbeit'],
  ['blockiert', 'Blockiert / wartet'],
  ['naechstes', 'Als Nächstes'],
  ['spaeter', 'Später (Daniel)'],
  ['neuLive', 'Neu live'],
]
const ICON_RANG = { '🔴': 0, '🟠': 1, '🔵': 2 }
const ICON_PRIO = { '🔴': 'dringend', '🟠': 'heute', '🔵': 'wenn Zeit ist' }
const KOPF_ZEICHEN = 400

/** Rang je Eintrag-Zeilennummer aus `rangliste()` der Mod; ein künstlicher Text mit allen gekennzeichneten Köpfen schließt eingerückte Einträge ein. */
function ranglisteVon(alle, jetzt) {
  const mitK = alle.filter((e) => e.k)
  const text = ['## Als Nächstes', ...mitK.map((e) => e.kopf)].join('\n')
  const rang = new Map()
  rangliste(text, jetzt).eintraege.forEach((r, i) => rang.set(mitK[r.nr - 2], i))
  return rang
}

function eintragVon(e, ctx) {
  const texte = [e.kopf, ...e.notizen]
  const kopfText = bereinigt(e.kopf)
  const { beleg: nummern, geliefert } = prBelege(texte)
  const marken = markenVon(texte)
  const { labels, quellen } = labelsVon(nummern, marken, ctx.prDaten)
  const rang = ctx.rang.get(e)
  return {
    nr: e.nr,
    titel: e.titel,
    kopf: kopfText.slice(0, KOPF_ZEICHEN),
    notizen: e.notizen.length,
    eltern: e.eltern,
    herkunft: e.abschnitt,
    ziel: e.k?.ziel ?? '-',
    prio: e.k ? `${e.k.art} · ${e.k.dringlichkeit}` : (ICON_PRIO[e.icon] ?? null),
    icon: e.icon,
    groesse: e.groesse,
    labels,
    labelQuellen: quellen,
    prs: nummern,
    links: linksVon(texte).slice(0, 8),
    alter: alterVon(e, ctx.jetzt),
    grund: blockiertGrund(e, kopfText),
    thema: themaVon(e.titel),
    naechster: ctx.naechsterNr === e.nr,
    streichen: istStreichkandidat(e.abschnitt, [kopfText, ...e.notizen], geliefert, ctx.prDaten, blockiertGrund(e, kopfText)),
    sortier: rang ?? 1000 + (ICON_RANG[e.icon] ?? 5),
  }
}

const abschnittVon = (e) => (e.herkunft === 'neuLive' || e.herkunft === 'jetzt' || !e.grund ? e.herkunft : 'blockiert')

/** Gruppen Ziel → Thema → Einträge; Ziele in Zielreihenfolge, Themen nach bestem Eintrag, Einträge nach Rang (dann Zeile). */
export function gruppiere(eintraege) {
  const nachRang = (a, b) => a.sortier - b.sortier || a.nr - b.nr
  return ZIELE.filter((z) => eintraege.some((e) => e.ziel === z)).map((ziel) => {
    const imZiel = eintraege.filter((e) => e.ziel === ziel).sort(nachRang)
    const themen = [...new Set(imZiel.map((e) => e.thema))].map((thema) => ({ thema, eintraege: imZiel.filter((e) => e.thema === thema) }))
    themen.sort((a, b) => (a.thema === 'Sonstiges') - (b.thema === 'Sonstiges') || nachRang(a.eintraege[0], b.eintraege[0]))
    return { ziel, name: ZIEL_NAMEN[ziel], themen }
  })
}

/** Neu live: neueste zuerst, ohne Gruppen. */
function flach(eintraege) {
  const sortiert = [...eintraege].sort((a, b) => (a.alter?.tage ?? 1e9) - (b.alter?.tage ?? 1e9) || a.nr - b.nr)
  return [{ ziel: null, name: null, themen: [{ thema: null, eintraege: sortiert }] }]
}

/** Gesamtmodell. `gh`: `{prDaten}` oder null; `jetzt` in ms. */
export function baueModell(text, jetzt, gh) {
  const roh = leseStand(text)
  const alle = Object.entries(roh).flatMap(([herkunft, liste]) => liste.map((e) => ({ ...e, abschnitt: herkunft })))
  const naechsterNr = auswerten(text, jetzt).naechster?.nr ?? null
  const ctx = { jetzt, prDaten: gh?.prDaten ?? {}, rang: ranglisteVon(alle, jetzt), naechsterNr }
  const eintraege = alle.map((e) => eintragVon(e, ctx))
  const abschnitte = ABSCHNITT_TITEL.map(([id, titel]) => {
    const dieser = eintraege.filter((e) => abschnittVon(e) === id)
    return { id, titel, anzahl: dieser.length, gruppen: id === 'neuLive' ? flach(dieser) : gruppiere(dieser) }
  })
  const streichkandidaten = eintraege.filter((e) => e.streichen).sort((a, b) => a.nr - b.nr)
  return { jetzt, abschnitte, streichkandidaten, eintraege: eintraege.length }
}

/** Offene Einträge je Label-Klasse (ohne „Neu live“): lokal, nacht, beide, offen (kein Beleg). */
export function labelZaehlung(modell) {
  const z = { lokal: 0, nacht: 0, beide: 0, offen: 0 }
  for (const a of modell.abschnitte.filter((x) => x.id !== 'neuLive')) {
    for (const g of a.gruppen) for (const t of g.themen) for (const e of t.eintraege) z[e.labels.length === 2 ? 'beide' : (e.labels[0] ?? 'offen')] += 1
  }
  return z
}
