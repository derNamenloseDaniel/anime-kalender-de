/**
 * HTML-Fassung der Übersicht: eine Datei, serverseitig gerendert (jeder Text über `esc`, Links nur https:/file:), CSS und
 * Filter-Skript eingebettet, kein fetch, keine fremde Adresse außer den Links aus den Daten.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { ZIEL_NAMEN, ZIELE } from './uebersicht-modell.mjs'
import { GH_FEHLT, LABEL_HINWEIS, STREICH_HINWEIS, alterText, labelText } from './uebersicht-md.mjs'
import { grundText } from './uebersicht-regeln.mjs'

const CSS = readFileSync(join(import.meta.dirname, 'uebersicht-seite.css'), 'utf8')
const JS = readFileSync(join(import.meta.dirname, 'uebersicht-seite.js'), 'utf8')
const ERLAUBT = /^(?:https:\/\/|file:\/\/\/)/i

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

function linkHtml(l) {
  return ERLAUBT.test(l.href) ? `<a href="${esc(l.href)}">${esc(l.text)}</a>` : esc(l.text)
}

/** Eine Zeile `li.e` mit Datenattributen für den Filter. */
export function eintragHtml(e) {
  const text = `${e.titel} ${e.kopf}`.toLowerCase()
  const badges = e.labels.map((l) => `<span class="badge ${l}">${esc(labelText([l]))}</span>`).join(' ')
  const alt = e.alter ? `<span class="alt${e.alter.rot ? ' rot' : ''}">${esc(alterText(e.alter))}</span>` : ''
  const grund = e.grund ? `<p>${esc(grundText(e.grund))}</p>` : ''
  const quellen = e.labelQuellen.length ? `<p class="mu">Label-Beleg: ${esc(e.labelQuellen.join('; '))}</p>` : ''
  const eltern = e.eltern ? `<p class="mu">gehört zu: ${esc(e.eltern)}</p>` : ''
  const links = e.links.length ? `<p>${e.links.map(linkHtml).join(' · ')}</p>` : ''
  return `<li class="e" data-labels="${e.labels.join(' ')}" data-ziel="${esc(e.ziel)}" data-text="${esc(text)}"><details><summary>${e.naechster ? '<span class="next">▶ nächster</span> ' : ''}<span class="titel">${esc(e.titel)}</span> ${badges} ${alt}${e.prio ? ` <span class="prio">${esc(e.prio)}</span>` : ''}</summary><div class="detail"><p>${esc(e.kopf)}</p>${grund}${eltern}${quellen}${links}</div></details></li>`
}

function themaHtml(t) {
  const liste = `<ul class="liste">${t.eintraege.map(eintragHtml).join('')}</ul>`
  if (!t.thema) return liste
  return `<details class="thema" open><summary>${esc(t.thema)} <span class="zahl" data-zahl>(${t.eintraege.length})</span></summary>${liste}</details>`
}

function gruppeHtml(g) {
  const inhalt = g.themen.map(themaHtml).join('')
  if (!g.ziel) return inhalt
  const n = g.themen.reduce((s, t) => s + t.eintraege.length, 0)
  return `<details class="ziel" open><summary><h3 style="display:inline">${esc(g.name)}</h3> <span class="zahl" data-zahl>(${n})</span></summary>${inhalt}</details>`
}

function abschnittHtml(a) {
  const zu = a.id === 'neuLive'
  const leer = a.anzahl ? '' : '<p class="leer">Keine Einträge.</p>'
  return `<details class="abschnitt" id="a-${a.id}"${zu ? '' : ' open'}><summary><h2>${esc(a.titel)}</h2> <span class="zahl" data-zahl>(${a.anzahl})</span></summary>${leer}${a.gruppen.map(gruppeHtml).join('')}</details>`
}

