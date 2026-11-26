import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import yaml from 'js-yaml'
import type { Title } from '../../shared/types.ts'
import { log, readJson, ROOT, warn } from '../lib/util.ts'
import type { SprecherDatei } from '../lib/wikipedia-sprecher-sammeln.ts'
import { wikipediaAdresse } from '../lib/wikipedia-sprecher-seite.ts'
import type { SprecherZeile } from '../lib/wikipedia-sprecher.ts'
import { VOICES_DIR } from './grundlagen.ts'
import type { Rolle } from './sprecher-zusammen.ts'

/**
 * Bauphase „Sprecher aus de.wikipedia“ (26.11.2026), nach der aniSearch-Besetzung: Titel der Handliste
 * `data/wikipedia-sprecher-seiten.yaml` bekommen die Tabelle ihrer Seite aus `data/wikipedia-sprecher.json`
 * (Sammler `fetch-wikipedia-sprecher.ts`), aber nur, wo keine andere Quelle Rollen führt — Wikipedia füllt Lücken.
 * Wiederholbar: Rollen `von: 'wikipedia'` werden jedes Mal neu abgeleitet.
 *
 * `unsicher` (Tabelle nennt den Film, das Special oder die Staffel nicht): die Rollen stehen mit diesem Grund im
 * Vermerk `wikipedia.unsicher` und ≈ in der Anzeige, und nur, wenn die deutsche Fassung schon anderweitig belegt ist —
 * eine vermutete Besetzung belegt nie eine Synchro (`hasVoices` zählt dafür in `shared/saison.ts`).
 */
export const HANDLISTE = 'data/wikipedia-sprecher-seiten.yaml'
export const SAMMLUNG = 'data/wikipedia-sprecher.json'

export interface WikipediaZiel {
  id: number
  seite: string
  fassung?: string
  unsicher?: string
}

export interface WikipediaVermerk {
  seite: string
  url: string
  unsicher?: string
}

export interface VoiceDatei {
  titleId: number
  updatedAt: string
  roles: Rolle[]
  annUrl?: string
  wikipedia?: WikipediaVermerk
}

export interface Zaehlung {
  titel: number
  unsicher: number
  /** Ziel hat schon Rollen aus aniSearch, AniList oder ANN. */
  andereQuelle: number
  /** `unsicher`, aber die Synchro ist nicht anderweitig belegt. */
  ohneSynchroBeleg: number
  /** Seite nicht gesammelt, ohne deutsche Spalte oder ohne Stimme der Fassung. */
  ohneRollen: number
  ohneTitel: number
}

export function zieleAusHandliste(liste: { seite: string; titel: Omit<WikipediaZiel, 'seite'>[] }[]): WikipediaZiel[] {
  return liste.flatMap((e) => e.titel.map((t) => ({ ...t, seite: e.seite })))
}

/** Rollen eines Ziels: nur Stimmen seiner Fassung; ein weiterer Zusatz („ab Staffel 3“) bleibt am Namen. */
export function rollenFuer(zeilen: SprecherZeile[], fassung?: string): Rolle[] {
  const aus: Rolle[] = []
  const gesehen = new Set<string>()
  for (const z of zeilen) {
    for (const d of z.deutsch) {
      if (fassung && !d.zusatz?.includes(fassung)) continue
      const rest = (d.zusatz ?? '').replace(fassung ?? '', '').replace(/^[,\s]+|[,\s]+$/g, '')
      const actor = rest ? `${d.sprecher} (${rest})` : d.sprecher
      if (gesehen.has(`${z.rolle}|${actor}`)) continue
      gesehen.add(`${z.rolle}|${actor}`)
      aus.push({ character: z.rolle, actor, von: 'wikipedia' })
    }
  }
  return aus
}

const synchroBelegt = (t: Title): boolean => Boolean(t.streams?.some((s) => s.dub === true && !s.dubAbgeleitet) || t.deErstausgabe?.synchro)

