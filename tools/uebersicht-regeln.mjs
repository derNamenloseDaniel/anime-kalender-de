/**
 * Reine Regeln der Übersicht (kein Netz, keine Dateien): Alter, Blockiert-Erkennung, Themengruppe, Labels aus PR-Daten und Marken,
 * Merges je Tag. `jetzt` und alle PR-Daten kommen als Parameter.
 */
import { tagBerlin } from './tageskennzahlen-rechnen.mjs'

export const ROT_AB_TAGEN = 3
export const WORT_KOPF_ZEICHEN = 220
const TAG_MS = 86_400_000
const BOT_AUTOR = /anime-kalender-daten/
const EIGNER = 'derNamenloseDaniel'

/** Tage vom Datum `{j,m,d}` bis heute (Berliner Tag von `jetzt`); negativ = in der Zukunft. */
function tageBis(datum, jetzt) {
  return Math.round((Date.parse(tagBerlin(jetzt)) - Date.UTC(datum.j, datum.m - 1, datum.d)) / TAG_MS)
}

/** Jahrloses Datum: das jüngste Jahr, das nicht nach `jetzt` liegt (wie `eingangMs` der Mod). */
function ohneJahr(d, m, jetzt) {
  const jahr = Number(tagBerlin(jetzt).slice(0, 4))
  return Date.UTC(jahr, m - 1, d) > Date.parse(tagBerlin(jetzt)) ? jahr - 1 : jahr
}

/** Alle Daten im Text (`JJJJ-MM-TT`, `TT.MM.JJJJ`, `TT.MM.`), in Textreihenfolge als `{j,m,d,jahrlos}`. */
export function datenImText(text, jetzt) {
  const aus = []
  const re = /(?<![\d.])(?:(\d{4})-(\d\d)-(\d\d)|(\d\d)\.(\d\d)\.(\d{4})|(\d\d)\.(\d\d)\.(?!\d))/g
  for (const m of text.matchAll(re)) {
    if (m[1]) aus.push({ j: +m[1], m: +m[2], d: +m[3], jahrlos: false })
    else if (m[4]) aus.push({ j: +m[6], m: +m[5], d: +m[4], jahrlos: false })
    else aus.push({ j: ohneJahr(+m[7], +m[8], jetzt), m: +m[8], d: +m[7], jahrlos: true })
  }
  return aus.filter((x) => x.m >= 1 && x.m <= 12 && x.d >= 1 && x.d <= 31)
}

/**
 * Alter eines Eintrags: `{art:'seit', tage, rot}` ab Eingang (Kennzeichen) bzw. frühestem vergangenem Datum der Kopfzeile,
 * bei Terminen (📅) `{art:'faellig', tage}` (negativ = noch hin). Ohne Datum null; ein Datum in der Zukunft ist nie ein Alter.
 */
export function alterVon(e, jetzt) {
  if (e.icon === '📅') {
    const d = datenImText(e.kopf, jetzt)[0]
    if (!d) return null
    // Ein Termin ohne Jahr liegt im nächstgelegenen Jahr (auch in der Zukunft).
    const tage = (d.jahrlos ? [d.j - 1, d.j, d.j + 1] : [d.j]).map((j) => tageBis({ ...d, j }, jetzt)).reduce((a, b) => (Math.abs(b) < Math.abs(a) ? b : a))
    return { art: 'faellig', tage, rot: tage >= ROT_AB_TAGEN }
  }
  const daten = e.k ? [{ j: ohneJahr(e.k.tag, e.k.monat, jetzt), m: e.k.monat, d: e.k.tag }] : datenImText(e.kopf, jetzt)
  const vergangen = daten.map((d) => tageBis(d, jetzt)).filter((t) => t >= 0)
  if (!vergangen.length) return null
  const tage = Math.max(...vergangen)
  return { art: 'seit', tage, rot: tage >= ROT_AB_TAGEN }
}

/** Grund, warum der Eintrag blockiert ist/wartet, sonst null: Kennzeichen-/`{wartet:}`-Text, ⏳/🚫, Wort „wartet/blockiert“ in der Kopfzeile. */
export function blockiertGrund(e, kopfText) {
  if (e.wartet) return e.wartet
  const wort = /\b(wartet|blockiert)\b/i.exec(kopfText.slice(0, WORT_KOPF_ZEICHEN))
  if (e.icon === '⏳' || e.icon === '🚫') return wort ? kopfText.slice(wort.index, wort.index + 90) : (e.icon === '🚫' ? 'blockiert' : 'wartet')
  return wort ? kopfText.slice(wort.index, wort.index + 90) : null
}

const THEMEN = [
  ['Mod, Werkzeuge und Regeln', /(?<!\p{L})(mod\b|arbeitsliste|werkzeug|wächter|prüf|orchester|merger|skill|agent|hook|regel|lehren|vorschlag|listenpflege|stand\.md)/iu],
  ['Pipeline und Betrieb', /(?<!\p{L})(pipeline|bestandsbau|sammler|workflow|deploy|pr-kette|kette\b|ci-|ci\b|bau\b|lauf|läufe|ausbleiben|wache|worker)/iu],
  ['Erweiterung und Quellen', /(?<!\p{L})(erweiterung|durchgang|netflix|prime|crunchyroll|anisearch|justwatch|tmdb|quelle|joyn|disney)/iu],
  ['Web und Oberfläche', /(?<!\p{L})(detail-panel|kalender|filter|mockup|woche|layout|handy|anzeige|navigator|suche|panel|cover|ics\b|reiter|bühne|gestaltung)/iu],
  ['Titel und Franchise', /(?<!\p{L})(staffel|folge|handlung|disc|termin|synchro|franchise|horizonte|mängel|stumme|beyblade|pokémon|titel\b)/iu],
]