function streichHtml(liste) {
  if (!liste.length) return ''
  const hinweis = `<p class="detail mu">${esc(STREICH_HINWEIS)}</p>`
  return `<details class="abschnitt" id="a-streichen"><summary><h2>Streichkandidaten</h2> <span class="zahl" data-zahl>(${liste.length})</span></summary>${hinweis}<ul class="liste" style="padding:0 14px">${liste.map(eintragHtml).join('')}</ul></details>`
}

function karten(k) {
  const l = k.labels
  const aus = k.abschnitte.filter((a) => a.id !== 'neuLive').map((a) => `<div class="karte"><b>${a.anzahl}</b><small>${esc(a.titel)}</small></div>`)
  aus.push(`<div class="karte"><b>${l.lokal} · ${l.nacht} · ${l.beide}</b><small>lokal · nacht · beide (ohne Beleg ${l.offen})</small></div>`)
  if (k.merges) aus.push(`<div class="karte"><b>${k.merges.summe.nacht + k.merges.summe.lokal + k.merges.summe.daten}</b><small>Merges 7 Tage: nacht ${k.merges.summe.nacht} · lokal ${k.merges.summe.lokal} · Datenbot ${k.merges.summe.daten}</small></div>`)
  if (k.prs) aus.push(`<div class="karte"><b>${k.prs.abgeschnitten ? '≥ ' : ''}${k.prs.liste.length}</b><small>offene PRs, ältester ${k.prs.liste[0]?.stunden ?? 0} h</small></div>`)
  return `<div class="kopf">${aus.join('')}</div>`
}

function mergesHtml(k) {
  if (!k.merges) return `<p class="mu">${esc(k.ghText ?? GH_FEHLT)}</p>`
  const zeilen = k.merges.tage.map((t) => `<tr><td>${esc(t.tag)}</td><td>${t.lokal}</td><td>${t.nacht}</td><td>${t.daten}</td></tr>`).join('')
  const warn = k.merges.vollstaendig ? '' : ' (unvollständig: Seitengrenze erreicht)'
  return `<details class="abschnitt" open><summary><h2>Merges je Tag</h2> <span class="zahl">${warn}</span></summary><div class="detail"><table><tr><th>Tag</th><th>💻 lokal</th><th>🌙 nacht</th><th>Datenbot</th></tr>${zeilen}</table></div></details>`
}

function knopf(feld, wert, text, an) {
  return `<button type="button" class="f" data-feld="${feld}" data-wert="${esc(wert)}" aria-pressed="${an}">${esc(text)}</button>`
}

function leiste() {
  const label = [['alle', 'Alle'], ['lokal', '💻 lokal'], ['nacht', '🌙 nacht'], ['beide', 'beide'], ['offen', 'ohne Beleg']]
  const ziele = [['alle', 'Alle Ziele'], ...ZIELE.map((z) => [z, ZIEL_NAMEN[z]])]
  return `<div class="leiste"><div class="gruppe-knoepfe">${label.map(([w, t], i) => knopf('label', w, t, i === 0)).join('')}</div><div class="gruppe-knoepfe">${ziele.map(([w, t], i) => knopf('ziel', w, t, i === 0)).join('')}</div><input type="search" id="suche" placeholder="Suchen …" aria-label="Suchen"></div>`
}

/** Ganze Seite. `k` aus kennzahlen(). */
export function htmlVon(modell, k) {
  const stand = new Date(modell.jetzt).toISOString().replace('T', ' ').slice(0, 16)
  const csp = "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'"
  const abschnitte = modell.abschnitte.map(abschnittHtml)
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${csp}"><title>Übersicht</title><style>${CSS}</style></head>
<body><main><h1>Übersicht</h1><p class="mu">Erzeugt ${esc(stand)} UTC aus stand.md (einzige Wahrheit; nicht von Hand ändern).</p><p class="mu">${esc(LABEL_HINWEIS)}</p>${karten(k)}${mergesHtml(k)}${leiste()}${streichHtml(modell.streichkandidaten)}${abschnitte.join('')}</main><script>${JS}</script></body></html>
`
}
