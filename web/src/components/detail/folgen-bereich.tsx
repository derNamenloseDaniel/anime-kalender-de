import { useEffect, useState, type ReactNode } from 'react'
import { loadJson } from '../../lib/data.ts'
import { gemerkt } from '../../lib/lade-neuversuch.ts'
import { Tooltip } from '../ui.tsx'
import { DeFlaggeZeichen } from '../de-flagge.tsx'
import { folgeIstDeutsch } from './stream-bereiche.ts'
import { SERIENBELEG_HINWEIS, serienbelegOhneFolgenbeleg } from '@shared/folgen-flagge.ts'
import { staffelAbschnitte, staffelZeile, type StaffelZeile } from './folgen-staffeln.ts'
import type { FolgenZaehlung } from './antwort-regeln.ts'
import { staffelZiele, type StaffelZiel } from '../../lib/staffel-ziele.ts'
import { todayIso } from '@shared/time.ts'
import type { Release } from '@shared/types.ts'
import { abschnittZeile, reiterVon, startReiter } from './staffel-reiter-liste.ts'
import { StaffelAbschnitt } from './staffel-abschnitt.tsx'

/**
 * **Die Folgenliste im Antwortkasten** (Daniel, 04.10.2026): Ein Pfeil klappt sie auf, der Kasten wächst mit,
 * höchstens 16 rem hoch und mit Bildlauf. Ab 50 Folgen gibt es Reiter in 50er-Paketen („1–50", „51–100" …), damit
 * One Piece nicht als eine Wand dasteht. Jede Folge steht in einer Zeile: Nummer, Titel, und die deutsche Flagge,
 * wo für diese Folge eine Synchro belegt ist. Die Minuten stehen einmal am Kopf („~24 Min. je Folge"), solange alle
 * Folgen gleich lang sind; sonst je Zeile.
 *
 * Die Daten kommen nachgeladen aus `public/data/folgen/<AniList-ID>.json` (`pipeline/bau/folgen-dateien.ts`);
 * den Pfeil gibt es nur, wo eine Datei existiert (Verzeichnis `index.json`).
 */
type Folge = [nr: number, titel: string, minuten?: number]
interface Liste {
  f: Folge[]
  de: [number, number][]
  min?: number
  h?: [number, string][]
  /** Deutsche Staffelgrenzen (`folgen-staffeln.ts`): Reiter je Staffel statt Paketen. */
  s?: StaffelZeile[]
  /** Staffelnamen wörtlich aus `data/curated/*-staffeln.yaml`: `{ "1": "…" }`, nur für Staffeln mit Namen. */
  sn?: Record<string, string>
  /** TOGGO-Seite je Staffel: `[Staffelnummer, Adresse]`. */
  tg?: [number, string][]
}

const PAKET = 50
let verzeichnis: Promise<Set<number>> | undefined
const holeVerzeichnis = (): Promise<Set<number>> => (verzeichnis ??= loadJson<number[]>('folgen/index.json').then((l) => new Set(l)).catch(() => new Set<number>()))
/** Ein Abruf je Titel: Folgenkasten und Anbieterzeilen (Staffelgrenzen) lesen dieselbe Datei. */
const holeListe = (titleId: number): Promise<Liste> => gemerkt(`folgen/${titleId}`, () => loadJson<Liste>(`folgen/${titleId}.json`))

/** Gibt es zu diesem Titel eine Folgenliste? Erst nach dem Laden des Verzeichnisses `true`; wer die Liste als Inhalt braucht (leerer Kasten), fragt hier. */
export function useHatFolgenListe(titleId: number): boolean {
  const [gibtEs, setGibtEs] = useState(false)
  useEffect(() => {
    let aktiv = true
    setGibtEs(false)
    void holeVerzeichnis().then((s) => aktiv && setGibtEs(s.has(titleId)))
    return () => {
      aktiv = false
    }
  }, [titleId])
  return gibtEs
}

