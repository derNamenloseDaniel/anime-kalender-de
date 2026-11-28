import { useEffect, useId, useState } from 'react'
import type { Translate } from '../../lib/i18n.tsx'
import { AufklappKopf } from './aufklapp-kopf.tsx'
import { PanelKarte, StapelZeichen } from './panel-karte.tsx'
import { reihenKarte, type Ordnung, type ReihenListeProps } from './reihen-inhalt.tsx'
import { ReihenSpur } from './reihen-spur.tsx'
import { reihenStand } from './reihen-karte.tsx'
import { gezeigteGruppen, gezeigteZahl, gruppeVon, type Gruppe } from './reihen-uebersicht-regeln.ts'

type UebersichtProps = ReihenListeProps & { o: Ordnung }

/** Suche über die ganze Breite. */
function UebersichtKopf({ t, suche, onSuche }: { t: Translate; suche: string; onSuche: (text: string) => void }) {
  return (
    <div className="mb-1 flex flex-col gap-1">
      <input
        type="search"
        value={suche}
        onChange={(e) => onSuche(e.target.value)}
        placeholder={t('detail.reiheSuche')}
        aria-label={t('detail.reiheSuche')}
        className="h-11 w-full rounded-lg border border-ak-rand bg-transparent px-3 text-t3"
      />
    </div>
  )
}

/** Die Teile einer offenen Gruppe als waagerechte Spur mit Karussell-Covern (wie die Spur kleiner Reihen); alle Teile, damit Zahl und Karten übereinstimmen. */
function Gruppenspur({ g, p }: { g: Gruppe; p: UebersichtProps }) {
  return (
    <ReihenSpur gewaehltId={p.title.id} erste t={p.t}>
      {g.teile.map((m) => reihenKarte(m, p.o, p))}
    </ReihenSpur>
  )
}

/**
 * Welche Gruppen offen sind: nur die des geöffneten Titels (F148). Wechselt sie (anderer Teil, Nachladen ordnet um),
 * geht die alte zu — live blieb bei „Horizonte“ sonst die Hauptserie aus dem ersten Bild offen.
 */
function useOffeneGruppen(eigene: string | undefined) {
  const [offen, setOffen] = useState<string[]>(() => (eigene ? [eigene] : []))
  useEffect(() => {
    setOffen(eigene ? [eigene] : [])
  }, [eigene])
  const umschalten = (titel: string) => setOffen((o) => (o.includes(titel) ? o.filter((x) => x !== titel) : [...o, titel]))
  return { offen, umschalten }
}

/**
 * **Große Reihen als Übersicht** (Daniel, F148, 20.11.2026): Gruppen mit Zahl, offen nur die des geöffneten Titels.
 * Zahl am Kopf, Zahl je Gruppe und Liste kommen aus denselben `gezeigteGruppen`.
 */
export function ReihenUebersicht(p: UebersichtProps) {
  const { t, o, title, reihenSchluessel, reiheSuche } = p
  const basis = useId()
  const eigene = gruppeVon(o.gruppen, title.id)
  const { offen, umschalten } = useOffeneGruppen(eigene)
  const suchText = reiheSuche.reihe === reihenSchluessel ? reiheSuche.text.trim() : ''
  const zeigen = gezeigteGruppen(o.gruppen, suchText)
  /* Der Stand steht nur bei einer Hauptstaffel; „25 Staffeln“ neben einer Gruppe mit 12 Einträgen widerspräche der Zahl. */
  const stand = o.nummern.has(title.id) ? reihenStand(p.reihenTeile, p.reihenName, title.id, t) : ''
  return (
    <PanelKarte symbol={<StapelZeichen />} titel={t('detail.reihe')} zaehler={gezeigteZahl(zeigen)} akzent="info">
      {stand && <p className="-mt-1.5 mb-2 pl-[38px] text-t5 text-ak-text/75">{stand}</p>}
      <div data-reihe-liste data-reihe-uebersicht className="p-0.5">
        <UebersichtKopf t={t} suche={suchText ? reiheSuche.text : ''} onSuche={(text) => p.setReiheSuche({ reihe: reihenSchluessel, text })} />
        {!zeigen.length && <span className="px-1 py-2 text-t4 text-ak-leise">{t('detail.reiheKeinTreffer')}</span>}
        {zeigen.map((g, i) => {
          const auf = Boolean(suchText) || offen.includes(g.titel)
          return (
            <div key={g.titel} data-reihe-gruppe={g.titel}>
              <AufklappKopf offen={auf} onClick={() => umschalten(g.titel)} steuert={`${basis}-${i}`}>
                <span className="flex-1">{g.titel}</span>
                <span className="pr-2 tabular-nums">{g.teile.length}</span>
              </AufklappKopf>
              <div id={`${basis}-${i}`}>{auf && <Gruppenspur g={g} p={p} />}</div>
            </div>
          )
        })}
      </div>
    </PanelKarte>
  )
}
