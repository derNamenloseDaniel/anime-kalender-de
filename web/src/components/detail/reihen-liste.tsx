import { useContext } from 'react'
import { titelAlsReiter } from './anbieter-staffel.ts'
import { ReihenKarte } from './reihen-karte.tsx'
import { reihenInhalt, reihenOrdnung, type ReihenListeProps } from './reihen-inhalt.tsx'
import { ReihenReiterKontext } from './reihen-reiter.tsx'
import { ReihenUebersicht } from './reihen-uebersicht.tsx'
import { gezeigteGruppen, gezeigteZahl, istGrosseReihe } from './reihen-uebersicht-regeln.ts'

export function ReihenListe(eingang: ReihenListeProps) {
  /* Was als Reiter am Antwortkasten steht, fehlt hier (F157, Daniel 24.11.2026: „dafür die aus der reihe entfernen“). */
  const props = { ...eingang, ohne: titelAlsReiter(useContext(ReihenReiterKontext)?.reiter ?? []) }
  const { reihenTeile, t, reihenName, title } = props
  if (reihenTeile.length < 2) return null
  /* Große Reihen (eine Gruppe über 12 Teile) als Übersicht mit eingeklappten Gruppen, alle anderen als Spur (F148, 20.11.2026). */
  const o = reihenOrdnung(reihenTeile, reihenName, t, props.ohne)
  if (o.gruppen.length === 0) return null
  if (istGrosseReihe(o.gruppen)) return <ReihenUebersicht key={props.reihenSchluessel} {...props} o={o} />
  /* Die Zahl am Kopf ist die der gezeigten Zeilen, wie in der Übersicht. */
  const suchText = props.reiheSuche.reihe === props.reihenSchluessel ? props.reiheSuche.text.trim() : ''
  const zaehler = gezeigteZahl(gezeigteGruppen(o.gruppen, suchText))
  return (
    <ReihenKarte reihenTeile={reihenTeile} reihenName={reihenName} title={title} zaehler={zaehler}>
      <div data-reihe-liste className="p-0.5">
        {reihenInhalt(props)}
      </div>
    </ReihenKarte>
  )
}