/** Neuer Stand der Datei eines Titels; undefined = keine Datei nötig. */
export function wendeAn(datei: VoiceDatei | undefined, ziel: WikipediaZiel | undefined, rollen: Rolle[], belegt: boolean, stand: string): VoiceDatei | undefined {
  const andere = (datei?.roles ?? []).filter((r) => r.von !== 'wikipedia')
  let basis: VoiceDatei | undefined
  if (datei) {
    const { wikipedia: _alt, ...rest } = datei
    basis = { ...rest, roles: andere }
  }
  if (!ziel || andere.length || !rollen.length || (ziel.unsicher && !belegt)) return basis
  const vermerk: WikipediaVermerk = { seite: ziel.seite, url: wikipediaAdresse(ziel.seite), ...(ziel.unsicher ? { unsicher: ziel.unsicher } : {}) }
  return { ...(basis ?? { titleId: ziel.id, updatedAt: stand }), roles: rollen, wikipedia: vermerk }
}

function liesDatei(id: number): VoiceDatei | undefined {
  const pfad = `${VOICES_DIR}/${id}.json`
  if (!existsSync(pfad)) return undefined
  try {
    return JSON.parse(readFileSync(pfad, 'utf8')) as VoiceDatei
  } catch (e) {
    warn(`Sprecher aus Wikipedia: ${pfad} unlesbar (${e instanceof Error ? e.message : String(e)}), wird neu geschrieben`)
    return undefined
  }
}

/** Ids, deren Datei noch Wikipedia-Rollen trägt (aus der Handliste gefallene Ziele räumen). */
function idsMitWikipedia(): number[] {
  if (!existsSync(VOICES_DIR)) return []
  return readdirSync(VOICES_DIR)
    .filter((n) => n.endsWith('.json') && readFileSync(`${VOICES_DIR}/${n}`, 'utf8').includes('"wikipedia"'))
    .map((n) => Number(n.slice(0, -5)))
}

/** Schreibt die Wikipedia-Rollen; Rückgabe: Titel mit Rollen danach (ergänzt `mitStimmen`). */
export function ergaenzeWikipediaSprecher({ titles, mitStimmen }: { titles: Map<number, Title>; mitStimmen: Set<number> }): { mitStimmen: Set<number>; zaehlung: Zaehlung } {
  const ziele = zieleAusHandliste(yaml.load(readFileSync(join(ROOT, HANDLISTE), 'utf8')) as Parameters<typeof zieleAusHandliste>[0])
  const sammlung = readJson<SprecherDatei>(SAMMLUNG, { seiten: {} })
  const jeId = new Map(ziele.map((z) => [z.id, z]))
  const z: Zaehlung = { titel: 0, unsicher: 0, andereQuelle: 0, ohneSynchroBeleg: 0, ohneRollen: 0, ohneTitel: 0 }
  const aus = new Set(mitStimmen)
  for (const id of new Set([...jeId.keys(), ...idsMitWikipedia()])) {
    const t = titles.get(id)
    const ziel = jeId.get(id)
    if (!t) {
      if (ziel) z.ohneTitel++
      continue
    }
    const seite = ziel ? sammlung.seiten[ziel.seite] : undefined
    const rollen = ziel && seite ? rollenFuer(seite.zeilen, ziel.fassung) : []
    const datei = liesDatei(id)
    const neu = wendeAn(datei, ziel, rollen, synchroBelegt(t), seite?.abgerufen ?? '')
    if (neu && JSON.stringify(neu) !== JSON.stringify(datei)) writeFileSync(`${VOICES_DIR}/${id}.json`, JSON.stringify(neu))
    if (neu?.roles.length) aus.add(id)
    else aus.delete(id)
    if (!ziel) continue
    if (neu?.wikipedia) {
      z.titel++
      if (neu.wikipedia.unsicher) z.unsicher++
    } else if (neu?.roles.length) z.andereQuelle++
    else if (rollen.length) z.ohneSynchroBeleg++
    else z.ohneRollen++
  }
  log(
    `Sprecher aus Wikipedia: ${z.titel} Titel (${z.unsicher} ≈ unsicher); übergangen: ${z.andereQuelle} mit anderer Quelle, ` +
      `${z.ohneSynchroBeleg} unsicher ohne Synchrobeleg, ${z.ohneRollen} ohne Rollen, ${z.ohneTitel} ohne Titel`,
  )
  return { mitStimmen: aus, zaehlung: z }
}
