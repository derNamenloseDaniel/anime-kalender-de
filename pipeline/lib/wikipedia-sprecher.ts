/**
 * Sprechertabelle aus dem Wikitext eines de.wikipedia-Abschnitts „Synchronisation“ (Vorstufe, noch ohne Bau-Anschluss).
 * Quelle: de.wikipedia, Lizenz CC BY-SA 4.0 (Quellennennung mit Link auf die Versionsgeschichte der Seite).
 * Gelesen werden Wikitext-Tabellen mit einer Spalte „Deutsch…“ in der Kopfzeile (auch zweizeiliger Kopf mit
 * rowspan/colspan, mehrere deutsche Spalten je Fassung). Datenzellen gelten als eine Spalte je Zelle.
 */

export interface DeutscheStimme {
  sprecher: string
  /** Fassung aus der Spaltenüberschrift (Baki) oder aus `<small>` in der Zelle (Ranma), sonst null. */
  zusatz: string | null
}

export interface SprecherZeile {
  rolle: string
  deutsch: DeutscheStimme[]
}

export interface SprecherTabelle {
  /** false: keine Tabelle mit deutscher Spalte (Ron Kamonohashi nennt nur Japanisch). */
  deutscheSpalte: boolean
  zeilen: SprecherZeile[]
}

interface Zelle {
  text: string
  colspan: number
  rowspan: number
}
interface Zeile {
  kopf: boolean
  zellen: Zelle[]
}

const KEINE_STIMME = new Set(['', '—', '–', '-'])

function bereinige(wikitext: string): string {
  let t = wikitext.replace(/<!--[\s\S]*?-->/g, '').replace(/<ref\b[^>]*\/>/g, '')
  t = t.replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/g, '')
  for (let alt = ''; alt !== t; ) {
    alt = t
    t = t.replace(/\{\{(?:(?!\{\{)[\s\S])*?\}\}/g, '')
  }
  return t.replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, '$2').replace(/\[\[([^\]]*)\]\]/g, '$1').replace(/&nbsp;/g, ' ')
}

function zelle(roh: string): Zelle {
  const m = /^((?:\s*[a-z]+="[^"]*")+)\s*\|(?!\|)([\s\S]*)$/.exec(roh)
  const attribute = m?.[1] ?? ''
  const zahl = (name: string): number => Number(new RegExp(`${name}="(\\d+)"`).exec(attribute)?.[1] ?? 1)
  return { text: (m ? m[2]! : roh).trim(), colspan: zahl('colspan'), rowspan: zahl('rowspan') }
}

function zeilenAusTabelle(tabelle: string): Zeile[] {
  const zeilen: Zeile[] = []
  let aktuell: Zeile | null = null
  for (const l of tabelle.split('\n')) {
    if (/^\|-/.test(l)) {
      aktuell = null
      continue
    }
    if (aktuell && /^\s+(\|\||!!)/.test(l)) {
      aktuell.zellen.push(...l.trim().slice(2).split(aktuell.kopf ? /!!|\|\|/ : '||').map(zelle))
      continue
    }
    const kopf = l.startsWith('!')
    if ((!kopf && !l.startsWith('|')) || l.startsWith('|+')) {
      const letzte = aktuell?.zellen.at(-1)
      if (letzte && l.trim()) letzte.text += `\n${l.trim()}`
      continue
    }
    if (!aktuell) zeilen.push((aktuell = { kopf, zellen: [] }))
    aktuell.zellen.push(...l.slice(1).split(kopf ? /!!|\|\|/ : '||').map(zelle))
  }
  return zeilen
}

/** Kopfzeilen zu Spaltenpfaden auflösen (rowspan trägt den Text in die Folgezeile, colspan über mehrere Spalten). */
function spaltenPfade(kopfzeilen: Zeile[]): string[][] {
  const pfade: string[][] = []
  const uebrig = new Map<number, number>()
  for (const z of kopfzeilen) {
    let spalte = 0
    const ueberspringe = (): void => {
      for (let r = uebrig.get(spalte) ?? 0; r > 0; r = uebrig.get(spalte) ?? 0) {
        uebrig.set(spalte++, r - 1)
      }
    }
    for (const c of z.zellen) {
      ueberspringe()
      for (let k = 0; k < c.colspan; k++) {
        pfade[spalte + k] ??= []
        pfade[spalte + k]!.push(c.text)
        uebrig.set(spalte + k, c.rowspan - 1)
      }
      spalte += c.colspan
    }
    ueberspringe()
  }
  return pfade
}

function stimmen(zellText: string, spaltenZusatz: string | null): DeutscheStimme[] {
  const aus: DeutscheStimme[] = []
  // Zweite Stimme auch auf eigener Zeile ohne <br>, wenn sie mit einem Namen beginnt (Ranma, Stand 26.11.2026:
  // „Thomas Rauscher\n[[Torsten Münchow]] <small>…“); kleingeschrieben setzt die Zeile die Stimme fort.
  for (const teil of zellText.split(/<[Bb][Rr]\s*\/?>|\n(?=\s*\p{Lu})/u)) {
    const klein = /<small>([\s\S]*?)<\/small>/i.exec(teil)?.[1]?.replace(/^\s*\(|\)\s*$/g, '').trim()
    const sprecher = teil.replace(/<small>[\s\S]*?<\/small>/gi, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').replace(/,$/, '').trim()
    if (KEINE_STIMME.has(sprecher)) continue
    const zusatz = [spaltenZusatz, klein].filter((x): x is string => !!x).join(', ')
    aus.push({ sprecher, zusatz: zusatz || null })
  }
  return aus
}

function deutscheSpalten(pfade: string[][]): { spalte: number; zusatz: string | null }[] {
  const aus: { spalte: number; zusatz: string | null }[] = []
  pfade.forEach((pfad, spalte) => {
    const i = pfad.findIndex((p) => /^(?:deutsch|deu\.|dt\.)/i.test(p.replace(/'{2,}/g, '').trim()))
    if (i < 0) return
    const unter = pfad.slice(i + 1).at(-1)
    aus.push({ spalte, zusatz: unter ? unter.replace(/\s+/g, ' ') : null })
  })
  return aus
}

export function liesSprechertabelle(wikitext: string): SprecherTabelle {
  for (const [, tabelle] of bereinige(wikitext).matchAll(/^\{\|[^\n]*\n([\s\S]*?)^\|\}/gm)) {
    const zeilen = zeilenAusTabelle(tabelle!)
    const spalten = deutscheSpalten(spaltenPfade(zeilen.filter((z) => z.kopf)))
    if (spalten.length === 0) continue
    const ergebnis: SprecherZeile[] = []
    for (const z of zeilen.filter((x) => !x.kopf)) {
      const rolle = (z.zellen[0]?.text ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
      const deutsch = spalten.flatMap((s) => stimmen(z.zellen[s.spalte]?.text ?? '', s.zusatz))
      if (rolle && deutsch.length > 0) ergebnis.push({ rolle, deutsch })
    }
    return { deutscheSpalte: true, zeilen: ergebnis }
  }
  return { deutscheSpalte: false, zeilen: [] }
}
