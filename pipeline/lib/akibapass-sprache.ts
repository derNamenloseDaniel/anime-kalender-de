import type { Title, WatchLink } from '../../shared/types.ts'
import { adresseIstOmu } from '../../shared/omu-adresse.ts'

/**
 * **Die Sprache eines Akibapass-Wegs steht auf der Produktseite** (Daniel, 28.11.2026, Call of the Night S1:
 * „Sprache offen“, die Seite sagt „mit deutscher Synchronisation. Sprache: Deutsch / Untertitel: keine“).
 * Der Sammler (`pipeline/fetch-akibapass-sprache.ts`) holt die Seite, dieser Teil liest den Text und trägt den Befund ein.
 * Die Adresse ist nur Vorfilter: „omu“ im Pfad folgt der OmU-Regel (`shared/omu-adresse.ts`), alles andere braucht die Seite.
 */
export type AkibapassSprache = 'de' | 'omu' | 'offen'
export type AkibapassDatei = { geholtAm?: string; seiten: Record<string, { sprache: AkibapassSprache; am: string; episoden?: number }> }

export const istAkibapassWeg = (w: WatchLink): boolean => w.name === 'Akibapass'

/** Antwort auf robots.txt: 200 → Text; 404/410 → keine Datei, alles erlaubt (RFC 9309); sonst Fehler (Host wird nicht geholt, Warnung). */
export function robotsAusAntwort(status: number, text: string, host: string): string {
  if (status === 200) return text
  if (status === 404 || status === 410) return ''
  throw new Error(`robots.txt von ${host}: HTTP ${status}`)
}

