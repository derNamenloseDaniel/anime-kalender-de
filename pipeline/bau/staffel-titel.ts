/**
 * **Phase Staffel-Titel**: schneidet einen AniList-Sammeltitel in einen Titel je deutscher Staffel (`pipeline/lib/staffel-titel.ts`).
 *
 * Steht nach `schliesseWegeAb`/`stelleZurueck` und vor `baueMeta`: Bis hierhin laufen Quellen, Handbelege und Zuordnung gegen den
 * Sammeltitel (eine Kennung je Anime), danach sieht die Auslieferung nur noch normale Titel. Ohne `basis` in der Yaml geschieht nichts.
 *
 * **Riegel „vorher = nachher“** (Skill `stille-ausfaelle-verhindern`): Termine (samt unveränderter `ev.id`), Folgen der Wege und
 * TOGGO-Blöcke müssen nach dem Schnitt vollständig da sein, sonst bricht der Bau ab. TV-Termine ohne Folgentitel-Treffer bleiben an der
 * Basis und werden als Warnung gezählt.
 */
import type { Release, ReleaseEvent, Title } from '../../shared/types.ts'
import type { TvSendung } from '../fetch-tv-programm.ts'
import { ladeStaffelGrenzen } from '../lib/pokemon-staffeln.ts'
import { staffelPlaene, teileStreams, teileTitel, teileWatchLinks, type StaffelPlan } from '../lib/staffel-titel.ts'
import { folgentitelJeSendeplatz, staffelJeFolgentitel, teileTermine } from '../lib/staffel-termine.ts'
import type { WikiListen } from '../lib/tv-termine.ts'
import { log, readJson, warn } from '../lib/util.ts'

/** Der Sammeltitel vor dem Schnitt samt seinen Releases: Die Folgenliste (`folgen-dateien.ts`) wird über ihn gebaut und danach geteilt. */
export type StaffelSammel = { plan: StaffelPlan; titel: Title; releases: Release[] }

export type StaffelEingaben = { plaene: StaffelPlan[]; sendungen: TvSendung[]; wiki: WikiListen }

export function ladeStaffelEingaben(): StaffelEingaben {
  const plaene = staffelPlaene(ladeStaffelGrenzen())
  if (!plaene.length) return { plaene, sendungen: [], wiki: {} }
  return {
    plaene,
    sendungen: Object.values(readJson<{ sendungen?: Record<string, TvSendung> }>('data/tv-programm.json', {}).sendungen ?? {}),
    wiki: readJson<{ titel?: WikiListen }>('data/wikipedia-folgen.json', {}).titel ?? {},
  }
}

const wikiAdresse = (seite: string): string => `https://de.wikipedia.org/wiki/${encodeURI(seite.replace(/ /g, '_'))}`

/** TOGGO-Blöcke eines Titels (Riegel). */
function toggoBloecke(t: Title): number {
  return (t.watchLinks ?? []).reduce((n, w) => n + (w.toggo?.length ?? 0), 0)
}

/** Bricht ab, wenn der Schnitt etwas verloren hat; `fehler` nennt jede Abweichung. */
export function pruefeSchnitt(name: string, z: { termineVorher: number; termineNachher: number; idsGleich: boolean; wegeVerloren: number; bloeckeVorher: number; bloeckeNachher: number; fremdeBloecke: number }): void {
  const fehler = [
    z.termineVorher !== z.termineNachher && `Termine ${z.termineVorher} vorher, ${z.termineNachher} nachher`,
    !z.idsGleich && 'Termin-Kennungen (ev.id) geändert',
    z.wegeVerloren !== 0 && `${z.wegeVerloren} Folgen der Wege in keiner Staffel`,
    z.bloeckeVorher !== z.bloeckeNachher && `TOGGO-Blöcke ${z.bloeckeVorher} vorher, ${z.bloeckeNachher} nachher`,
    z.fremdeBloecke !== 0 && `${z.fremdeBloecke} TOGGO-Blöcke einer unbekannten Staffel`,
  ].filter(Boolean)
  if (fehler.length) throw new Error(`Staffel-Titel ${name}: ${fehler.join('; ')}`)
}

