/**
 * Reine Regeln der Übersicht (kein Netz, keine Dateien): Alter, Blockiert-Erkennung, Themengruppe, PR-Belege und Labels,
 * Streichkandidaten, Merges je Tag. `jetzt` und alle PR-Daten kommen als Parameter.
 */
import { tagBerlin } from './tageskennzahlen-rechnen.mjs'

export const ROT_AB_TAGEN = 3
export const WORT_KOPF_ZEICHEN = 220
/** Ein Termin ohne Jahr gilt bis zu so vielen Tagen zurück als überfällig, sonst als nächstes Vorkommen in der Zukunft. */
export const UEBERFAELLIG_MAX_TAGE = 182
const TAG_MS = 86_400_000
const BOT_AUTOR = /anime-kalender-daten/
const EIGNER = 'derNamenloseDaniel'

/** Gibt es das Datum wirklich (kein 29.02. im Nichtschaltjahr, kein 31.04.)? */
function gueltig(j, m, d) {
  const t = new Date(Date.UTC(j, m - 1, d))
  return t.getUTCFullYear() === j && t.getUTCMonth() === m - 1 && t.getUTCDate() === d
}

/** Tage vom Datum `{j,m,d}` bis heute (Berliner Tag von `jetzt`); negativ = in der Zukunft. */
function tageBis(datum, jetzt) {
  return Math.round((Date.parse(tagBerlin(jetzt)) - Date.UTC(datum.j, datum.m - 1, datum.d)) / TAG_MS)
}

/** Berliner Jahr von `jetzt`. */
const jahrVon = (jetzt) => Number(tagBerlin(jetzt).slice(0, 4))

/** Eingang eines Kennzeichens (immer ein vergangener Tag): das jüngste Jahr, das nicht nach `jetzt` liegt (wie `eingangMs` der Mod). */
function eingangDatum(k, jetzt) {
  const jahr = jahrVon(jetzt)
  const j = Date.UTC(jahr, k.monat - 1, k.tag) > Date.parse(tagBerlin(jetzt)) ? jahr - 1 : jahr
  return gueltig(j, k.monat, k.tag) ? { j, m: k.monat, d: k.tag } : null
}

/**
 * Alle gültigen Daten im Text (`JJJJ-MM-TT`, `TT.MM.JJJJ`, `TT.MM.`) in Textreihenfolge als `{j,m,d,jahrlos}`;
 * ein jahrloses Datum trägt das laufende Berliner Jahr (kein Zurückrollen), ein ungültiges (29.02. im Nichtschaltjahr) fällt weg.
 */
export function datenImText(text, jetzt) {
  const aus = []
  const re = /(?<![\d.])(?:(\d{4})-(\d\d)-(\d\d)|(\d\d)\.(\d\d)\.(\d{4})|(\d\d)\.(\d\d)\.(?!\d))/g
  for (const m of text.matchAll(re)) {
    if (m[1]) aus.push({ j: +m[1], m: +m[2], d: +m[3], jahrlos: false })
    else if (m[4]) aus.push({ j: +m[6], m: +m[5], d: +m[4], jahrlos: false })
    else aus.push({ j: jahrVon(jetzt), m: +m[8], d: +m[7], jahrlos: true })
  }
  return aus.filter((x) => gueltig(x.j, x.m, x.d))
}

/**
 * Termin (📅) als Tage bis heute (negativ = noch hin). Mit Jahr gilt es wörtlich. Ohne Jahr: lag das Datum höchstens
 * `UEBERFAELLIG_MAX_TAGE` Tage zurück (Vorjahr, laufendes Jahr), ist es überfällig, sonst das nächste Vorkommen in der Zukunft.
 */
function terminTage(d, jetzt) {
  if (!d.jahrlos) return tageBis(d, jetzt)
  const kandidaten = [d.j - 1, d.j, d.j + 1].filter((j) => gueltig(j, d.m, d.d)).map((j) => tageBis({ ...d, j }, jetzt))
  const vergangen = kandidaten.filter((t) => t >= 0 && t <= UEBERFAELLIG_MAX_TAGE)
  if (vergangen.length) return Math.min(...vergangen)
  const kommend = kandidaten.filter((t) => t < 0)
  return kommend.length ? Math.max(...kommend) : null
}

