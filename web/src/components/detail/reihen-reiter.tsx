import { createContext, useContext, useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react'
import type { LageMitGrund } from '@shared/logic.ts'
import type { Dataset } from '../../lib/data.ts'
import { kastenKlassen, kastenKopfVon, useKastenZustand } from './antwort-kasten-zustand.tsx'
import type { AntwortKastenProps } from './antwort-kasten-props.ts'
import { reihenLageMitGrund, type ReihenReiter } from './reihen-reiter-liste.ts'
import { ReiterPfeil, rolleUm, usePfeilLage } from './staffel-pfeile.tsx'
import { useReiterBlase } from './reiter-blase.tsx'
import { Akzentstrich, LAGE_WORT, LageMarke, LEISTE, LEISTE_HUELLE, naechsterReiter, reiterKlassen, reiterTitel, zeigeGewaehlten } from './staffel-reiter.tsx'
import { useLang } from '../../lib/i18n.tsx'

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
 * Reiter eines Teils ohne deutsche Synchro: gestrichelter Rand in `ak-sehr-leise` statt der Randfarbe (gewählt auch statt der des
 * Kastens). Der Rand `ak-rand` hielt auf der Reiterfläche 1,27:1 (dunkel) bzw. 1,23:1 (hell), die Striche waren kaum zu sehen; so 4,6:1.
 */
export function gestrichelt(klassen: string): string {
  return [...klassen.split(' ').filter((k) => !/^border-ak-/.test(k)), 'border-dashed', 'border-ak-sehr-leise'].join(' ')
}

/**
 * Je Titel der Kategorie ein Reiter mit nur der Kurzform (Nummer, Bereich) über dem Antwortkasten, der volle Titel steht im Tooltip;
 * ein Reiter öffnet seinen Titel. Pfeiltasten,
 * Pos1 und Ende setzen nur den Fokus, Eingabe oder Leertaste öffnet: jede Wahl lädt einen anderen Titel.
 */
export function ReihenReiterZeile(p: { reiter: ReihenReiter[]; aktiv: number; lagen: Map<number, LageMitGrund>; farbe: string; kennung: string; beiWahl: (id: number) => void }) {
  const { reiter, aktiv, lagen, farbe, kennung, beiWahl } = p
  const { t } = useLang()
  const zeile = useRef<HTMLDivElement>(null)
  const gewaehlterReiter = useRef<HTMLButtonElement>(null)
  useEffect(() => zeigeGewaehlten(zeile.current, gewaehlterReiter.current), [aktiv])
  const lage = usePfeilLage(zeile, reiter.length)
  const lageVon = (id: number) => lagen.get(id) ?? { lage: 'ruht' as const }
  const blase = useReiterBlase((id) => {
    const r = reiter.find((x) => x.id === id)
    return r ? reiterTitel(r.name, lageVon(id), t, r.ohneSynchro) : ''
  })
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
          const l = lageVon(r.id).lage
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
              aria-label={`Staffel ${r.label}: ${r.name}${LAGE_WORT[l]}${r.ohneSynchro ? OHNE_SYNCHRO_WORT : ''}`}
              {...blase.an(r.id)}
              onClick={() => beiWahl(r.id)}
              className={r.ohneSynchro ? gestrichelt(reiterKlassen(gewaehlt, farbe)) : reiterKlassen(gewaehlt, farbe)}
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
      {blase.blase}
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
  const lagen = new Map<number, LageMitGrund>(reiter.map((r) => [r.id, data.titleById.has(r.id) ? reihenLageMitGrund(data.titleById.get(r.id)!, data.releasesByTitle.get(r.id) ?? [], today) : { lage: 'ruht' }]))
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