/** robots.txt: gilt für `*` und für uns (`agent`); die längste passende Regel gewinnt, bei Gleichstand Allow. Leerer Text erlaubt alles. */
export function robotsErlaubt(robots: string, pfad: string, agent: string): boolean {
  let gilt = false
  let vorherigeZeileAgent = false
  const regeln: { erlaubt: boolean; muster: string }[] = []
  for (const zeile of robots.split(/\r?\n/)) {
    const [, feld, wert] = /^\s*([A-Za-z-]+)\s*:\s*(.*?)\s*(?:#.*)?$/.exec(zeile) ?? []
    if (!feld) continue
    const f = feld.toLowerCase()
    if (f === 'user-agent') {
      const trifft = wert === '*' || agent.toLowerCase().includes(wert.toLowerCase())
      gilt = vorherigeZeileAgent ? gilt || trifft : trifft
      vorherigeZeileAgent = true
      continue
    }
    vorherigeZeileAgent = false
    if (gilt && (f === 'allow' || f === 'disallow') && wert) regeln.push({ erlaubt: f === 'allow', muster: wert })
  }
  const passt = (m: string) => pfad.startsWith(m.replace(/\*.*$/, '').replace(/\$$/, ''))
  const treffer = regeln.filter((r) => passt(r.muster)).sort((a, b) => b.muster.length - a.muster.length || Number(b.erlaubt) - Number(a.erlaubt))
  return treffer.length === 0 || treffer[0].erlaubt
}

/** Sichtbarer Text einer Seite: ohne Skripte, Stile und Tags, Leerraum zusammengezogen. */
export function seitenText(html: string): string {
  return html
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
}

/** `Sprache: Deutsch / Untertitel: keine` → de; `Sprache: Japanisch / Untertitel: Deutsch` → omu; ohne Angabe offen. */
export function spracheAusSeite(html: string): AkibapassSprache {
  const text = seitenText(html)
  // Die echte Seite trägt „Sprache: X / Untertitel: Y“ mehrfach (28.11.2026: 17-mal, alle gleich). Ein Urteil nur, wenn **alle** Treffer gleich lauten;
  // ein „Sprache:“ ohne „/ Untertitel“ (Sprachwahl) oder ein abweichender Treffer lässt den Titel offen.
  const stuecke = text.split(/Sprache:/i).slice(1)
  if (stuecke.length) {
    const toene = stuecke.map((s) => /^\s*((?:(?!\/).){0,60}?)\s*\/\s*Untertitel/i.exec(s)?.[1])
    if (toene.some((t) => t === undefined || !/\S/.test(t))) return 'offen'
    const arten = new Set(toene.map((t) => (/deutsch/i.test(t!) ? 'de' : 'omu')))
    return arten.size === 1 ? (arten.has('de') ? 'de' : 'omu') : 'offen'
  }
  if (/mit deutscher Synchronisation/i.test(text)) return 'de'
  if (/\bOmU\b|Originalton mit (deutschen )?Untertiteln/i.test(text)) return 'omu'
  return 'offen'
}

/** „Enthält alle 13 Episoden der Season 1“ → 13; ohne diesen Satz undefined. */
export function folgenAusSeite(html: string): number | undefined {
  const n = Number(/Enthält alle (\d{1,4}) Episoden?/i.exec(seitenText(html))?.[1])
  return n > 0 ? n : undefined
}

export type Anwendung = { gesetzt: number; ohneFolgenzahl: number; abweichend: number }

/**
 * Trägt belegtes Deutsch als `dubRanges` ein: Folgen 1 bis zur Zahl, die die Produktseite nennt („Enthält alle N Episoden“), sonst bis `episodes` des Titels.
 * Fehlt beides, bleibt der Weg offen (`ohneFolgenzahl`); nennt die Seite eine andere Zahl als der Titel (etwa ein Teil einer Staffel), ebenso (`abweichend`).
 * Ein Weg mit eigener Angabe und ein OmU-Pfad bleiben unberührt.
 */
export function setzeAkibapassSprache(titles: Iterable<Title>, datei: AkibapassDatei): Anwendung {
  const z: Anwendung = { gesetzt: 0, ohneFolgenzahl: 0, abweichend: 0 }
  for (const t of titles) {
    for (const w of t.watchLinks ?? []) {
      if (!istAkibapassWeg(w) || w.dubRanges?.length || adresseIstOmu(w.url)) continue
      const e = datei.seiten[w.url]
      if (e?.sprache !== 'de') continue
      const zahl = e.episoden ?? t.episodes
      if (!zahl) { z.ohneFolgenzahl++; continue } // keine erfundene Folgenzahl
      if (e.episoden && t.episodes && e.episoden !== t.episodes) { z.abweichend++; continue }
      w.dubRanges = [{ from: 1, to: zahl, dub: true }]
      z.gesetzt++
    }
  }
  return z
}

export type HostZahl = { geholt: number; gesperrt: number; uebersprungen: number }
export type Abruf = { holeRobots: (host: string) => Promise<string>; holeSeite: (url: string) => Promise<{ status: number; text: () => Promise<string> }>; pause: () => Promise<void> }

/**
 * Holt die Seiten; 403/429 sperrt nur den Host dieser Adresse, dessen weitere Adressen werden übersprungen, andere Hosts laufen weiter.
 * Rückgabe: Befunde je Adresse und Zählung je Host.
 */
export async function holeAkibapassSeiten(urls: string[], abruf: Abruf, heute: string, warn: (t: string) => void): Promise<{ seiten: AkibapassDatei['seiten']; hosts: Record<string, HostZahl> }> {
  const seiten: AkibapassDatei['seiten'] = {}
  const hosts: Record<string, HostZahl> = {}
  const robots = new Map<string, string>()
  const gesperrt = new Set<string>()
  for (const url of urls) {
    const { host, pathname } = new URL(url)
    const z = (hosts[host] ??= { geholt: 0, gesperrt: 0, uebersprungen: 0 })
    if (gesperrt.has(host)) { z.uebersprungen++; continue }
    if (!robots.has(host)) {
      // Ergebnis je Host einmal; scheitert der Abruf (5xx, Timeout, Netz), ruht der Host für diesen Lauf.
      try { robots.set(host, await abruf.holeRobots(host)) } catch (fehler) {
        warn(`robots.txt von ${host} nicht lesbar, Host ruht in diesem Lauf: ${(fehler as Error).message}`)
        gesperrt.add(host)
        z.uebersprungen++
        continue
      }
    }
    try {
      if (!robotsErlaubt(robots.get(host)!, pathname, 'anime-kalender-de')) { warn(`robots.txt sperrt ${url}`); z.uebersprungen++; continue }
      const antwort = await abruf.holeSeite(url)
      if (antwort.status === 403 || antwort.status === 429) { warn(`HTTP ${antwort.status} bei ${host}: Host pausiert, Rest im nächsten Lauf`); gesperrt.add(host); z.gesperrt++; continue }
      if (antwort.status !== 200) { warn(`${url}: HTTP ${antwort.status}`); continue }
      const html = await antwort.text()
      const episoden = folgenAusSeite(html)
      seiten[url] = { sprache: spracheAusSeite(html), am: heute, ...(episoden ? { episoden } : {}) }
      z.geholt++
    } catch (fehler) {
      warn(`${url}: ${(fehler as Error).message}`)
    }
    await abruf.pause()
  }
  return { seiten, hosts }
}