/**
 * Alter eines Eintrags: `{art:'seit', tage, rot}` ab Eingang (Kennzeichen) bzw. frühestem vergangenem Datum der Kopfzeile,
 * bei Terminen (📅) `{art:'faellig', tage}` (negativ = noch hin). Ohne Datum null; ein Datum in der Zukunft ist nie ein Alter.
 */
export function alterVon(e, jetzt) {
  if (e.icon === '📅') {
    const d = datenImText(e.kopf, jetzt)[0]
    const tage = d ? terminTage(d, jetzt) : null
    return tage === null ? null : { art: 'faellig', tage, rot: tage >= ROT_AB_TAGEN }
  }
  const eingang = e.k ? eingangDatum(e.k, jetzt) : null
  const daten = e.k ? (eingang ? [eingang] : []) : datenImText(e.kopf, jetzt)
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

/** Anzeige des Wartegrunds: nur das Wort „wartet“/„blockiert“ bleibt allein, ein Satz mit diesem Wort steht ohne Vorsatz, sonst „wartet: <Grund>“. */
export function grundText(grund) {
  if (/^(wartet|blockiert)$/i.test(grund)) return grund
  return /^(wartet|blockiert)\b/i.test(grund) ? grund : `wartet: ${grund}`
}

const THEMEN = [
  ['Mod, Werkzeuge und Regeln', /(?<!\p{L})(mod\b|arbeitsliste|werkzeug|wächter|prüf|orchester|merger|skill|agent|hook|regel|lehren|vorschlag|listenpflege|stand\.md)/iu],
  ['Pipeline und Betrieb', /(?<!\p{L})(pipeline|bestandsbau|sammler|workflow|deploy|pr-kette|kette\b|ci-|ci\b|bau\b|lauf|läufe|ausbleiben|wache|worker)/iu],
  ['Erweiterung und Quellen', /(?<!\p{L})(erweiterung|durchgang|netflix|prime|crunchyroll|anisearch|justwatch|tmdb|quelle|joyn|disney)/iu],
  ['Web und Oberfläche', /(?<!\p{L})(detail-panel|kalender|filter|mockup|woche|layout|handy|anzeige|navigator|suche|panel|cover|ics\b|reiter|bühne|gestaltung)/iu],
  ['Titel und Franchise', /(?<!\p{L})(staffel|folge|handlung|disc|synchro|franchise|horizonte|mängel|stumme|beyblade|pokémon|titel\b)/iu],
]

/** Themengruppe aus dem Titel: nur bei genau einem Treffer, sonst „Sonstiges“ (keine erfundene Zuordnung). */
export function themaVon(titel) {
  const treffer = THEMEN.filter(([, re]) => re.test(titel))
  return treffer.length === 1 ? treffer[0][0] : 'Sonstiges'
}

const LIEFERT = /gemergt/i
const LAEUFT = /gemergt|eingereicht|läuft|Prüfer/i
const HERKUNFT_DAVOR = /(?:Ursache|Herkunft|aus|nach|Basis|Vorschlag|Messquelle|Messung|wegen|laut|siehe|vgl\.?|von)\s+$/i
const FENSTER_ZEICHEN = 70

/** Text ohne Markdown-Link-Adressen (nur Linktext bleibt) und ohne `{…}`-Stempel. */
function ohneAuszeichnung(t) {
  return t.replace(/\[([^\]]*)\]\((?:https?|file):[^)]*\)/g, (_, x) => x).replace(/\{[^}]*\}/g, ' ')
}

