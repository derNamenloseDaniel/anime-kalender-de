/**
 * **Staffel und Folge an Fernsehterminen** (F157, 24.11.2026): Die Kalenderkarte sagt bei Horizonte „Staffel 3 · Folge 38“ statt „Folge 127“.
 *
 * Nur über den Folgentitel der Sendung gegen die Wikipedia-Episodenliste (`pipeline/lib/staffel-termine.ts`): Die Sender wiederholen quer
 * durch die Staffeln, und tv.de nennt keine Nummer. Ohne eindeutigen Treffer, oder wenn der Treffer der Folgennummer des Termins
 * widerspricht, bleibt der Termin ohne `staffelFolge` (gezählt): eine falsche Staffel darf nie entstehen. Nur Titel aus
 * `data/curated/horizonte-staffeln.yaml`; Nicht-TV-Termine rechnet `staffel-folge-termine.ts` aus der Nummer.
 */
import type { ReleaseEvent } from '../../shared/types.ts'
import type { TvSendung } from '../fetch-tv-programm.ts'
import { HORIZONTE_STAFFELN, ladeStaffelGrenzen, type StaffelGrenzen } from '../lib/pokemon-staffeln.ts'
import { folgentitelJeSendeplatz, sendeSchluessel, staffelJeFolgentitel, trefferFuer } from '../lib/staffel-termine.ts'
import type { StaffelPlan } from '../lib/staffel-titel.ts'
import type { WikiListen } from '../lib/tv-termine.ts'
import { log, readJson, warn } from '../lib/util.ts'

export type TvStaffelEingaben = { grenzen: StaffelGrenzen[]; sendungen: TvSendung[]; wiki: WikiListen }
export type TvStaffelZaehlung = { mit: number; ohneTreffer: number; widerspruch: number }

export function ladeTvStaffelEingaben(): TvStaffelEingaben {
  return {
    grenzen: ladeStaffelGrenzen(HORIZONTE_STAFFELN),
    sendungen: Object.values(readJson<{ sendungen?: Record<string, TvSendung> }>('data/tv-programm.json', {}).sendungen ?? {}),
    wiki: readJson<{ titel?: WikiListen }>('data/wikipedia-folgen.json', {}).titel ?? {},
  }
}

/** Die Grenzen in der Form, die `staffelJeFolgentitel` liest (Staffeln mit `von`/`bis` in durchlaufender Zählung). */
const planAus = (g: StaffelGrenzen): StaffelPlan => ({
  sammel: g.anilistId,
  titel: g.titel ?? String(g.anilistId),
  basis: g.staffeln[0]!.nr,
  staffeln: g.staffeln.map((s) => ({ nr: s.nr, von: s.von, ...(s.bis !== undefined ? { bis: s.bis } : {}), kennung: g.anilistId })),
})

/** Schreibt `staffelFolge` an jeden Fernsehtermin der Titel mit Grenzen, dessen Folgentitel eindeutig einer Staffel zugeordnet ist. */
export function schreibeTvStaffelFolgen(events: ReleaseEvent[], { grenzen, sendungen, wiki }: TvStaffelEingaben): TvStaffelZaehlung {
  const z: TvStaffelZaehlung = { mit: 0, ohneTreffer: 0, widerspruch: 0 }
  for (const g of grenzen) {
    const plan = planAus(g)
    const liste = staffelJeFolgentitel(wiki[String(g.anilistId)]?.folgen ?? [], plan)
    const sendeplatz = folgentitelJeSendeplatz(sendungen, g.anilistId)
    for (const ev of events) {
      if (ev.titleId !== g.anilistId || ev.platform !== 'tv') continue
      const t = trefferFuer(liste, sendeplatz.get(sendeSchluessel(ev.sender ?? '', `${ev.date}T${ev.time ?? ''}`)))
      const s = t && plan.staffeln.find((x) => x.nr === t.nr)
      if (!t || !s) z.ohneTreffer++
      else if (ev.episode !== undefined && ev.episode !== s.von - 1 + t.folge) z.widerspruch++
      else {
        ev.staffelFolge = [t.nr, t.folge]
        z.mit++
      }
    }
  }
  return z
}

/** Eine Logzeile; Termine ohne Staffel werden als Warnung gezählt (Skill `stille-ausfaelle-verhindern`). */
export function meldeTvStaffelFolgen(z: TvStaffelZaehlung): void {
  const text = `Staffel und Folge im Fernsehen: ${z.mit} Termine, ${z.ohneTreffer} ohne eindeutigen Folgentitel, ${z.widerspruch} im Widerspruch zur Folgennummer (beide ohne Staffel)`
  if (z.ohneTreffer + z.widerspruch) warn(text)
  else log(text)
}
