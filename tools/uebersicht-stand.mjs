/**
 * stand.md lesen (Übersicht, tools/uebersicht.mjs): jede Zeile `- ` der Abschnitte Neu live, Daniel-Todo (Jetzt/Später),
 * In Arbeit und Als Nächstes wird genau ein Eintrag; eingerückte Zeilen hängen als Notiz am Eintrag davor, außer sie tragen
 * selbst ein gültiges Kennzeichen (dann eigener Eintrag mit `eltern`). Der Auto-Block `<!-- pr-zeilen` zählt nicht.
 * Kennzeichen-Regeln kommen aus der Mod (stand-kennzeichen.mjs), nicht aus einer Kopie.
 */
import { parseKennzeichen } from '../.claude/mods/arbeitsliste/hooks/stand-kennzeichen.mjs'

const ABSCHNITTE = [
  ['## Neu und live testbar', 'neuLive'],
  ['## Daniel-Todo', 'todo'],
  ['## In Arbeit', 'inArbeit'],
  ['## Als Nächstes', 'naechstes'],
]
const ICONS = ['🔴', '🟠', '🔵', '📅', '⏳', '🚫']
const AUTONOM = /^autonomer modus\b/i

/** Neu-live-Titel: Fett-Titel, sonst der Text nach dem Datum bis vor „ — [Link]“ bzw. „([Link]“ (nie nur der Linktext wie „Seite“), höchstens 100 Zeichen, sonst die Zeile selbst. */
export function neuLiveTitel(kopf) {
  const fett = /\*\*(.+?)\*\*/.exec(kopf)
  if (fett) return fett[1]
  const ohneDatum = kopf.replace(/^- (?:\[\d{4}-\d\d-\d\d(?: \d\d:\d\d)?\]\s*)?/, '')
  const text = ohneDatum.split(/\s+—\s+\[|\s*\(\[/)[0].replace(/\[([^\]]+)\]\([^)]*\)/g, (_, x) => x).trim()
  if (!text) return titelVon(kopf)
  return text.length > 100 ? `${text.slice(0, 99)}…` : text
}

/** Fett-Titel, sonst Text des ersten Links, sonst die ersten 70 Zeichen ohne Icon und Größenmarke. */
export function titelVon(kopf) {
  const fett = /\*\*(.+?)\*\*/.exec(kopf)
  if (fett) return fett[1]
  const link = /\[([^\]]+)\]\([^)]*\)/.exec(kopf)
  if (link) return link[1]
  return kopf.replace(/^- /, '').replace(/^(?:🔴|🟠|🔵|📅|⏳|🚫)\s*/u, '').slice(0, 70)
}

/** Erstes Icon der Zeile (nach `- ` und optionalem Datum davor), sonst null. */
function iconVon(kopf) {
  const anfang = kopf.replace(/^\s*- /, '').slice(0, 12)
  return ICONS.find((i) => anfang.includes(i)) ?? null
}

/** Kopf einer Zeile ohne Kennzeichen, `{wartet:…}`, Größenmarke und Link-Adressen (für Anzeige und Wortsuche). */
export function bereinigt(kopf) {
  return kopf
    .replace(/^\s*- /, '')
    .replace(/\[([^\]]+)\]\((?:https?|file):[^)]*\)/g, '$1')
    .replace(/\{[^}]*\}/g, '')
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Alle Markdown-Links `[Text](https|file…)` der Texte, ohne Doppelte. */
export function linksVon(texte) {
  const aus = []
  for (const t of texte) {
    for (const m of t.matchAll(/\[([^\]]+)\]\(((?:https?|file):[^)\s]+)\)/g)) {
      if (!aus.some((l) => l.href === m[2])) aus.push({ text: m[1], href: m[2] })
    }
  }
  return aus
}

/** Wartet-Text aus `{wartet: …}` (Todo-Form) oder dem Kennzeichen, sonst null. */
function wartetVon(kopf, k) {
  const alt = /\{wartet: ([^}]*\S)\}/.exec(kopf)
  return alt ? alt[1] : (k?.wartet ?? null)
}

function neuerEintrag(kopf, nr, abschnitt, eltern) {
  const k = parseKennzeichen(kopf)
  return {
    nr,
    abschnitt,
    eltern,
    kopf,
    notizen: [],
    titel: abschnitt === 'neuLive' ? neuLiveTitel(kopf) : titelVon(kopf),
    icon: iconVon(kopf),
    groesse: /\[(klein|mittel)\]/.exec(kopf)?.[1] ?? null,
    k: k.ok ? k : null,
    wartet: wartetVon(kopf, k.ok ? k : null),
  }
}

/** Zustand des Zeilenlesers: Abschnitt, Unterabschnitt, Auto-Block, letzter Eintrag. */
function oeffneAbschnitt(z, zustand) {
  zustand.imBlock = false
  zustand.letzter = null
  zustand.unter = null
  zustand.abschnitt = ABSCHNITTE.find(([anfang]) => z.startsWith(anfang))?.[1] ?? null
  if (zustand.abschnitt === 'todo') zustand.unter = 'jetzt'
}

/** Einträge je Abschnitt: `{neuLive, jetzt, spaeter, inArbeit, naechstes}` (Todo wird in Jetzt/Später geteilt). */
export function leseStand(text) {
  const aus = { neuLive: [], jetzt: [], spaeter: [], inArbeit: [], naechstes: [] }
  const zustand = { abschnitt: null, unter: null, imBlock: false, letzter: null }
  text.split(/\r?\n/).forEach((z, i) => {
    if (z.startsWith('## ')) return oeffneAbschnitt(z, zustand)
    if (zustand.abschnitt === 'todo' && z.startsWith('### ')) {
      zustand.unter = /^### Sp(ä|ae)ter/.test(z) ? 'spaeter' : 'jetzt'
      zustand.letzter = null
      return
    }
    if (z.includes('<!-- pr-zeilen')) zustand.imBlock = true
    else if (z.includes('<!-- /pr-zeilen')) zustand.imBlock = false
    else if (zustand.abschnitt && !zustand.imBlock) nimmZeile(z, i + 1, zustand, aus)
  })
  return aus
}

function nimmZeile(z, nr, zustand, aus) {
  const ziel = zustand.abschnitt === 'todo' ? zustand.unter : zustand.abschnitt
  if (z.startsWith('- ')) {
    if (AUTONOM.test(titelVon(z))) {
      zustand.letzter = null
      return
    }
    zustand.letzter = neuerEintrag(z, nr, ziel, null)
    aus[ziel].push(zustand.letzter)
  } else if (/^\s+\S/.test(z) && zustand.letzter) {
    const eigen = /^\s+- /.test(z) && parseKennzeichen(z).ok
    if (eigen) {
      zustand.letzter = neuerEintrag(z.trim(), nr, ziel, zustand.letzter.eltern ?? zustand.letzter.titel)
      aus[ziel].push(zustand.letzter)
    } else zustand.letzter.notizen.push(z.trim())
  }
}