/**
 * PR-Nummern, die die Zeile ausdrücklich nennt: `beleg` = im Satz dahinter (höchstens 70 Zeichen, bis zum nächsten PR oder
 * Satzende) oder direkt davor „gemergt“, „eingereicht“, „läuft“ oder „Prüfer“; `geliefert` = „gemergt“. Herkunfts-, Ursachen-,
 * Mess-, Vorschlags- und Verlaufsverweise (davor „aus“, „nach“, „Ursache“ …, oder kein solches Wort) zählen nicht.
 */
export function prBelege(texte) {
  const beleg = []
  const geliefert = []
  const nimm = (liste, n) => { if (!liste.includes(n)) liste.push(n) }
  for (const roh of texte) {
    const t = ohneAuszeichnung(roh)
    const treffer = [...t.matchAll(/\bPRs?\s+#?(\d{3,6})\b/g)]
    treffer.forEach((m, i) => {
      if (HERKUNFT_DAVOR.test(t.slice(0, m.index))) return
      const ende = m.index + m[0].length
      const danach = t.slice(ende, Math.min(ende + FENSTER_ZEICHEN, treffer[i + 1]?.index ?? t.length)).split(/(?<=[a-zäöüß)][.!?])\s|;/i)[0]
      const davor = t.slice(Math.max(0, m.index - 16), m.index)
      const gemergt = LIEFERT.test(danach) || /gemergt[:\s([]*$/i.test(davor)
      if (gemergt) nimm(geliefert, +m[1])
      if (gemergt || LAEUFT.test(danach) || /eingereicht[:\s([]*$/i.test(davor)) nimm(beleg, +m[1])
    })
  }
  return { beleg, geliefert }
}

/** Marken `@nacht`/`@lokal` aus den Texten (nicht in E-Mails oder Namen: davor kein Wortzeichen). */
export function markenVon(texte) {
  const aus = new Set()
  for (const t of texte) for (const m of t.matchAll(/(?<![\w@/])@(nacht|lokal)\b/g)) aus.add(m[1])
  return aus
}

/**
 * Labels eines Eintrags `['lokal','nacht']` (je nach Beleg, sonst leer) und deren Quellen; `nummern` sind die Beleg-PRs von `prBelege`.
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

/** Wörter eines offenen Satzes: dann ist die Zeile nicht erledigt, auch wenn ein PR gemergt ist. */
const OFFEN = /offen|\bRest|danach|vorher|zählen|prüf|steht aus|ausdehn|nachmess|\bnoch\b|folge|später|geplant|beobacht|im Blick|\bnach\b|nächst|entworfen|sammelzeile|\?|📅|⏳/iu
/** Sammelzeile mit Teilen „(a) … (b) …“: ein gemergter PR erledigt nur einen Teil. */
const TEILE = /\([a-e]\)[\s\S]*\([a-e]\)/

/**
 * Streichkandidat: Zeile aus In Arbeit/Als Nächstes, die mindestens einen PR ausdrücklich als gemergt nennt (`geliefert`),
 * alle diese PRs sind laut GitHub gemergt, der Text (Kopf ohne Kennzeichen, Notizen) hat keinen offenen Satz (`OFFEN`)
 * und die Zeile hat keinen Wartegrund. Ein PR ohne „gemergt“ im Satz (Herkunft, Ursache, Messung, Vorschlag) zählt nicht.
 * Die Zeile bleibt in ihrem Abschnitt; die Liste ist nur ein Hinweis.
 */
export function istStreichkandidat(herkunft, texte, geliefert, prDaten, grund) {
  if (grund || (herkunft !== 'inArbeit' && herkunft !== 'naechstes')) return false
  if (!geliefert.length || geliefert.some((n) => prDaten[n]?.typ !== 'PullRequest' || !prDaten[n].gemergt)) return false
  return offenesWort(texte) === null
}

/** Erstes Zeichen eines offenen Satzes („offen“, „prüf…“, „nach“, Sammelzeile (a)/(b) …) im Text, sonst null. */
export function offenesWort(texte) {
  for (const t of texte) {
    const m = OFFEN.exec(t)
    if (m) return m[0]
  }
  return TEILE.test(texte.join('\n')) ? '(a)…(b)' : null
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
