import { useEffect, useState } from 'react'
import { EinstellungenLazy } from './components/EinstellungenLazy.tsx'
import { useStartdaten } from './lib/start-daten.ts'
import { useEinstellungenOffen } from './lib/einstellungen-offen.ts'
import type { FilterState } from './lib/filters.ts'
import { useKalenderFilter } from './lib/kalender-filter.ts'
import { useFavorites, useHidden } from './lib/favorites.ts'
import { speicherSichern, useNewsletterSync } from './lib/newsletterSync.ts'
import { useFavoritenAbgleich } from './lib/favoriten-abgleich.ts'
import { usePushNachfuehren } from './lib/push-nachfuehren.ts'
import { useRoute, type ViewId } from './lib/router.ts'
import { useDbSchalter } from './lib/db-schalter.ts'
import { addDays, addMonths, todayIso } from '@shared/time.ts'
import { useCoverSicherung, useKalenderTermine, useNachladeTitel, useTitelAnsicht } from './lib/app-ansicht.ts'
import { AppDetail, AppInhalt, appKopf } from './components/AppBereiche.tsx'
import { InstallDialog } from './components/InstallPrompt.tsx'
import { DatenFehler } from './components/DatenFehler.tsx'
import { Footer } from './components/Footer.tsx'
import { StartGeruest } from './components/StartGeruest.tsx'
import { useErstesErgebnis } from './lib/erstes-ergebnis.ts'

/** Eine Wahl, die im Browser bleibt statt in der Adresse — wer einen Link teilt, teilt nicht seine Vorlieben. */
function useGemerkterSchalter(schluessel: string, lesen: () => boolean): [boolean, (an: boolean) => void] {
  const [wert, setWert] = useState(lesen)
  useEffect(() => {
    try {
      localStorage.setItem(schluessel, wert ? '1' : '0')
    } catch {
      /* Gesperrte Site-Daten: Die Wahl gilt dann für diese Sitzung. */
    }
  }, [schluessel, wert])
  return [wert, setWert]
}

function tvAusGespeichert(): boolean {
  try {
    return localStorage.getItem('tvAus') === '1'
  } catch {
    return false
  }
}

/** Unten docken am Handy die Werkzeugleiste (Kalender, Datenbank) und am Rechner im Kalender die Steuerleiste an — der Fuß bleibt darüber lesbar. */
const FUSS_ABSTAND = {
  kalender: 'pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-24',
  datenbank: 'pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0',
  sonst: '',
}

function fussAbstand(view: ViewId): string {
  if (view === 'woche' || view === 'monat') return FUSS_ABSTAND.kalender
  return view === 'datenbank' ? FUSS_ABSTAND.datenbank : FUSS_ABSTAND.sonst
}

