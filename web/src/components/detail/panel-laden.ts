import { useEffect, useRef, useState } from 'react'
import type { DiscAusgabe, FranchiseMember } from '@shared/types.ts'
import { ladeTitelBestand, loadDiscAusgaben, loadFranchises, type Dataset } from '../../lib/data.ts'

/** Die Disc-Ausgaben des Titels; beim Titelwechsel zuerst leer, eine verspätete Antwort des alten Titels zählt nicht. */
export function useDiscAusgaben(titleId: number): DiscAusgabe[] {
  const [discAusgaben, setDiscAusgaben] = useState<DiscAusgabe[]>([])
  useEffect(() => {
    let alive = true
    setDiscAusgaben([])
    loadDiscAusgaben(titleId)
      .then((a) => {
        if (alive) setDiscAusgaben(a)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [titleId])
  return discAusgaben
}

/**
 * **Ein Titel, den der Kern nicht kennt, wird nachgeladen.** `titles-core.json` führt nur, worauf
 * ein Termin zeigt — beim Einstieg über eine geteilte Adresse und bei jedem Reiterwechsel auf einen Teil
 * ohne Termin fehlt sonst das Panel. Das Panel öffnet sofort (Platzhalter), der Bestand kommt danach.
 * Genau einmal je Kennung (`versucht`), damit ein wirklich unbekannter Titel nicht in eine Schleife läuft.
 * `fertigId` gilt nur für die Kennung, die gerade offen ist: eine späte Antwort eines früheren Wechsels ändert nichts.
 */
export function useTitelNachladen(data: Dataset, titleId: number): boolean {
  const [fertigId, setFertigId] = useState<number | undefined>(undefined)
  const versucht = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (data.titleById.has(titleId) || versucht.current === titleId) return
    versucht.current = titleId
    ladeTitelBestand(data, titleId)
      .catch(() => {})
      .finally(() => setFertigId(titleId))
  }, [data, titleId])
  /* Schon im ersten Zeichnen nach dem Wechsel „holt“ (nicht erst nach dem Effekt), sonst blitzt „keine Metadaten“ auf. */
  return !data.titleById.has(titleId) && fertigId !== titleId
}

/** Ein Teil der Reihe aus `franchises.json` (Cover, Name), solange der Titelbestand noch fehlt. */
export function useReihenmitglied(titleId: number): FranchiseMember | undefined {
  const [gefunden, setGefunden] = useState<FranchiseMember | undefined>(undefined)
  useEffect(() => {
    let alive = true
    loadFranchises()
      .then((f) => {
        const m = Object.values(f).flat().find((x) => x.id === titleId)
        if (alive) setGefunden(m)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [titleId])
  return gefunden?.id === titleId ? gefunden : undefined
}

/** Wechsel auf einen anderen Reihenteil: öffnet im selben Zug; fehlt der Titel im Bestand, füllt `useTitelNachladen` das offene Panel nach. */
export function useReihenWechsel(titleId: number, onOpenTitle: (id: number) => void) {
  const wechsleZu = (id: number) => {
    if (id !== titleId) onOpenTitle(id)
  }
  return { wechsleZu }
}
