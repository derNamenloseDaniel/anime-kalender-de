/**
 * Welche Sammler-Datei trägt die Schuld an einem roten Titel? Der Bau druckt bei einer verletzten Zusicherung je Titel eine Marke
 * (`tools/quarantaene.mjs`) und legt die Kennungen beim Abbruch in eine Liste (`schuldigenPfad`); `tools/sammler-zuruecknehmen.mjs`
 * nimmt dann nur die Dateien zurück, in denen sich der Eintrag dieses Titels seit dem letzten grünen Bau geändert hat.
 *
 * Belegt ist die Zuordnung nur dort, wo die Datei die Titelkennung selbst trägt: als Schlüssel (`HERKUNFT.schluessel`) oder als
 * Feld `titleId` (`HERKUNFT.feld`). Gemessen 23.11.2026 (Stand origin/main f25ae9adb5): in jeder dieser Dateien sind 98 bis 100 % der
 * Kennungen Titel aus `titles.json`, `cartoons.json` oder `ohne-synchro.json` (toggo 22 von 22, tmdb-folgen 945/945, disc-ausgaben 2085/2085,
 * justwatch-audio 3905/3951, tmdb-titles 2997/3011 …). Dateien mit fremden Kennungen (aniSearch-, ASIN-Schlüssel) stehen nicht hier: ihre
 * Zahlen treffen Titelkennungen nur zufällig (anisearch.json 2654 von 14886). Nur Node-Bordmittel (der Workflow ruft das Werkzeug ohne Pakete).
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { schuldigenPfad } from './quarantaene.mjs'

/** `unter`: Punktpfad zum Objekt; `schluessel`: dessen Schlüssel sind Titelkennungen; `feld`: dessen Einträge tragen die Kennung in diesem Feld. */
export const HERKUNFT = [
  { datei: 'data/toggo.json', unter: 'titel', schluessel: true },
  { datei: 'data/tmdb-staffel0.json', schluessel: true },
  { datei: 'data/tmdb-folgen.json', schluessel: true },
  { datei: 'data/tmdb-banner.json', schluessel: true },
  { datei: 'data/tmdb-titles.json', schluessel: true },
  { datei: 'data/kitsu-folgen.json', schluessel: true },
  { datei: 'data/disc-ausgaben.json', schluessel: true },
  { datei: 'data/justwatch-audio.json', schluessel: true },
  { datei: 'data/youtube-kauf.json', schluessel: true },
  { datei: 'data/trailer.json', schluessel: true },
  { datei: 'data/trailer-versuche.json', schluessel: true },
  { datei: 'data/motn.json', unter: 'gesucht', schluessel: true },
  { datei: 'data/rtlplus-katalog.json', schluessel: true },
  { datei: 'data/rtlplus-folgen.json', unter: 'titel', schluessel: true },
  { datei: 'data/wikipedia-folgen.json', unter: 'titel', schluessel: true },
  { datei: 'data/crunchyroll-de-kennungen.json', unter: 'kennungen', schluessel: true },
  { datei: 'data/tv-programm.json', unter: 'sendungen', feld: 'titleId' },
]

const unter = (json, pfad) => (pfad || '').split('.').filter(Boolean).reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), json)

/** Eintrag je Titelkennung als Text (zum Vergleichen): `Map<Zahl, string>`; eine unerwartete Form ergibt eine leere Karte. */
export function eintraege(json, form) {
  const wurzel = unter(json, form.unter)
  const karte = new Map()
  if (!wurzel || typeof wurzel !== 'object') return karte
  if (form.schluessel) {
    for (const [k, v] of Object.entries(wurzel)) if (/^-?[0-9]+$/.test(k)) karte.set(Number(k), JSON.stringify(v))
    return karte
  }
  const liste = new Map()
  for (const v of Object.values(wurzel)) {
    const id = v && typeof v === 'object' ? v[form.feld] : undefined
    if (Number.isInteger(id)) liste.set(id, [...(liste.get(id) ?? []), v])
  }
  for (const [id, l] of liste) karte.set(id, JSON.stringify(l))
  return karte
}

/**
 * Ordnet jeden schuldigen Titel den Dateien zu, in denen sich sein Eintrag geändert hat.
 * `lies(datei)` liefert `{alt, neu}` (geparstes JSON oder null, wenn es die Datei dort nicht gibt) und wirft bei unlesbarem Inhalt.
 * Jeder Weg, der nicht zu einer engen Auswahl führt, steht benannt in der Antwort: `unbekannt` (Titel ohne Datei, die ihn belegt ändert),
 * `unlesbar` (Datei ließ sich nicht lesen), `ohneHerkunft` (Sammler-Dateien ohne Eintrag in `HERKUNFT`, nur zur Zählung).
 */
