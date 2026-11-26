/** Markdown-Fassung der Übersicht: dieselbe Ordnung wie das HTML (Modell aus uebersicht-modell.mjs). */

import { grundText } from './uebersicht-regeln.mjs'

export const LABEL_TEXT = { lokal: '💻 lokal', nacht: '🌙 nacht' }
export const GH_FEHLT = 'GitHub nicht erreichbar: PR- und Merge-Zahlen sowie PR-Labels entfallen.'
export const GH_FRIST = 'GitHub-Daten fehlen (Frist): PR- und Merge-Zahlen sowie PR-Labels entfallen.'
export const LABEL_HINWEIS = 'Labels: Nur PRs, die die Zeile als gemergt, eingereicht, laufend oder im Prüfer nennt, bestimmen lokal und nacht; Verlauf und Herkunft zählen nicht, ein Nachtrag der lokalen Sitzung ist nicht erkennbar.'
export const STREICH_HINWEIS = 'Zeile nennt PRs ausdrücklich als gemergt (alle gemergt), ohne offenen Satz, 📅, ⏳ oder Wartegrund. Die Zeilen stehen weiter in ihrem Abschnitt.'

/** Label-Badges als Text; ohne Beleg leer. */
export function labelText(labels) {
  return labels.map((l) => LABEL_TEXT[l]).join(' ')
}

/** „seit 5 Tagen“ / „fällig in 2 Tagen“ / „seit 3 Tagen fällig“; rot (≥ 3 Tage) mit Ausrufezeichen. */
export function alterText(a) {
  if (!a) return ''
  const n = Math.abs(a.tage)
  const tage = `${n} ${n === 1 ? 'Tag' : 'Tagen'}`
  if (a.art === 'seit') return `${a.rot ? '❗ ' : ''}seit ${tage}`
  return a.tage < 0 ? `fällig in ${tage}` : `${a.rot ? '❗ ' : ''}seit ${tage} fällig`
}

function zeile(e) {
  const teile = [e.naechster ? '▶' : '', `**${e.titel.replace(/\|/g, '/')}**`, labelText(e.labels), alterText(e.alter), e.prio ? `(${e.prio})` : '']
  const grund = e.grund ? ` — ${grundText(e.grund)}` : ''
  const links = e.links.slice(0, 3).map((l) => `[${l.text.replace(/[[\]]/g, '')}](${l.href})`).join(' ')
  return `- ${teile.filter(Boolean).join(' ')}${grund}${links ? ` — ${links}` : ''}`
}

function gruppeText(g) {
  const aus = []
  if (g.ziel) aus.push(`### ${g.name}`)
  for (const t of g.themen) {
    if (t.thema) aus.push(`#### ${t.thema}`)
    aus.push(...t.eintraege.map(zeile), '')
  }
  return aus
}

function kopfText(k, jetzt) {
  const aus = [`# Übersicht`, '', `Erzeugt ${new Date(jetzt).toISOString()} aus stand.md (einzige Wahrheit, nicht von Hand ändern).`, '', LABEL_HINWEIS, '']
  aus.push('| Abschnitt | Punkte |', '|---|---|', ...k.abschnitte.map((a) => `| ${a.titel} | ${a.anzahl} |`), '')
  const l = k.labels
  aus.push(`Labels offene Punkte: 💻 lokal ${l.lokal} · 🌙 nacht ${l.nacht} · beide ${l.beide} · ohne Beleg ${l.offen}`, '')
  if (k.prs) {
    aus.push(`Offene PRs: ${k.prs.abgeschnitten ? '≥ ' : ''}${k.prs.liste.length}`)
    aus.push(...k.prs.liste.slice(0, 15).map((p) => `- PR ${p.number} — ${p.stunden} h — ${p.title}${p.labels.length ? ` [${p.labels.join(', ')}]` : ''}`), '')
  }
  if (k.merges) {
    const s = k.merges.summe
    aus.push(`Merges 7 Tage: nacht ${s.nacht} · lokal ${s.lokal} · Datenbot ${s.daten}`, '')
    aus.push(`Merges je Tag${k.merges.vollstaendig ? '' : ' (unvollständig: Seitengrenze erreicht)'}`, '| Tag | 💻 lokal | 🌙 nacht | Datenbot |', '|---|---|---|---|')
    aus.push(...k.merges.tage.map((t) => `| ${t.tag} | ${t.lokal} | ${t.nacht} | ${t.daten} |`), '')
  } else aus.push(`_${k.ghText ?? GH_FEHLT}_`, '')
  return aus
}

/** Ganze Datei. `k` aus kennzahlen(). */
export function markdownVon(modell, k) {
  const aus = kopfText(k, modell.jetzt)
  if (modell.streichkandidaten.length) {
    aus.push(`## Streichkandidaten (${modell.streichkandidaten.length})`, '', STREICH_HINWEIS, '')
    aus.push(...modell.streichkandidaten.map(zeile), '')
  }
  for (const a of modell.abschnitte) {
    aus.push(`## ${a.titel} (${a.anzahl})`, '')
    for (const g of a.gruppen) aus.push(...gruppeText(g))
  }
  return aus.join('\n')
}