/** Die deutschen Staffelgrenzen des Titels (`s` der Folgenliste) für die Anbieterzeilen; ohne Liste oder Grenzen nichts. */
export function useStaffelGrenzen(titleId: number): StaffelZeile[] | undefined {
  const [s, setS] = useState<StaffelZeile[]>()
  useEffect(() => {
    setS(undefined)
    let aktiv = true
    /* Das Verzeichnis im selben Effekt fragen: ein Zustand „Liste da“ des vorigen Titels löste sonst beim Wechsel einen Abruf ohne Datei aus.
       Ohne Datei bleibt die Zeile bei der durchgehenden Zählung; den Fehler zeigt der Folgenkasten selbst. */
    void holeVerzeichnis()
      .then((v) => (v.has(titleId) ? holeListe(titleId) : undefined))
      .then((l) => aktiv && setS(l?.s))
      .catch(() => aktiv && setS(undefined))
    return () => {
      aktiv = false
    }
  }, [titleId])
  return s
}

/** Die TOGGO-Seiten je Staffel (`tg` der Folgenliste), solange sie verschieden sind; ohne Liste oder bei einer Adresse nichts. */
export function useStaffelZiele(titleId: number): StaffelZiel[] | undefined {
  const [ziele, setZiele] = useState<StaffelZiel[]>()
  useEffect(() => {
    setZiele(undefined)
    let aktiv = true
    void holeVerzeichnis()
      .then((v) => (v.has(titleId) ? holeListe(titleId) : null))
      .then((l) => aktiv && setZiele(l ? staffelZiele(l.tg) : undefined))
      .catch(() => aktiv && setZiele(undefined))
    return () => {
      aktiv = false
    }
  }, [titleId])
  return ziele
}

let zaehlungen: Promise<Record<string, FolgenZaehlung>> | undefined
/** `[alle Folgen, Folgen mit deutscher Synchro]` aus `folgen/zaehlung.json` — für die Überschrift, wo AniList keine Folgenzahl führt. */
export function useFolgenZaehlung(titleId: number): FolgenZaehlung | undefined {
  const [z, setZ] = useState<FolgenZaehlung>()
  useEffect(() => {
    let aktiv = true
    setZ(undefined)
    void (zaehlungen ??= loadJson<Record<string, FolgenZaehlung>>('folgen/zaehlung.json').catch(() => ({} as Record<string, FolgenZaehlung>))).then((m) => aktiv && setZ(m[String(titleId)]))
    return () => {
      aktiv = false
    }
  }, [titleId])
  return z
}

/** Zahl und Staffelgrenzen für den Kopf des Antwort-Kastens: Sammeltitel mit laufender Staffel zählen dort je Staffel (`offeneStaffelText`). */
export function useKopfZahlen(titleId: number): { folgenZahl: FolgenZaehlung | undefined; staffeln: StaffelZeile[] | undefined } {
  return { folgenZahl: useFolgenZaehlung(titleId), staffeln: useStaffelGrenzen(titleId) }
}

const HUELLE = 'mt-2 border-t border-ak-rand pt-1.5 text-t4 text-ak-text'

/**
 * `laufzeitImKopf`: Die Laufzeit steht schon im Kopf des Panels — dann nicht noch einmal (mit anderem Wert) im Kasten.
 * Ab zwei Staffeln in `s` stehen Reiter an einer Abschnittsbox (F157, `staffel-abschnitt.tsx`); `releases` und `today` geben ihre Lage.
 */
