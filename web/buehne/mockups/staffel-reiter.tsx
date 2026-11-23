import { useContext, useEffect, useRef, type ComponentProps, type ReactNode } from 'react'
import { titleStatus } from '@shared/logic.ts'
import type { Dataset } from '../../src/lib/data.ts'
import { kastenKopfVon, useKastenZustand } from '../../src/components/detail/antwort-kasten-zustand.tsx'
import type { AntwortKastenMitMarke } from '../../src/components/detail/kasten-marke.tsx'
import { usePanelReihe } from '../../src/components/detail/panel-reihe-namen.ts'
import { TitelWechselKontext } from '../titel-wechsel.ts'
import { reiterVon, type Reiter } from './staffel-reiter-liste.ts'

type KastenEigenschaften = ComponentProps<typeof AntwortKastenMitMarke>

/** Farbe und Rand des Antwortkastens (`kastenKlassen`): der gewählte Reiter trägt dieselben, so wächst er aus dem Kasten. */
const KASTEN_ROT = 'border-[#f6cfc3] bg-[#fff6f3] dark:border-[#4a2a24] dark:bg-[#1a1416]'
const KASTEN_GRAU = 'border-slate-200 bg-[#f8fafc] dark:border-white/10 dark:bg-[#111623]'

type Lage = 'laeuft' | 'kommt' | 'sonst'

function reiterKlassen(lage: Lage, gewaehlt: boolean, kasten: string): string {
  const basis = 'relative grid shrink-0 cursor-pointer snap-center place-items-center rounded-t-xl border border-b-0 px-3 text-t3 tabular-nums'
  if (gewaehlt) return `${basis} z-10 -mb-px min-h-[3.25rem] min-w-12 pb-px font-bold ${kasten} ${lage === 'laeuft' ? 'text-ak-akzent-text' : 'text-ak-text'}`
  const hoehe = 'min-h-11 min-w-11'
  if (lage === 'laeuft') return `${basis} ${hoehe} border-ak-akzent bg-ak-akzent font-bold text-ak-auf-akzent`
  return `${basis} ${hoehe} ${lage === 'kommt' ? 'border-dashed' : ''} border-ak-rand bg-ak-flaeche-2 font-semibold text-ak-leise`
}

/** Den gewählten Reiter in die Mitte der Zeile rollen. */
function zeigeGewaehlten(zeile: HTMLElement | null): void {
  const reiter = zeile?.querySelector<HTMLElement>('[aria-current="true"]')
  if (!zeile || !reiter) return
  zeile.scrollLeft = reiter.offsetLeft - (zeile.clientWidth - reiter.offsetWidth) / 2
}

/** Läuft die Staffel (echter Status des Titels), kommt sie noch, oder ist sie schon da. */
function lageVon(data: Dataset, id: number, today: string): Lage {
  const titel = data.titleById.get(id)
  const status = titleStatus(data.releasesByTitle.get(id) ?? [], today, titel)
  return status === 'airing' ? 'laeuft' : status === 'tba' ? 'kommt' : 'sonst'
}

/** „Staffeln“ links, daneben je Staffel ein Reiter mit nur der Nummer; wischt nativ, Beschriftung für Hilfsmittel nennt den Titel. */
function ReiterZeile({ reiter, aktiv, lagen, farbe }: { reiter: Reiter[]; aktiv: number; lagen: Map<number, Lage>; farbe: string }) {
  const wechsle = useContext(TitelWechselKontext)
  const zeile = useRef<HTMLDivElement>(null)
  useEffect(() => zeigeGewaehlten(zeile.current), [aktiv])
  return (
    <div className="relative z-10 -mb-px flex items-end gap-2 pr-4">
      <span className="shrink-0 pb-2.5 text-t3 font-bold text-ak-text">Staffeln</span>
      <div ref={zeile} role="group" aria-label="Staffeln" data-staffel-reiter className="flex min-w-0 flex-1 snap-x snap-proximity items-end gap-1 overflow-x-auto pb-px [scrollbar-width:none] pointer-fine:[scrollbar-width:thin] [&::-webkit-scrollbar]:hidden">
        {reiter.map((r) => {
          const lage = lagen.get(r.id) ?? 'sonst'
          return (
            <button key={r.id} type="button" aria-current={r.id === aktiv} aria-label={`Staffel ${r.label}: ${r.name}`} onClick={() => wechsle(r.id)} className={reiterKlassen(lage, r.id === aktiv, farbe)}>
              {r.label}
              {lage === 'laeuft' && <span aria-hidden="true" className={`absolute top-1 right-1 size-1.5 rounded-full ${r.id === aktiv ? 'bg-ak-akzent' : 'bg-ak-auf-akzent'}`} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Reiter über dem echten Kasten; die Hülle des Kastens (und damit die Farbe) kennt dieselbe Rechnung wie `AntwortKasten`. */
export function ReiterUeberKasten({ data, eigenschaften, kasten }: { data: Dataset; eigenschaften: KastenEigenschaften; kasten: ReactNode }) {
  const { title, antwort, t, today, releases = [], ohneSprachbeleg, stream = [], disc = [], pillenGruppen = new Map(), terminPillen = [], discZuerst = false } = eigenschaften
  const { reihenTeile, reihenName } = usePanelReihe(title, data)
  const z = useKastenZustand({ antwort, title, t, stream, disc, pillenGruppen, terminPillen, discZuerst })
  const { gedaempft } = kastenKopfVon({ antwort, title, today, T: z.T, releases, ohneSprachbeleg, folgenZahl: z.folgenZahl, staffeln: z.staffeln })
  const reiter = reiterVon(title, reihenTeile, reihenName, data.titles)
  const lagen = new Map(reiter.map((r) => [r.id, lageVon(data, r.id, today)]))
  if (reiter.length === 0) return kasten
  return (
    <>
      <ReiterZeile reiter={reiter} aktiv={title.id} lagen={lagen} farbe={gedaempft ? KASTEN_GRAU : KASTEN_ROT} />
      {kasten}
    </>
  )
}
