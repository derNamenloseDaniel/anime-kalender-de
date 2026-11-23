/**
 * **Ein Sammeltitel wird zu einem Titel je deutscher Staffel** (Daniel, 20.11.2026: „aufteilen in einzelne staffeln, statt alles in 1“).
 *
 * AniList führt Pokémon Horizonte als einen Eintrag (158871); die deutschen Staffeln stehen in `data/curated/horizonte-staffeln.yaml`.
 * Alle Quellen, Handbelege und die Zuordnung laufen weiter gegen den Sammeltitel; erst die Bau-Phase `pipeline/bau/staffel-titel.ts`
 * schneidet ihn hier in Titel, Wege und TOGGO-Blöcke (Termine: `staffel-termine.ts`, Folgenliste: `staffel-folgen.ts`). Die Staffel `basis`
 * behält die Kennung des Sammeltitels, jede andere trägt ihre `kennung` (`shared/staffel-titel.ts`). Ohne `basis` geschieht nichts.
 *
 * Gezählt wird in der Staffel ab 1; `von`/`bis` der Yaml sind die durchlaufenden Nummern des Sammeltitels.
 */
import type { StreamLink, Title } from '../../shared/types.ts'
import type { WatchLink } from '../../shared/watchlink-typ.ts'
import { istStaffelTitel } from '../../shared/staffel-titel.ts'
import { addDays } from '../../shared/time.ts'
import type { StaffelGrenzen } from './pokemon-staffeln.ts'
import { slugify } from './util.ts'

/** `name`: der offizielle deutsche Staffelname aus der Yaml; ohne ihn heißt die Staffel „<Titel> – Staffel N“. */
export type StaffelPlanZeile = { nr: number; von: number; bis?: number; kennung: number; name?: string }
/** `quelle`: die Wikipedia-Episodenliste, aus der TV-Termine Staffel und Folge bekommen (setzt die Phase), für `sources`. */
/** `aktiv`: ab diesem Tag zählen Meldungen zur Basis-Staffel in ihrer Staffelzählung, ältere durchlaufend (Meldungen vor der Aktivierung). */
export type StaffelPlan = { sammel: number; titel: string; basis: number; staffeln: StaffelPlanZeile[]; quelle?: string; aktiv?: string }

/**
 * Die Pläne aus der Yaml. Ein Titel ohne `basis` wird nicht geteilt; mit `basis` muss jede andere Staffel eine Kennung aus dem
 * Staffel-Raum tragen, sonst wirft es (eine halbe Teilung gibt es nicht).
 */
export function staffelPlaene(grenzen: StaffelGrenzen[]): StaffelPlan[] {
  const vergeben = new Set<number>()
  return grenzen.flatMap((g): StaffelPlan[] => {
    if (g.basis === undefined) return []
    if (!g.staffeln.some((s) => s.nr === g.basis)) throw new Error(`Staffel-Titel ${g.anilistId}: basis ${g.basis} ist keine Staffel der Datei`)
    const staffeln = g.staffeln.map((s): StaffelPlanZeile => {
      if (s.nr === g.basis) {
        if (s.kennung !== undefined) throw new Error(`Staffel-Titel ${g.anilistId}: Staffel ${s.nr} ist basis und trägt trotzdem kennung ${s.kennung}`)
        return { nr: s.nr, von: s.von, ...(s.bis !== undefined ? { bis: s.bis } : {}), kennung: g.anilistId, ...(s.name ? { name: s.name } : {}) }
      }
      if (s.kennung === undefined || !istStaffelTitel(s.kennung)) throw new Error(`Staffel-Titel ${g.anilistId}: Staffel ${s.nr} ohne gültige kennung (${s.kennung})`)
      if (vergeben.has(s.kennung)) throw new Error(`Staffel-Titel ${g.anilistId}: kennung ${s.kennung} doppelt`)
      vergeben.add(s.kennung)
      return { nr: s.nr, von: s.von, ...(s.bis !== undefined ? { bis: s.bis } : {}), kennung: s.kennung, ...(s.name ? { name: s.name } : {}) }
    })
    return [{ sammel: g.anilistId, titel: g.titel ?? String(g.anilistId), basis: g.basis, staffeln, ...(g.aktiv ? { aktiv: g.aktiv } : {}) }]
  })
}

