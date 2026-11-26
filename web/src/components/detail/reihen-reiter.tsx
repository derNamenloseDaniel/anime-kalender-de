import { createContext, useContext, useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react'
import type { StaffelLage } from '@shared/logic.ts'
import type { Dataset } from '../../lib/data.ts'
import { kastenKlassen, kastenKopfVon, useKastenZustand } from './antwort-kasten-zustand.tsx'
import type { AntwortKastenProps } from './antwort-kasten-props.ts'
import { reihenLageVon, type ReihenReiter } from './reihen-reiter-liste.ts'
import { ReiterPfeil, rolleUm, usePfeilLage } from './staffel-pfeile.tsx'
import { Akzentstrich, LAGE_WORT, LageMarke, LEISTE, LEISTE_HUELLE, naechsterReiter, reiterKlassen, zeigeGewaehlten } from './staffel-reiter.tsx'

/** Was die Reiter am Antwortkasten aus dem Panel brauchen; ohne Anbieter (Kasten allein gerendert) stehen keine Reiter. */
export interface ReihenReiterDaten {
  data: Dataset
  /** Die Reiter des geöffneten Titels (`reihenReiterVon`); die Reihenliste lässt genau diese Titel weg. */
  reiter: ReihenReiter[]
  /** Derselbe Weg wie ein Klick in der Reihenliste (`useReihenWechsel`). */
  wechsleZu: (id: number) => void
}

/** Hinter dem Namen im `aria-label`: Der gestrichelte Rand sagt es nur dem Auge. */
export const OHNE_SYNCHRO_WORT = ', ohne deutsche Synchro'

export const ReihenReiterKontext = createContext<ReihenReiterDaten | null>(null)

/** Farbe und Rand aus den Klassen der Kastenhülle (`kastenKlassen`): der gewählte Reiter trägt dieselben, so wächst er aus dem Kasten. */
export function kastenFarbe(huelle: string): string {
  /* Mit Varianten-Vorsatz (Dunkelthema) zählt die Klasse auch; Vergleich auf dem Teil nach dem letzten Doppelpunkt. */
  return huelle.split(' ').filter((k) => /^(border|bg)-/.test(k.slice(k.lastIndexOf(':') + 1))).join(' ')
}

/**
 * Je Titel der Kategorie ein Reiter mit nur der Kurzform (Nummer, Bereich) über dem Antwortkasten, der volle Titel steht im Tooltip;
 * ein Reiter öffnet seinen Titel. Pfeiltasten,
 * Pos1 und Ende setzen nur den Fokus, Eingabe oder Leertaste öffnet: jede Wahl lädt einen anderen Titel.
 */
export function ReihenReiterZeile(p: { reiter: ReihenReiter[]; aktiv: number; lagen: Map<number, StaffelLage>; farbe: string; kennung: string; beiWahl: (id: number) => void }) {
  const { reiter, aktiv, lagen, farbe, kennung, beiWahl } = p
  const zeile = useRef<HTMLDivElement>(null)
  const gewaehlterReiter = useRef<HTMLButtonElement>(null)
  useEffect(() => zeigeGewaehlten(zeile.current, gewaehlterReiter.current), [aktiv])
  const lage = usePfeilLage(zeile, reiter.length)
  const taste = (e: KeyboardEvent<HTMLDivElement>) => {
    const tabs = [...(zeile.current?.querySelectorAll<HTMLElement>('[role="tab"]') ?? [])]
    const von = tabs.indexOf(e.target as HTMLElement)
    const ziel = naechsterReiter(e.key, von < 0 ? reiter.findIndex((r) => r.id === aktiv) : von, reiter.length)
    if (ziel === undefined) return
    e.preventDefault()
    tabs[ziel]?.focus()
  }
  return (
    <div className={LEISTE_HUELLE}>
      <div ref={zeile} role="tablist" aria-label="Titel der Reihe" data-reihen-reiter onKeyDown={taste} className={LEISTE}>
        {reiter.map((r) => {
          const gewaehlt = r.id === aktiv
          const l = lagen.get(r.id) ?? 'ruht'
          return (
            <button
              key={r.id}
              ref={gewaehlt ? gewaehlterReiter : undefined}
              type="button"
              role="tab"
              id={`${kennung}-reiter-${r.id}`}
              aria-selected={gewaehlt}
              aria-controls={`${kennung}-kasten`}
              tabIndex={gewaehlt ? 0 : -1}
              aria-label={`${r.staffel ? `Staffel ${r.label}: ` : ''}${r.name}${LAGE_WORT[l]}${r.ohneSynchro ? OHNE_SYNCHRO_WORT : ''}`}
              title={r.name}
              onClick={() => beiWahl(r.id)}
              className={`${reiterKlassen(gewaehlt, farbe)}${r.ohneSynchro ? ' border-dashed' : ''}`}
            >
              {gewaehlt && <Akzentstrich />}
              {r.label}
              <LageMarke lage={l} />
            </button>
          )
        })}
      </div>
      <ReiterPfeil richtung="links" weitere={lage.links} beiKlick={() => rolleUm(zeile.current, 'links')} />
      <ReiterPfeil richtung="rechts" weitere={lage.rechts} beiKlick={() => rolleUm(zeile.current, 'rechts')} />
    </div>
  )
}

/** Reiter über dem echten Kasten; die Hülle des Kastens (und damit die Farbe) kennt dieselbe Rechnung wie `AntwortKasten`. */
export function ReihenReiterAmKasten({ eigenschaften, kasten }: { eigenschaften: AntwortKastenProps; kasten: ReactNode }) {
  const quelle = useContext(ReihenReiterKontext)
  const { title, antwort, t, today, releases = [], ohneSprachbeleg, stream = [], disc = [], pillenGruppen = new Map(), terminPillen = [], discZuerst = false } = eigenschaften
  const z = useKastenZustand({ antwort, title, t, stream, disc, pillenGruppen, terminPillen, discZuerst })
  if (!quelle) return kasten
  const { data } = quelle
  const { reiter } = quelle
  if (reiter.length === 0) return kasten
  const { gedaempft } = kastenKopfVon({ antwort, title, today, T: z.T, releases, ohneSprachbeleg, folgenZahl: z.folgenZahl, staffeln: z.staffeln })
  /* Ein Reiter-Titel, den die Seite nicht kennt (nicht in `titleById`), trägt keine Marke. */
  const lagen = new Map(reiter.map((r) => [r.id, data.titleById.has(r.id) ? reihenLageVon(data.titleById.get(r.id)!, data.releasesByTitle.get(r.id) ?? [], today) : ('ruht' as const)]))
  const farbe = kastenFarbe(kastenKlassen({ antwort, title, neben: '', gedaempft }))
  const kennung = `reihe-${title.id}`
  /* Eine Hülle um Reiter und Kasten: der Abstand der Seite zwischen ihren Geschwistern trennt sie nicht.
     `data-kasten` am Tabpanel: die Prüfwerkzeuge suchen `[data-kasten] > section`, die Hülle schiebt sich sonst dazwischen. */
  return (
    <div>
      <ReihenReiterZeile reiter={reiter} aktiv={title.id} lagen={lagen} farbe={farbe} kennung={kennung} beiWahl={quelle.wechsleZu} />
      <div role="tabpanel" data-kasten id={`${kennung}-kasten`} aria-labelledby={`${kennung}-reiter-${title.id}`}>
        {kasten}
      </div>
    </div>
  )
}
