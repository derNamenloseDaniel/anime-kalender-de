/**
 * **Termine eines Sammeltitels je Staffel** (zu `staffel-titel.ts`).
 *
 * - **Fernsehen nach Folgentitel:** tv.de und das RTL+-Programm nennen keine Folgennummer, nur den Folgentitel. Die TV-Termine des
 *   Sammeltitels sind deshalb nur gezählt (`sichtungsZahl`, 1–58 bei Horizonte), und die Sender wiederholen quer durch die Staffeln
 *   (Tor-Befund PR 4579, 22.11.2026: werktags Staffel 2 Folge 33–44, dann Staffel 1 ab 1; samstags Staffel 3 Folge 38–47). Staffel und
 *   Folge kommen aus der Wikipedia-Episodenliste (`st` springt am Staffelwechsel auf 1); ohne eindeutigen Treffer bleibt der Termin ohne
 *   Folge an der Basis und wird gezählt.
 * - **Alles andere nach Folgennummer** (durchlaufend, `firstEpisodeNumber`): Der Termin wandert ganz in seine Staffel.
 * - `ev.id` bleibt immer, wie es ist: Sie ist die UID im Kalender der Abonnenten.
 */
import type { Release, ReleaseEvent } from '../../shared/types.ts'
import { folgenKern } from '../../shared/folgen-zuordnung.ts'
import type { TvSendung } from '../fetch-tv-programm.ts'
import type { WikiFolge } from './wikipedia-folgen.ts'
import { aehnlicherKern } from './tv-termine.ts'
import { staffelDerFolge, staffelName, type StaffelPlan } from './staffel-titel.ts'

export type StaffelFolge = { nr: number; folge: number }
/** Folgentitel-Kern → Staffel und Folge; `ohneArtikel` ist der Rückfall über Kerne ohne führenden Artikel (nur eindeutige). */
export type FolgentitelListe = Map<string, StaffelFolge> & { ohneArtikel?: Map<string, StaffelFolge> }

/* Das TV-Programm schreibt „Ein Lied im Nebel“, die Wikipedia „Lied im Nebel“ (Horizonte S1/31, 13.11.2026). */
const ohneArtikel = (t: string): string => folgenKern(t.replace(/^\s*(?:eine[nm]?|ein|der|die|das|den|dem)\s+/i, ''))

/**
 * Folgentitel → Staffel und Folge aus der Wikipedia-Liste. Die Staffel zählt mit jedem Rücksprung von `st` auf 1 weiter; sie muss mit der
 * Staffel übereinstimmen, die der Plan der durchlaufenden Position gibt (sonst sind Liste und Yaml auseinandergelaufen: wirft).
 * Ein Titel, der zweimal vorkommt, ordnet nichts zu; eine Liste ohne „Folge in der Staffel“ (`st`) auch nicht (die Staffeln wären geraten).
 */
export function staffelJeFolgentitel(folgen: WikiFolge[], plan: StaffelPlan): FolgentitelListe {
  const aus: FolgentitelListe = new Map<string, StaffelFolge>()
  const doppelt = new Set<string>()
  const rueckfall = new Map<string, StaffelFolge>()
  const rueckfallDoppelt = new Set<string>()
  if (folgen.some((f) => f.st === undefined)) return aus
  let nr = plan.staffeln[0]!.nr - 1
  folgen.forEach((f, i) => {
    if (f.st === 1 || i === 0) nr++
    const lautPlan = staffelDerFolge(plan, i + 1)
    if (lautPlan && lautPlan.nr !== nr) throw new Error(`Staffel-Titel ${plan.sammel}: Wikipedia-Folge ${i + 1} („${f.dt}“) liegt in Staffel ${nr}, die Yaml sagt ${lautPlan.nr}`)
    const k = folgenKern(f.dt)
    if (!k) return
    if (aus.has(k)) doppelt.add(k)
    aus.set(k, { nr, folge: f.st! })
    const o = ohneArtikel(f.dt)
    if (rueckfall.has(o)) rueckfallDoppelt.add(o)
    rueckfall.set(o, { nr, folge: f.st! })
  })
  for (const k of doppelt) aus.delete(k)
  for (const k of rueckfallDoppelt) rueckfall.delete(k)
  aus.ohneArtikel = rueckfall
  return aus
}

/**
 * Der Treffer zu einem Folgentitel der Sendung: wörtlich, sonst über die eine Schreibvariante (`aehnlicherKern`), zuletzt ohne führenden
 * Artikel auf beiden Seiten (nur eindeutig). Vorspann „Serie: “ fällt weg.
 */
export function trefferFuer(liste: FolgentitelListe, folge: string | undefined): StaffelFolge | undefined {
  if (!folge) return undefined
  const ohneVorspann = folge.replace(/^[^:]{3,60}:\s*/, '')
  const k = folgenKern(ohneVorspann)
  return liste.get(k) ?? liste.get(aehnlicherKern(liste.keys(), k) ?? '') ?? liste.get(folgenKern(folge)) ?? liste.ohneArtikel?.get(ohneArtikel(ohneVorspann))
}

