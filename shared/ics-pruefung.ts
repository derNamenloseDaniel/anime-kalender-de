/**
 * **RFC-5545-Prüfung einer fertigen ICS-Datei** (26.11.2026; Nachnutzer wie AniNews importieren den Kalender).
 * Zählt je Regel die Verstöße; `shared/` ohne Node, damit Pipeline und Test dieselbe Prüfung nutzen.
 */
export const ICS_REGELN = [
  'zeilenende-nicht-crlf',
  'zeile-ueber-75-oktette',
  'falz-ohne-vorgaenger',
  'utf8-zerrissen',
  'text-unmaskiert',
  'text-steuerzeichen',
  'vevent-ohne-uid',
  'vevent-ohne-dtstamp',
  'uid-doppelt',
  'vevent-ohne-summary',
  'vevent-ohne-dtstart',
  'url-keine-adresse',
  'klammern-unausgeglichen',
  'kopf-fehlt',
] as const
export type IcsRegel = (typeof ICS_REGELN)[number]
export type IcsZaehler = Record<IcsRegel, number>

/** TEXT-Felder nach RFC 5545 §3.3.11; dort müssen Backslash, Semikolon, Komma und Zeilenumbruch maskiert sein. */
const TEXT_FELDER = new Set(['SUMMARY', 'DESCRIPTION', 'CATEGORIES', 'X-WR-CALNAME', 'X-WR-CALDESC', 'LOCATION', 'COMMENT'])

export const leererZaehler = (): IcsZaehler => Object.fromEntries(ICS_REGELN.map((r) => [r, 0])) as IcsZaehler

const utf8 = new TextEncoder()
const streng = new TextDecoder('utf-8', { fatal: true })

function istGueltigesUtf8(bytes: Uint8Array): boolean {
  try {
    streng.decode(bytes)
    return true
  } catch {
    return false
  }
}

/** Ein TEXT-Wert ist maskiert, wenn kein `;`/`,` allein steht und jeder Backslash `\\ \; \, \n \N` einleitet. */
function textUnmaskiert(wert: string): boolean {
  return /(^|[^\\])(\\\\)*[;,]/.test(wert) || /(^|[^\\])(\\\\)*\\($|[^\\;,nN])/.test(wert)
}

// eslint-disable-next-line no-control-regex -- Steuerzeichen sind genau der Gegenstand der Prüfung
const STEUERZEICHEN = /[\u0000-\u0008\u000b-\u001f\u007f]/

function pruefeZeilenform(text: string, z: IcsZaehler): string[] {
  z['zeilenende-nicht-crlf'] += (text.match(/(?<!\r)\n/g) ?? []).length
  const physisch = text.split('\r\n')
  if (physisch.at(-1) === '') physisch.pop()
  const logisch: string[] = []
  for (const zeile of physisch) {
    const bytes = utf8.encode(zeile)
    if (bytes.length > 75) z['zeile-ueber-75-oktette']++
    if (zeile.startsWith(' ') || zeile.startsWith('\t')) {
      if (!logisch.length) z['falz-ohne-vorgaenger']++
      else logisch[logisch.length - 1] += zeile.slice(1)
    } else logisch.push(zeile)
    /* Ein mitten im Zeichen getrenntes UTF-8 zeigt sich schon an der einzelnen physischen Zeile. */
    if (!istGueltigesUtf8(bytes) || zeile.includes('�')) z['utf8-zerrissen']++
  }
  return logisch
}

function pruefeFeld(name: string, wert: string, z: IcsZaehler): void {
  if (TEXT_FELDER.has(name)) {
    if (textUnmaskiert(wert)) z['text-unmaskiert']++
    if (STEUERZEICHEN.test(wert)) z['text-steuerzeichen']++
  }
  if (name === 'URL' && !/^https?:\/\/\S+$/.test(wert)) z['url-keine-adresse']++
}

function pruefeTermin(felder: Set<string>, z: IcsZaehler): void {
  if (!felder.has('UID')) z['vevent-ohne-uid']++
  if (!felder.has('DTSTAMP')) z['vevent-ohne-dtstamp']++
  if (!felder.has('SUMMARY')) z['vevent-ohne-summary']++
  if (!felder.has('DTSTART')) z['vevent-ohne-dtstart']++
}

/** Prüft den entfalteten Inhalt: Felder je Termin, Kopf, Klammern, doppelte UIDs. */
function pruefeInhalt(logisch: string[], z: IcsZaehler): void {
  const uids = new Set<string>()
  const tiefe: string[] = []
  let termin: Set<string> | null = null
  for (const zeile of logisch) {
    const doppel = zeile.indexOf(':')
    if (doppel < 0) continue
    const name = zeile.slice(0, doppel).split(';')[0]!.toUpperCase()
    const wert = zeile.slice(doppel + 1)
    if (name === 'BEGIN') {
      tiefe.push(wert)
      if (wert === 'VEVENT') termin = new Set()
    } else if (name === 'END') {
      if (tiefe.pop() !== wert) z['klammern-unausgeglichen']++
      if (wert === 'VEVENT' && termin) pruefeTermin(termin, z)
      if (wert === 'VEVENT') termin = null
    } else {
      /* Felder des VALARM zählen nicht zum Termin (dessen DESCRIPTION wäre sonst ein zweites). */
      if (termin && tiefe.at(-1) === 'VEVENT') termin.add(name)
      if (name === 'UID' && termin) {
        if (uids.has(wert)) z['uid-doppelt']++
        uids.add(wert)
      }
      pruefeFeld(name, wert, z)
    }
  }
  if (tiefe.length) z['klammern-unausgeglichen']++
  const kopf = logisch.slice(0, 3).join('\n')
  if (logisch[0] !== 'BEGIN:VCALENDAR' || !kopf.includes('VERSION:2.0') || !logisch.some((l) => l.startsWith('PRODID:'))) z['kopf-fehlt']++
}

export function pruefeIcs(text: string): IcsZaehler {
  const z = leererZaehler()
  pruefeInhalt(pruefeZeilenform(text, z), z)
  return z
}

export function summiere(liste: IcsZaehler[]): IcsZaehler {
  const summe = leererZaehler()
  for (const z of liste) for (const r of ICS_REGELN) summe[r] += z[r]
  return summe
}