/** Schneidet einen Sammeltitel; ersetzt ihn in `titles`, `releases` und `events` an Ort und Stelle. */
export function teileEinenSammeltitel(
  plan: StaffelPlan,
  { titles, releases, events }: { titles: Map<number, Title>; releases: Release[]; events: ReleaseEvent[] },
  eingaben: Omit<StaffelEingaben, 'plaene'>,
): StaffelSammel | undefined {
  const sammel = titles.get(plan.sammel)
  if (!sammel) {
    log(`Staffel-Titel ${plan.sammel}: nicht im Bau, nichts geteilt`)
    return undefined
  }
  const wiki = eingaben.wiki[String(plan.sammel)]
  const mitQuelle: StaffelPlan = wiki && !wiki.url ? { ...plan, quelle: wikiAdresse(wiki.seite) } : plan
  const vorher = { titel: structuredClone(sammel), releases: structuredClone(releases.filter((r) => r.titleId === plan.sammel)) }
  const idsVorher = events.filter((e) => e.titleId === plan.sammel).map((e) => e.id)
  const teil = teileTermine(releases, events, mitQuelle, folgentitelJeSendeplatz(eingaben.sendungen, plan.sammel), staffelJeFolgentitel(wiki?.folgen ?? [], plan))
  const kennungen = new Set(plan.staffeln.map((s) => s.kennung))
  const idsNachher = new Set(teil.events.filter((e) => kennungen.has(e.titleId)).map((e) => e.id))
  const neu = teileTitel(sammel, mitQuelle)
  pruefeSchnitt(plan.titel, {
    termineVorher: teil.vorher,
    termineNachher: teil.nachher,
    idsGleich: idsVorher.length === idsNachher.size && idsVorher.every((id) => idsNachher.has(id)),
    wegeVerloren: teileStreams(sammel.streams ?? [], plan).verloren,
    bloeckeVorher: toggoBloecke(sammel),
    bloeckeNachher: neu.reduce((n, t) => n + toggoBloecke(t), 0),
    fremdeBloecke: teileWatchLinks(sammel.watchLinks ?? [], plan).fremd,
  })
  releases.splice(0, releases.length, ...teil.releases)
  events.splice(0, events.length, ...teil.events)
  ersetzeAnOrt(titles, plan.sammel, neu)
  const meld = teil.ohneTreffer ? warn : log
  meld(`Staffel-Titel ${plan.titel}: ${neu.length} Titel, ${teil.vorher} Termine, ${teil.ohneTreffer} TV-Termine ohne Folgentitel-Treffer (bleiben ohne Folge an der Basis)`)
  return { plan: mitQuelle, ...vorher }
}

/** Ersetzt einen Eintrag der Map durch mehrere an seiner Stelle: Die Reihenfolge der übrigen Titel (und damit der Ausgabe) bleibt. */
function ersetzeAnOrt(titles: Map<number, Title>, alt: number, neu: Title[]): void {
  const eintraege = [...titles.entries()]
  titles.clear()
  for (const [id, t] of eintraege) {
    if (id !== alt) titles.set(id, t)
    else for (const n of neu) titles.set(n.id, n)
  }
}

/** Die Phase: jeder Sammeltitel mit `basis` in der Yaml. Gibt die Sammeltitel vor dem Schnitt zurück (für die Folgenlisten). */
export function teileStaffelTitel(
  bau: { titles: Map<number, Title>; releases: Release[]; events: ReleaseEvent[] },
  eingaben: StaffelEingaben = ladeStaffelEingaben(),
): StaffelSammel[] {
  return eingaben.plaene.flatMap((plan) => {
    const s = teileEinenSammeltitel(plan, bau, eingaben)
    return s ? [s] : []
  })
}