/** Die Staffel, in der eine durchlaufende Folge liegt. */
export function staffelDerFolge(plan: StaffelPlan, folge: number): StaffelPlanZeile | undefined {
  return plan.staffeln.find((s) => folge >= s.von && (s.bis === undefined || folge <= s.bis))
}

export const staffelName = (plan: StaffelPlan, nr: number): string => plan.staffeln.find((s) => s.nr === nr)?.name ?? `${plan.titel} – Staffel ${nr}`

type Bereich = { from: number; to: number; dub: boolean }

/** Die Bereiche eines Weges im Fenster der Staffel, in die Zählung der Staffel verschoben. */
export function bereicheDerStaffel(bereiche: Bereich[], s: StaffelPlanZeile): Bereich[] {
  const bis = s.bis ?? Infinity
  return bereiche.flatMap((b) => {
    const von = Math.max(b.from, s.von)
    const ende = Math.min(b.to, bis)
    return von <= ende ? [{ from: von - s.von + 1, to: ende - s.von + 1, dub: b.dub }] : []
  })
}

const folgenIn = (bereiche: Bereich[]): number => bereiche.reduce((n, b) => n + b.to - b.from + 1, 0)

/**
 * Die Wege je Staffel. Ein Weg mit `dubRanges` geht an jede Staffel, die er trifft, mit ihrem Ausschnitt; `teilBereich` sagt, wo die
 * Staffel in seiner (durchlaufenden) Zählung liegt, `sharedWith`, wie viele Staffeln er bedient. Ein Weg ohne Bereiche bedient alle.
 * `verloren` zählt Folgen eines Weges, die in keiner Staffel liegen (Riegel der Phase).
 */
export function teileStreams(streams: StreamLink[], plan: StaffelPlan): { je: Map<number, StreamLink[]>; verloren: number; ohneBereich: number } {
  const je = new Map<number, StreamLink[]>(plan.staffeln.map((s) => [s.nr, []]))
  let verloren = 0
  let ohneBereich = 0
  for (const w of streams) {
    if (!w.dubRanges?.length) {
      ohneBereich++
      for (const s of plan.staffeln) je.get(s.nr)!.push({ ...structuredClone(w), ...(plan.staffeln.length > 1 ? { sharedWith: (w.sharedWith ?? 1) - 1 + plan.staffeln.length } : {}) })
      continue
    }
    const teile = plan.staffeln.flatMap((s) => {
      const b = bereicheDerStaffel(w.dubRanges!, s)
      return b.length ? [{ s, b }] : []
    })
    verloren += folgenIn(w.dubRanges) - teile.reduce((n, t) => n + folgenIn(t.b), 0)
    const hoechste = Math.max(...w.dubRanges.map((b) => b.to))
    for (const { s, b } of teile) {
      const neu: StreamLink = { ...structuredClone(w), dubRanges: b, teilBereich: { von: s.von, bis: s.bis ?? hoechste } }
      if (w.dub !== undefined) neu.dub = b.some((x) => x.dub)
      if (teile.length > 1) neu.sharedWith = (w.sharedWith ?? 1) - 1 + teile.length
      je.get(s.nr)!.push(neu)
    }
  }
  return { je, verloren, ohneBereich }
}

/**
 * TOGGO-Blöcke je Staffel über ihr Feld `staffel` (TOGGO zählt je Staffel ab 1, das ist schon unsere Zählung); andere Hinweise gehen an
 * jede Staffel. `fremd` zählt Blöcke einer Staffel, die der Plan nicht kennt (Riegel der Phase).
 */
export function teileWatchLinks(links: WatchLink[], plan: StaffelPlan): { je: Map<number, WatchLink[]>; bloecke: number; fremd: number } {
  const je = new Map<number, WatchLink[]>(plan.staffeln.map((s) => [s.nr, []]))
  const nrn = new Set(plan.staffeln.map((s) => s.nr))
  let bloecke = 0
  let fremd = 0
  for (const w of links) {
    if (!w.toggo) {
      for (const s of plan.staffeln) je.get(s.nr)!.push(structuredClone(w))
      continue
    }
    fremd += w.toggo.filter((b) => !nrn.has(b.staffel)).length
    for (const s of plan.staffeln) {
      const eigene = w.toggo.filter((b) => b.staffel === s.nr)
      bloecke += eigene.length
      if (eigene.length) je.get(s.nr)!.push({ ...structuredClone(w), toggo: structuredClone(eigene) })
    }
  }
  return { je, bloecke, fremd }
}