const sendeSchluessel = (sender: string, startBerlin: string): string => `${sender.toLowerCase()}|${startBerlin.slice(0, 16)}`

/** Sendeplatz (Sender und Start, Berliner Zeit) → Folgentitel, nur Sendungen des Sammeltitels. */
export function folgentitelJeSendeplatz(sendungen: TvSendung[], sammel: number): Map<string, string | undefined> {
  return new Map(sendungen.filter((s) => s.titleId === sammel).map((s) => [sendeSchluessel(s.sender, s.start), s.folge]))
}

export type Ziel = { nr: number; folge?: number }

/**
 * Wohin ein Termin gehört. Gesichtete TV-Termine nach ihrem Folgentitel (ohne Treffer: Basis, ohne Folge); alles andere nach der
 * durchlaufenden Folge (`episode`, sonst `firstEpisodeNumber` bzw. 1 des Release).
 */
export function zielDesTermins(
  ev: ReleaseEvent,
  r: Release | undefined,
  plan: StaffelPlan,
  sendeplatz: Map<string, string | undefined>,
  jeTitel: FolgentitelListe,
): Ziel | undefined {
  if (ev.platform === 'tv' && ev.sichtung) {
    const t = trefferFuer(jeTitel, sendeplatz.get(sendeSchluessel(ev.sender ?? '', `${ev.date}T${ev.time ?? ''}`)))
    return t ? { nr: t.nr, folge: t.folge } : undefined
  }
  const n = ev.episode ?? r?.schedule?.firstEpisodeNumber ?? 1
  const s = staffelDerFolge(plan, n)
  return s ? { nr: s.nr, ...(ev.episode !== undefined ? { folge: n - s.von + 1 } : {}) } : undefined
}

export type TerminTeilung = { releases: Release[]; events: ReleaseEvent[]; ohneTreffer: number; vorher: number; nachher: number }

const gruppenSlug = (r: Release, plan: StaffelPlan, kennung: number): string => {
  if (kennung === plan.sammel) return r.slug
  const auto = `auto-${plan.sammel}-`
  return r.slug.startsWith(auto) ? `auto-${kennung}-${r.slug.slice(auto.length)}` : `${r.slug}-s${plan.staffeln.find((s) => s.kennung === kennung)!.nr}`
}

/**
 * Teilt Termine und Releases des Sammeltitels. Je (Release, Staffel) entsteht ein Release mit eigenem Slug (die Basis behält ihn) und
 * neu gebildetem Plan aus seinen Terminen (`staffelRelease`); andere Titel bleiben unberührt. `vorher`/`nachher` zählen die Termine für den Riegel.
 */
export function teileTermine(
  releases: Release[],
  events: ReleaseEvent[],
  plan: StaffelPlan,
  sendeplatz: Map<string, string | undefined>,
  jeTitel: FolgentitelListe,
): TerminTeilung {
  const jeSlug = new Map(releases.filter((r) => r.titleId === plan.sammel).map((r) => [r.slug, r]))
  const basis = plan.staffeln.find((s) => s.nr === plan.basis)!
  const gruppen = new Map<string, { r: Release; kennung: number; nr: number; events: ReleaseEvent[] }>()
  let ohneTreffer = 0
  const neueEvents = events.map((ev) => {
    if (ev.titleId !== plan.sammel) return ev
    const r = jeSlug.get(ev.releaseSlug)
    const ziel = zielDesTermins(ev, r, plan, sendeplatz, jeTitel)
    if (!ziel) ohneTreffer++
    const s = ziel ? plan.staffeln.find((x) => x.nr === ziel.nr)! : basis
    const neu: ReleaseEvent = { ...ev, titleId: s.kennung, name: staffelName(plan, s.nr) }
    delete neu.staffelFolge
    if (ziel?.folge !== undefined) neu.episode = ziel.folge
    else delete neu.episode
    if (r) {
      neu.releaseSlug = gruppenSlug(r, plan, s.kennung)
      const g = gruppen.get(neu.releaseSlug) ?? { r, kennung: s.kennung, nr: s.nr, events: [] }
      g.events.push(neu)
      gruppen.set(neu.releaseSlug, g)
    }
    return neu
  })
  const neueReleases = releases.flatMap((r) => {
    if (r.titleId !== plan.sammel) return [r]
    const eigene = [...gruppen.values()].filter((g) => g.r === r)
    /* Ein Release ohne Termine (abgelaufen, gesperrt) bleibt an der Staffel seiner ersten Folge. */
    if (!eigene.length) return [ohneTermine(r, plan)]
    return eigene.map((g) => staffelRelease(g.r, g.events, plan, g.kennung, g.nr, jeTitel))
  })
  /* Riegel-Zahl: Termine einer Staffel, deren Release es nach der Teilung gibt. */
  const kennungen = new Set(plan.staffeln.map((s) => s.kennung))
  const slugs = new Set(neueReleases.map((r) => r.slug))
  return {
    releases: neueReleases,
    events: neueEvents,
    ohneTreffer,
    vorher: events.filter((e) => e.titleId === plan.sammel).length,
    nachher: neueEvents.filter((e) => kennungen.has(e.titleId) && slugs.has(e.releaseSlug)).length,
  }
}