export function FolgenBereich({ titleId, wege, erschienen, laufzeitImKopf, serieBelegt, releases = [], today = todayIso() }: { titleId: number; wege: { from: number; to: number }[]; erschienen?: number; laufzeitImKopf?: boolean; serieBelegt?: boolean; releases?: Release[]; today?: string }) {
  const [gibtEs, setGibtEs] = useState(false)
  const [offen, setOffen] = useState(false)
  const [liste, setListe] = useState<Liste>()
  const [paket, setPaket] = useState(0)
  const [wahl, setWahl] = useState<number>()
  useEffect(() => {
    let aktiv = true
    setGibtEs(false)
    setOffen(false)
    setListe(undefined)
    setPaket(0)
    setWahl(undefined)
    void holeVerzeichnis().then((s) => aktiv && setGibtEs(s.has(titleId)))
    return () => {
      aktiv = false
    }
  }, [titleId])
  useEffect(() => {
    if (!gibtEs || liste) return
    let aktiv = true
    void holeListe(titleId).then((l) => aktiv && setListe(l)).catch(() => aktiv && setListe({ f: [], de: [] }))
    return () => {
      aktiv = false
    }
  }, [gibtEs, liste, titleId])
  if (!gibtEs) return null
  const folgen = liste?.f
  const ohneTitel = folgen !== undefined && folgen.length > 0 && folgen.every(([, titel]) => !titel)
  const deutsch = (nr: number) => folgeIstDeutsch(nr, liste?.de ?? [], wege)
  const staffeln = staffelAbschnitte(liste?.s, folgen ?? [], liste?.de ?? [], deutsch)
  const gewaehlt = staffeln[paket]
  const anzahl = staffeln.length ? staffeln[staffeln.length - 1]!.bis : folgen?.length
  const pakete = staffeln.length || (folgen ? Math.ceil(folgen.length / PAKET) : 0)
  const sichtbar = gewaehlt?.folgen ?? folgen?.slice(paket * PAKET, paket * PAKET + PAKET) ?? []
  const reiter = (i: number) => `${i * PAKET + 1}–${Math.min((i + 1) * PAKET, folgen!.length)}`
  const nurSerienbeleg = serienbelegOhneFolgenbeleg(Boolean(serieBelegt), folgen?.map(([nr]) => nr) ?? [], deutsch)
  const staffelReiter = reiterVon(staffeln, releases, today, liste?.sn)
  if (staffelReiter.length) {
    const aktiv = wahl ?? startReiter(staffelReiter, staffeln)
    const zeilen = <FolgenListe liste={liste} sichtbar={staffeln[aktiv]!.folgen} ohneTitel={ohneTitel} nurSerienbeleg={nurSerienbeleg} deutsch={deutsch} erschienen={erschienen} />
    const klappe = <FolgenKlappe offen={offen} umschalten={() => setOffen((o) => !o)} min={laufzeitImKopf ? undefined : liste?.min} zeilen={zeilen} />
    return (
      <div className={HUELLE}>
        <StaffelAbschnitt reiter={staffelReiter} aktiv={aktiv} kennung={`folgen-${titleId}`} beiWahl={setWahl} zeile={abschnittZeile(staffeln[aktiv]!, staffelReiter[aktiv]!.lage, deutsch)} kinder={klappe} />
      </div>
    )
  }
  return (
    <div className={HUELLE}>
      <button type="button" onClick={() => setOffen((o) => !o)} aria-expanded={offen} className="flex min-h-11 w-full cursor-pointer items-center gap-1.5 text-left text-t3 font-semibold">
        <span aria-hidden className={`inline-block transition-transform ${offen ? 'rotate-90' : ''}`}>▸</span>
        Folgen{anzahl !== undefined ? ` (${anzahl})` : ''}
        {liste?.min && !laufzeitImKopf ? <span className="font-normal text-ak-leise">· ~{liste.min} Min. je Folge</span> : null}
      </button>
      {offen && (
        <div>
          {pakete > 1 && (
            <div role="tablist" className="mb-1 flex flex-wrap gap-1">
              {Array.from({ length: pakete }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === paket}
                  onClick={() => setPaket(i)}
                  className={`min-h-11 min-w-11 cursor-pointer rounded px-2 tabular-nums ${i === paket ? 'bg-ak-gewaehlt font-bold text-ak-auf-gewaehlt' : 'bg-ak-flaeche-2 text-ak-text hover:bg-ak-flaeche-3'}`}
                >
                  {reiter(i)}
                </button>
              ))}
            </div>
          )}
          {gewaehlt && <p className="pb-1 text-ak-leise">{staffelZeile(gewaehlt)}</p>}
          <FolgenListe liste={liste} sichtbar={sichtbar} ohneTitel={ohneTitel} nurSerienbeleg={nurSerienbeleg} deutsch={deutsch} erschienen={erschienen} />
        </div>
      )}
    </div>
  )
}

