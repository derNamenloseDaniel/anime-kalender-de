import { useState, type ReactNode } from 'react'
import { anzeigeName } from '@shared/titles.ts'
import { amazonLinkArt } from '@shared/plattform-suche.ts'
import { discAusgabenVon, FORMATE, type Format } from '../../src/components/detail/disc-ausgaben.ts'
import { gruppenVon, istKommend, jahre, kompaktDatum, startOffen, variantenVon, zielVon, type Art, type Variante } from '../../src/components/detail/disc-varianten.ts'
import type { DiscBereichEigenschaften } from '../ersatz.tsx'
import { KaufwegPillen } from './disc-bereich-teile.tsx'

/*
  Was A, B und C teilen (Runde 3, 26.11.2026): die Varianten der Seite, das Ziel je Variante (ein Händler, sonst der
  aniSearch-Artikel), und die Gruppen — eine Gruppe mit einem Eintrag steht immer offen, eine einzige Gruppe hat keinen Kopf.
  Texte stehen wörtlich (Mockup); beim Bau bekommen sie Schlüssel.
*/

export const ART_NAME: Record<Art, string> = { gesamt: 'Gesamtausgaben', box: 'Boxen', vol: 'Volumes', film: 'Filme', sonst: 'Sonstiges' }
export const FORMAT_NAME: Record<Format, string> = { b: 'Blu-ray', d: 'DVD', u: '4K' }
/** Bis hierhin zeigt eine Gruppe alle Einträge; darüber sechs und einen Knopf für den Rest. */
const GRENZE = 6

export function useVarianten(e: DiscBereichEigenschaften): Variante[] {
  return variantenVon(discAusgabenVon(e.discAusgaben, e.discReleases, e.title), anzeigeName(e.title))
}

export interface Ziel {
  url: string
  /** Lang für die Karte („Bei Amazon“), kurz für die Matrixspalte („Amazon“). */
  text: string
  kurz: string
}

/** Das Ziel der Seite (`zielVon`) mit den Beschriftungen der Varianten B und C. */
export function zielMitText(v: Variante): Ziel | undefined {
  const ziel = zielVon(v)
  if (!ziel) return undefined
  if (!ziel.haendler) return { url: ziel.url, text: 'Details bei aniSearch', kurz: 'aniSearch' }
  const art = amazonLinkArt(ziel.url)
  return { url: ziel.url, text: art === 'name' ? `Bei ${ziel.haendler} suchen` : art === 'ean' ? `Bei ${ziel.haendler}` : `Kaufen bei ${ziel.haendler}`, kurz: ziel.haendler }
}

/** Welche Formate in diesen Varianten vorkommen — die Spalten der Matrix (B), in fester Reihenfolge. */
export function spaltenVon(liste: Variante[]): Format[] {
  return FORMATE.filter((f) => liste.some((v) => v.formate.includes(f)))
}

/** „ab 15.01.27“ in Akzent für Kommendes, „seit 03.09.26“ leise für Erschienenes; ohne Datum nichts. */
export function DatumText({ iso, today }: { iso: string; today: string }) {
  if (!iso) return null
  const kommend = istKommend(iso, today)
  return <span className={`whitespace-nowrap tabular-nums ${kommend ? 'font-bold text-ak-akzent-text' : ''}`}>{kommend ? 'ab' : 'seit'} {kompaktDatum(iso)}</span>
}

export function FormatMarke({ f }: { f: Format }) {
  return <span className="whitespace-nowrap rounded border border-ak-rand px-1 text-t5 font-bold uppercase tracking-[.04em] text-ak-text">{FORMAT_NAME[f]}</span>
}

/** Eine Gruppe: Kopf nur bei mehreren Gruppen; zuklappbar nur mit mehreren Einträgen; lange Listen zeigen sechs und einen Knopf. */
function Gruppe({ art, liste, kopf, zu, zeige }: { art: Art; liste: Variante[]; kopf: boolean; zu: boolean; zeige: (liste: Variante[]) => ReactNode }) {
  const [offen, setOffen] = useState(!zu)
  const [alle, setAlle] = useState(false)
  const sichtbar = alle || liste.length <= GRENZE + 2 ? liste : liste.slice(0, GRENZE)
  const spanne = jahre(liste)
  const titel = (
    <span className="text-t4 font-bold">
      {ART_NAME[art]}
      {liste.length > 1 && <span className="font-normal text-ak-leise"> · {liste.length}{spanne && ` · ${spanne}`}</span>}
    </span>
  )
  return (
    <section className="flex flex-col gap-1.5">
      {kopf && liste.length > 1 && (
        <button type="button" aria-expanded={offen} onClick={() => setOffen((o) => !o)} className="flex min-h-11 items-center justify-between gap-2 rounded-lg px-1 text-left hover:bg-ak-flaeche-2">
          {titel}
          <span aria-hidden="true" className="text-ak-akzent-text">{offen ? '▴' : '▾'}</span>
        </button>
      )}
      {kopf && liste.length === 1 && <div className="px-1 pt-1">{titel}</div>}
      {(offen || liste.length === 1) && zeige(sichtbar)}
      {(offen || liste.length === 1) && sichtbar.length < liste.length && (
        <button type="button" onClick={() => setAlle(true)} className="inline-flex min-h-11 items-center gap-1 self-start rounded-full px-3 text-t4 font-semibold text-ak-akzent-text hover:bg-ak-flaeche-2">
          Alle {liste.length} anzeigen <span aria-hidden="true">▾</span>
        </button>
      )}
    </section>
  )
}

/** Rahmen aller drei Varianten: leise Kopfzeile (Zahl ab zwei, Verlag), die Gruppen, dann die übrigen Kaufwege der Seite. */
export function Rahmen({ e, zeige }: { e: DiscBereichEigenschaften; zeige: (liste: Variante[]) => ReactNode }) {
  const alle = useVarianten(e)
  const gruppen = gruppenVon(alle)
  const kopf = [alle.length > 1 ? `${alle.length} Varianten` : '', e.discReleases.map((r) => r.publisher).find(Boolean) ?? ''].filter(Boolean).join(' · ')
  return (
    <div className="flex w-full flex-col gap-2">
      {kopf && <div className="text-t5 font-bold uppercase tracking-[.08em] text-ak-leise">{kopf}</div>}
      {gruppen.map((g) => (
        <Gruppe key={`${g.art}-${startOffen(alle, g.art)}`} art={g.art} liste={g.liste} kopf={gruppen.length > 1} zu={!startOffen(alle, g.art)} zeige={zeige} />
      ))}
      <KaufwegPillen {...e} />
    </div>
  )
}
