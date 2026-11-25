/**
 * GitHub-Abrufe der Übersicht (Aufrufer reicht `ausfuehren(befehl, argumente, optionen)` herein, im Test eine Attrappe):
 * offene PRs, Merges der letzten Tage (REST, Seiten nach Aktualisierung, Abbruch erst hinter dem Fensterbeginn),
 * Label/Autor/Abnahme-Kommentare der in stand.md genannten PRs (GraphQL in Blöcken, Ergebnis im Zwischenspeicher).
 */
import { hatAbnahmeDirigent } from './uebersicht-regeln.mjs'

export const REPO = 'derNamenloseDaniel/anime-kalender-de'
const FRIST_MS = 60_000
const BLOCK = 40
const MAX_SEITEN = 15
const OFFEN_LIMIT = 200
const CACHE_OFFEN_MS = 600_000

/** Offene PRs `[{number, title, createdAt, labels}]` und ob das Limit erreicht war (Zahl dann „≥“). */
export function holeOffene(ausfuehren) {
  const roh = ausfuehren('gh', ['pr', 'list', '--repo', REPO, '--state', 'open', '--limit', String(OFFEN_LIMIT), '--json', 'number,title,createdAt,labels'], { timeout: FRIST_MS })
  const liste = JSON.parse(roh).map((p) => ({ number: p.number, title: p.title, createdAt: p.createdAt, labels: p.labels.map((l) => l.name) }))
  return { liste, abgeschnitten: liste.length >= OFFEN_LIMIT }
}

/** Gemergte PRs seit `vonMs` (REST, `sort=updated`: ein gemergter PR ist nie älter aktualisiert als gemergt). `vollstaendig` false, wenn die Seitengrenze vorher griff. */
export function holeMerges(ausfuehren, vonMs) {
  const jq = '.[]|{number,mergedAt:.merged_at,updatedAt:.updated_at,labels:[.labels[].name],autor:.user.login}|tojson'
  const aus = []
  for (let seite = 1; seite <= MAX_SEITEN; seite++) {
    const pfad = `repos/${REPO}/pulls?state=closed&sort=updated&direction=desc&per_page=100&page=${seite}`
    const zeilen = ausfuehren('gh', ['api', pfad, '--jq', jq], { timeout: FRIST_MS }).split('\n').filter(Boolean).map((z) => JSON.parse(z))
    aus.push(...zeilen.filter((p) => p.mergedAt && Date.parse(p.mergedAt) >= vonMs))
    if (zeilen.length < 100 || Date.parse(zeilen[zeilen.length - 1].updatedAt) < vonMs) return { liste: aus, vollstaendig: true }
  }
  return { liste: aus, vollstaendig: false }
}

function abfrage(nummern, mitKommentaren) {
  const felder = mitKommentaren
    ? 'comments(last: 100) { nodes { author { login } body } }'
    : 'author { login } state labels(first: 20) { nodes { name } }'
  const teile = nummern.map((n) => `n${n}: issueOrPullRequest(number: ${Number(n)}) { __typename ... on PullRequest { ${felder} } }`)
  return `query { repository(owner: "${REPO.split('/')[0]}", name: "${REPO.split('/')[1]}") { ${teile.join(' ')} } }`
}

/** `data.repository` einer GraphQL-Antwort; `gh` meldet Teilfehler (unbekannte Nummer) mit Exit 1 und Daten im stdout. */
function graphql(ausfuehren, query) {
  let roh
  try {
    roh = ausfuehren('gh', ['api', 'graphql', '-f', `query=${query}`], { timeout: FRIST_MS })
  } catch (fehler) {
    roh = fehler.stdout ? String(fehler.stdout) : null
    if (!roh) throw fehler
  }
  return JSON.parse(roh).data?.repository ?? {}
}

function inBloecken(liste, f) {
  for (let i = 0; i < liste.length; i += BLOCK) f(liste.slice(i, i + BLOCK))
}

const UNBEKANNT = { typ: 'unbekannt', autor: null, labels: [], offen: false, abnahmeDirigent: false }

function ausKnoten(k) {
  return { typ: k.__typename, autor: k.author?.login ?? null, labels: (k.labels?.nodes ?? []).map((l) => l.name), offen: k.state === 'OPEN', gemergt: k.state === 'MERGED', abnahmeDirigent: false }
}

/**
 * PR-Daten `{[nummer]: {typ, autor, labels, offen, abnahmeDirigent, abgerufen}}` für `nummern`; `cache` (Objekt, wird ergänzt) hält
 * abgeschlossene PRs dauerhaft, offene `CACHE_OFFEN_MS`. Kommentare nur für PRs mit Label `orchester`.
 */
export function holePrDaten(ausfuehren, nummern, cache, jetztMs) {
  const frisch = (n) => cache[n] && (!cache[n].offen || jetztMs - cache[n].abgerufen < CACHE_OFFEN_MS)
  const fehlend = nummern.filter((n) => !frisch(n))
  inBloecken(fehlend, (block) => {
    const antwort = graphql(ausfuehren, abfrage(block, false))
    for (const n of block) cache[n] = { ...(antwort[`n${n}`] ? ausKnoten(antwort[`n${n}`]) : UNBEKANNT), abgerufen: jetztMs }
  })
  const mitKommentar = fehlend.filter((n) => cache[n]?.typ === 'PullRequest' && cache[n].labels.includes('orchester'))
  inBloecken(mitKommentar, (block) => {
    const antwort = graphql(ausfuehren, abfrage(block, true))
    for (const n of block) {
      const k = (antwort[`n${n}`]?.comments?.nodes ?? []).map((c) => ({ autor: c.author?.login ?? '', text: c.body ?? '' }))
      cache[n].abnahmeDirigent = hatAbnahmeDirigent(k)
    }
  })
  return Object.fromEntries(nummern.filter((n) => cache[n]).map((n) => [n, cache[n]]))
}
