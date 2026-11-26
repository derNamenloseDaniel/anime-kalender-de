import { useEffect, useMemo, useRef, useState } from 'react'
import { todayIso } from '@shared/time.ts'
import { useEscape } from '../lib/escape.ts'
import { useLang } from '../lib/i18n.tsx'
import { sprungLage, type SprungLage } from '../lib/sprung-lage.ts'
import { sichtbareBreite } from '../lib/sichtbare-breite.ts'

export interface SprungTermine {
  /** Die Tage aller Termine (ungefiltert für den Bereich, gefiltert für die Zählung). */
  alle: string[]
  sichtbar: string[]
}

function bereichVon(alle: string[], heute: string): { von: string; bis: string } {
  let von = heute
  let bis = heute
  for (const d of alle) {
    if (d < von) von = d
    if (d > bis) bis = d
  }
  return { von, bis }
}

/* Termine je Monat („2026-11") und je Tag, aus der gefilterten Ansicht. */
function zaehleTermine(sichtbar: string[]) {
  const jeMonat = new Map<string, number>()
  const jeTag = new Map<string, number>()
  for (const d of sichtbar) {
    jeMonat.set(d.slice(0, 7), (jeMonat.get(d.slice(0, 7)) ?? 0) + 1)
    jeTag.set(d, (jeTag.get(d) ?? 0) + 1)
  }
  return { jeMonat, jeTag }
}

/** Zustand und Ableitungen des Datumssprungs; Hook-Reihenfolge unverändert. */
export function useSprungZustand(date: string, termine: SprungTermine, onDate: (d: string) => void) {
  const { t } = useLang()
  const heute = todayIso()
  const [offen, setOffen] = useState(false)
  const [jahr, setJahr] = useState(Number(date.slice(0, 4)))
  const [monat, setMonat] = useState<number | null>(null)
  const knopf = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState<SprungLage | null>(null)

  const { von, bis } = useMemo(() => bereichVon(termine.alle, heute), [termine.alle, heute])
  const { jeMonat, jeTag } = useMemo(() => zaehleTermine(termine.sichtbar), [termine.sichtbar])

  useEffect(() => {
    if (!offen) return
    const weg = () => setOffen(false)
    window.addEventListener('resize', weg)
    return () => window.removeEventListener('resize', weg)
  }, [offen])
  useEscape(offen, () => setOffen(false))

  const oeffnen = () => {
    if (offen) return setOffen(false)
    const r = knopf.current?.getBoundingClientRect()
    if (r) setPos(sprungLage(r, { breite: sichtbareBreite(), hoehe: window.innerHeight }))
    setJahr(Number(date.slice(0, 4)))
    setMonat(null)
    setOffen(true)
  }
  const springe = (d: string) => {
    onDate(d < von ? von : d > bis ? bis : d)
    setOffen(false)
  }

  const monatKey = (m: number) => `${jahr}-${String(m + 1).padStart(2, '0')}`
  const monatErlaubt = (m: number) => monatKey(m) >= von.slice(0, 7) && monatKey(m) <= bis.slice(0, 7)

  return { t, heute, offen, setOffen, jahr, setJahr, monat, setMonat, knopf, pos, von, bis, jeMonat, jeTag, oeffnen, springe, monatKey, monatErlaubt }
}