export default function App() {
  const [einstellungenOffen, setEinstellungenOffen] = useEinstellungenOffen()
  /* TV-Termine ausblenden. */
  const [tvAus, setTvAus] = useGemerkterSchalter('tvAus', tvAusGespeichert)
  const [route, navigate, ersetze] = useRoute()
  /* Staffeln zusammenfassen (Vorgabe aus) und Titel ohne Synchro: Adresse, sonst gespeicherter bzw. voreingestellter Wert (`db-schalter.ts`). */
  const { grouped, setGrouped, zeigeOhneSynchro, setZeigeOhneSynchro } = useDbSchalter(route, ersetze)
  /* Die Filter von Woche und Monat: nur im Speicher, nicht in der Adresse, nicht mit der Datenbank geteilt (`kalender-filter.ts`). */
  const { filters: kalenderFilters, kalenderNavigate } = useKalenderFilter(route, navigate)
  const { favorites, toggle } = useFavorites()
  const { hidden, toggle: toggleHidden } = useHidden()
  // Hält Newsletter und Push aktuell — hier oben, damit es unabhängig von der geöffneten Ansicht greift.
  useNewsletterSync(favorites)
  useFavoritenAbgleich()
  usePushNachfuehren(favorites, kalenderFilters, tvAus)
  // Bittet den Browser einmalig, den lokalen Speicher nicht selbst zu räumen (iOS-Safari: sieben Tage).
  useEffect(speicherSichern, [])
  const today = todayIso()
  /* Die Wochenansicht startet aus der kleinen Wochen-Datei; `data` ist bis zum vollen Datensatz (`voll`) nur diese Woche. */
  const { data, voll, error, neuLaden } = useStartdaten(route, today)
  useCoverSicherung(data, today)
  useTastenSpruenge(route, navigate)
  const nachgeladen = useNachladeTitel(data, voll, route, zeigeOhneSynchro)

  const { eventListe, eventsVeraltet, termintage } = useKalenderTermine(data, voll, kalenderFilters, today, favorites, tvAus)
  const datenbank = useTitelAnsicht({ data, filters: route.filters, today, favorites, grouped, setGrouped, zeigeOhneSynchro, setZeigeOhneSynchro, nachgeladen })
  const kalenderBereit = useErstesErgebnis(!!data, eventsVeraltet)

  const setFilters = (filters: FilterState) => navigate({ filters: { ...filters, search: route.filters.search } })
  /* Gesucht wird nur in der Datenbank; von anderen Seiten aus führt die Suche dorthin. */
  const setSuche = (search: string) =>
    navigate({
      filters: { ...route.filters, search },
      ...(route.view === 'datenbank' || !search ? {} : { view: 'datenbank' as ViewId }),
    })

  /* Nur ohne Anzeigbares: eine stehende Ansicht (Wochen-Daten) bleibt stehen, auch wenn das Nachladen scheitert. */
  if (error && !data) {
    return <DatenFehler detail={error} onNeuLaden={neuLaden} />
  }

  const kopf = appKopf({ route, navigate, setSuche, favorites, einstellungen: () => setEinstellungenOffen(true) })

  if (!data) return StartGeruest({ kopf }) // Funktion statt Element: eine Komponentengrenze hängt den Kopf neu ein und nimmt Fokus mit (4072)

  const merkliste = { favorites, hidden, onToggleFavorite: toggle, onToggleHidden: toggleHidden }

  return (
    <div className={`flex min-h-full flex-col ${fussAbstand(route.view)}`}>
      {kopf}
      <EinstellungenLazy
        offen={einstellungenOffen}
        schliessen={() => setEinstellungenOffen(false)}
      />
      <AppInhalt
        {...merkliste}
        data={data}
        route={route}
        navigate={navigate}
        ersetze={ersetze}
        setFilters={setFilters}
        kalenderFilters={kalenderFilters}
        kalenderNavigate={kalenderNavigate}
        kalenderBereit={kalenderBereit}
        events={eventListe}
        tvAus={tvAus}
        setTvAus={setTvAus}
        termine={termintage}
        datenbank={datenbank}
      />

      <Footer meta={data.meta} />

      <InstallDialog />

      {!!route.title && voll && <AppDetail {...merkliste} data={data} route={route} navigate={navigate} titleId={route.title} />}
    </div>
  )
}

/** Wochen- und Monatssprünge per Tastatur (← → T), solange kein Textfeld den Fokus hat. */
function useTastenSpruenge(route: ReturnType<typeof useRoute>[0], navigate: ReturnType<typeof useRoute>[1]) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return
      if (route.title) return
      if (route.view !== 'woche' && route.view !== 'monat') return
      const isMonth = route.view === 'monat'
      if (e.key === 'ArrowLeft') navigate({ date: isMonth ? addMonths(route.date, -1) : addDays(route.date, -7) })
      else if (e.key === 'ArrowRight') navigate({ date: isMonth ? addMonths(route.date, 1) : addDays(route.date, 7) })
      else if (e.key.toLowerCase() === 't') navigate({ date: todayIso() })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [route, navigate])
}
