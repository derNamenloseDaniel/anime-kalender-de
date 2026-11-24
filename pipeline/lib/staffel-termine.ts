/**
 * **Staffel und Folge einer Fernsehsendung über ihren Folgentitel** (zu `pipeline/bau/staffel-folge-tv.ts`).
 *
 * tv.de und das RTL+-Programm nennen keine Folgennummer, nur den Folgentitel, und die Sender wiederholen quer durch die Staffeln
 * (Tor-Befund PR 4579, 22.11.2026: werktags Staffel 2 Folge 33–44, dann Staffel 1 ab 1; samstags Staffel 3 Folge 38–47). Staffel und
 * Folge kommen aus der Wikipedia-Episodenliste (`st` springt am Staffelwechsel auf 1); ohne eindeutigen Treffer nichts.
 */
import { folgenKern } from '../../shared/folgen-zuordnung.ts'
import type { TvSendung } from '../fetch-tv-programm.ts'
import type { WikiFolge } from './wikipedia-folgen.ts'
import { aehnlicherKern } from './tv-termine.ts'
import type { StaffelGrenzen } from './pokemon-staffeln.ts'

export type StaffelFolge = { nr: number; folge: number }
/** Folgentitel-Kern → Staffel und Folge; `ohneArtikel` ist der Rückfall über Kerne ohne führenden Artikel (nur eindeutige). */
export type FolgentitelListe = Map<string, StaffelFolge> & { ohneArtikel?: Map<string, StaffelFolge> }

/* Das TV-Programm schreibt „Ein Lied im Nebel“, die Wikipedia „Lied im Nebel“ (Horizonte S1/31, 13.11.2026). */
const ohneArtikel = (t: string): string => folgenKern(t.replace(/^\s*(?:eine[nm]?|ein|der|die|das|den|dem)\s+/i, ''))

/** Die Staffel der Yaml, in der eine durchlaufende Folge liegt. */
const staffelDerFolge = (g: StaffelGrenzen, folge: number) => g.staffeln.find((s) => folge >= s.von && (s.bis === undefined || folge <= s.bis))

/**
 * Folgentitel → Staffel und Folge aus der Wikipedia-Liste. Die Staffel zählt mit jedem Rücksprung von `st` auf 1 weiter; sie muss mit der
 * Staffel übereinstimmen, die die Yaml der durchlaufenden Position gibt (sonst sind Liste und Yaml auseinandergelaufen: wirft).
 * Ein Titel, der zweimal vorkommt, ordnet nichts zu; eine Liste ohne „Folge in der Staffel“ (`st`) auch nicht (die Staffeln wären geraten).
 */
export function staffelJeFolgentitel(folgen: WikiFolge[], g: StaffelGrenzen): FolgentitelListe {
  const aus: FolgentitelListe = new Map<string, StaffelFolge>()
  const doppelt = new Set<string>()
  const rueckfall = new Map<string, StaffelFolge>()
  const rueckfallDoppelt = new Set<string>()
  if (folgen.some((f) => f.st === undefined)) return aus
  let nr = g.staffeln[0]!.nr - 1
  folgen.forEach((f, i) => {
    if (f.st === 1 || i === 0) nr++
    const lautYaml = staffelDerFolge(g, i + 1)
    if (lautYaml && lautYaml.nr !== nr) throw new Error(`Staffeln ${g.anilistId}: Wikipedia-Folge ${i + 1} („${f.dt}“) liegt in Staffel ${nr}, die Yaml sagt ${lautYaml.nr}`)
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

export const sendeSchluessel = (sender: string, startBerlin: string): string => `${sender.toLowerCase()}|${startBerlin.slice(0, 16)}`

/** Sendeplatz (Sender und Start, Berliner Zeit) → Folgentitel, nur Sendungen des Titels. */
export function folgentitelJeSendeplatz(sendungen: TvSendung[], titel: number): Map<string, string | undefined> {
  return new Map(sendungen.filter((s) => s.titleId === titel).map((s) => [sendeSchluessel(s.sender, s.start), s.folge]))
}