export function ordneZu({ schuldige, dateien, lies }) {
  const bekannt = HERKUNFT.filter((h) => dateien.includes(h.datei))
  const ohneHerkunft = dateien.filter((d) => !HERKUNFT.some((h) => h.datei === d))
  const geaendert = new Map()
  const unlesbar = []
  for (const h of bekannt) {
    try {
      const { alt, neu } = lies(h.datei)
      const a = eintraege(alt, h)
      const n = eintraege(neu, h)
      geaendert.set(h.datei, new Set([...a.keys(), ...n.keys()].filter((id) => (a.get(id) ?? '') !== (n.get(id) ?? ''))))
    } catch {
      unlesbar.push(h.datei)
    }
  }
  const belegt = {}
  for (const id of schuldige) belegt[id] = [...geaendert].filter(([, ids]) => ids.has(id)).map(([datei]) => datei).sort()
  const unbekannt = schuldige.filter((id) => belegt[id].length === 0)
  const eng = [...new Set(Object.values(belegt).flat())].sort()
  return { belegt, eng, unbekannt, unlesbar: unlesbar.sort(), ohneHerkunft }
}

/**
 * Enge Auswahl nur, wenn jeder schuldige Titel belegt ist und keine Datei unlesbar blieb; sonst alle Sammler-Dateien wie bisher (im Zweifel sicher).
 * @returns {{art: 'eng' | 'alle', grund: string, zuordnung: object | null}}
 */
export function waehle({ schuldige, dateien, lies }) {
  if (!schuldige || schuldige.length === 0) return { art: 'alle', grund: 'keine Schuldigenliste', zuordnung: null }
  const zuordnung = ordneZu({ schuldige, dateien, lies })
  if (zuordnung.unbekannt.length) return { art: 'alle', grund: `Titel ohne belegte Quelle: ${zuordnung.unbekannt.join(', ')}`, zuordnung }
  if (zuordnung.unlesbar.length) return { art: 'alle', grund: `Datei unlesbar: ${zuordnung.unlesbar.join(', ')}`, zuordnung }
  return { art: 'eng', grund: `${schuldige.length} schuldige Titel belegt`, zuordnung }
}

/** Die Zeile fürs Log: Art, Zahl der Dateien und jeder Verwerfungspfad mit Namen. */
export function auswahlZeile(wahl) {
  const z = wahl.zuordnung
  const namen = (l) => (l?.length ? `: ${l.join(', ')}` : '')
  const belegt = z ? Object.entries(z.belegt).map(([id, d]) => `${id} → ${d.join('+') || '?'}`).join('; ') : '-'
  const zahl = wahl.art === 'eng' ? z.eng.length : wahl.zahlAlle
  const rot = wahl.engRot ? '; enge Auswahl blieb rot, alle Dateien genommen' : ''
  return `Sammler-Zurücknahme Auswahl: ${wahl.art} (${zahl} von ${wahl.zahlAlle} Dateien), Grund: ${wahl.grund}; Zuordnung: ${belegt}; ${z?.unlesbar.length ?? 0} unlesbar${namen(z?.unlesbar)}; ${z?.ohneHerkunft.length ?? 0} Dateien ohne Herkunftsregel${namen(z?.ohneHerkunft)}${rot}`
}

/** Die Schuldigenliste dieses Laufs; `null` mit Grund, wenn sie fehlt, kaputt ist oder zu einem anderen Lauf gehört (Rest eines früheren Laufs gilt nie). */
export function liesSchuldige(env, lesen = (p) => readFileSync(p, 'utf8')) {
  const pfad = schuldigenPfad(env)
  let rohtext
  try {
    rohtext = lesen(pfad)
  } catch {
    return { ids: null, grund: `keine Schuldigenliste (${pfad})` }
  }
  try {
    const d = JSON.parse(rohtext)
    if ((d.laufId ?? '') !== (env.GITHUB_RUN_ID ?? '')) return { ids: null, grund: `Schuldigenliste gehört zu Lauf ${d.laufId || '-'}, nicht zu ${env.GITHUB_RUN_ID || '-'}` }
    const ids = [...new Set(d.schuldige.map((e) => e.titleId).filter(Number.isInteger))].sort((a, b) => a - b)
    return { ids, grund: ids.length ? '' : 'Schuldigenliste ohne Titelkennung' }
  } catch {
    return { ids: null, grund: 'Schuldigenliste unlesbar' }
  }
}

/** Alt- und Neustand einer Datei aus git: `basis` und HEAD; fehlt sie dort, `null`. */
export function paarAusGit(cwd, basis) {
  const zeige = (ref, datei) => {
    let text
    try {
      text = execFileSync('git', ['show', `${ref}:${datei}`], { cwd, encoding: 'utf8', windowsHide: true, timeout: 120000, maxBuffer: 512 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] })
    } catch (fehler) {
      if (/exists on disk, but not in|does not exist in|fatal: path/.test(String(fehler.stderr))) return null
      throw fehler
    }
    return JSON.parse(text)
  }
  return (datei) => ({ alt: zeige(basis, datei), neu: zeige('HEAD', datei) })
}