/** Im Abschnitt einer Staffel klappt der Knopf nur ihre Folgen auf; ihre Zahl steht schon in der Kopfzeile des Abschnitts. */
function FolgenKlappe({ offen, umschalten, min, zeilen }: { offen: boolean; umschalten: () => void; min?: number; zeilen: ReactNode }) {
  return (
    <>
      <button type="button" onClick={umschalten} aria-expanded={offen} className="flex min-h-11 w-full cursor-pointer items-center gap-1.5 text-left text-t3 font-semibold">
        <span aria-hidden className={`inline-block transition-transform ${offen ? 'rotate-90' : ''}`}>▸</span>
        Folgen
        {min ? <span className="font-normal text-ak-leise">· ~{min} Min. je Folge</span> : null}
      </button>
      {offen && zeilen}
    </>
  )
}

/** Die Zeilen der Folgen (Nummer, Titel, Minuten, Flagge) samt Lade- und Leerhinweis. */
function FolgenListe({ liste, sichtbar, ohneTitel, nurSerienbeleg, deutsch, erschienen }: {
  liste: Liste | undefined
  sichtbar: Folge[]
  ohneTitel: boolean
  nurSerienbeleg: boolean
  deutsch: (nr: number) => boolean
  erschienen: number | undefined
}) {
  const folgen = liste?.f
  return (
    <ul className="max-h-64 overflow-y-auto pr-1">
      {!folgen && <li className="text-ak-leise">Lädt …</li>}
      {folgen && !folgen.length && <li className="text-ak-leise">Keine Folgentitel bekannt.</li>}
      {ohneTitel && <li className="pb-1 text-ak-leise">Die Folgentitel liegen noch nicht vor.</li>}
      {nurSerienbeleg && <li className="pb-1 text-ak-leise">{SERIENBELEG_HINWEIS}</li>}
      {sichtbar.map(([nr, titel, min]) => (
        <li key={nr} className="flex items-baseline gap-2 py-px">
          <span className="w-9 shrink-0 text-right tabular-nums text-ak-leise">{nr}</span>
          <span className="min-w-0 flex-1 truncate">{titel || (ohneTitel ? '' : '—')}</span>
          {min ? <span className="shrink-0 tabular-nums text-ak-leise">{min} Min.</span> : null}
          {deutsch(nr) ? <DeFlagge /> : erschienen !== undefined && nr > erschienen ? <NochNichtErschienen /> : <FolgeOhneFlagge hinweis={liste?.h?.find(([n]) => n === nr)?.[1]} gibtDeutsche={Boolean(liste?.de.length)} />}
        </li>
      ))}
    </ul>
  )
}

function DeFlagge() {
  return (
    <Tooltip text="Für diese Folge existiert eine Deutsche Synchro." eigenerFokus>
      <DeFlaggeZeichen />
    </Tooltip>
  )
}

/** Eine Folge, die noch nicht erschienen ist: keine Flagge und kein „keine Synchro", sondern der Hinweis darauf. */
function NochNichtErschienen() {
  return (
    <Tooltip text="Erscheint noch. Ob die Folge auf Deutsch kommt, belegt erst ihr Erscheinen." eigenerFokus>
      <span role="img" aria-label="Noch nicht erschienen" className="inline-flex size-3.5 shrink-0 items-center justify-center text-ak-leise">
        <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><circle cx="8" cy="8" r="6.5" /><path d="M8 4.5V8l2.5 1.5" /></svg>
      </span>
    </Tooltip>
  )
}

/** Die Lücke in der Flaggenreihe: ✕ mit dem Hinweistext, wo belegt ist, dass es keine Synchro gibt; sonst ein „?". */
function FolgeOhneFlagge({ hinweis, gibtDeutsche }: { hinweis?: string; gibtDeutsche: boolean }) {
  if (!hinweis && !gibtDeutsche) return null
  const marke = 'inline-flex size-3.5 shrink-0 items-center justify-center rounded-full border text-t5 font-bold'
  return (
    <Tooltip text={hinweis ?? 'Für diese Folge ist keine deutsche Synchro belegt.'} eigenerFokus>
      <span
        role="img"
        aria-label={hinweis ?? 'Keine deutsche Synchro belegt'}
        className={`${marke} ${hinweis ? 'border-ak-fehler text-ak-fehler-text' : 'border-ak-sehr-leise text-ak-leise'}`}
      >
        {hinweis ? '✕' : '?'}
      </span>
    </Tooltip>
  )
}