function ohneTermine(r: Release, plan: StaffelPlan): Release {
  const s = staffelDerFolge(plan, r.schedule?.firstEpisodeNumber ?? 1) ?? plan.staffeln.find((x) => x.nr === plan.basis)!
  const neu: Release = { ...structuredClone(r), titleId: s.kennung, slug: gruppenSlug(r, plan, s.kennung) }
  if (neu.schedule?.firstEpisodeNumber !== undefined) verschiebeErsteFolge(neu, s.von)
  return neu
}

function verschiebeErsteFolge(r: Release, von: number): void {
  const n = r.schedule.firstEpisodeNumber! - von + 1
  if (n === 1) delete r.schedule.firstEpisodeNumber
  else r.schedule.firstEpisodeNumber = n
}

/**
 * Das Release einer Staffel aus seinen Terminen. Kein TV-Termin: dasselbe Release, erste Folge in Staffelzählung. Gesichtetes Fernsehen:
 * Beobachtungen, Uhrzeiten und Folgenzahl neu aus den Terminen der Staffel (wie `releasesAusTvProgramm`, nur mit belegten Nummern).
 */
export function staffelRelease(
  r: Release,
  events: ReleaseEvent[],
  plan: StaffelPlan,
  kennung: number,
  nr: number,
  jeTitel: FolgentitelListe,
): Release {
  const s = plan.staffeln.find((x) => x.nr === nr)!
  const neu: Release = { ...structuredClone(r), slug: events[0]!.releaseSlug, titleId: kennung }
  if (!(r.platform === 'tv' && events.every((e) => e.sichtung))) {
    if (neu.schedule?.firstEpisodeNumber !== undefined) verschiebeErsteFolge(neu, s.von)
    return neu
  }
  const sortiert = [...events].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
  const mitFolge = sortiert.filter((e) => e.episode !== undefined)
  const observed: Record<number, string> = {}
  const zeiten: Record<number, string> = {}
  for (const e of mitFolge) {
    if (observed[e.episode!]) continue
    observed[e.episode!] = e.date
    if (e.time) zeiten[e.episode!] = e.time
  }
  const nrn = Object.keys(observed).map(Number)
  const ab = nrn.length ? Math.min(...nrn) : 1
  const anzahl = nrn.length ? Math.max(...nrn) - ab + 1 : sortiert.length
  const eineZeit = new Set(Object.values(zeiten)).size === 1 ? Object.values(zeiten)[0] : undefined
  neu.name = staffelName(plan, nr)
  neu.schedule = {
    firstEpisodeDate: sortiert[0]!.date,
    ...(eineZeit ? { time: eineZeit } : nrn.length ? { zeiten } : {}),
    ...(ab > 1 ? { firstEpisodeNumber: ab } : {}),
    episodeCount: anzahl,
    episodeCountAssumed: true,
    episodeCountNurGesichtet: true,
    ...(nrn.length ? { observed } : {}),
  }
  neu.tvLetzteSichtung = sortiert.at(-1)!.date
  if (mitFolge.length === sortiert.length) neu.folgenBelegt = true
  else delete neu.folgenBelegt
  if (neu.herkunft) neu.herkunft = neu.herkunft.replace(/\(\d+ Sendungen gesichtet\)/, `(${sortiert.length} Sendungen gesichtet)`)
  if (mitFolge.length) {
    neu.herkunft = `${neu.herkunft ?? ''} Staffel und Folge aus der Episodenliste der Wikipedia.`.trim()
    if (plan.quelle && !neu.sources?.includes(plan.quelle)) neu.sources = [...(neu.sources ?? []), plan.quelle]
  }
  if (r.sendungen) neu.sendungen = sendungenDerStaffel(r.sendungen, nr, kennung === plan.sammel, jeTitel)
  return neu
}

/** Die angehängten Sendungen (ab gestern) der Staffel, `nr` in Staffelzählung; Sendungen ohne Treffer bleiben ohne Nummer bei der Basis. */
function sendungenDerStaffel(
  liste: NonNullable<Release['sendungen']>,
  nr: number,
  istBasis: boolean,
  jeTitel: FolgentitelListe,
): NonNullable<Release['sendungen']> {
  return liste.flatMap((s) => {
    const t = trefferFuer(jeTitel, s.folge)
    if (t) return t.nr === nr ? [{ ...s, nr: t.folge }] : []
    if (!istBasis) return []
    const { nr: _alt, ...ohneNr } = s
    return [ohneNr]
  })
}
