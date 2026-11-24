import { useEffect, useMemo, useState } from 'react'
import type { Title } from '@shared/types.ts'
import { addDays, startOfWeek } from '@shared/time.ts'
import { loadAllTitles, loadCartoons, loadOhneSynchro, loadSynonyme, type Dataset } from './data.ts'
import { titelFuerAnsichtGen, type FilterState } from './filters.ts'
import { useSprecherAuswahl } from './sprecher.ts'
import { titelQuelle } from './titel-quelle.ts'
import { leeresErgebnis, useZeitscheibe } from './use-zeitscheibe.ts'
import { cacheCoversForOffline } from './pwa.ts'
import { coverBild, KACHEL_DICHTE } from './cover.ts'
import type { AppRoute } from './router.ts'
import type { Fundstelle } from './search.ts'

/** Die Titelansicht, bevor etwas gerechnet ist. */
const LEERE_ANSICHT = { liste: [] as Title[], fundstellen: new Map<string, Fundstelle[]>() }

/** Cover der aktuellen und nächsten Woche für unterwegs sichern — dieselbe Größe wie die Kachel. */
export function useCoverSicherung(data: Dataset | undefined, today: string): void {
  useEffect(() => {
    if (!data) return
    const from = startOfWeek(today)
    const to = addDays(from, 13)
    const urls = data.events
      .filter((e) => e.date >= from && e.date <= to)
      .map((e) => coverBild(data.titleById.get(e.titleId)?.coverImage, 160, undefined, KACHEL_DICHTE).src)
      .filter((url): url is string => Boolean(url))
    cacheCoversForOffline(urls)
  }, [data, today])
}

/** Nachgeladene Titellisten: alle (Datenbank), ohne Synchro (auf Wunsch) und Cartoons (Datenbank, direkt geöffneter Cartoon). */
export function useNachladeTitel(data: Dataset | undefined, voll: Dataset | undefined, route: AppRoute, zeigeOhneSynchro: boolean) {
  const [allTitles, setAllTitles] = useState<Title[]>()
  const [ohneSynchro, setOhneSynchro] = useState<Title[]>()
  const [cartoons, setCartoons] = useState<Title[]>()
  // Die vollständige Titelliste kommt erst mit der Datenbank; der Kalender führt nur die Titel mit Termin.
  useEffect(() => {
    if (!data || allTitles || route.view !== 'datenbank') return
    /* Die Synonyme kommen mit — erst danach steht die Liste, damit die Suche sie kennt. */
    Promise.all([loadAllTitles(data), loadSynonyme()])
      .then(([alle]) => setAllTitles(alle))
      .catch(() => setAllTitles(data.titles))
  }, [data, allTitles, route.view])

  // Die Titel ohne Synchro kommen erst, wenn jemand sie sehen will — und dann genau einmal.
  useEffect(() => {
    if (!data || !zeigeOhneSynchro || ohneSynchro) return
    loadOhneSynchro(data).then(setOhneSynchro)
  }, [data, zeigeOhneSynchro, ohneSynchro])

  /* Cartoons mit Termin stehen schon im Kern; die übrigen lädt die Seite nur für die Datenbank und für einen direkt geöffneten Cartoon (18.09.2026). */
  const brauchtCartoons = route.view === 'datenbank' || (route.title !== undefined && !!voll && !voll.titleById.has(route.title))
  useEffect(() => {
    if (!data || cartoons || !brauchtCartoons) return
    loadCartoons(data).then(setCartoons)
  }, [data, cartoons, brauchtCartoons])
  return { allTitles, ohneSynchro, cartoons }
}

interface TitelAnsichtEingabe {
  data: Dataset | undefined
  filters: FilterState
  today: string
  favorites: Set<number>
  grouped: boolean
  zeigeOhneSynchro: boolean
  nachgeladen: ReturnType<typeof useNachladeTitel>
}

/** Die Titelliste der Datenbank samt Quelle und Sprecher-Auswahl. */
export function useTitelAnsicht(e: TitelAnsichtEingabe) {
  const { data, filters, today, favorites, grouped, zeigeOhneSynchro } = e
  const { allTitles, ohneSynchro, cartoons } = e.nachgeladen
  const sprecher = useSprecherAuswahl(filters)
  const quelle = useMemo(() => titelQuelle(data?.titles ?? [], allTitles, ohneSynchro, zeigeOhneSynchro, cartoons), [data, allTitles, ohneSynchro, zeigeOhneSynchro, cartoons])
  const { wert: titles, laeuft: titelRechnet } = useZeitscheibe(
    () => (data ? titelFuerAnsichtGen(quelle, data, filters, today, favorites, grouped, sprecher.auswahl) : leeresErgebnis(LEERE_ANSICHT)),
    [data, quelle, filters, today, favorites, grouped, sprecher.auswahl],
    LEERE_ANSICHT,
  )
  return { titles, titelRechnet, quelle, sprecher }
}