/** Themengruppe aus dem Titel: nur bei genau einem Treffer, sonst „Sonstiges“ (keine erfundene Zuordnung). */
export function themaVon(titel) {
  const treffer = THEMEN.filter(([, re]) => re.test(titel))
  return treffer.length === 1 ? treffer[0][0] : 'Sonstiges'
}

/** PR-Nummern der Einträge: `…/pull/N`, `PR N`, `PRs N`. Nur dreistellig und länger, Reihenfolge des Auftretens, ohne Doppelte. */
export function prNummern(texte) {
  const aus = []
  for (const t of texte) {
    for (const m of t.matchAll(/(?:pull\/|\bPRs?\s+#?)(\d{3,6})\b/g)) if (!aus.includes(+m[1])) aus.push(+m[1])
  }
  return aus
}

/** Marken `@nacht`/`@lokal` aus den Texten (nicht in E-Mails oder Namen: davor kein Wortzeichen). */
export function markenVon(texte) {
  const aus = new Set()
  for (const t of texte) for (const m of t.matchAll(/(?<![\w@/])@(nacht|lokal)\b/g)) aus.add(m[1])
  return aus
}

/**
 * Labels eines Eintrags `['lokal','nacht']` (je nach Beleg, sonst leer) und deren Quellen.
 * Regel je PR: Label `orchester` = nacht; mit Kommentar des Eigners „## Nachtrag (Abnahme Dirigent“ zusätzlich lokal;
 * ohne `orchester` = lokal; PR des Datenbots und unbekannte Nummern geben nichts. Marken ergänzen.
 */
export function labelsVon(nummern, marken, prDaten) {
  const menge = new Set(marken)
  const quellen = [...marken].map((m) => `Marke @${m}`)
  for (const n of nummern) {
    const d = prDaten[n]
    if (!d || d.typ !== 'PullRequest' || BOT_AUTOR.test(d.autor ?? '')) continue
    if (d.labels.includes('orchester')) {
      menge.add('nacht')
      quellen.push(`PR ${n}: orchester`)
      if (d.abnahmeDirigent) {
        menge.add('lokal')
        quellen.push(`PR ${n}: Abnahme Dirigent`)
      }
    } else {
      menge.add('lokal')
      quellen.push(`PR ${n}: ohne orchester`)
    }
  }
  return { labels: ['lokal', 'nacht'].filter((l) => menge.has(l)), quellen }
}

/**
 * Streichkandidat: Zeile aus In Arbeit/Als Nächstes mit mindestens einem PR, alle PRs gemergt, und weder „offen“ noch 📅 noch ⏳
 * in Kopf oder Notizen und ohne Wartegrund (`blockiertGrund`: wartende Zeilen sind kein erledigter Punkt). Die Zeile bleibt in ihrem Abschnitt; die Liste ist nur ein Hinweis.
 */
export function istStreichkandidat(herkunft, texte, nummern, prDaten, grund) {
  if (grund || (herkunft !== 'inArbeit' && herkunft !== 'naechstes')) return false
  if (!nummern.length || nummern.some((n) => prDaten[n]?.typ !== 'PullRequest' || !prDaten[n].gemergt)) return false
  return !texte.some((t) => /offen|📅|⏳/iu.test(t))
}

/** Kommentare eines PR: hat der Eigner mit „## Nachtrag (Abnahme Dirigent“ begonnen? */
export function hatAbnahmeDirigent(kommentare) {
  return kommentare.some((k) => k.autor === EIGNER && /^\s*## Nachtrag \(Abnahme Dirigent/.test(k.text))
}

/** Topf eines gemergten PR: Label `orchester` = nacht, Datenbot = daten, sonst lokal. */
export function topfVon(pr) {
  if (pr.labels.includes('orchester')) return 'nacht'
  return BOT_AUTOR.test(pr.autor ?? '') ? 'daten' : 'lokal'
}

/** Merges der letzten `tage` Berliner Tage (heute und davor), je Tag `{tag, lokal, nacht, daten}`, neuester zuerst. */
export function mergesJeTag(prs, jetzt, tage = 7) {
  const heute = Date.parse(tagBerlin(jetzt))
  const liste = []
  for (let i = 0; i < tage; i++) liste.push({ tag: new Date(heute - i * TAG_MS).toISOString().slice(0, 10), lokal: 0, nacht: 0, daten: 0 })
  for (const pr of prs) {
    if (!pr.mergedAt) continue
    const zeile = liste.find((z) => z.tag === tagBerlin(pr.mergedAt))
    if (zeile) zeile[topfVon(pr)] += 1
  }
  return liste
}