/** Folgen der längsten abgeschlossenen Staffel: Eine höhere Nummer kann keine Zählung innerhalb einer Staffel sein (`staffelVonTiteln`). */
export const laengsteStaffel = (plan: StaffelPlan): number => Math.max(0, ...plan.staffeln.flatMap((s) => (s.bis === undefined ? [] : [s.bis - s.von + 1])))

/** Der Tag, ab dem Meldungen zur Basis-Staffel in deren Zählung gelten: der Tag nach dem ersten ausgelieferten Bestand mit dem Schnitt (steht er schon in `titles.json`, bleibt sein Tag), nie der Tag des Merge. */
export function aktivTag(vorher: { id: number; staffelTitel?: { aktiv?: string } }[], sammel: number, heute: string): string {
  return vorher.find((t) => t.id === sammel)?.staffelTitel?.aktiv ?? addDays(heute, 1)
}

/**
 * Ein Titel je Staffel. Name „<Titel> – Staffel N“, Folgenzahl nur bei abgeschlossener Staffel; die Erstausgabe (`deErstausgabe`) gehört
 * der ersten Staffel. Die MAL-Kennung behält nur die Basis (Katalog „ohne Synchro“ und MAL-Dubletten erkennen den Sammeltitel daran).
 */
export function teileTitel(sammel: Title, plan: StaffelPlan): Title[] {
  const streams = teileStreams(sammel.streams ?? [], plan).je
  const links = teileWatchLinks(sammel.watchLinks ?? [], plan).je
  const erste = plan.staffeln[0]!.nr
  return plan.staffeln.map((s) => {
    const t: Title = structuredClone(sammel)
    t.id = s.kennung
    t.titleDe = staffelName(plan, s.nr)
    t.staffelTitel = { sammel: plan.sammel, nr: s.nr, ab: s.von, ...(s.kennung === plan.sammel && plan.aktiv ? { aktiv: plan.aktiv, laengste: laengsteStaffel(plan) } : {}) }
    if (s.kennung !== plan.sammel) {
      t.slug = `${slugify(t.titleDe)}-${s.kennung}`
      delete t.malId
    }
    if (s.bis !== undefined) t.episodes = s.bis - s.von + 1
    else delete t.episodes
    if (s.nr !== erste) delete t.deErstausgabe
    if (sammel.streams) t.streams = streams.get(s.nr)!
    if (sammel.watchLinks) t.watchLinks = links.get(s.nr)!
    return t
  })
}

type ToggoFolge = { staffel: number; folge: number; ab: string; bis: string }

/**
 * Die TOGGO-Folgen eines Titels (`data/toggo.json`, je Sammeltitel): Eine abgeleitete Staffel nimmt die Folgen, die TOGGO unter ihrer Staffelnummer
 * führt (TOGGO zählt je Staffel, wie die Yaml). Beim Sammeltitel selbst bleibt es bei allen, solange der Bau ihn nicht geschnitten hat.
 */
export function toggoFolgenDerStaffel(folgen: ToggoFolge[], t: { staffelTitel?: { sammel: number; nr: number } }): ToggoFolge[] {
  return t.staffelTitel ? folgen.filter((f) => f.staffel === t.staffelTitel!.nr) : folgen
}

/** Riegel „vorher = nachher“ für TOGGO: Jede Folge des Sammeltitels geht an genau eine Staffel, sonst bricht der Bau ab (Folge einer Staffelnummer ohne Titel). */
export function pruefeToggoVerteilung(sammel: number, vorhanden: number, verteilt: number): void {
  if (vorhanden !== verteilt) throw new Error(`Staffel-Titel ${sammel}: ${vorhanden} TOGGO-Folgen, ${verteilt} an Staffeln verteilt`)
}
